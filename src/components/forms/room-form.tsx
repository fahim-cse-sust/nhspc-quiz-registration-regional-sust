"use client";

import { useActionState } from "react";
import { createRoomAction, updateRoomAction } from "@/actions/rooms";
import type { ActionState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = {};

export function RoomForm({
  mode,
  room
}: {
  mode: "create" | "edit";
  room?: { id: string; name: string; capacity: number };
}) {
  const action = mode === "create" ? createRoomAction : updateRoomAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {state.error}
        </div>
      ) : null}

      {room?.id ? <input type="hidden" name="id" value={room.id} /> : null}

      <div>
        <Label htmlFor="name">Room name</Label>
        <Input id="name" name="name" defaultValue={room?.name} placeholder="Example: Room 101" required />
      </div>

      <div>
        <Label htmlFor="capacity">Highest capacity</Label>
        <Input id="capacity" name="capacity" type="number" min="1" defaultValue={room?.capacity} placeholder="Example: 40" required />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : mode === "create" ? "Create Room" : "Update Room"}
      </Button>
    </form>
  );
}
