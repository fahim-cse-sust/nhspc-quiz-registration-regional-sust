import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getQuizConfig, ordinalRank } from "@/lib/quiz";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const [quizConfig, students] = await Promise.all([
    getQuizConfig(),
    prisma.student.findMany({
      where: { isRegistered: true, quizMark: { not: null } },
      take: 40,
      orderBy: [{ quizMark: "desc" }, { mobile: "asc" }],
      include: { room: true, registeredBy: { select: { name: true, email: true } } }
    })
  ]);

  const rows = students.map((student, index) => ({
    Rank: ordinalRank(index + 1),
    "Rank Number": index + 1,
    "Quiz Mark": student.quizMark ?? "",
    "Total Mark": quizConfig.totalMarks,
    Mobile: student.mobile,
    "Name (EN)": student.nameEn || "",
    "Serial Number": student.serialNumber || "",
    Email: student.email || "",
    Contest: student.contest,
    Category: student.category,
    "Venue Name": student.venue,
    "Institute Name(EN)": student.instituteNameEn,
    Upazila: student.upazila || "",
    District: student.district || "",
    Division: student.division || "",
    "Registration Status": student.isRegistered ? "Registered" : "Pending",
    Room: student.room?.name ?? "",
    "Registered By": student.registeredBy ? `${student.registeredBy.name} (${student.registeredBy.email})` : "",
    "Registered At": student.registeredAt ? student.registeredAt.toISOString() : "",
    "Quiz Mark Updated At": student.quizMarkUpdatedAt ? student.quizMarkUpdatedAt.toISOString() : "",
    "Quiz Mark Updated By": student.quizMarkUpdatedBy || "",
    Note: student.note || "",
    "Student ID": student.id,
    "Room ID": student.roomId || "",
    "Registered By ID": student.registeredById || "",
    "Created At": student.createdAt.toISOString(),
    "Updated At": student.updatedAt.toISOString(),
    "Legacy Name": student.name || "",
    "Legacy Institution": student.institution || "",
    "Legacy Class Name": student.className || "",
    "Birth Certificate Number": student.birthCertificateNumber || "",
    "Legacy Phone": student.phone || ""
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
    { wch: 26 },
    { wch: 18 },
    { wch: 28 },
    { wch: 18 },
    { wch: 22 },
    { wch: 18 },
    { wch: 18 },
    { wch: 32 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 28 },
    { wch: 24 },
    { wch: 24 },
    { wch: 24 },
    { wch: 30 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Top 40 Winners");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const body = new Uint8Array(buffer);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="nhspc-top-40-winners.xlsx"'
    }
  });
}
