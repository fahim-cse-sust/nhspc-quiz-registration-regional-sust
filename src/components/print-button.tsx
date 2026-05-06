"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold hover:bg-[var(--muted)]"
    >
      <Printer className="h-4 w-4" /> Print
    </button>
  );
}
