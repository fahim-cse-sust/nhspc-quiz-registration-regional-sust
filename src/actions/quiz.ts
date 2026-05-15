"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/auth";
import { quizMarkSchema, quizTotalMarksSchema } from "@/lib/validation";
import { DEFAULT_TOTAL_MARKS, QUIZ_CONFIG_KEY } from "@/lib/quiz";
import type { ActionState } from "@/actions/auth";

async function readTotalMarks() {
  const config = await prisma.quizConfig.findUnique({ where: { key: QUIZ_CONFIG_KEY } });
  return config?.totalMarks ?? DEFAULT_TOTAL_MARKS;
}

export async function updateQuizTotalMarksAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("SUPER_ADMIN");
  const parsed = quizTotalMarksSchema.safeParse({
    totalMarks: formData.get("totalMarks")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid total mark." };
  }

  const highestMarkedStudent = await prisma.student.findFirst({
    where: { quizMark: { not: null } },
    orderBy: { quizMark: "desc" },
    select: { quizMark: true, serialNumber: true }
  });

  if (highestMarkedStudent?.quizMark != null && parsed.data.totalMarks < highestMarkedStudent.quizMark) {
    return {
      error: `Total mark cannot be lower than the current highest mark (${highestMarkedStudent.quizMark}) by Serial Number ${highestMarkedStudent.serialNumber}.`
    };
  }

  await prisma.quizConfig.upsert({
    where: { key: QUIZ_CONFIG_KEY },
    update: {
      totalMarks: parsed.data.totalMarks,
      updatedByName: user.name
    },
    create: {
      key: QUIZ_CONFIG_KEY,
      totalMarks: parsed.data.totalMarks,
      updatedByName: user.name
    }
  });

  revalidatePath("/quiz");
  revalidatePath("/dashboard");
  return { success: "Total quiz mark updated successfully." };
}

export async function updateQuizMarkAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const totalMarks = await readTotalMarks();

  const parsed = quizMarkSchema.safeParse({
    studentId: formData.get("studentId"),
    quizMark: formData.get("quizMark")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid quiz mark." };
  }

  const mark = parsed.data.quizMark;

  if (mark != null && mark > totalMarks) {
    return { error: `Mark cannot be more than the total quiz mark (${totalMarks}).` };
  }

  const student = await prisma.student.findUnique({
    where: { id: parsed.data.studentId },
    select: { id: true }
  });

  if (!student) {
    return { error: "Student was not found." };
  }

  await prisma.student.update({
    where: { id: parsed.data.studentId },
    data: {
      quizMark: mark,
      quizMarkUpdatedAt: new Date(),
      quizMarkUpdatedBy: user.name
    }
  });

  revalidatePath("/quiz");
  revalidatePath("/dashboard");
  return { success: mark == null ? "Quiz mark cleared." : "Quiz mark saved." };
}
