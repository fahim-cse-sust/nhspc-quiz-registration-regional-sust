"use client";

import { useMemo, useState, useActionState } from "react";
import { createStudentAction, updateStudentAction } from "@/actions/students";
import type { ActionState } from "@/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const initialState: ActionState = {};

type RoomOption = {
  id: string;
  name: string;
  capacity: number;
  allocatedSeats: number;
  availableSeats: number;
};

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
  rooms: RoomOption[];
  student?: StudentFormData;
}) {
  const action = mode === "create" ? createStudentAction : updateStudentAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [selectedRoomId, setSelectedRoomId] = useState(student?.roomId || rooms[0]?.id || "");

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId),
    [rooms, selectedRoomId]
  );

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {state.error}
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
              <option key={room.id} value={room.id} disabled={mode === "create" && room.availableSeats <= 0}>
                {room.name} — {room.availableSeats} seat(s) available
              </option>
            ))}
          </Select>
        </Field>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
          <p className="text-sm font-semibold">Room availability</p>
          {selectedRoom ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge>{selectedRoom.name}</Badge>
              <Badge>Total: {selectedRoom.capacity}</Badge>
              <Badge>Allocated: {selectedRoom.allocatedSeats}</Badge>
              <Badge>Available: {selectedRoom.availableSeats}</Badge>
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">Select a room to see available seats.</p>
          )}
        </div>
      </div>

      <Field label="Optional note" id="note">
        <Textarea id="note" name="note" defaultValue={student?.note || ""} placeholder="Any optional note" />
      </Field>

      <Button type="submit" disabled={pending || rooms.length === 0}>
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
