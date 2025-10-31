import { Role } from "@/app/types/administration.types";

export interface CreateRoomDto {
  ownerId: number;
  name: string;
  description?: string;
  startAt?: string;
  durationMinutes?: number;
  isPublic?: boolean;
  showHistoryToNewbies?: boolean;
  password?: string;
  waitingRoomEnabled?: boolean;
  allowEarlyJoin?: boolean;
  timeZone?: string;
  canShareScreen?: Role;
  canStartPresentation?: Role;
}
