import * as React from "react";
import { cn } from "@/lib/utils";

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-teal-500/10",
        className
      )}
      {...props}
    />
  );
}
