import Link from "next/link";
import { RoomForm } from "@/components/forms/room-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";

export default async function NewRoomPage() {
  await requireRole("SUPER_ADMIN");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/rooms" className="text-sm font-semibold text-[var(--primary)]">← Back to rooms</Link>
      <Card>
        <CardHeader>
          <CardTitle>Add Room</CardTitle>
          <CardDescription>Enter room name, highest capacity and priority number.</CardDescription>
        </CardHeader>
        <CardContent>
          <RoomForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
