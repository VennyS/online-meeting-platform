import { IRoom, UpdateRoomDto } from "@/app/types/room.types";

export type RoomListProps = {
  fetchMode?: "user" | "all" | "none";
  initialRooms?: IRoom[];
};

export type RoomCardProps = {
  room: IRoom;
  onSave: (data: UpdateRoomDto) => void;
  updating: boolean;
};

export type MeetingReportsProps = {
  shortId: string;
  isOpen: boolean;
  onClose: () => void;
};
