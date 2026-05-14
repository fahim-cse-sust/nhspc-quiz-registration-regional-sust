"use client";

import { useActionState, useEffect, useMemo, useState, type FormEvent } from "react";
import { registerUploadedStudentAction, type RegisterStudentState } from "@/actions/students";
import type { RoomAllocationOption, RoomRegistrationStats } from "@/lib/rooms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const initialState: RegisterStudentState = {};

type RegisterStudent = {
  id: string;
  mobile: string;
  contest: string;
  category: string;
  venue: string;
  instituteNameEn: string;
  isRegistered: boolean;
};

type RoomWithStats = RoomAllocationOption & {
  stats: RoomRegistrationStats;
};

function normaliseCategory(category: string) {
  const value = category.trim().toLowerCase();
  if (value.includes("senior") || value.includes("higher") || value.includes("hsc")) return "higherSecondary";
  if (value.includes("junior") || value === "jr") return "junior";
  return "other";
}

function categorySoftWarning(category: string, room: RoomWithStats | undefined) {
  if (!room) return null;
  const normalised = normaliseCategory(category);
  if (normalised === "other") return null;

  const count = normalised === "higherSecondary" ? room.stats.higherSecondaryCount : room.stats.juniorCount;
  if (count < room.stats.halfCapacity) return null;

  const label = normalised === "higherSecondary" ? "Senior / Higher Secondary" : "Junior";
  return `Warning: ${label} allocation for this room has exceeded half of the room capacity. You can still register this student.`;
}

export function RegisterUploadedStudentForm({ student, rooms }: { student: RegisterStudent; rooms: RoomWithStats[] }) {
  const [state, formAction, pending] = useActionState(registerUploadedStudentAction, initialState);
  const firstSelectableRoomId = rooms.find((room) => room.isSelectable)?.id || rooms[0]?.id || "";
  const [selectedRoomId, setSelectedRoomId] = useState(firstSelectableRoomId);

  const selectedRoom = useMemo(() => rooms.find((room) => room.id === selectedRoomId), [rooms, selectedRoomId]);
  const liveWarning = categorySoftWarning(student.category, selectedRoom);
  const hasSelectableRoom = rooms.some((room) => room.isSelectable);
  const [halfOverrideArmed, setHalfOverrideArmed] = useState(false);

  useEffect(() => {
    setHalfOverrideArmed(false);
  }, [selectedRoomId, student.id]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!liveWarning || halfOverrideArmed) return;

    event.preventDefault();
    setHalfOverrideArmed(true);
  }

  if (student.isRegistered) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
        This uploaded student is already registered.
      </div>
    );
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="studentId" value={student.id} />
      <input type="hidden" name="confirmHalfOverride" value={halfOverrideArmed ? "true" : "false"} />

      {state.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {state.error}
        </div>
      ) : null}
      {state.success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {state.success}
        </div>
      ) : null}
      {state.warning ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {state.warning}
        </div>
      ) : null}

      {!hasSelectableRoom ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          No room is currently selectable. Ask Super Admin to open a room or check the room capacity.
        </div>
      ) : null}

      <div className="grid gap-4">
        <div>
          <Label htmlFor="roomId">Select room</Label>
          <Select id="roomId" name="roomId" value={selectedRoomId} onChange={(event) => setSelectedRoomId(event.target.value)} required>
            <option value="" disabled>Select a room</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id} disabled={!room.isSelectable}>
                P{room.priority} — {room.name} — {room.availableSeats} seat(s) — {room.statusLabel}
              </option>
            ))}
          </Select>
          <p className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-xs text-[var(--muted-foreground)]">
            Full capacity and priority rules are still enforced. The half-capacity category warning is soft only.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
          <p className="text-sm font-semibold">Selected room details</p>
          {selectedRoom ? (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge>{selectedRoom.name}</Badge>
                <Badge>{selectedRoom.statusLabel}</Badge>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <RoomStat label="Total capacity" value={selectedRoom.capacity} />
                <RoomStat label="Total registered" value={selectedRoom.stats.totalRegisteredInRoom} />
                <RoomStat label="Senior / Higher Secondary" value={selectedRoom.stats.higherSecondaryCount} />
                <RoomStat label="Junior" value={selectedRoom.stats.juniorCount} />
                <RoomStat label="Half limit per category" value={selectedRoom.stats.halfCapacity} />
                <RoomStat label="Available seats" value={selectedRoom.availableSeats} />
              </div>

              <p className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--muted-foreground)]">
                {selectedRoom.lockReason}
              </p>
              {liveWarning ? (
                <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  <p>{liveWarning}</p>
                  <p>Click Confirm Registration once to read this warning, then click it again to register anyway.</p>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">Select a room to see live counts.</p>
          )}
        </div>
      </div>

      {halfOverrideArmed && liveWarning ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Half-capacity warning acknowledged. Click the button again to confirm this override.
        </div>
      ) : null}

      <Button type="submit" disabled={pending || !hasSelectableRoom || !selectedRoom?.isSelectable} className="w-full sm:w-auto">
        {pending ? "Registering..." : halfOverrideArmed && liveWarning ? "Confirm Override and Register" : "Confirm Registration"}
      </Button>
    </form>
  );
}

function RoomStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
      <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-1 text-lg font-black text-[var(--primary)]">{value}</p>
    </div>
  );
}
