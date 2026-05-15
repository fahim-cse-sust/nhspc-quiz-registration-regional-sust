import Link from "next/link";
import { Award, Download, Medal, Search, Sparkles, Trophy } from "lucide-react";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildCategoryWiseRankList, getQuizConfig, ordinalRank } from "@/lib/quiz";
import { requireUser } from "@/lib/auth";
import { QuizMarkForm } from "@/components/forms/quiz-mark-form";
import { QuizTotalMarksForm } from "@/components/forms/quiz-total-marks-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

type QuizPageSearchParams = {
  q?: string;
  room?: string;
};

export default async function QuizPage({ searchParams }: { searchParams: Promise<QuizPageSearchParams> }) {
  const user = await requireUser();
  const params = await searchParams;
  const q = params?.q?.trim() || "";
  const room = params?.room || "";
  const quizConfig = await getQuizConfig();

  const where: Prisma.StudentWhereInput = {
    isRegistered: true,
    ...(room ? { roomId: room } : {}),
    ...(q
      ? {
          OR: [
            { mobile: { contains: q, mode: "insensitive" } },
            { nameEn: { contains: q, mode: "insensitive" } },
            { serialNumber: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { contest: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
            { instituteNameEn: { contains: q, mode: "insensitive" } },
            { venue: { contains: q, mode: "insensitive" } },
            { room: { name: { contains: q, mode: "insensitive" } } }
          ]
        }
      : {})
  };

  const [students, rooms, rankedCandidateStudents, markedCount, registeredCount] = await Promise.all([
    prisma.student.findMany({
      where,
      orderBy: [{ room: { name: "asc" } }, { serialNumber: "asc" }],
      include: { room: true }
    }),
    prisma.room.findMany({ orderBy: { name: "asc" } }),
    prisma.student.findMany({
      where: { isRegistered: true, quizMark: { not: null } },
      orderBy: [{ quizMark: "desc" }, { serialNumber: "asc" }],
      include: { room: true }
    }),
    prisma.student.count({ where: { isRegistered: true, quizMark: { not: null } } }),
    prisma.student.count({ where: { isRegistered: true } })
  ]);

  const rankList = buildCategoryWiseRankList(rankedCandidateStudents, 20);
  const highestMark = rankedCandidateStudents[0]?.quizMark ?? null;

  return (
    <div className="space-y-6">
      <section className="animate-fade-up overflow-hidden rounded-3xl border border-[var(--border)] bg-[linear-gradient(135deg,rgba(20,184,166,0.18),rgba(59,130,246,0.10),rgba(255,255,255,0.50))] p-5 shadow-sm dark:bg-[linear-gradient(135deg,rgba(20,184,166,0.14),rgba(59,130,246,0.12),rgba(15,23,42,0.80))] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)]/70 px-3 py-1 text-xs font-bold text-[var(--primary)] shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> SUST Regional Quiz Marking
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">Quiz Marks & Rank List</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted-foreground)]">
              Enter quiz marks for registered students, protect the maximum mark limit, and generate ranking automatically.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-96 sm:grid-cols-3">
            <HeroStat label="Total mark" value={quizConfig.totalMarks} />
            <HeroStat label="Marked" value={markedCount} />
            <HeroStat label="Highest" value={highestMark ?? "—"} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <Card className="animate-fade-up animation-delay-100 overflow-hidden">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-[var(--primary)]" /> Category-wise Top 40 Rank List</CardTitle>
              <CardDescription>Showing top 20 Junior and top 20 Senior / Higher Secondary students. Rank resets inside each category.</CardDescription>
            </div>
            <a
              href="/api/quiz/winners/export"
              className="no-print inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold hover:bg-[var(--muted)]"
            >
              <Download className="h-4 w-4" /> Export Winners Excel
            </a>
          </CardHeader>
          <CardContent className="max-h-[760px] overflow-y-auto p-0">
            {rankList.length === 0 ? (
              <p className="p-5 text-sm text-[var(--muted-foreground)]">No quiz marks added yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <THead>
                    <TR>
                      <TH>Rank</TH>
                      <TH>Category</TH>
                      <TH>Student</TH>
                      <TH>Room</TH>
                      <TH className="text-right">Mark</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {rankList.map(({ student, rank, categoryLabel }) => (
                      <TR key={student.id} className={rank <= 3 ? "bg-amber-50/50 dark:bg-amber-950/10" : undefined}>
                        <TD className="font-black">
                          <span className="inline-flex items-center gap-2">
                            {rank <= 3 ? <Medal className="h-4 w-4 text-amber-500" /> : <Award className="h-4 w-4 text-[var(--muted-foreground)]" />}
                            {ordinalRank(rank)}
                          </span>
                        </TD>
                        <TD><Badge>{categoryLabel}</Badge></TD>
                        <TD>
                          <p className="font-bold">{student.serialNumber}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">{student.nameEn || student.instituteNameEn}</p>
                        </TD>
                        <TD>{student.room ? <Badge>{student.room.name}</Badge> : "—"}</TD>
                        <TD className="text-right text-lg font-black text-[var(--primary)]">
                          {student.quizMark}/{quizConfig.totalMarks}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="animate-fade-up animation-delay-200">
          <CardHeader>
            <CardTitle>Total Mark Control</CardTitle>
            <CardDescription>
              {user.role === Role.SUPER_ADMIN
                ? "Only the super admin can change the total quiz mark. Existing marks above the new total will block the change."
                : "The total quiz mark is controlled by the super admin."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user.role === Role.SUPER_ADMIN ? (
              <QuizTotalMarksForm totalMarks={quizConfig.totalMarks} />
            ) : (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-5">
                <p className="text-sm text-[var(--muted-foreground)]">Current total quiz mark</p>
                <p className="mt-2 text-4xl font-black text-[var(--primary)]">{quizConfig.totalMarks}</p>
                {quizConfig.updatedByName ? (
                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">Last updated by {quizConfig.updatedByName}</p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="animate-fade-up animation-delay-300 no-print">
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[1fr_240px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <Input className="pl-9" name="q" defaultValue={q} placeholder="Search serial number or name, e.g. SN-001 or FAHim" />
            </div>
            <Select name="room" defaultValue={room}>
              <option value="">All rooms</option>
              {rooms.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </Select>
            <Button type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="animate-fade-up animation-delay-400 overflow-hidden">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Enter Quiz Marks</CardTitle>
            <CardDescription>
              {students.length} student(s) shown. Registered: {registeredCount}. Maximum allowed mark: {quizConfig.totalMarks}.
            </CardDescription>
          </div>
          <Link href="/students/new" className="no-print inline-flex h-10 items-center justify-center rounded-xl border border-[var(--border)] px-4 text-sm font-semibold hover:bg-[var(--muted)]">
            Register Student
          </Link>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {students.length === 0 ? (
            <p className="p-5 text-sm text-[var(--muted-foreground)]">No registered students found.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Student</TH>
                  <TH>Category</TH>
                  <TH>Contest</TH>
                  <TH>Room</TH>
                  <TH>Last Updated</TH>
                  <TH className="no-print text-right">Quiz Mark</TH>
                </TR>
              </THead>
              <TBody>
                {students.map((student) => (
                  <TR key={student.id}>
                    <TD>
                      <p className="font-bold">{student.serialNumber}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{student.nameEn || student.instituteNameEn}</p>
                    </TD>
                    <TD>{student.category}</TD>
                    <TD>{student.contest}</TD>
                    <TD>{student.room ? <Badge>{student.room.name}</Badge> : "—"}</TD>
                    <TD>
                      {student.quizMarkUpdatedAt ? (
                        <div>
                          <p>{formatDate(student.quizMarkUpdatedAt)}</p>
                          {student.quizMarkUpdatedBy ? <p className="text-xs text-[var(--muted-foreground)]">by {student.quizMarkUpdatedBy}</p> : null}
                        </div>
                      ) : (
                        <span className="text-sm text-[var(--muted-foreground)]">Not marked</span>
                      )}
                    </TD>
                    <TD className="no-print text-right">
                      <QuizMarkForm
                        studentId={student.id}
                        studentName={student.serialNumber}
                        quizMark={student.quizMark}
                        totalMarks={quizConfig.totalMarks}
                      />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-white/40 bg-[var(--card)]/75 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-2 text-2xl font-black text-[var(--primary)]">{value}</p>
    </div>
  );
}
