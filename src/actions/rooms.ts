"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { roomSchema } from "@/lib/validation";
import type { ActionState } from "@/actions/auth";

export async function createRoomAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("SUPER_ADMIN");

  const parsed = roomSchema.safeParse({
    name: formData.get("name"),
    capacity: formData.get("capacity")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid room details." };
  }

  try {
    await prisma.room.create({
      data: {
        name: parsed.data.name.trim(),
        capacity: parsed.data.capacity,
        allocatedSeats: 0
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "A room with this name already exists." };
    }
    return { error: "Could not create room." };
  }

  revalidatePath("/rooms");
  revalidatePath("/dashboard");
  redirect("/rooms");
}

export async function updateRoomAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("SUPER_ADMIN");

  const parsed = roomSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    capacity: formData.get("capacity")
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

  try {
    await prisma.room.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name.trim(),
        capacity: parsed.data.capacity
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "A room with this name already exists." };
    }
    return { error: "Could not update room." };
  }

  revalidatePath("/rooms");
  revalidatePath("/dashboard");
  redirect("/rooms");
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
  revalidatePath("/rooms");
  revalidatePath("/dashboard");
  redirect("/rooms");
}
