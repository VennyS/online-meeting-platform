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
  canShareScreen?: RoomRole | "all";
  canSharePresentation?: RoomRole | "all";
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
  isBlackListed: boolean;
}

export interface Permissions {
  canShareScreen?: boolean;
  canStartPresentation?: boolean;
}

export interface UserPermissions {
  role: RoomRole;
  permissions: Permissions;
}

export interface BlacklistEntry {
  userId: string | undefined;
  ip: string;
  name: string;
}

export type RoomRole = "owner" | "admin" | "participant";
export type Role = Omit<RoomRole, "participant"> & "all";

type WSMessage<E extends string, D> = {
  event: E;
  data: D;
};

export type RoomWSMessage =
  | WSMessage<"init", { role: RoomRole }>
  | WSMessage<
      "init_host",
      { guests: IWaitingGuest[]; blacklist: BlacklistEntry[] }
    >
  | WSMessage<"waiting_queue_updated", { guests: IWaitingGuest[] }>
  | WSMessage<"new_guest_waiting", { guest: IWaitingGuest }>
  | WSMessage<"role_updated", { role: RoomRole; userId: string | number }>
  | WSMessage<
      "permissions_init",
      { role: RoomRole; permissions: Permissions }[]
    >
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
        presentationId: string;
        url: string;
        authorId: string;
        currentPage: number;
        zoom: number;
        scroll: { x: number; y: number };
        mode: "presentationWithCamera" | "presentationOnly";
      }
    >
  | WSMessage<
      "presentation_page_changed",
      { presentationId: string; page: number }
    >
  | WSMessage<
      "presentation_zoom_changed",
      { presentationId: string; zoom: number }
    >
  | WSMessage<
      "presentation_scroll_changed",
      { presentationId: string; x: number; y: number }
    >
  | WSMessage<"presentation_finished", { presentationId: string }>
  | WSMessage<
      "presentations_state",
      {
        presentations: Array<{
          presentationId: string;
          url: string;
          authorId: string;
          currentPage: number;
          zoom: number;
          scroll: { x: number; y: number };
          mode: "presentationWithCamera" | "presentationOnly";
        }>;
      }
    >
  | WSMessage<
      "presentation_mode_changed",
      {
        presentationId: string;
        mode: "presentationWithCamera" | "presentationOnly";
      }
    >
  | WSMessage<
      "blacklist_updated",
      {
        blacklist: BlacklistEntry[];
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
  | WSMessage<
      "presentation_started",
      {
        url: string;
        mode: "presentationWithCamera" | "presentationOnly";
      }
    >
  | WSMessage<
      "presentation_page_changed",
      { presentationId: string; page: number }
    >
  | WSMessage<
      "presentation_zoom_changed",
      { presentationId: string; zoom: number }
    >
  | WSMessage<
      "presentation_scroll_changed",
      { presentationId: string; x: number; y: number }
    >
  | WSMessage<"presentation_finished", { presentationId: string }>
  | WSMessage<
      "presentation_mode_changed",
      {
        presentationId: string;
        mode: "presentationWithCamera" | "presentationOnly";
      }
    >
  | WSMessage<"add_to_blacklist", { userId: string; name: string }>
  | WSMessage<
      "remove_from_blacklist",
      {
        ip: string;
      }
    >;
