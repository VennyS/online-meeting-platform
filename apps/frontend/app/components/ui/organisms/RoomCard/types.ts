import { IRoom, UpdateRoomDto } from "@/app/types/room.types";

export type RoomCardProps = {
  room: IRoom;
  onSave: (data: UpdateRoomDto) => void;
  updating: boolean;
};
