import { IRoom } from "@/app/types/room.types";
import { ModalState } from "../RoomList/RoomList";

export type RoomCardGridProps = {
  rooms: IRoom[];
  onModalOpen: (params: ModalState) => void;
};
