import { prisma } from "@/lib/prisma";

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
