import Link from "next/link";
import { Plus, SlidersHorizontal } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { buildRoomAllocationOptions, getRoomStatisticsMap, roomManualStatusLabel } from "@/lib/rooms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { DeleteButton } from "@/components/forms/delete-button";
import { deleteRoomAction } from "@/actions/rooms";

export default async function RoomsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireRole("SUPER_ADMIN");
  const params = await searchParams;

  const rooms = await prisma.room.findMany({
    orderBy: [{ priority: "asc" }, { name: "asc" }]
  });

  const statsMap = await getRoomStatisticsMap(rooms.map((room) => room.id));
  const roomOptions = buildRoomAllocationOptions(
    rooms.map((room) => ({ ...room, allocatedSeats: statsMap.get(room.id)?.totalRegisteredInRoom ?? room.allocatedSeats }))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Rooms</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Create rooms, set priority and monitor registered students by category.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <a href="/api/rooms/export" className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--border)] px-4 text-sm font-semibold hover:bg-[var(--muted)]">
            Export Summary CSV
          </a>
          <Link href="/rooms/control" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold hover:bg-[var(--muted)]">
            <SlidersHorizontal className="h-4 w-4" /> Open / Close Rooms
          </Link>
          <Link href="/rooms/new" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] hover:opacity-90">
            <Plus className="h-4 w-4" /> Add Room
          </Link>
        </div>
      </div>

      {params?.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {params.error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Room List</CardTitle>
          <CardDescription>Priority-wise room status, category count and available seats.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {roomOptions.length === 0 ? (
            <p className="p-5 text-sm text-[var(--muted-foreground)]">No rooms created yet.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Priority</TH>
                  <TH>Room</TH>
                  <TH>Capacity</TH>
                  <TH>Registered</TH>
                  <TH>Higher Secondary</TH>
                  <TH>Junior</TH>
                  <TH>Half Limit</TH>
                  <TH>Available</TH>
                  <TH>Status</TH>
                  <TH>Manual Control</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {roomOptions.map((room) => {
                  const stats = statsMap.get(room.id);
                  return (
                    <TR key={room.id}>
                      <TD className="font-semibold">{room.priority}</TD>
                      <TD className="font-semibold">{room.name}</TD>
                      <TD>{room.capacity}</TD>
                      <TD>{stats?.totalRegisteredInRoom ?? 0}</TD>
                      <TD>{stats?.higherSecondaryCount ?? 0}</TD>
                      <TD>{stats?.juniorCount ?? 0}</TD>
                      <TD>{stats?.halfCapacity ?? Math.floor(room.capacity / 2)}</TD>
                      <TD><Badge>{room.availableSeats}</Badge></TD>
                      <TD><Badge>{room.statusLabel}</Badge></TD>
                      <TD>{roomManualStatusLabel(room)}</TD>
                      <TD>
                        <div className="flex justify-end gap-2">
                          <Link href={`/rooms/${room.id}/edit`} className="inline-flex h-9 items-center rounded-xl border border-[var(--border)] px-3 text-sm font-semibold hover:bg-[var(--muted)]">
                            Edit
                          </Link>
                          <DeleteButton
                            id={room.id}
                            action={deleteRoomAction}
                            message="Delete this room? You can only delete rooms with no registered students."
                          />
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
