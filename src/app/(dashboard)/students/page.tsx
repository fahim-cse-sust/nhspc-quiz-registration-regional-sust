import Link from "next/link";
import { Plus } from "lucide-react";
import { Prisma } from "@prisma/client";
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
import { formatDate } from "@/lib/utils";

type StudentsPageSearchParams = {
  q?: string;
  room?: string;
};

export default async function StudentsPage({ searchParams }: { searchParams: Promise<StudentsPageSearchParams> }) {
  await requireUser();
  const params = await searchParams;
  const q = params?.q?.trim() || "";
  const room = params?.room || "";

  const where: Prisma.StudentWhereInput = {
    ...(room ? { roomId: room } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { institution: { contains: q, mode: "insensitive" } },
            { birthCertificateNumber: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { room: { name: { contains: q, mode: "insensitive" } } }
          ]
        }
      : {})
  };

  const [students, rooms] = await Promise.all([
    prisma.student.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { room: true, registeredBy: { select: { name: true } } }
    }),
    prisma.room.findMany({ orderBy: { name: "asc" } })
  ]);

  const csvUrl = `/api/students/export${room ? `?roomId=${room}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Students</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Search, filter, edit, delete and export registered students.</p>
        </div>
        <div className="no-print flex flex-col gap-2 sm:flex-row">
          <PrintButton />
          <a href={csvUrl} className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--border)] px-4 text-sm font-semibold hover:bg-[var(--muted)]">
            Export CSV
          </a>
          <Link href="/students/new" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] hover:opacity-90">
            <Plus className="h-4 w-4" /> Register Student
          </Link>
        </div>
      </div>

      <Card className="no-print">
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[1fr_240px_auto]">
            <Input name="q" defaultValue={q} placeholder="Search name, birth certificate, phone, email, room or institution" />
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

      <Card>
        <CardHeader>
          <CardTitle>Registered Student List</CardTitle>
          <CardDescription>{students.length} student(s) found.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {students.length === 0 ? (
            <p className="p-5 text-sm text-[var(--muted-foreground)]">No student registration found.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Institution</TH>
                  <TH>Class</TH>
                  <TH>Birth Cert.</TH>
                  <TH>Phone</TH>
                  <TH>Room</TH>
                  <TH>Registered</TH>
                  <TH className="no-print text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {students.map((student) => (
                  <TR key={student.id}>
                    <TD className="font-semibold">{student.name}</TD>
                    <TD>{student.institution}</TD>
                    <TD>{student.className}</TD>
                    <TD>{student.birthCertificateNumber}</TD>
                    <TD>{student.phone}</TD>
                    <TD><Badge>{student.room.name}</Badge></TD>
                    <TD>{formatDate(student.createdAt)}</TD>
                    <TD className="no-print">
                      <div className="flex justify-end gap-2">
                        <Link href={`/students/${student.id}/edit`} className="inline-flex h-9 items-center rounded-xl border border-[var(--border)] px-3 text-sm font-semibold hover:bg-[var(--muted)]">
                          Edit
                        </Link>
                        <DeleteButton id={student.id} action={deleteStudentAction} message="Delete this student registration?" />
                      </div>
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
