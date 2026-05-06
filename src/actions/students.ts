"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { studentSchema } from "@/lib/validation";
import { normaliseEmail, normalisePhone } from "@/lib/utils";
import type { ActionState } from "@/actions/auth";

function friendlyUniqueError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = Array.isArray(error.meta?.target) ? error.meta?.target.join(", ") : String(error.meta?.target || "field");
    if (target.includes("birthCertificateNumber")) return "This birth certificate number is already registered.";
    if (target.includes("email")) return "This student email is already registered.";
    if (target.includes("phone")) return "This phone number is already registered.";
    return "Duplicate information found. Please check the form.";
  }
  return null;
}

async function reserveRoomSeat(roomId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { id: true, capacity: true, allocatedSeats: true }
  });

  if (!room) {
    throw new Error("Selected room was not found.");
  }

  const result = await prisma.room.updateMany({
    where: {
      id: roomId,
      allocatedSeats: { lt: room.capacity }
    },
    data: {
      allocatedSeats: { increment: 1 }
    }
  });

  if (result.count !== 1) {
    throw new Error("Selected room has no available seats.");
  }
}

async function releaseRoomSeat(roomId: string) {
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

export async function createStudentAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const parsed = studentSchema.safeParse({
    name: formData.get("name"),
    institution: formData.get("institution"),
    className: formData.get("className"),
    birthCertificateNumber: formData.get("birthCertificateNumber"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    roomId: formData.get("roomId"),
    note: formData.get("note")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid student details." };
  }

  const data = {
    ...parsed.data,
    email: normaliseEmail(parsed.data.email),
    phone: normalisePhone(parsed.data.phone),
    note: parsed.data.note || null
  };

  let seatReserved = false;

  try {
    await reserveRoomSeat(data.roomId);
    seatReserved = true;

    await prisma.student.create({
      data: {
        name: data.name.trim(),
        institution: data.institution.trim(),
        className: data.className.trim(),
        birthCertificateNumber: data.birthCertificateNumber.trim(),
        email: data.email,
        phone: data.phone,
        note: data.note,
        roomId: data.roomId,
        registeredById: user.id
      }
    });
  } catch (error) {
    if (seatReserved) await releaseRoomSeat(data.roomId);
    const uniqueError = friendlyUniqueError(error);
    if (uniqueError) return { error: uniqueError };
    if (error instanceof Error) return { error: error.message };
    return { error: "Could not register student." };
  }

  revalidatePath("/students");
  revalidatePath("/dashboard");
  revalidatePath("/rooms");
  redirect("/students");
}

export async function updateStudentAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();

  const parsed = studentSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    institution: formData.get("institution"),
    className: formData.get("className"),
    birthCertificateNumber: formData.get("birthCertificateNumber"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    roomId: formData.get("roomId"),
    note: formData.get("note")
  });

  if (!parsed.success || !parsed.data.id) {
    return { error: parsed.success ? "Student ID is missing." : parsed.error.issues[0]?.message };
  }

  const data = {
    ...parsed.data,
    email: normaliseEmail(parsed.data.email),
    phone: normalisePhone(parsed.data.phone),
    note: parsed.data.note || null
  };

  let newSeatReserved = false;
  let oldRoomId: string | null = null;

  try {
    const currentStudent = await prisma.student.findUnique({ where: { id: data.id } });
    if (!currentStudent) throw new Error("Student was not found.");

    oldRoomId = currentStudent.roomId;

    if (currentStudent.roomId !== data.roomId) {
      await reserveRoomSeat(data.roomId);
      newSeatReserved = true;
    }

    await prisma.student.update({
      where: { id: data.id },
      data: {
        name: data.name.trim(),
        institution: data.institution.trim(),
        className: data.className.trim(),
        birthCertificateNumber: data.birthCertificateNumber.trim(),
        email: data.email,
        phone: data.phone,
        note: data.note,
        roomId: data.roomId
      }
    });

    if (newSeatReserved && oldRoomId) {
      await releaseRoomSeat(oldRoomId);
    }
  } catch (error) {
    if (newSeatReserved) await releaseRoomSeat(data.roomId);
    const uniqueError = friendlyUniqueError(error);
    if (uniqueError) return { error: uniqueError };
    if (error instanceof Error) return { error: error.message };
    return { error: "Could not update student." };
  }

  revalidatePath("/students");
  revalidatePath("/dashboard");
  revalidatePath("/rooms");
  redirect("/students");
}

export async function deleteStudentAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") || "");
  if (!id) return;

  const deletedStudent = await prisma.student.delete({
    where: { id },
    select: { roomId: true }
  });

  await releaseRoomSeat(deletedStudent.roomId);
  revalidatePath("/students");
  revalidatePath("/dashboard");
  revalidatePath("/rooms");
  redirect("/students");
}
