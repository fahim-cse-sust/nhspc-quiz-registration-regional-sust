import Link from "next/link";
import { CheckCircle2, DoorOpen, Plus, Trophy, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getQuizConfig, ordinalRank } from "@/lib/quiz";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  await requireUser();

  const [studentCount, roomCount, rooms, recentStudents, markedStudents, rankList, quizConfig] = await Promise.all([
    prisma.student.count(),
    prisma.room.count(),
    prisma.room.findMany({ orderBy: [{ priority: "asc" }, { name: "asc" }] }),
    prisma.student.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { room: true, registeredBy: { select: { name: true } } }
    }),
    prisma.student.count({ where: { quizMark: { not: null } } }),
    prisma.student.findMany({
      where: { quizMark: { not: null } },
      take: 5,
      orderBy: [{ quizMark: "desc" }, { name: "asc" }],
      include: { room: true }
    }),
    getQuizConfig()
  ]);

  const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);
  const allocatedSeats = rooms.reduce((sum, room) => sum + room.allocatedSeats, 0);
  const availableSeats = Math.max(totalCapacity - allocatedSeats, 0);

  return (
    <div className="space-y-6">
      <div className="animate-fade-up flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Dashboard</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Overview of NHSPC quiz registration, room allocation and result entry.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/quiz" className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold hover:bg-[var(--muted)] sm:w-auto">
            <Trophy className="h-4 w-4" /> Quiz Marks
          </Link>
          <Link href="/students/new" className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] hover:opacity-90 sm:w-auto">
            <Plus className="h-4 w-4" /> Register Student
          </Link>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Registered Students" value={studentCount} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Total Rooms" value={roomCount} icon={<DoorOpen className="h-5 w-5" />} />
        <StatCard title="Available Seats" value={availableSeats} icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard title="Marked Scripts" value={markedStudents} icon={<Trophy className="h-5 w-5" />} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="animate-fade-up animation-delay-100 card-hover">
          <CardHeader>
            <CardTitle>Recent Registrations</CardTitle>
            <CardDescription>Latest students registered by admins.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {recentStudents.length === 0 ? (
              <p className="p-5 text-sm text-[var(--muted-foreground)]">No students registered yet.</p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Name</TH>
                    <TH>Institution</TH>
                    <TH>Room</TH>
                    <TH>Registered</TH>
                  </TR>
                </THead>
                <TBody>
                  {recentStudents.map((student) => (
                    <TR key={student.id}>
                      <TD className="font-semibold">{student.name}</TD>
                      <TD>{student.institution}</TD>
                      <TD><Badge>{student.room.name}</Badge></TD>
                      <TD>{formatDate(student.createdAt)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="animate-fade-up animation-delay-200 card-hover">
          <CardHeader>
            <CardTitle>Live Top Rank Preview</CardTitle>
            <CardDescription>Top 5 scores from the quiz mark entry page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {rankList.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No quiz marks entered yet.</p>
            ) : (
              rankList.map((student, index) => (
                <div key={student.id} className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/50 p-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-[var(--primary)]">{ordinalRank(index + 1)} Place</p>
                    <p className="font-bold">{student.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{student.room.name}</p>
                  </div>
                  <p className="text-xl font-black text-[var(--primary)]">{student.quizMark}/{quizConfig.totalMarks}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="animate-fade-up animation-delay-300 card-hover">
        <CardHeader>
          <CardTitle>Room Summary</CardTitle>
          <CardDescription>Allocated and available seats.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rooms.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No rooms created yet.</p>
          ) : (
            rooms.map((room) => {
              const used = room.allocatedSeats;
              const available = room.capacity - used;
              return (
                <div key={room.id} className="rounded-2xl border border-[var(--border)] p-4 transition hover:-translate-y-0.5 hover:bg-[var(--muted)]/50">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold">{room.name}</p>
                    <Badge>P{room.priority} · {available} available</Badge>
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    Priority {room.priority} · {used} allocated out of {room.capacity}
                  </p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <Card className="animate-fade-up card-hover">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-[var(--muted-foreground)]">{title}</p>
          <p className="mt-2 text-3xl font-black">{value}</p>
        </div>
        <div className="rounded-2xl bg-teal-500/10 p-3 text-[var(--primary)]">{icon}</div>
      </CardContent>
    </Card>
  );
}
