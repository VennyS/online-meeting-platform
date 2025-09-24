import { useParticipants } from "@livekit/components-react";
import { LocalParticipant, RemoteParticipant } from "livekit-client";
import { useEffect, useState } from "react";
import {
  IWaitingGuest,
  Permissions,
  RoomRole,
  RoomWSMessage,
  RoomWSSendMessage,
  UserPermissions,
} from "../types/room.types";

export interface ParticipantsWithPermissions {
  local: ParticipantWithPermissions;
  remote: ParticipantWithPermissions[];
  permissionsMap: Record<RoomRole, UserPermissions>;
  waitingGuests: IWaitingGuest[];
  localPresentation?: [string, Presentation];
  remotePresentations: Map<string, Presentation>;
  updateRolePermissions: (
    targetRole: RoomRole,
    permission: keyof Permissions,
    value: boolean
  ) => void;
  updateUserRole: (targetUserId: string, newRole: RoomRole) => void;
  approveGuest: (guestId: string) => void;
  rejectGuest: (guestId: string) => void;
  startPresentation: (
    url: string,
    mode?: "presentationWithCamera" | "presentationOnly"
  ) => void;
  changePage: (presentationId: string, newPage: number) => void;
  changeZoom: (presentationId: string, newZoom: number) => void;
  changeScroll: (
    presentationId: string,
    position: { x: number; y: number }
  ) => void;
  changePresentationMode: (
    presentationId: string,
    mode: "presentationWithCamera" | "presentationOnly"
  ) => void;
  finishPresentation: (presentationId: string) => void;
  addToBlackList: (userId: string, username: string) => void;
}

export type PresentationMode = "presentationWithCamera" | "presentationOnly";

type Presentation = {
  presentationId: string;
  url: string;
  authorId: string;
  currentPage: number;
  zoom: number;
  scroll: { x: number; y: number };
  mode: PresentationMode;
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
    permissions: { canShareScreen: false, canStartPresentation: false },
  },
});

export function useParticipantsWithPermissions(
  ws: WebSocket | null,
  localUserId: number
): ParticipantsWithPermissions | null {
  const participants = useParticipants();
  const [permissionsMap, setPermissionsMap] = useState<
    Record<RoomRole, UserPermissions>
  >(getDefaultPermissions());
  const [usersRoles, setUsersRoles] = useState<Record<string, RoomRole>>({});
  const [waitingGuests, setWaitingGuests] = useState<IWaitingGuest[]>([]);
  const [presentations, setPresentations] = useState<Map<string, Presentation>>(
    new Map()
  );
  const localParticipant = participants.find((p) => p.isLocal);
  const remoteParticipants = participants.filter((p) => !p.isLocal);

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

  function startPresentation(
    url: string,
    mode:
      | "presentationWithCamera"
      | "presentationOnly" = "presentationWithCamera"
  ) {
    sendMessage("presentation_started", { url, mode });
  }

  function changePage(presentationId: string, newPage: number) {
    sendMessage("presentation_page_changed", { presentationId, page: newPage });
  }

  function changeZoom(presentationId: string, newZoom: number) {
    sendMessage("presentation_zoom_changed", { presentationId, zoom: newZoom });
  }

  function changeScroll(
    presentationId: string,
    position: { x: number; y: number }
  ) {
    sendMessage("presentation_scroll_changed", {
      presentationId,
      x: position.x,
      y: position.y,
    });
  }

  function changePresentationMode(
    presentationId: string,
    mode: "presentationWithCamera" | "presentationOnly"
  ) {
    sendMessage("presentation_mode_changed", { presentationId, mode });
  }

  function finishPresentation(presentationId: string) {
    sendMessage("presentation_finished", { presentationId });
  }

  function addToBlackList(userId: string, username: string) {
    sendMessage("add_to_blacklist", { userId, name: username });
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

        case "permissions_init":
          const newPermissionsMap = message.data.reduce<
            Record<RoomRole, UserPermissions>
          >((acc, { role, permissions }) => {
            acc[role] = { role, permissions };
            return acc;
          }, {} as Record<RoomRole, UserPermissions>);

          setPermissionsMap(newPermissionsMap);
          break;

        case "role_updated":
          setUsersRoles((prev) => ({
            ...prev,
            [String(data.userId)]: data.role,
          }));
          break;

        case "roles_updated":
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

        case "presentations_state":
          setPresentations((prev) => {
            const newPresentations = new Map();
            data.presentations.forEach((p: Presentation) => {
              newPresentations.set(p.presentationId, p);
            });
            return newPresentations;
          });
          break;

        case "presentation_started":
          setPresentations((prev) => {
            const newPresentations = new Map(prev);
            newPresentations.set(data.presentationId, {
              presentationId: data.presentationId,
              url: data.url,
              authorId: data.authorId,
              currentPage: data.currentPage,
              zoom: data.zoom,
              scroll: data.scroll,
              mode: data.mode || "presentationWithCamera",
            });
            return newPresentations;
          });
          break;

        case "presentation_page_changed":
          setPresentations((prev) => {
            const presentation = prev.get(data.presentationId);
            if (!presentation) return prev;
            return new Map(prev).set(data.presentationId, {
              ...presentation,
              currentPage: data.page,
            });
          });
          break;

        case "presentation_zoom_changed":
          setPresentations((prev) => {
            const presentation = prev.get(data.presentationId);
            if (!presentation) return prev;
            return new Map(prev).set(data.presentationId, {
              ...presentation,
              zoom: data.zoom,
            });
          });
          break;

        case "presentation_scroll_changed":
          if (
            presentations.get(data.presentationId)?.authorId ===
            String(localUserId)
          ) {
            break;
          }
          setPresentations((prev) => {
            const presentation = prev.get(data.presentationId);
            if (!presentation) return prev;
            return new Map(prev).set(data.presentationId, {
              ...presentation,
              scroll: { x: data.x, y: data.y },
            });
          });
          break;

        case "presentation_mode_changed":
          setPresentations((prev) => {
            const presentation = prev.get(data.presentationId);
            if (!presentation) return prev;
            return new Map(prev).set(data.presentationId, {
              ...presentation,
              mode: data.mode,
            });
          });
          break;

        case "presentation_finished":
          setPresentations((prev) => {
            const newPresentations = new Map(prev);
            newPresentations.delete(data.presentationId);
            return newPresentations;
          });
          break;
      }
    };
  }, [ws, localUserId, presentations]);

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

  const localPresentation: [string, Presentation] | undefined = Array.from(
    presentations.entries()
  ).find(([, presentation]) => presentation.authorId === String(localUserId));

  const remotePresentations: Map<string, Presentation> = new Map(
    Array.from(presentations.entries()).filter(
      ([, presentation]) => presentation.authorId !== String(localUserId)
    )
  );

  return {
    local,
    remote,
    permissionsMap,
    waitingGuests,
    localPresentation,
    remotePresentations,
    updateRolePermissions,
    updateUserRole,
    approveGuest,
    rejectGuest,
    startPresentation,
    changePage,
    changeZoom,
    changeScroll,
    changePresentationMode,
    finishPresentation,
    addToBlackList,
  };
}
