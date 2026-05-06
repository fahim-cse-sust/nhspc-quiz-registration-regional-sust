import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
};

const variants = {
  primary: "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90",
  secondary: "bg-slate-900 text-white hover:opacity-90 dark:bg-slate-100 dark:text-slate-950",
  outline: "border border-[var(--border)] bg-transparent hover:bg-[var(--muted)]",
  danger: "bg-[var(--danger)] text-white hover:opacity-90",
  ghost: "bg-transparent hover:bg-[var(--muted)]"
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
