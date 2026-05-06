"use client";

import { useActionState } from "react";
import { updateQuizTotalMarksAction } from "@/actions/quiz";
import type { ActionState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = {};

export function QuizTotalMarksForm({ totalMarks }: { totalMarks: number }) {
  const [state, formAction, pending] = useActionState(updateQuizTotalMarksAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="totalMarks">Total quiz mark</Label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <Input
            id="totalMarks"
            name="totalMarks"
            type="number"
            min={1}
            max={1000}
            step={1}
            defaultValue={totalMarks}
            required
            className="sm:max-w-44"
          />
          <Button type="submit" disabled={pending} className="sm:w-auto">
            {pending ? "Updating..." : "Update Total"}
          </Button>
        </div>
      </div>

      {state.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {state.success}
        </p>
      ) : null}
    </form>
  );
}
