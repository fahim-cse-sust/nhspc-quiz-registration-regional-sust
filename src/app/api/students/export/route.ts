import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const roomId = request.nextUrl.searchParams.get("roomId") || "";
  const category = request.nextUrl.searchParams.get("category") || "";
  const status = request.nextUrl.searchParams.get("status") || "";
  const q = request.nextUrl.searchParams.get("q")?.trim() || "";

  const where: Prisma.StudentWhereInput = {
    ...(roomId ? { roomId } : {}),
    ...(category ? { category: { equals: category, mode: "insensitive" } } : {}),
    ...(status === "registered" ? { isRegistered: true } : {}),
    ...(status === "pending" ? { isRegistered: false } : {}),
    ...(q
      ? {
          OR: [
            { mobile: { contains: q, mode: "insensitive" } },
            { nameEn: { contains: q, mode: "insensitive" } },
            { serialNumber: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { contest: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
            { venue: { contains: q, mode: "insensitive" } },
            { instituteNameEn: { contains: q, mode: "insensitive" } },
            { upazila: { contains: q, mode: "insensitive" } },
            { district: { contains: q, mode: "insensitive" } },
            { division: { contains: q, mode: "insensitive" } },
            { room: { name: { contains: q, mode: "insensitive" } } },
            { registeredBy: { name: { contains: q, mode: "insensitive" } } }
          ]
        }
      : {})
  };

  const students = await prisma.student.findMany({
    where,
    orderBy: [{ isRegistered: "asc" }, { updatedAt: "desc" }],
    include: { room: true, registeredBy: { select: { name: true, email: true } } }
  });

  const rows = [
    [
      "Mobile",
      "Name (EN)",
      "Serial Number",
      "Email",
      "Contest",
      "Category",
      "Venue Name",
      "Institute Name(EN)",
      "Upazila",
      "District",
      "Division",
      "Registration Status",
      "Room",
      "Registered By",
      "Registered At",
      "Quiz Mark",
      "Note"
    ],
    ...students.map((student) => [
      student.mobile,
      student.nameEn || "",
      student.serialNumber || "",
      student.email || "",
      student.contest,
      student.category,
      student.venue,
      student.instituteNameEn,
      student.upazila || "",
      student.district || "",
      student.division || "",
      student.isRegistered ? "Registered" : "Pending",
      student.room?.name ?? "",
      student.registeredBy ? `${student.registeredBy.name} (${student.registeredBy.email})` : "",
      student.registeredAt ? student.registeredAt.toISOString() : "",
      student.quizMark ?? "",
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
