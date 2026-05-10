import Link from "next/link";
import { StudentForm } from "@/components/forms/student-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { buildRoomAllocationOptions } from "@/lib/rooms";

export default async function NewStudentPage() {
  await requireUser();

  const rooms = await prisma.room.findMany({
    orderBy: [{ priority: "asc" }, { name: "asc" }]
  });

  const roomOptions = buildRoomAllocationOptions(rooms);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/students" className="text-sm font-semibold text-[var(--primary)]">← Back to students</Link>
      <Card>
        <CardHeader>
          <CardTitle>Register Student</CardTitle>
          <CardDescription>Enter student details and select the currently open priority room.</CardDescription>
        </CardHeader>
        <CardContent>
          {roomOptions.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              No rooms are available. Super Admin must create rooms before student registration.
            </div>
          ) : (
            <StudentForm mode="create" rooms={roomOptions} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
