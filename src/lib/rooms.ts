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

function normaliseRoom(room: RoomAllocationInput): RoomAllocationInput {
  return {
    ...room,
    priority: Number.isFinite(room.priority) && room.priority > 0 ? room.priority : 1,
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

export function buildRoomAllocationOptions(rooms: RoomAllocationInput[], currentRoomId?: string): RoomAllocationOption[] {
  const normalisedRooms = rooms.map(normaliseRoom);
  const activePriority = getActivePriority(normalisedRooms, currentRoomId);

  return sortRoomsByPriority(normalisedRooms).map((room) => {
    const availableSeats = Math.max(room.capacity - room.allocatedSeats + (room.id === currentRoomId ? 1 : 0), 0);
    const isFull = availableSeats <= 0;
    const isCurrentRoom = room.id === currentRoomId;
    const isAutoPriorityRoom = activePriority !== null && room.priority === activePriority;
    const isSelectable =
      !isFull &&
      (isCurrentRoom || (!room.isManuallyClosed && (room.isManuallyOpen || isAutoPriorityRoom)));

    let statusLabel = "Locked";
    let lockReason = activePriority === null ? "No available priority room." : `Priority ${activePriority} must be filled first.`;

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
      statusLabel = "Open by priority";
      lockReason = "This is the current priority room.";
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

export function canSelectRoomByPriority(rooms: RoomAllocationInput[], roomId: string, currentRoomId?: string) {
  const selectedRoom = buildRoomAllocationOptions(rooms, currentRoomId).find((room) => room.id === roomId);
  return selectedRoom?.isSelectable ?? false;
}

export function roomManualStatusLabel(room: Pick<RoomAllocationInput, "isManuallyOpen" | "isManuallyClosed">) {
  if (room.isManuallyClosed) return "Closed manually";
  if (room.isManuallyOpen) return "Opened manually";
  return "Automatic priority";
}
