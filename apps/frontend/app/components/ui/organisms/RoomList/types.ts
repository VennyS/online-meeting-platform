import { Room } from "@/app/types/room.types";

export type RoomListProps = {
  fetchMode?: "user" | "all" | "none";
  initialRooms?: Room[];
};

export type Status = {
  label: "Отменена" | "Предстоящая" | "Завершена" | "Идет";
  color: "success" | "error" | "info" | "warning";
};

export type RoomWithStatus = Room & Status;
