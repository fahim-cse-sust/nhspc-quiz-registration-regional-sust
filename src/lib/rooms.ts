import { prisma } from "@/lib/prisma";

export type RoomAllocationInput = {
  id: string;
  name: string;
  capacity: number;
  priority: number;
  allocatedSeats: number;
  isManuallyOpen: boolean;
  isManuallyClosed: boolean;
};

export type RoomAllocationOption = RoomAllocationInput & {
  availableSeats: number;
  isFull: boolean;
  isAutoPriorityRoom: boolean;
  isSelectable: boolean;
  statusLabel: string;
  lockReason: string;
};

export type NormalizedCategory = "higherSecondary" | "junior" | "other";

export type RoomRegistrationStats = {
  roomId: string;
  capacity: number;
  totalRegisteredInRoom: number;
  higherSecondaryCount: number;
  juniorCount: number;
  halfCapacity: number;
};

function normaliseRoom(room: RoomAllocationInput): RoomAllocationInput {
  return {
    ...room,
    priority: Number.isFinite(room.priority) && room.priority > 0 ? room.priority : 1,
    allocatedSeats: Math.max(room.allocatedSeats || 0, 0),
    isManuallyOpen: Boolean(room.isManuallyOpen),
    isManuallyClosed: Boolean(room.isManuallyClosed)
  };
}

function sortRoomsByPriority<T extends RoomAllocationInput>(rooms: T[]) {
  return [...rooms].sort((first, second) => {
    const firstPriority = Number.isFinite(first.priority) && first.priority > 0 ? first.priority : 1;
    const secondPriority = Number.isFinite(second.priority) && second.priority > 0 ? second.priority : 1;
    if (firstPriority !== secondPriority) return firstPriority - secondPriority;
    return first.name.localeCompare(second.name);
  });
}

export function normaliseStudentCategory(category: string | null | undefined): NormalizedCategory {
  const value = String(category || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_/-]+/g, " ");

  if (!value) return "other";
  if (value.includes("senior") || value.includes("higher") || value.includes("hsc") || value.includes("higher secondary")) {
    return "higherSecondary";
  }
  if (value.includes("junior") || value === "jr" || value.includes(" jr")) return "junior";
  return "other";
}

export function categoryDisplayName(category: NormalizedCategory) {
  if (category === "higherSecondary") return "Senior / Higher Secondary";
  if (category === "junior") return "Junior";
  return "Other";
}

export function calculateHalfCapacity(capacity: number) {
  return Math.floor(Math.max(capacity, 0) / 2);
}

export function emptyRoomStats(room: Pick<RoomAllocationInput, "id" | "capacity">): RoomRegistrationStats {
  return {
    roomId: room.id,
    capacity: room.capacity,
    totalRegisteredInRoom: 0,
    higherSecondaryCount: 0,
    juniorCount: 0,
    halfCapacity: calculateHalfCapacity(room.capacity)
  };
}

export function buildRoomStatsFromStudents(
  room: Pick<RoomAllocationInput, "id" | "capacity">,
  students: { category: string | null }[]
): RoomRegistrationStats {
  const stats = emptyRoomStats(room);

  for (const student of students) {
    stats.totalRegisteredInRoom += 1;
    const category = normaliseStudentCategory(student.category);
    if (category === "higherSecondary") stats.higherSecondaryCount += 1;
    if (category === "junior") stats.juniorCount += 1;
  }

  return stats;
}

export async function getRoomRegistrationStats(roomId: string): Promise<RoomRegistrationStats | null> {
  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { id: true, capacity: true } });
  if (!room) return null;

  const students = await prisma.student.findMany({
    where: { roomId, isRegistered: true },
    select: { category: true }
  });

  return buildRoomStatsFromStudents(room, students);
}

export async function getRoomStatisticsMap(roomIds?: string[]) {
  const rooms = await prisma.room.findMany({
    where: roomIds?.length ? { id: { in: roomIds } } : undefined,
    select: { id: true, capacity: true }
  });
  const statsMap = new Map<string, RoomRegistrationStats>();

  for (const room of rooms) {
    statsMap.set(room.id, emptyRoomStats(room));
  }

  const students = await prisma.student.findMany({
    where: {
      isRegistered: true,
      roomId: roomIds?.length ? { in: roomIds } : { not: null }
    },
    select: { roomId: true, category: true }
  });

  for (const student of students) {
    if (!student.roomId) continue;
    const stats = statsMap.get(student.roomId);
    if (!stats) continue;

    stats.totalRegisteredInRoom += 1;
    const category = normaliseStudentCategory(student.category);
    if (category === "higherSecondary") stats.higherSecondaryCount += 1;
    if (category === "junior") stats.juniorCount += 1;
  }

  return statsMap;
}

export function getCategoryCountForStats(stats: RoomRegistrationStats, category: string) {
  const normalisedCategory = normaliseStudentCategory(category);
  if (normalisedCategory === "higherSecondary") return stats.higherSecondaryCount;
  if (normalisedCategory === "junior") return stats.juniorCount;
  return 0;
}

export function getCategoryHalfCapacityWarning(category: string, stats: RoomRegistrationStats, roomName?: string) {
  const normalisedCategory = normaliseStudentCategory(category);
  if (normalisedCategory === "other") return null;

  const categoryCount = getCategoryCountForStats(stats, category);
  if (categoryCount < stats.halfCapacity) return null;

  const label = categoryDisplayName(normalisedCategory);
  return `Warning: ${label} allocation${roomName ? ` for ${roomName}` : " for this room"} has exceeded half of the room capacity. You can still register this student.`;
}

export function getActivePriority(rooms: RoomAllocationInput[], currentRoomId?: string) {
  const availableRooms = rooms
    .map(normaliseRoom)
    .map((room) => ({
      ...room,
      availableSeats: Math.max(room.capacity - room.allocatedSeats + (room.id === currentRoomId ? 1 : 0), 0)
    }))
    .filter((room) => !room.isManuallyClosed && room.availableSeats > 0);

  if (availableRooms.length === 0) return null;
  return Math.min(...availableRooms.map((room) => room.priority));
}

function getCategoryCountForRoom(statsMap: Map<string, RoomRegistrationStats> | undefined, room: RoomAllocationInput, category: string) {
  const stats = statsMap?.get(room.id) ?? emptyRoomStats(room);
  return getCategoryCountForStats(stats, category);
}

function getCategoryHalfForRoom(statsMap: Map<string, RoomRegistrationStats> | undefined, room: RoomAllocationInput) {
  const stats = statsMap?.get(room.id) ?? emptyRoomStats(room);
  return stats.halfCapacity;
}

function isRoomCategoryGateCleared(
  room: RoomAllocationInput,
  category: string,
  statsMap: Map<string, RoomRegistrationStats> | undefined,
  currentRoomId?: string
) {
  const availableSeats = Math.max(room.capacity - room.allocatedSeats + (room.id === currentRoomId ? 1 : 0), 0);
  if (room.isManuallyClosed || availableSeats <= 0) return true;

  const halfCapacity = getCategoryHalfForRoom(statsMap, room);
  if (halfCapacity <= 0) return true;

  return getCategoryCountForRoom(statsMap, room, category) >= halfCapacity;
}

function isUnlockedForCategoryPriority(
  rooms: RoomAllocationInput[],
  targetRoom: RoomAllocationInput,
  category: string,
  statsMap: Map<string, RoomRegistrationStats> | undefined,
  currentRoomId?: string
) {
  const categoryType = normaliseStudentCategory(category);
  if (categoryType === "other") return false;

  const earlierRooms = sortRoomsByPriority(rooms).filter((room) => room.priority < targetRoom.priority);
  return earlierRooms.every((room) => isRoomCategoryGateCleared(room, category, statsMap, currentRoomId));
}

export function buildRoomAllocationOptions(
  rooms: RoomAllocationInput[],
  currentRoomId?: string,
  category?: string,
  statsMap?: Map<string, RoomRegistrationStats>
): RoomAllocationOption[] {
  const normalisedRooms = rooms.map(normaliseRoom);
  const categoryType = normaliseStudentCategory(category);
  const useCategoryPriority = Boolean(category) && categoryType !== "other" && statsMap !== undefined;
  const activePriority = useCategoryPriority ? null : getActivePriority(normalisedRooms, currentRoomId);
  const categoryLabel = categoryDisplayName(categoryType);

  return sortRoomsByPriority(normalisedRooms).map((room) => {
    const availableSeats = Math.max(room.capacity - room.allocatedSeats + (room.id === currentRoomId ? 1 : 0), 0);
    const isFull = availableSeats <= 0;
    const isCurrentRoom = room.id === currentRoomId;
    const isAutoPriorityRoom = useCategoryPriority
      ? isUnlockedForCategoryPriority(normalisedRooms, room, category || "", statsMap, currentRoomId)
      : activePriority !== null && room.priority === activePriority;
    const isSelectable =
      !isFull &&
      (isCurrentRoom || (!room.isManuallyClosed && (room.isManuallyOpen || isAutoPriorityRoom)));

    let statusLabel = "Locked";
    let lockReason = useCategoryPriority
      ? `Earlier priority room must reach its ${categoryLabel} half-capacity first.`
      : activePriority === null
        ? "No available priority room."
        : `Priority ${activePriority} must be filled first.`;

    if (isFull) {
      statusLabel = "Full";
      lockReason = "This room has no available seats.";
    } else if (isCurrentRoom) {
      statusLabel = "Current room";
      lockReason = "Current room for this student.";
    } else if (room.isManuallyClosed) {
      statusLabel = "Closed";
      lockReason = "Closed manually by Super Admin.";
    } else if (room.isManuallyOpen) {
      statusLabel = "Open manually";
      lockReason = "Opened manually by Super Admin.";
    } else if (isAutoPriorityRoom) {
      statusLabel = useCategoryPriority ? `Open for ${categoryLabel}` : "Open by priority";
      lockReason = useCategoryPriority
        ? `${categoryLabel} registration can use this room now. Earlier priority room remains selectable until it is full.`
        : "This is the current priority room.";
    }

    return {
      ...room,
      availableSeats,
      isFull,
      isAutoPriorityRoom,
      isSelectable,
      statusLabel,
      lockReason
    };
  });
}

export function canSelectRoomByPriority(
  rooms: RoomAllocationInput[],
  roomId: string,
  currentRoomId?: string,
  category?: string,
  statsMap?: Map<string, RoomRegistrationStats>
) {
  const selectedRoom = buildRoomAllocationOptions(rooms, currentRoomId, category, statsMap).find((room) => room.id === roomId);
  return selectedRoom?.isSelectable ?? false;
}

export function roomManualStatusLabel(room: Pick<RoomAllocationInput, "isManuallyOpen" | "isManuallyClosed">) {
  if (room.isManuallyClosed) return "Closed manually";
  if (room.isManuallyOpen) return "Opened manually";
  return "Automatic priority";
}
