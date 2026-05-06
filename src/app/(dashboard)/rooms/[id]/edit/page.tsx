import Link from "next/link";
import { notFound } from "next/navigation";
import { RoomForm } from "@/components/forms/room-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export default async function EditRoomPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("SUPER_ADMIN");
  const { id } = await params;
  const room = await prisma.room.findUnique({ where: { id } });
  if (!room) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/rooms" className="text-sm font-semibold text-[var(--primary)]">← Back to rooms</Link>
      <Card>
        <CardHeader>
          <CardTitle>Edit Room</CardTitle>
          <CardDescription>Update room name or capacity.</CardDescription>
        </CardHeader>
        <CardContent>
          <RoomForm mode="edit" room={room} />
        </CardContent>
      </Card>
    </div>
  );
}
