import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const rooms = await prisma.room.findMany({
    orderBy: { name: "asc" }
  });

  const rows = [
    ["Room Name", "Capacity", "Allocated Students", "Available Seats"],
    ...rooms.map((room) => [room.name, room.capacity, room.allocatedSeats, room.capacity - room.allocatedSeats])
  ];

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=nhspc-room-summary.csv"
    }
  });
}
