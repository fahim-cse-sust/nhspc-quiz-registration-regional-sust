import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { buildRoomAllocationOptions, roomManualStatusLabel } from "@/lib/rooms";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const rooms = await prisma.room.findMany({
    orderBy: [{ priority: "asc" }, { name: "asc" }]
  });

  const roomOptions = buildRoomAllocationOptions(rooms);

  const rows = [
    ["Priority", "Room Name", "Capacity", "Allocated Students", "Available Seats", "Current Status", "Manual Status"],
    ...roomOptions.map((room) => [
      room.priority,
      room.name,
      room.capacity,
      room.allocatedSeats,
      room.availableSeats,
      room.statusLabel,
      roomManualStatusLabel(room)
    ])
  ];

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=nhspc-room-summary.csv"
    }
  });
}
