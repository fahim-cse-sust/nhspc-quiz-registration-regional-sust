"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { roomSchema } from "@/lib/validation";
import type { ActionState } from "@/actions/auth";

function revalidateRoomPages() {
  revalidatePath("/rooms");
  revalidatePath("/rooms/control");
  revalidatePath("/students/new");
  revalidatePath("/dashboard");
}

export async function createRoomAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("SUPER_ADMIN");

  const parsed = roomSchema.safeParse({
    name: formData.get("name"),
    capacity: formData.get("capacity"),
    priority: formData.get("priority")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid room details." };
  }

  const duplicatePriorityRoom = await prisma.room.findFirst({
    where: { priority: parsed.data.priority },
    select: { name: true }
  });

  if (duplicatePriorityRoom) {
    return { error: `Priority ${parsed.data.priority} is already assigned to ${duplicatePriorityRoom.name}.` };
  }

  try {
    await prisma.room.create({
      data: {
        name: parsed.data.name.trim(),
        capacity: parsed.data.capacity,
        priority: parsed.data.priority,
        allocatedSeats: 0,
        isManuallyOpen: false,
        isManuallyClosed: false
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "A room with this name already exists." };
    }
    return { error: "Could not create room." };
  }

  revalidateRoomPages();
  redirect("/rooms");
}

export async function updateRoomAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("SUPER_ADMIN");

  const parsed = roomSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    capacity: formData.get("capacity"),
    priority: formData.get("priority")
  });

  if (!parsed.success || !parsed.data.id) {
    return { error: parsed.success ? "Room ID is missing." : parsed.error.issues[0]?.message };
  }

  const existingRoom = await prisma.room.findUnique({
    where: { id: parsed.data.id },
    select: { allocatedSeats: true }
  });

  if (!existingRoom) {
    return { error: "Room was not found." };
  }

  if (parsed.data.capacity < existingRoom.allocatedSeats) {
    return {
      error: `Capacity cannot be less than the current allocated students (${existingRoom.allocatedSeats}).`
    };
  }

  const duplicatePriorityRoom = await prisma.room.findFirst({
    where: {
      priority: parsed.data.priority,
      id: { not: parsed.data.id }
    },
    select: { name: true }
  });

  if (duplicatePriorityRoom) {
    return { error: `Priority ${parsed.data.priority} is already assigned to ${duplicatePriorityRoom.name}.` };
  }

  try {
    await prisma.room.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name.trim(),
        capacity: parsed.data.capacity,
        priority: parsed.data.priority
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "A room with this name already exists." };
    }
    return { error: "Could not update room." };
  }

  revalidateRoomPages();
  redirect("/rooms");
}

export async function updateRoomManualStatusAction(formData: FormData) {
  await requireRole("SUPER_ADMIN");

  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "auto");

  if (!id) return;

  const data =
    status === "open"
      ? { isManuallyOpen: true, isManuallyClosed: false }
      : status === "closed"
        ? { isManuallyOpen: false, isManuallyClosed: true }
        : { isManuallyOpen: false, isManuallyClosed: false };

  await prisma.room.update({
    where: { id },
    data
  });

  revalidateRoomPages();
  redirect("/rooms/control");
}

export async function deleteRoomAction(formData: FormData) {
  await requireRole("SUPER_ADMIN");
  const id = String(formData.get("id") || "");
  if (!id) return;

  const assignedStudents = await prisma.student.count({ where: { roomId: id } });
  if (assignedStudents > 0) {
    redirect("/rooms?error=Cannot delete a room that already has students assigned.");
  }

  await prisma.room.delete({ where: { id } });
  revalidateRoomPages();
  redirect("/rooms");
}
