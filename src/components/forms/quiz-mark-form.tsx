"use client";

import { useActionState } from "react";
import { updateQuizMarkAction } from "@/actions/quiz";
import type { ActionState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: ActionState = {};

type QuizMarkFormProps = {
  studentId: string;
  studentName: string;
  quizMark: number | null;
  totalMarks: number;
};

export function QuizMarkForm({ studentId, studentName, quizMark, totalMarks }: QuizMarkFormProps) {
  const [state, formAction, pending] = useActionState(updateQuizMarkAction, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="studentId" value={studentId} />
      <div className="flex min-w-56 items-center justify-end gap-2">
        <Input
          aria-label={`Quiz mark for ${studentName}`}
          name="quizMark"
          type="number"
          min={0}
          max={totalMarks}
          step={1}
          defaultValue={quizMark ?? ""}
          placeholder="Mark"
          className="h-9 w-24 text-right"
        />
        <Button type="submit" disabled={pending} className="h-9 px-3">
          {pending ? "..." : "Save"}
        </Button>
      </div>
      {state.error ? <p className="text-right text-xs font-medium text-red-600 dark:text-red-300">{state.error}</p> : null}
      {state.success ? <p className="text-right text-xs font-medium text-emerald-600 dark:text-emerald-300">{state.success}</p> : null}
    </form>
  );
}
