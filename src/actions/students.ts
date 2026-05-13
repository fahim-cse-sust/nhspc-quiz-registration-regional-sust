"use server";

import { Prisma, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/auth";
import {
  buildRoomAllocationOptions,
  getCategoryHalfCapacityWarning,
  getRoomRegistrationStats,
  getRoomStatisticsMap
} from "@/lib/rooms";
import { registerUploadedStudentSchema, uploadedStudentSchema } from "@/lib/validation";
import { normalisePhone } from "@/lib/utils";
import type { ActionState } from "@/actions/auth";

export type ImportStudentsState = ActionState & {
  summary?: {
    totalRowsProcessed: number;
    insertedCount: number;
    updatedCount: number;
    skippedInvalidCount: number;
    errors: string[];
  };
};

export type RegisterStudentState = ActionState & {
  warning?: string;
};

const REQUIRED_COLUMNS = {
  mobile: ["mobile", "mobilenumber", "phone", "phonenumber", "contact", "contactnumber", "cell", "cellnumber"],
  contest: ["contest", "contestname", "competition", "competitionname"],
  category: ["category", "cat", "group"],
  serialNumber: ["serialnumber", "serialno", "serial", "slno", "sl", "no", "number"],
  venue: ["venuename", "venue", "venuem", "venu", "vanue", "location", "center", "centre"],
  instituteNameEn: [
    "institutenameen",
    "institutenameenglish",
    "institutename",
    "institutenameeng",
    "institutenameenen",
    "institution",
    "institutionname",
    "institute",
    "school",
    "schoolname",
    "college",
    "collegename"
  ]
} as const;

const OPTIONAL_COLUMNS = {
  nameEn: ["nameen", "nameenglish", "name", "studentname", "studentnameen", "participantname", "participantnameen"],
  upazila: ["upazila", "upozila", "upzilla", "subdistrict", "thana"],
  division: ["division", "div"],
  district: ["district", "dist"],
  email: ["email", "emailaddress", "mail", "mailaddress"]
} as const;

function friendlyUniqueError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = Array.isArray(error.meta?.target) ? error.meta?.target.join(", ") : String(error.meta?.target || "field");
    if (target.includes("serialNumber")) return "This serial number already exists.";
    return "Duplicate information found. Please check the form.";
  }
  return null;
}

function normaliseHeader(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
}

function getCellText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normaliseImportedMobile(value: unknown) {
  let mobile = getCellText(value).replace(/\.0$/, "");
  mobile = normalisePhone(mobile);

  // If a Bangladeshi mobile was stored as a number in Excel, the leading zero may be lost.
  if (/^1[3-9]\d{8}$/.test(mobile)) mobile = `0${mobile}`;
  return mobile;
}

function findRequiredColumn(headerMap: Map<string, number>, aliases: readonly string[]) {
  for (const alias of aliases) {
    const index = headerMap.get(alias);
    if (index !== undefined) return index;
  }
  return null;
}

function getOptionalCell(row: unknown[], index: number | null) {
  if (index === null) return "";
  return getCellText(row[index]);
}

function optionalText(value: string) {
  return value.trim() || null;
}

function revalidateStudentPages() {
  revalidatePath("/students");
  revalidatePath("/students/new");
  revalidatePath("/students/import");
  revalidatePath("/dashboard");
  revalidatePath("/rooms");
  revalidatePath("/rooms/control");
  revalidatePath("/quiz");
}

async function reserveRoomSeat(roomId: string, currentRoomId?: string) {
  const rooms = await prisma.room.findMany({
    select: {
      id: true,
      name: true,
      capacity: true,
      priority: true,
      allocatedSeats: true,
      isManuallyOpen: true,
      isManuallyClosed: true
    }
  });

  const statsMap = await getRoomStatisticsMap(rooms.map((room) => room.id));
  const roomsWithLiveCounts = rooms.map((room) => ({
    ...room,
    allocatedSeats: statsMap.get(room.id)?.totalRegisteredInRoom ?? room.allocatedSeats
  }));

  const roomOptions = buildRoomAllocationOptions(roomsWithLiveCounts, currentRoomId);
  const selectedRoom = roomOptions.find((room) => room.id === roomId);

  if (!selectedRoom) {
    throw new Error("Selected room was not found.");
  }

  if (!selectedRoom.isSelectable) {
    throw new Error(`${selectedRoom.name} is not selectable. ${selectedRoom.lockReason}`);
  }

  const result = await prisma.room.updateMany({
    where: {
      id: roomId,
      allocatedSeats: { lt: selectedRoom.capacity }
    },
    data: {
      allocatedSeats: { increment: 1 }
    }
  });

  if (result.count !== 1) {
    throw new Error("Selected room has no available seats.");
  }
}

async function releaseRoomSeat(roomId: string | null | undefined) {
  if (!roomId) return;
  await prisma.room.updateMany({
    where: {
      id: roomId,
      allocatedSeats: { gt: 0 }
    },
    data: {
      allocatedSeats: { decrement: 1 }
    }
  });
}

export async function importStudentsAction(_prevState: ImportStudentsState, formData: FormData): Promise<ImportStudentsState> {
  await requireRole(Role.SUPER_ADMIN);

  const uploadedFile = formData.get("file");
  if (!(uploadedFile instanceof File) || uploadedFile.size === 0) {
    return { error: "Please upload an Excel or CSV file." };
  }

  const fileName = uploadedFile.name.toLowerCase();
  const allowed = fileName.endsWith(".xlsx") || fileName.endsWith(".xls") || fileName.endsWith(".csv");
  if (!allowed) {
    return { error: "Only .xlsx, .xls, or .csv files are allowed." };
  }

  let rows: unknown[][] = [];

  try {
    const buffer = Buffer.from(await uploadedFile.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return { error: "The uploaded file does not contain any worksheet." };
    const worksheet = workbook.Sheets[firstSheetName];
    rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: "", blankrows: false, raw: false });
  } catch {
    return { error: "Could not read this file. Please check the Excel format and try again." };
  }

  if (rows.length < 2) {
    return { error: "The file must include a header row and at least one student row." };
  }

  const headerRow = rows[0];
  const headerMap = new Map<string, number>();
  headerRow.forEach((header, index) => {
    const normalised = normaliseHeader(header);
    if (normalised && !headerMap.has(normalised)) headerMap.set(normalised, index);
  });

  const columnIndex = {
    mobile: findRequiredColumn(headerMap, REQUIRED_COLUMNS.mobile),
    contest: findRequiredColumn(headerMap, REQUIRED_COLUMNS.contest),
    category: findRequiredColumn(headerMap, REQUIRED_COLUMNS.category),
    serialNumber: findRequiredColumn(headerMap, REQUIRED_COLUMNS.serialNumber),
    venue: findRequiredColumn(headerMap, REQUIRED_COLUMNS.venue),
    instituteNameEn: findRequiredColumn(headerMap, REQUIRED_COLUMNS.instituteNameEn)
  };

  const optionalColumnIndex = {
    nameEn: findRequiredColumn(headerMap, OPTIONAL_COLUMNS.nameEn),
    upazila: findRequiredColumn(headerMap, OPTIONAL_COLUMNS.upazila),
    division: findRequiredColumn(headerMap, OPTIONAL_COLUMNS.division),
    district: findRequiredColumn(headerMap, OPTIONAL_COLUMNS.district),
    email: findRequiredColumn(headerMap, OPTIONAL_COLUMNS.email)
  };

  const missingColumns = Object.entries(columnIndex)
    .filter(([, index]) => index === null)
    .map(([key]) => (key === "instituteNameEn" ? "Institute Name (EN)" : key[0].toUpperCase() + key.slice(1)));

  if (missingColumns.length > 0) {
    return { error: `Missing required column(s): ${missingColumns.join(", ")}.` };
  }

  const parsedRows: Array<{
    rowNumber: number;
    mobile: string;
    serialNumber: string;
    contest: string;
    category: string;
    venue: string;
    instituteNameEn: string;
    nameEn?: string | null;
    upazila?: string | null;
    division?: string | null;
    district?: string | null;
    email?: string | null;
  }> = [];
  const errors: string[] = [];
  let totalRowsProcessed = 0;
  let skippedInvalidCount = 0;

  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index];
    if (!row || row.every((cell) => getCellText(cell) === "")) continue;

    totalRowsProcessed += 1;
    const rowNumber = index + 1;
    const data = {
      mobile: getCellText(row[columnIndex.mobile as number]),
      serialNumber: getCellText(row[columnIndex.serialNumber as number]),
      contest: getCellText(row[columnIndex.contest as number]),
      category: getCellText(row[columnIndex.category as number]),
      venue: getCellText(row[columnIndex.venue as number]),
      instituteNameEn: getCellText(row[columnIndex.instituteNameEn as number]),
      nameEn: getOptionalCell(row, optionalColumnIndex.nameEn),
      upazila: getOptionalCell(row, optionalColumnIndex.upazila),
      division: getOptionalCell(row, optionalColumnIndex.division),
      district: getOptionalCell(row, optionalColumnIndex.district),
      email: getOptionalCell(row, optionalColumnIndex.email)
    };

    // Excel rows are considered pre-validated source data.
    // Do not run zod validation here, otherwise rows with non-standard mobile/email/text values are skipped.
    parsedRows.push({ rowNumber, ...data });
  }

  let insertedCount = 0;
  let updatedCount = 0;

  for (const row of parsedRows) {
    try {
      const existingStudent = await prisma.student.findUnique({ where: { serialNumber: row.serialNumber }, select: { id: true } });

      if (existingStudent) {
        await prisma.student.update({
          where: { serialNumber: row.serialNumber },
          data: {
            contest: row.contest,
            category: row.category,
            venue: row.venue,
            instituteNameEn: row.instituteNameEn,
            serialNumber: row.serialNumber,
            nameEn: optionalText(row.nameEn || ""),
            upazila: optionalText(row.upazila || ""),
            division: optionalText(row.division || ""),
            district: optionalText(row.district || ""),
            email: optionalText(row.email || "")
          }
        });
        updatedCount += 1;
      } else {
        await prisma.student.create({
          data: {
            serialNumber: row.serialNumber,
            mobile: row.mobile,
            contest: row.contest,
            category: row.category,
            venue: row.venue,
            instituteNameEn: row.instituteNameEn,
            nameEn: optionalText(row.nameEn || ""),
            upazila: optionalText(row.upazila || ""),
            division: optionalText(row.division || ""),
            district: optionalText(row.district || ""),
            email: optionalText(row.email || ""),
            isRegistered: false
          }
        });
        insertedCount += 1;
      }
    } catch (error) {
      skippedInvalidCount += 1;
      const uniqueError = friendlyUniqueError(error);
      if (errors.length < 20) errors.push(`Row ${row.rowNumber}: ${uniqueError || "Could not save this student."}`);
    }
  }

  revalidateStudentPages();

  return {
    success: "Import completed.",
    summary: {
      totalRowsProcessed,
      insertedCount,
      updatedCount,
      skippedInvalidCount,
      errors
    }
  };
}

export async function updateUploadedStudentAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();

  const parsed = uploadedStudentSchema.safeParse({
    id: formData.get("id"),
    mobile: formData.get("mobile"),
    contest: formData.get("contest"),
    category: formData.get("category"),
    venue: formData.get("venue"),
    instituteNameEn: formData.get("instituteNameEn"),
    nameEn: formData.get("nameEn"),
    upazila: formData.get("upazila"),
    division: formData.get("division"),
    district: formData.get("district"),
    serialNumber: formData.get("serialNumber"),
    email: formData.get("email"),
    note: formData.get("note")
  });

  if (!parsed.success || !parsed.data.id) {
    return { error: parsed.success ? "Student ID is missing." : parsed.error.issues[0]?.message };
  }

  const data = {
    ...parsed.data,
    mobile: normaliseImportedMobile(parsed.data.mobile),
    nameEn: optionalText(parsed.data.nameEn || ""),
    upazila: optionalText(parsed.data.upazila || ""),
    division: optionalText(parsed.data.division || ""),
    district: optionalText(parsed.data.district || ""),
    serialNumber: parsed.data.serialNumber.trim(),
    email: optionalText(parsed.data.email || ""),
    note: parsed.data.note || null
  };

  try {
    await prisma.student.update({
      where: { id: data.id },
      data: {
        mobile: data.mobile,
        contest: data.contest.trim(),
        category: data.category.trim(),
        venue: data.venue.trim(),
        instituteNameEn: data.instituteNameEn.trim(),
        nameEn: data.nameEn,
        upazila: data.upazila,
        division: data.division,
        district: data.district,
        serialNumber: data.serialNumber,
        email: data.email,
        note: data.note
      }
    });
  } catch (error) {
    const uniqueError = friendlyUniqueError(error);
    if (uniqueError) return { error: uniqueError };
    return { error: "Could not update student." };
  }

  revalidateStudentPages();
  redirect("/students");
}

export async function registerUploadedStudentAction(
  _prevState: RegisterStudentState,
  formData: FormData
): Promise<RegisterStudentState> {
  const user = await requireUser();

  const parsed = registerUploadedStudentSchema.safeParse({
    studentId: formData.get("studentId"),
    roomId: formData.get("roomId")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid registration request." };
  }

  const { studentId, roomId } = parsed.data;
  let seatReserved = false;
  let warning: string | null = null;

  try {
    const [student, room, stats] = await Promise.all([
      prisma.student.findUnique({ where: { id: studentId } }),
      prisma.room.findUnique({ where: { id: roomId }, select: { id: true, name: true, capacity: true } }),
      getRoomRegistrationStats(roomId)
    ]);

    if (!student) return { error: "Student was not found." };
    if (student.isRegistered) return { error: "This student is already registered." };
    if (!room || !stats) return { error: "Selected room was not found." };

    warning = getCategoryHalfCapacityWarning(student.category, stats, room.name);

    await reserveRoomSeat(roomId);
    seatReserved = true;

    await prisma.student.update({
      where: { id: studentId },
      data: {
        roomId,
        registeredById: user.id,
        registeredAt: new Date(),
        isRegistered: true
      }
    });
  } catch (error) {
    if (seatReserved) await releaseRoomSeat(roomId);
    if (error instanceof Error) return { error: error.message };
    return { error: "Could not register this student." };
  }

  revalidateStudentPages();

  return {
    success: "Student registration confirmed successfully.",
    ...(warning ? { warning } : {})
  };
}

// Backwards-compatible aliases for older imports. Manual student creation is no longer used.
export const createStudentAction = registerUploadedStudentAction;
export const updateStudentAction = updateUploadedStudentAction;

export async function deleteStudentAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") || "");
  if (!id) return;

  const deletedStudent = await prisma.student.delete({
    where: { id },
    select: { roomId: true, isRegistered: true }
  });

  if (deletedStudent.isRegistered) await releaseRoomSeat(deletedStudent.roomId);
  revalidateStudentPages();
  redirect("/students");
}
