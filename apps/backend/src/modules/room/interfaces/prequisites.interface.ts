export interface Prequisites {
  name: string;
  description: string | null;
  startAt: Date;
  guestAllowed: boolean;
  passwordRequired: boolean;
  waitingRoomEnabled: boolean;
  allowEarlyJoin: boolean;
  isOwner: boolean;
  cancelled: boolean;
  isFinished: boolean;
  isBlackListed: boolean;
}
