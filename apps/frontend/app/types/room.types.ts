import { Role } from "./administration.types";

export interface Room {
  id: number;
  shortId: string;
  isPublic: boolean;
  createdAt: string;
  name: string;
  description: string | null;
  startAt: Date;
  guestAllowed: boolean;
  passwordRequired: boolean;
  waitingRoomEnabled: boolean;
  allowEarlyJoin: boolean;
  cancelled: boolean;
  finished: boolean;
  timeZone: string;
  haveFiles: boolean;
  haveReports: boolean;
  showHistoryToNewbies: boolean;
  durationMinutes: number;
  canShareScreen: Role;
  canStartPresentation: Role;
}

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
