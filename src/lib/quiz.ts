import { prisma } from "@/lib/prisma";
import { categoryDisplayName, normaliseStudentCategory, type NormalizedCategory } from "@/lib/rooms";

export const QUIZ_CONFIG_KEY = "sylhet-regional-quiz";
export const DEFAULT_TOTAL_MARKS = 50;

export async function getQuizConfig() {
  const config = await prisma.quizConfig.findUnique({
    where: { key: QUIZ_CONFIG_KEY }
  });

  return {
    totalMarks: config?.totalMarks ?? DEFAULT_TOTAL_MARKS,
    updatedAt: config?.updatedAt ?? null,
    updatedByName: config?.updatedByName ?? null
  };
}

export function ordinalRank(rank: number) {
  const suffixes = ["th", "st", "nd", "rd"];
  const value = rank % 100;
  return `${rank}${suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0]}`;
}


export type WinnerCategory = Extract<NormalizedCategory, "junior" | "higherSecondary">;

export type CategoryRankedWinner<T extends { category: string | null; quizMark: number | null; serialNumber?: string | null }> = {
  student: T;
  rank: number;
  categoryGroup: WinnerCategory;
  categoryLabel: string;
};

export function buildCategoryWiseRankList<T extends { category: string | null; quizMark: number | null; serialNumber?: string | null }>(
  students: T[],
  perCategory = 20
): CategoryRankedWinner<T>[] {
  const grouped: Record<WinnerCategory, T[]> = {
    junior: [],
    higherSecondary: []
  };

  const sortedStudents = [...students].sort((first, second) => {
    const markDifference = (second.quizMark ?? -1) - (first.quizMark ?? -1);
    if (markDifference !== 0) return markDifference;
    return String(first.serialNumber || "").localeCompare(String(second.serialNumber || ""));
  });

  for (const student of sortedStudents) {
    const category = normaliseStudentCategory(student.category);
    if (category !== "junior" && category !== "higherSecondary") continue;
    if (grouped[category].length >= perCategory) continue;
    grouped[category].push(student);
  }

  return (["junior", "higherSecondary"] as const).flatMap((categoryGroup) =>
    grouped[categoryGroup].map((student, index) => ({
      student,
      rank: index + 1,
      categoryGroup,
      categoryLabel: categoryDisplayName(categoryGroup)
    }))
  );
}
