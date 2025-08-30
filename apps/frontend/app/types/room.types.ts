export interface CreateRoomDto {
  ownerId: number;
  name: string;
  description?: string;
  startAt?: string; // ISO
  durationMinutes?: number;
  isPublic?: boolean;
  showHistoryToNewbies?: boolean;
  password?: string;
  waitingRoomEnabled?: boolean;
  allowEarlyJoin?: boolean;
}

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
}

export interface IRoom {
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
}

export interface IWaitingGuest {
  guestId: string;
  name: string;
  requestedAt: string;
}

export interface IPrequisites {
  name: string;
  description: string | null;
  startAt: Date;
  guestAllowed: boolean;
  passwordRequired: boolean;
  waitingRoomEnabled: boolean;
  allowEarlyJoin: boolean;
  isOwner: boolean;
  cancelled: boolean;
}

export interface Permissions {
  canShareScreen?: boolean;
}

export interface UserPermissions {
  role: RoomRole;
  permissions: Permissions;
}

export type RoomRole = "owner" | "admin" | "participant";

export type RoomWSMessage =
  | { type: "init"; role: RoomRole }
  | { type: "waiting_queue_updated"; guests: IWaitingGuest[] }
  | { type: "new_guest_waiting"; guest: IWaitingGuest }
  | { type: "role_updated"; role: RoomRole; userId: string }
  | {
      type: "permissions_updated";
      role: RoomRole;
      permissions: Partial<Permissions>;
    }
  | { type: "guest_approved"; token: string }
  | { type: "guest_rejected" }
  | { type: "roles_updated"; roles: Record<string, RoomRole> };
