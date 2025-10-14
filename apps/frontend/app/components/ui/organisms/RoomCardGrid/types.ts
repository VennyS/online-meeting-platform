import { ModalState } from "../RoomList/RoomList";
import { RoomWithStatus } from "../RoomList/types";

export type RoomCardGridProps = {
  rooms: RoomWithStatus[];
  onModalOpen: (params: ModalState) => void;
};
