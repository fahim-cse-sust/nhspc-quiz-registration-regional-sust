import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const roomId = request.nextUrl.searchParams.get("roomId") || undefined;

  const students = await prisma.student.findMany({
    where: roomId ? { roomId } : undefined,
    orderBy: [{ room: { name: "asc" } }, { name: "asc" }],
    include: { room: true, registeredBy: { select: { name: true, email: true } } }
  });

  const rows = [
    ["Student Name", "Institution", "Class", "Birth Certificate Number", "Email", "Phone", "Room", "Quiz Mark", "Registered By", "Registered At", "Note"],
    ...students.map((student) => [
      student.name,
      student.institution,
      student.className,
      student.birthCertificateNumber,
      student.email,
      student.phone,
      student.room.name,
      student.quizMark ?? "",
      `${student.registeredBy.name} (${student.registeredBy.email})`,
      student.createdAt.toISOString(),
      student.note || ""
    ])
  ];

  const csv = toCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nhspc-students${roomId ? `-${roomId}` : ""}.csv"`
    }
  });
}
