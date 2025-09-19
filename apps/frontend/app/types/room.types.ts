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
  timeZone?: string;
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
  timeZone: string;
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
  isFinished: boolean;
}

export interface Permissions {
  canShareScreen?: boolean;
  canStartPresentation?: boolean;
}

export interface UserPermissions {
  role: RoomRole;
  permissions: Permissions;
}

export type RoomRole = "owner" | "admin" | "participant";

type WSMessage<E extends string, D> = {
  event: E;
  data: D;
};

export type RoomWSMessage =
  | WSMessage<"init", { role: RoomRole }>
  | WSMessage<"waiting_queue_updated", { guests: IWaitingGuest[] }>
  | WSMessage<"new_guest_waiting", { guest: IWaitingGuest }>
  | WSMessage<"role_updated", { role: RoomRole; userId: string | number }>
  | WSMessage<
      "permissions_updated",
      { role: RoomRole; permissions: Partial<Permissions> }
    >
  | WSMessage<"guest_approved", { token: string }>
  | WSMessage<"guest_rejected", {}>
  | WSMessage<"roles_updated", { roles: Record<string, RoomRole> }>
  | WSMessage<
      "presentation_started",
      {
        url: string;
        authorId: string;
      }
    >
  | WSMessage<
      "presentation_page_changed",
      {
        page: string;
      }
    >;

export type RoomWSSendMessage =
  | WSMessage<
      "update_permission",
      { targetRole: RoomRole; permission: keyof Permissions; value: boolean }
    >
  | WSMessage<"update_role", { targetUserId: string; newRole: RoomRole }>
  | WSMessage<"host_approval", { guestId: string; approved: boolean }>
  | WSMessage<"guest_join_request", { name: string }>
  | WSMessage<"presentation_started", { url: string }>;
