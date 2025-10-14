import { ModalState } from "../RoomList/RoomList";
import { RoomWithStatus } from "../RoomList/types";

export type RoomTableProps = {
  rooms: RoomWithStatus[];
  onModalOpen: (params: ModalState) => void;
};
