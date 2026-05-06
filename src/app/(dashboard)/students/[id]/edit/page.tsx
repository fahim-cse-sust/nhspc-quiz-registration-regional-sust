import Link from "next/link";
import { notFound } from "next/navigation";
import { StudentForm } from "@/components/forms/student-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const [student, rooms] = await Promise.all([
    prisma.student.findUnique({ where: { id } }),
    prisma.room.findMany({
      orderBy: { name: "asc" }
    })
  ]);

  if (!student) notFound();

  const roomOptions = rooms.map((room) => {
    const allocated = room.allocatedSeats;
    const extraSeatForCurrentRoom = room.id === student.roomId ? 1 : 0;
    return {
      id: room.id,
      name: room.name,
      capacity: room.capacity,
      allocatedSeats: allocated,
      availableSeats: Math.max(room.capacity - allocated + extraSeatForCurrentRoom, 0)
    };
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/students" className="text-sm font-semibold text-[var(--primary)]">← Back to students</Link>
      <Card>
        <CardHeader>
          <CardTitle>Edit Student</CardTitle>
          <CardDescription>Update student information or change allocated room if seats are available.</CardDescription>
        </CardHeader>
        <CardContent>
          <StudentForm mode="edit" rooms={roomOptions} student={student} />
        </CardContent>
      </Card>
    </div>
  );
}
