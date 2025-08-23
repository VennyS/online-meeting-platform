import { IWaitingGuest } from "@/app/types/room.types";

export type ParticipantsListProps = {
  waitingGuests: IWaitingGuest[];
  approveGuest: (guestId: string) => void;
  rejectGuest: (guestId: string) => void;
};
