import Link from "next/link";
import { notFound } from "next/navigation";
import { StudentForm } from "@/components/forms/student-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { buildRoomAllocationOptions } from "@/lib/rooms";

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const [student, rooms] = await Promise.all([
    prisma.student.findUnique({ where: { id } }),
    prisma.room.findMany({
      orderBy: [{ priority: "asc" }, { name: "asc" }]
    })
  ]);

  if (!student) notFound();

  const roomOptions = buildRoomAllocationOptions(rooms, student.roomId);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/students" className="text-sm font-semibold text-[var(--primary)]">← Back to students</Link>
      <Card>
        <CardHeader>
          <CardTitle>Edit Student</CardTitle>
          <CardDescription>Update student information or change allocated room if the priority rule allows it.</CardDescription>
        </CardHeader>
        <CardContent>
          <StudentForm mode="edit" rooms={roomOptions} student={student} />
        </CardContent>
      </Card>
    </div>
  );
}
