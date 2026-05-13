import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { buildRoomAllocationOptions, getRoomStatisticsMap, roomManualStatusLabel } from "@/lib/rooms";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const rooms = await prisma.room.findMany({
    orderBy: [{ priority: "asc" }, { name: "asc" }]
  });

  const statsMap = await getRoomStatisticsMap(rooms.map((room) => room.id));
  const roomOptions = buildRoomAllocationOptions(
    rooms.map((room) => ({ ...room, allocatedSeats: statsMap.get(room.id)?.totalRegisteredInRoom ?? room.allocatedSeats }))
  );

  const rows = [
    [
      "Priority",
      "Room Name",
      "Capacity",
      "Registered Students",
      "Higher Secondary Count",
      "Junior Count",
      "Half Capacity",
      "Available Seats",
      "Current Status",
      "Manual Status"
    ],
    ...roomOptions.map((room) => {
      const stats = statsMap.get(room.id);
      return [
        room.priority,
        room.name,
        room.capacity,
        stats?.totalRegisteredInRoom ?? 0,
        stats?.higherSecondaryCount ?? 0,
        stats?.juniorCount ?? 0,
        stats?.halfCapacity ?? Math.floor(room.capacity / 2),
        room.availableSeats,
        room.statusLabel,
        roomManualStatusLabel(room)
      ];
    })
  ];

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=nhspc-room-summary.csv"
    }
  });
}
