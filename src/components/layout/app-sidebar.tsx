import Link from "next/link";
import { BookOpenCheck, DoorOpen, LayoutDashboard, SlidersHorizontal, Trophy, Upload, UserPlus, Users } from "lucide-react";
import type { Role } from "@prisma/client";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppSidebar({ user }: { user: { name: string; email: string; role: Role } }) {
  return (
    <aside className="no-print hidden min-h-screen w-72 shrink-0 border-r border-[var(--border)] bg-[var(--card)]/95 p-5 shadow-sm backdrop-blur lg:block">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-600 text-lg font-black text-white">
          N
        </div>
        <div>
          <h1 className="font-black leading-tight">NHSPC Quiz</h1>
          <p className="text-xs text-[var(--muted-foreground)]">BCC Regional, Sylhet</p>
        </div>
      </div>

      <nav className="mt-8 space-y-2">
        <SidebarLink href="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" />
        <SidebarLink href="/students" icon={<Users className="h-4 w-4" />} label="Students" />
        <SidebarLink href="/students/new" icon={<UserPlus className="h-4 w-4" />} label="Register Student" />
        <SidebarLink href="/quiz" icon={<Trophy className="h-4 w-4" />} label="Quiz Marks" />
        {user.role === "SUPER_ADMIN" ? (
          <>
            <SidebarLink href="/students/import" icon={<Upload className="h-4 w-4" />} label="Import Students" />
            <SidebarLink href="/rooms" icon={<DoorOpen className="h-4 w-4" />} label="Rooms" />
            <SidebarLink href="/rooms/control" icon={<SlidersHorizontal className="h-4 w-4" />} label="Room Control" />
          </>
        ) : null}
      </nav>

      <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
        <div className="flex items-center gap-2">
          <BookOpenCheck className="h-4 w-4 text-[var(--primary)]" />
          <Badge>{user.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}</Badge>
        </div>
        <p className="mt-3 font-semibold">{user.name}</p>
        <p className="break-all text-xs text-[var(--muted-foreground)]">{user.email}</p>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <ThemeToggle />
        <form action={logoutAction} className="flex-1">
          <Button variant="outline" className="w-full" type="submit">
            Log out
          </Button>
        </form>
      </div>
    </aside>
  );
}

function SidebarLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--muted-foreground)] transition hover:-translate-y-0.5 hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
    >
      {icon}
      {label}
    </Link>
  );
}
