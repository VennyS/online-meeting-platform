import { Socket } from "socket.io-client";
import { BlacklistEntry } from "../hooks/useBlacklist";
import { Message } from "./chat.types";
import { RoomRole, Permissions } from "./administration.types";
import { Presentation, PresentationDto } from "./presentation.types";
import { WaitingGuest } from "./waiting.types";

export interface GuestServerEvents {
  init_host: (data: {
    guests: WaitingGuest[];
    blacklist: BlacklistEntry[];
  }) => void;
  waiting_queue_updated: (data: { guests: WaitingGuest[] }) => void;
  new_guest_waiting: (data: { guest: WaitingGuest }) => void;
  guest_approved: (data: { token: string; guestId: number }) => void;
  guest_rejected: (data: {}) => void;
}

export interface GuestClientEvents {
  host_approval: (data: { guestId: string; approved: boolean }) => void;
  guest_join_request: (data: { name: string }) => void;
}

export interface AdministrationServerEvents {
  role_updated: (data: { role: RoomRole; userId: string | number }) => void;
  roles_updated: (data: { roles: Record<string, RoomRole> }) => void;
  permissions_init: (data: Record<RoomRole, Permissions>) => void;
  permissions_updated: (data: {
    role: RoomRole;
    permissions: Partial<Permissions>;
  }) => void;
}

export interface AdministrationClientEvents {
  update_permission: (data: {
    targetRole: RoomRole;
    permission: keyof Permissions;
    value: boolean;
  }) => void;
  update_role: (data: { targetUserId: string; newRole: RoomRole }) => void;
}

export interface PresentationServerEvents {
  presentations_init: (data: { presentations: PresentationDto[] }) => void;
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
  presentation_mode_changed: (data: {
    presentationId: string;
    mode: "presentationWithCamera" | "presentationOnly";
  }) => void;
}

export interface PresentationClientEvents {
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
}

export interface BlacklistServerEvents {
  blacklist_init: (data: { blacklist: BlacklistEntry[] }) => void;
  blacklist_updated: (data: { blacklist: BlacklistEntry[] }) => void;
}

export interface BlacklistClientEvents {
  add_to_blacklist: (data: { userId: string; name: string }) => void;
  remove_from_blacklist: (data: { ip: string }) => void;
}

export interface RecordingServerEvents {
  recording_started: (data: { egressId: string }) => void;
  recording_finished: (data: { egressId: string }) => void;
  recording_storage_overflow: (data: {
    totalVideoSize: number;
    constraint: number;
    causedById: number;
  }) => void;
}

export interface RecordingClientEvents {
  recording_started: (data: {}) => void;
  recording_finished: (data: { egressId: string }) => void;
}

export interface ChatServerEvents {
  init_chat: (data: { messages: Message[] }) => void;
}

export interface ChatClientEvents {
  new_message: (data: { message: Omit<Message, "id" | "createdAt"> }) => void;
}

export type RoomServerToClientEvents = GuestServerEvents &
  AdministrationServerEvents &
  PresentationServerEvents &
  BlacklistServerEvents &
  RecordingServerEvents &
  ChatServerEvents;
export type RoomClientToServerEvents = GuestClientEvents &
  AdministrationClientEvents &
  PresentationClientEvents &
  BlacklistClientEvents &
  RecordingClientEvents &
  ChatClientEvents;

export type RoomSocket = Socket<
  RoomServerToClientEvents,
  RoomClientToServerEvents
>;
