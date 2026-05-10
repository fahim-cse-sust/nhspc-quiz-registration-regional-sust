import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { buildRoomAllocationOptions, roomManualStatusLabel } from "@/lib/rooms";
import { updateRoomManualStatusAction } from "@/actions/rooms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export default async function RoomControlPage() {
  await requireRole("SUPER_ADMIN");

  const rooms = await prisma.room.findMany({
    orderBy: [{ priority: "asc" }, { name: "asc" }]
  });

  const roomOptions = buildRoomAllocationOptions(rooms);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Room Open / Close Control</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Super Admin can force any room open or closed regardless of the automatic priority rule.
          </p>
        </div>
        <Link href="/rooms" className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--border)] px-4 text-sm font-semibold hover:bg-[var(--muted)]">
          ← Back to Rooms
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manual Room Status</CardTitle>
          <CardDescription>
            Automatic means normal priority rule. Open manually makes the room selectable now. Closed manually makes it unselectable now.
          </CardDescription>
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
                  <TH>Seats</TH>
                  <TH>Current Status</TH>
                  <TH>Manual Status</TH>
                  <TH className="text-right">Control</TH>
                </TR>
              </THead>
              <TBody>
                {roomOptions.map((room) => (
                  <TR key={room.id}>
                    <TD className="font-semibold">{room.priority}</TD>
                    <TD className="font-semibold">{room.name}</TD>
                    <TD>{room.allocatedSeats}/{room.capacity} allocated, {room.availableSeats} available</TD>
                    <TD><Badge>{room.statusLabel}</Badge></TD>
                    <TD>{roomManualStatusLabel(room)}</TD>
                    <TD>
                      <div className="flex flex-wrap justify-end gap-2">
                        <RoomStatusButton id={room.id} status="auto" label="Automatic" disabled={!room.isManuallyOpen && !room.isManuallyClosed} />
                        <RoomStatusButton id={room.id} status="open" label="Open" disabled={room.isManuallyOpen} />
                        <RoomStatusButton id={room.id} status="closed" label="Close" disabled={room.isManuallyClosed} danger />
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

function RoomStatusButton({
  id,
  status,
  label,
  disabled,
  danger = false
}: {
  id: string;
  status: "auto" | "open" | "closed";
  label: string;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <form action={updateRoomManualStatusAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" variant={danger ? "danger" : "outline"} disabled={disabled} className="h-9 px-3">
        {label}
      </Button>
    </form>
  );
}
