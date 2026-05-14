import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { DeleteButton } from "@/components/forms/delete-button";
import { deleteStudentAction } from "@/actions/students";
import { PrintButton } from "@/components/print-button";

type StudentsPageSearchParams = {
  q?: string;
  room?: string;
  category?: string;
  status?: string;
};

function buildExportUrl(params: { q: string; room: string; category: string; status: string }) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.room) search.set("roomId", params.room);
  if (params.category) search.set("category", params.category);
  if (params.status) search.set("status", params.status);
  const query = search.toString();
  return `/api/students/export${query ? `?${query}` : ""}`;
}

export default async function StudentsPage({ searchParams }: { searchParams: Promise<StudentsPageSearchParams> }) {
  const user = await requireUser();
  const params = await searchParams;
  const q = params?.q?.trim() || "";
  const room = params?.room || "";
  const category = params?.category?.trim() || "";
  const status = params?.status || "";

  const where: Prisma.StudentWhereInput = {
    ...(room ? { roomId: room } : {}),
    ...(category ? { category: { equals: category, mode: "insensitive" } } : {}),
    ...(status === "registered" ? { isRegistered: true } : {}),
    ...(status === "pending" ? { isRegistered: false } : {}),
    ...(q
      ? {
          OR: [
            { mobile: { contains: q, mode: "insensitive" } },
            { nameEn: { contains: q, mode: "insensitive" } },
            { serialNumber: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { contest: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
            { venue: { contains: q, mode: "insensitive" } },
            { instituteNameEn: { contains: q, mode: "insensitive" } },
            { upazila: { contains: q, mode: "insensitive" } },
            { district: { contains: q, mode: "insensitive" } },
            { division: { contains: q, mode: "insensitive" } },
            { room: { name: { contains: q, mode: "insensitive" } } },
            { registeredBy: { name: { contains: q, mode: "insensitive" } } }
          ]
        }
      : {})
  };

  const [students, rooms, categories, uploadedCount, registeredCount, pendingCount] = await Promise.all([
    prisma.student.findMany({
      where,
      orderBy: [{ isRegistered: "asc" }, { updatedAt: "desc" }],
      include: { room: true, registeredBy: { select: { name: true, email: true } } }
    }),
    prisma.room.findMany({ orderBy: [{ priority: "asc" }, { name: "asc" }] }),
    prisma.student.findMany({ distinct: ["category"], select: { category: true }, orderBy: { category: "asc" } }),
    prisma.student.count(),
    prisma.student.count({ where: { isRegistered: true } }),
    prisma.student.count({ where: { isRegistered: false } })
  ]);

  const csvUrl = buildExportUrl({ q, room, category, status });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Students</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Compact list for quick search. Open Register or Edit to view complete student information.
          </p>
        </div>
        <div className="no-print flex flex-col gap-2 sm:flex-row">
          <PrintButton />
          <a href={csvUrl} className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--border)] px-4 text-sm font-semibold hover:bg-[var(--muted)]">
            Export CSV
          </a>
          {user.role === Role.SUPER_ADMIN ? (
            <Link href="/students/import" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold hover:bg-[var(--muted)]">
              <Upload className="h-4 w-4" /> Import Students
            </Link>
          ) : null}
          <Link href="/students/new" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] hover:opacity-90">
            <Plus className="h-4 w-4" /> Register Student
          </Link>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <StatusCard label="Uploaded students" value={uploadedCount} />
        <StatusCard label="Registered students" value={registeredCount} />
        <StatusCard label="Pending students" value={pendingCount} />
      </section>

      <Card className="no-print">
        <CardContent>
          <form className="grid gap-3 lg:grid-cols-[1fr_220px_220px_190px_auto]">
            <Input name="q" defaultValue={q} placeholder="Search mobile, serial number, or name, e.g. FAHim" />
            <Select name="category" defaultValue={category}>
              <option value="">All categories</option>
              {categories.map((item) => (
                <option key={item.category} value={item.category}>{item.category}</option>
              ))}
            </Select>
            <Select name="room" defaultValue={room}>
              <option value="">All rooms</option>
              {rooms.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </Select>
            <Select name="status" defaultValue={status}>
              <option value="">All statuses</option>
              <option value="registered">Registered</option>
              <option value="pending">Pending</option>
            </Select>
            <Button type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Student List</CardTitle>
          <CardDescription>
            {students.length} student(s) found. Showing only name, serial number, institute, mobile, category and actions to keep the table readable.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {students.length === 0 ? (
            <p className="p-5 text-sm text-[var(--muted-foreground)]">No student record found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[1080px]">
                <THead>
                  <TR>
                    <TH className="w-[18%]">Name (EN)</TH>
                    <TH className="w-[14%]">Serial Number</TH>
                    <TH className="w-[27%]">Institute</TH>
                    <TH className="w-[13%]">Mobile</TH>
                    <TH className="w-[14%]">Category</TH>
                    <TH className="no-print w-[14%] min-w-[220px] text-right">Actions</TH>
                  </TR>
                </THead>
                <TBody>
                  {students.map((student) => (
                    <TR key={student.id}>
                      <TD className="break-words font-semibold">{student.nameEn || <span className="text-sm text-[var(--muted-foreground)]">—</span>}</TD>
                      <TD className="break-words font-semibold">{student.serialNumber || <span className="text-sm text-[var(--muted-foreground)]">—</span>}</TD>
                      <TD className="break-words">{student.instituteNameEn}</TD>
                      <TD className="break-words font-semibold">{student.mobile}</TD>
                      <TD className="align-top">
                        <div className="flex max-w-[170px] flex-col items-start gap-1">
                          <span className="break-words leading-5">{student.category}</span>
                          <Badge className={student.isRegistered ? "max-w-full border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200" : "max-w-full border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"}>
                            {student.isRegistered ? "Registered" : "Pending"}
                          </Badge>
                          {student.room ? <Badge className="max-w-full whitespace-normal text-left leading-4">{student.room.name}</Badge> : null}
                        </div>
                      </TD>
                      <TD className="no-print align-top">
                        <div className="flex min-w-[210px] flex-wrap justify-end gap-2">
                          {!student.isRegistered ? (
                            <Link href={`/students/new?studentId=${student.id}`} className="inline-flex h-9 items-center whitespace-nowrap rounded-xl border border-[var(--border)] px-3 text-sm font-semibold hover:bg-[var(--muted)]">
                              Register
                            </Link>
                          ) : (
                            <Link href={`/students/new?studentId=${student.id}`} className="inline-flex h-9 items-center whitespace-nowrap rounded-xl border border-[var(--border)] px-3 text-sm font-semibold hover:bg-[var(--muted)]">
                              View
                            </Link>
                          )}
                          <Link href={`/students/${student.id}/edit`} className="inline-flex h-9 items-center whitespace-nowrap rounded-xl border border-[var(--border)] px-3 text-sm font-semibold hover:bg-[var(--muted)]">
                            Edit
                          </Link>
                          <DeleteButton id={student.id} action={deleteStudentAction} message="Delete this student record?" />
                        </div>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
        <p className="mt-2 text-3xl font-black text-[var(--primary)]">{value}</p>
      </CardContent>
    </Card>
  );
}
