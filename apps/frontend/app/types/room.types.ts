import { Track } from "livekit-client";
import { Message } from "../components/ui/organisms/Chat/types";
import { TrackReference } from "@livekit/components-react";

export type PresentationMode = "presentationWithCamera" | "presentationOnly";

export type Presentation = {
  id: string;
  fileId: string;
  presentationId: string;
  url: string;
  authorId: string;
  page: number;
  zoom: number;
  scroll: { x: number; y: number };
  mode: PresentationMode;
  source: Track.Source;
  participant: Participant;
  local: boolean;
  video?: TrackReference;
};

export type PresentationDto = Omit<
  Presentation,
  "id" | "source" | "participant" | "local" | "video"
>;

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
  finished: boolean;
  timeZone: string;
  haveFiles: boolean;
  haveReports: boolean;
  showHistoryToNewbies: boolean;
  durationMinutes: number;
  canShareScreen: Role;
  canStartPresentation: Role;
}

export interface MeetingReports {
  sessions: MeetingReport[];
}

export interface MeetingReport {
  id: number;
  roomId: number;
  startTime: string;
  endTime?: string;
  duration?: number;
  participants: Participant[];
}

export interface Participant {
  id: number;
  userId: number;
  name: string;
  sessions: ParticipantSession[];
}

export interface ParticipantSession {
  joinTime: string;
  leaveTime?: string;
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

export interface Permissions {
  canShareScreen?: boolean;
  canStartPresentation?: boolean;
}

export const RoomRoleMap = {
  owner: "Владелец",
  admin: "Администратор",
  participant: "Участник",
};

export type Role = "OWNER" | "ADMIN" | "ALL";

export type WSMessage<E extends string, D> = {
  event: E;
  data: D;
};

export type RoomWSMessage =
  | WSMessage<
      "init_host",
      { guests: IWaitingGuest[]; blacklist: BlacklistEntry[] }
    >
  | WSMessage<"ready", {}>
  | WSMessage<"waiting_queue_updated", { guests: IWaitingGuest[] }>
  | WSMessage<"new_guest_waiting", { guest: IWaitingGuest }>
  | WSMessage<"role_updated", { role: RoomRole; userId: string | number }>
  | WSMessage<"permissions_init", Record<RoomRole, Permissions>>
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
        fileId: string;
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
          fileId: string;
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
    >
  | WSMessage<"recording_started", { egressId: string }>
  | WSMessage<"recording_finished", { egressId: string }>
  | WSMessage<
      "recording_storage_overflow",
      { totalVideoSize: number; constraint: number; causedById: number }
    >;

export type RoomWSSendMessage =
  | WSMessage<
      "update_permission",
      { targetRole: RoomRole; permission: keyof Permissions; value: boolean }
    >
  | WSMessage<"ready", {}>
  | WSMessage<"update_role", { targetUserId: string; newRole: RoomRole }>
  | WSMessage<"host_approval", { guestId: string; approved: boolean }>
  | WSMessage<"guest_join_request", { name: string }>
  | WSMessage<
      "presentation_started",
      {
        fileId: number;
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
    >
  | WSMessage<"recording_started", {}>
  | WSMessage<"recording_finished", { egressId: string }>;

export interface RoomServerToClientEvents {
  blacklist_init: (data: { blacklist: BlacklistEntry[] }) => void;
  init_host: (data: {
    guests: IWaitingGuest[];
    blacklist: BlacklistEntry[];
  }) => void;
  ready: (data: {}) => void;
  waiting_queue_updated: (data: { guests: IWaitingGuest[] }) => void;
  new_guest_waiting: (data: { guest: IWaitingGuest }) => void;
  role_updated: (data: { role: RoomRole; userId: string | number }) => void;
  permissions_init: (data: Record<RoomRole, Permissions>) => void;
  permissions_updated: (data: {
    role: RoomRole;
    permissions: Partial<Permissions>;
  }) => void;
  guest_approved: (data: { token: string }) => void;
  guest_rejected: (data: {}) => void;
  roles_updated: (data: { roles: Record<string, RoomRole> }) => void;
  presentation_started: (data: PresentationDto) => void;
  presentation_page_changed: (data: {
    presentationId: string;
    page: number;
  }) => void;
  presentation_zoom_changed: (data: {
    presentationId: string;
    zoom: number;
  }) => void;
  presentation_scroll_changed: (
    data: Pick<Presentation, "presentationId" | "scroll">
  ) => void;
  presentation_finished: (data: { presentationId: string }) => void;
  presentations_init: (data: { presentations: PresentationDto[] }) => void;
  presentation_mode_changed: (data: {
    presentationId: string;
    mode: "presentationWithCamera" | "presentationOnly";
  }) => void;
  blacklist_updated: (data: { blacklist: BlacklistEntry[] }) => void;
  recording_started: (data: { egressId: string }) => void;
  recording_finished: (data: { egressId: string }) => void;
  recording_storage_overflow: (data: {
    totalVideoSize: number;
    constraint: number;
    causedById: number;
  }) => void;
  init_chat: (data: { messages: Message[] }) => void;
}

export interface RoomClientToServerEvents {
  update_permission: (data: {
    targetRole: RoomRole;
    permission: keyof Permissions;
    value: boolean;
  }) => void;
  ready: (data: {}) => void;
  update_role: (data: { targetUserId: string; newRole: RoomRole }) => void;
  host_approval: (data: { guestId: string; approved: boolean }) => void;
  guest_join_request: (data: { name: string }) => void;
  presentation_started: (data: {
    fileId: number;
    url: string;
    mode: "presentationWithCamera" | "presentationOnly";
  }) => void;
  presentation_page_changed: (data: {
    presentationId: string;
    page: number;
  }) => void;
  presentation_zoom_changed: (data: {
    presentationId: string;
    zoom: number;
  }) => void;
  presentation_scroll_changed: (data: {
    presentationId: string;
    scroll: { x: number; y: number };
  }) => void;
  presentation_finished: (data: { presentationId: string }) => void;
  presentation_mode_changed: (data: {
    presentationId: string;
    mode: "presentationWithCamera" | "presentationOnly";
  }) => void;
  add_to_blacklist: (data: { userId: string; name: string }) => void;
  remove_from_blacklist: (data: { ip: string }) => void;
  recording_started: (data: {}) => void;
  recording_finished: (data: { egressId: string }) => void;
  new_message: (data: { message: Omit<Message, "id" | "createdAt"> }) => void;
}
