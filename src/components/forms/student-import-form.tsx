"use client";

import { useActionState } from "react";
import { importStudentsAction, type ImportStudentsState } from "@/actions/students";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ImportStudentsState = {};

export function StudentImportForm() {
  const [state, formAction, pending] = useActionState(importStudentsAction, initialState);
  const summary = state.summary;

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {state.success}
        </div>
      ) : null}

      <div>
        <Label htmlFor="file">Excel or CSV file</Label>
        <Input id="file" name="file" type="file" accept=".xlsx,.xls,.csv" required />
        <p className="mt-2 text-xs text-[var(--muted-foreground)]">
          Supported columns include No., Name (EN), Upazila, Division, District, Serial Number, Email, Mobile, Contest,
          Category, Venue Name, and Institute Name(EN). Serial Number is used as the unique key, so duplicate mobile numbers are allowed.
        </p>
      </div>

      <Button type="submit" disabled={pending}>{pending ? "Importing..." : "Import Students"}</Button>

      {summary ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
          <h3 className="text-sm font-bold">Import summary</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryItem label="Processed" value={summary.totalRowsProcessed} />
            <SummaryItem label="Inserted" value={summary.insertedCount} />
            <SummaryItem label="Updated" value={summary.updatedCount} />
            <SummaryItem label="Skipped" value={summary.skippedInvalidCount} />
          </div>

          {summary.errors.length > 0 ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <p className="font-semibold">Import messages</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {summary.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}
