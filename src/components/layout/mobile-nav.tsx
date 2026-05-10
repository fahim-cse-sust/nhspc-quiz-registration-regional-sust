"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { useState } from "react";
import type { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function MobileNav({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="no-print border-b border-[var(--border)] bg-[var(--card)] p-4 lg:hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-600 font-black text-white">
            N
          </div>
          <div>
            <p className="font-black">NHSPC Quiz</p>
            <p className="text-xs text-[var(--muted-foreground)]">BCC Regional, Sylhet</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ThemeToggle />
          <Button variant="outline" className="h-10 w-10 px-0" onClick={() => setOpen((value) => !value)}>
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {open ? (
        <nav className="mt-4 grid gap-2">
          <Link className="rounded-xl bg-[var(--muted)] px-3 py-2 text-sm font-semibold" href="/dashboard">
            Dashboard
          </Link>
          <Link className="rounded-xl bg-[var(--muted)] px-3 py-2 text-sm font-semibold" href="/students">
            Students
          </Link>
          <Link className="rounded-xl bg-[var(--muted)] px-3 py-2 text-sm font-semibold" href="/quiz">
            Quiz Marks
          </Link>
          {role === "SUPER_ADMIN" ? (
            <>
              <Link className="rounded-xl bg-[var(--muted)] px-3 py-2 text-sm font-semibold" href="/rooms">
                Rooms
              </Link>
              <Link className="rounded-xl bg-[var(--muted)] px-3 py-2 text-sm font-semibold" href="/rooms/control">
                Room Control
              </Link>
            </>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
