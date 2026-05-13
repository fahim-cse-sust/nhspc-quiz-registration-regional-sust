import Link from "next/link";
import { notFound } from "next/navigation";
import { UploadedStudentForm } from "@/components/forms/uploaded-student-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const student = await prisma.student.findUnique({ where: { id }, include: { room: true, registeredBy: { select: { name: true } } } });
  if (!student) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/students" className="text-sm font-semibold text-[var(--primary)]">← Back to students</Link>
      <Card>
        <CardHeader>
          <CardTitle>Edit Uploaded Student</CardTitle>
          <CardDescription>Update uploaded student data. Registration details are preserved.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-2 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
            <Badge>{student.isRegistered ? "Registered" : "Pending"}</Badge>
            {student.room ? <Badge>Room: {student.room.name}</Badge> : null}
            {student.registeredBy ? <Badge>By: {student.registeredBy.name}</Badge> : null}
          </div>
          <UploadedStudentForm student={student} />
        </CardContent>
      </Card>
    </div>
  );
}
