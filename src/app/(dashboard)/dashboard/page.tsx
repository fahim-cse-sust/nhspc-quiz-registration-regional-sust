import Link from "next/link";
import { CheckCircle2, DoorOpen, Plus, Trophy, Upload, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getQuizConfig, ordinalRank } from "@/lib/quiz";
import { getRoomStatisticsMap } from "@/lib/rooms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireUser();

  const [uploadedCount, registeredCount, pendingCount, roomCount, rooms, recentStudents, markedStudents, rankList, quizConfig] = await Promise.all([
    prisma.student.count(),
    prisma.student.count({ where: { isRegistered: true } }),
    prisma.student.count({ where: { isRegistered: false } }),
    prisma.room.count(),
    prisma.room.findMany({ orderBy: [{ priority: "asc" }, { name: "asc" }] }),
    prisma.student.findMany({
      where: { isRegistered: true },
      take: 6,
      orderBy: { registeredAt: "desc" },
      include: { room: true, registeredBy: { select: { name: true } } }
    }),
    prisma.student.count({ where: { isRegistered: true, quizMark: { not: null } } }),
    prisma.student.findMany({
      where: { isRegistered: true, quizMark: { not: null } },
      take: 5,
      orderBy: [{ quizMark: "desc" }, { mobile: "asc" }],
      include: { room: true }
    }),
    getQuizConfig()
  ]);

  const statsMap = await getRoomStatisticsMap(rooms.map((room) => room.id));
  const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);
  const availableSeats = Math.max(totalCapacity - registeredCount, 0);

  return (
    <div className="space-y-6">
      <div className="animate-fade-up flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Dashboard</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Overview of uploaded students, room allocation and result entry.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {user.role === "SUPER_ADMIN" ? (
            <Link href="/students/import" className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold hover:bg-[var(--muted)] sm:w-auto">
              <Upload className="h-4 w-4" /> Import Students
            </Link>
          ) : null}
          <Link href="/quiz" className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold hover:bg-[var(--muted)] sm:w-auto">
            <Trophy className="h-4 w-4" /> Quiz Marks
          </Link>
          <Link href="/students/new" className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] hover:opacity-90 sm:w-auto">
            <Plus className="h-4 w-4" /> Register Student
          </Link>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Uploaded Students" value={uploadedCount} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Registered Students" value={registeredCount} icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard title="Pending Students" value={pendingCount} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Total Rooms" value={roomCount} icon={<DoorOpen className="h-5 w-5" />} />
        <StatCard title="Available Seats" value={availableSeats} icon={<CheckCircle2 className="h-5 w-5" />} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="animate-fade-up animation-delay-100 card-hover">
          <CardHeader>
            <CardTitle>Recent Registrations</CardTitle>
            <CardDescription>Latest students confirmed by admins.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {recentStudents.length === 0 ? (
              <p className="p-5 text-sm text-[var(--muted-foreground)]">No students registered yet.</p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Mobile</TH>
                    <TH>Institute Name (EN)</TH>
                    <TH>Category</TH>
                    <TH>Room</TH>
                    <TH>Registered</TH>
                  </TR>
                </THead>
                <TBody>
                  {recentStudents.map((student) => (
                    <TR key={student.id}>
                      <TD className="font-semibold">{student.mobile}</TD>
                      <TD>{student.nameEn || student.instituteNameEn}</TD>
                      <TD>{student.category}</TD>
                      <TD>{student.room ? <Badge>{student.room.name}</Badge> : "—"}</TD>
                      <TD>{student.registeredAt ? formatDate(student.registeredAt) : "—"}</TD>
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
            <CardDescription>Top 5 scores from registered students.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {rankList.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No quiz marks entered yet.</p>
            ) : (
              rankList.map((student, index) => (
                <div key={student.id} className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/50 p-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-[var(--primary)]">{ordinalRank(index + 1)} Place</p>
                    <p className="font-bold">{student.mobile}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{student.room?.name ?? "No room"}</p>
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
          <CardDescription>Registered students, category counts and available seats.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rooms.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No rooms created yet.</p>
          ) : (
            rooms.map((room) => {
              const stats = statsMap.get(room.id);
              const used = stats?.totalRegisteredInRoom ?? 0;
              const available = Math.max(room.capacity - used, 0);
              return (
                <div key={room.id} className="rounded-2xl border border-[var(--border)] p-4 transition hover:-translate-y-0.5 hover:bg-[var(--muted)]/50">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold">{room.name}</p>
                    <Badge>P{room.priority} · {available} available</Badge>
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    {used} registered out of {room.capacity}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge>Higher Secondary: {stats?.higherSecondaryCount ?? 0}</Badge>
                    <Badge>Junior: {stats?.juniorCount ?? 0}</Badge>
                    <Badge>Half limit: {stats?.halfCapacity ?? Math.floor(room.capacity / 2)}</Badge>
                  </div>
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
