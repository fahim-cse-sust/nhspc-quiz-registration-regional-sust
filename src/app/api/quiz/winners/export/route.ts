import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { buildCategoryWiseRankList } from "@/lib/quiz";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const students = await prisma.student.findMany({
    where: { isRegistered: true, quizMark: { not: null } },
    orderBy: [{ quizMark: "desc" }, { mobile: "asc" }],
    include: { room: true }
  });

  const rankList = buildCategoryWiseRankList(students, 20);

  const rows = rankList.map(({ student, rank }) => ({
    Rank: rank,
    "Name (EN)": student.nameEn || "",
    Upazila: student.upazila || "",
    Division: student.division || "",
    District: student.district || "",
    "Serial Number": student.serialNumber || "",
    Email: student.email || "",
    Mobile: student.mobile,
    Contest: student.contest,
    Category: student.category,
    "Venue Name": student.venue,
    "Institute Name(EN)": student.instituteNameEn,
    Room: student.room?.name ?? "",
    "Quiz Mark": student.quizMark ?? "",
    Note: student.note || ""
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 8 },
    { wch: 28 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 28 },
    { wch: 16 },
    { wch: 18 },
    { wch: 24 },
    { wch: 22 },
    { wch: 34 },
    { wch: 18 },
    { wch: 12 },
    { wch: 30 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Category Winners");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const body = new Uint8Array(buffer);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="nhspc-category-wise-winners.xlsx"'
    }
  });
}
