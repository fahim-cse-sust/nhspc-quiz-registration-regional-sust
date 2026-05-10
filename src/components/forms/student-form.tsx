"use client";

import { useMemo, useState, useActionState } from "react";
import { createStudentAction, updateStudentAction } from "@/actions/students";
import type { ActionState } from "@/actions/auth";
import type { RoomAllocationOption } from "@/lib/rooms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const initialState: ActionState = {};

type StudentFormData = {
  id: string;
  name: string;
  institution: string;
  className: string;
  birthCertificateNumber: string;
  email: string;
  phone: string;
  roomId: string;
  note: string | null;
};

export function StudentForm({
  mode,
  rooms,
  student
}: {
  mode: "create" | "edit";
  rooms: RoomAllocationOption[];
  student?: StudentFormData;
}) {
  const action = mode === "create" ? createStudentAction : updateStudentAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const firstSelectableRoomId = rooms.find((room) => room.isSelectable)?.id || "";
  const [selectedRoomId, setSelectedRoomId] = useState(student?.roomId || firstSelectableRoomId);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId),
    [rooms, selectedRoomId]
  );

  const hasSelectableRoom = rooms.some((room) => room.isSelectable);

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {state.error}
        </div>
      ) : null}

      {!hasSelectableRoom ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          No room is currently selectable. Ask Super Admin to open a room or check the room capacity.
        </div>
      ) : null}

      {student?.id ? <input type="hidden" name="id" value={student.id} /> : null}

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Student name" id="name">
          <Input id="name" name="name" defaultValue={student?.name} placeholder="Full name" required />
        </Field>

        <Field label="Institution / school / college" id="institution">
          <Input id="institution" name="institution" defaultValue={student?.institution} placeholder="Institution name" required />
        </Field>

        <Field label="Class" id="className">
          <Input id="className" name="className" defaultValue={student?.className} placeholder="Example: Class 9" required />
        </Field>

        <Field label="Birth certificate number" id="birthCertificateNumber">
          <Input
            id="birthCertificateNumber"
            name="birthCertificateNumber"
            defaultValue={student?.birthCertificateNumber}
            placeholder="Birth certificate number"
            required
          />
        </Field>

        <Field label="Email" id="email">
          <Input id="email" name="email" type="email" defaultValue={student?.email} placeholder="student@example.com" required />
        </Field>

        <Field label="Phone" id="phone">
          <Input id="phone" name="phone" defaultValue={student?.phone} placeholder="01XXXXXXXXX" required />
        </Field>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_0.7fr]">
        <Field label="Allocated room" id="roomId">
          <Select id="roomId" name="roomId" value={selectedRoomId} onChange={(event) => setSelectedRoomId(event.target.value)} required>
            <option value="" disabled>Select a room</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id} disabled={!room.isSelectable}>
                P{room.priority} — {room.name} — {room.availableSeats} seat(s) — {room.statusLabel}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Locked rooms cannot be selected until the lower-priority room is full, unless Super Admin opens them manually.
          </p>
        </Field>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
          <p className="text-sm font-semibold">Room availability</p>
          {selectedRoom ? (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge>{selectedRoom.name}</Badge>
                <Badge>Priority: {selectedRoom.priority}</Badge>
                <Badge>Total: {selectedRoom.capacity}</Badge>
                <Badge>Allocated: {selectedRoom.allocatedSeats}</Badge>
                <Badge>Available: {selectedRoom.availableSeats}</Badge>
                <Badge>{selectedRoom.statusLabel}</Badge>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">{selectedRoom.lockReason}</p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">Select a room to see available seats.</p>
          )}
        </div>
      </div>

      <Field label="Optional note" id="note">
        <Textarea id="note" name="note" defaultValue={student?.note || ""} placeholder="Any optional note" />
      </Field>

      <Button type="submit" disabled={pending || !hasSelectableRoom}>
        {pending ? "Saving..." : mode === "create" ? "Register Student" : "Update Student"}
      </Button>
    </form>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
