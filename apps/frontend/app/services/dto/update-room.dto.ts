import { Role } from "@/app/types/administration.types";

export interface UpdateRoomDto {
  name?: string;
  description?: string;
  startAt?: string;
  durationMinutes?: number;
  isPublic?: boolean;
  showHistoryToNewbies?: boolean;
  password?: string;
  waitingRoomEnabled?: boolean;
  allowEarlyJoin?: boolean;
  cancelled?: boolean;
  timeZone?: string;
  canShareScreen?: Role;
  canStartPresentation?: Role;
}
