import { IRoom } from "@/app/types/room.types";

export type RoomListProps = {
  fetchMode?: "user" | "all" | "none"; // по умолчанию "user"
  initialRooms?: IRoom[];
};
