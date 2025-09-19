import { useParticipants } from "@livekit/components-react";
import { LocalParticipant, RemoteParticipant } from "livekit-client";
import { useEffect } from "react";
import {
  IWaitingGuest,
  Permissions,
  RoomRole,
  RoomWSMessage,
  RoomWSSendMessage,
  UserPermissions,
} from "../types/room.types";
import React from "react";

export interface ParticipantsWithPermissions {
  local: ParticipantWithPermissions;
  remote: ParticipantWithPermissions[];
  permissionsMap: Record<RoomRole, UserPermissions>;
  waitingGuests: IWaitingGuest[];
  presentation?: Presentation;
  updateRolePermissions: (
    targetRole: RoomRole,
    permission: keyof Permissions,
    value: boolean
  ) => void;
  updateUserRole: (targetUserId: string, newRole: RoomRole) => void;
  approveGuest: (guestId: string) => void;
  rejectGuest: (guestId: string) => void;
  startPresentation: (url: string) => void;
  changePage: (newPage: number) => void;
  changeZoom: (newZoom: number) => void;
}

type Presentation = {
  authorId: string;
  url: string;
  currentPage: number;
  zoom: number;
};

type ParticipantWithPermissions = {
  participant: RemoteParticipant | LocalParticipant;
  permissions: UserPermissions;
};

const getDefaultPermissions = (): Record<RoomRole, UserPermissions> => ({
  owner: {
    role: "owner",
    permissions: { canShareScreen: true, canStartPresentation: true },
  },
  admin: {
    role: "admin",
    permissions: { canShareScreen: true, canStartPresentation: true },
  },
  participant: {
    role: "participant",
    permissions: { canShareScreen: true, canStartPresentation: true },
  },
});

export function useParticipantsWithPermissions(
  ws: WebSocket | null,
  localUserId: number
): ParticipantsWithPermissions | null {
  const participants = useParticipants();
  const [permissionsMap, setPermissionsMap] = React.useState<
    Record<RoomRole, UserPermissions>
  >(getDefaultPermissions());
  const [usersRoles, setUsersRoles] = React.useState<Record<string, RoomRole>>(
    {}
  );
  const [waitingGuests, setWaitingGuests] = React.useState<IWaitingGuest[]>([]);
  const localParticipant = participants.find((p) => p.isLocal);
  const remoteParticipants = participants.filter((p) => !p.isLocal);
  const [presentation, setPresentation] = React.useState<Presentation>();

  function sendMessage<E extends RoomWSSendMessage["event"]>(
    event: E,
    data: Extract<RoomWSSendMessage, { event: E }>["data"]
  ) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ event, data }));
  }

  function updateRolePermissions(
    targetRole: RoomRole,
    permission: keyof Permissions,
    value: boolean
  ) {
    sendMessage("update_permission", { targetRole, permission, value });
  }

  function updateUserRole(targetUserId: string, newRole: RoomRole) {
    sendMessage("update_role", { targetUserId, newRole });
  }

  function approveGuest(guestId: string) {
    sendMessage("host_approval", { guestId, approved: true });
  }

  function rejectGuest(guestId: string) {
    sendMessage("host_approval", { guestId, approved: false });
  }

  function startPresentation(url: string) {
    sendMessage("presentation_started", { url: url });
  }

  function changePage(newPage: number) {
    sendMessage("presentation_page_changed", { page: newPage });
  }

  function changeZoom(newZoom: number) {
    sendMessage("presentation_zoom_changed", { zoom: newZoom });
  }

  useEffect(() => {
    if (!ws) return;

    ws.onmessage = (event: MessageEvent) => {
      const message: RoomWSMessage = JSON.parse(event.data);
      const { event: evt, data } = message;

      switch (evt) {
        case "permissions_updated":
          setPermissionsMap((prev) => ({
            ...prev,
            [data.role]: {
              ...prev[data.role],
              permissions: data.permissions,
            },
          }));
          break;

        case "role_updated":
          setUsersRoles((prev) => ({
            ...prev,
            [String(data.userId)]: data.role,
          }));
          break;

        case "roles_updated":
          // приводим ключи к строкам
          const roles: Record<string, RoomRole> = {};
          for (const [id, role] of Object.entries(data.roles)) {
            roles[String(id)] = role;
          }
          setUsersRoles((prev) => ({
            ...prev,
            ...roles,
          }));
          break;

        case "waiting_queue_updated":
          setWaitingGuests(data.guests);
          break;

        case "new_guest_waiting":
          setWaitingGuests((prev) => [...prev, data.guest]);
          break;

        case "init":
          setUsersRoles((prev) => ({
            ...prev,
            [String(localUserId)]: data.role,
          }));
          break;

        case "presentation_started":
          setPresentation((prev) => ({
            ...prev,
            ...data,
            zoom: 1,
            currentPage: 1, // гарантируем число
          }));
          break;

        case "presentation_page_changed":
          setPresentation((prev) => {
            if (!prev) return prev; // или return undefined — не обновляем, если ещё не было презентации

            return {
              ...prev,
              currentPage: Number(data.page),
            };
          });
          break;

        case "presentation_zoom_changed": {
          setPresentation((prev) => {
            if (!prev) return prev; // или return undefined — не обновляем, если ещё не было презентации

            return {
              ...prev,
              zoom: Number(data.zoom),
            };
          });
          break;
        }
      }
    };
  }, [ws, localUserId]);

  if (!localParticipant) return null;

  const localRole = usersRoles[String(localUserId)] || "participant";

  const local: ParticipantWithPermissions = {
    participant: localParticipant,
    permissions: {
      role: localRole,
      permissions: permissionsMap[localRole]?.permissions || {},
    },
  };

  const remote: ParticipantWithPermissions[] = remoteParticipants.map((p) => {
    const role = usersRoles[p.identity] || "participant";
    return {
      participant: p,
      permissions: {
        role,
        permissions: permissionsMap[role]?.permissions || {},
      },
    };
  });

  return {
    local,
    remote,
    permissionsMap,
    waitingGuests,
    presentation,
    updateRolePermissions,
    updateUserRole,
    approveGuest,
    rejectGuest,
    startPresentation,
    changePage,
    changeZoom,
  };
}
