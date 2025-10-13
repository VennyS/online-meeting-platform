import { IRoom } from "@/app/types/room.types";

export type RoomModalProps = {
  mode: "create" | "edit";
  initialData?: IRoom;
  onClose: () => void;
  onUpdateRoom?: (room: IRoom) => void;
  onCreateRoom?: (room: IRoom) => void;
};
