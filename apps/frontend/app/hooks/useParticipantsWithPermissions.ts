import { useParticipants, useRoomContext } from "@livekit/components-react";
import {
  LocalParticipant,
  Participant,
  RemoteParticipant,
  RoomEvent,
  Track,
} from "livekit-client";
import { useEffect, useMemo, useState } from "react";
import {
  BlacklistEntry,
  IWaitingGuest,
  Permissions,
  RoomRole,
  RoomWSMessage,
  RoomWSSendMessage,
  UserPermissions,
} from "../types/room.types";
import stringToColor from "../lib/stringToColor";

export enum Panel {
  Chat = "chat",
  Participants = "participants",
  Files = "files",
}

export interface ParticipantsWithPermissions {
  local: ParticipantWithPermissions;
  remote: ParticipantWithPermissions[];
  permissionsMap: Record<RoomRole, UserPermissions>;
  waitingGuests: IWaitingGuest[];
  presentations: Presentation[];
  blacklist: BlacklistEntry[];
  isRecording: boolean;
  openedRightPanel: Panel | undefined;
  unreadCount: number;
  updateRolePermissions: (
    targetRole: RoomRole,
    permission: keyof Permissions,
    value: boolean
  ) => void;
  updateUserRole: (targetUserId: string, newRole: RoomRole) => void;
  approveGuest: (guestId: string) => void;
  rejectGuest: (guestId: string) => void;
  startPresentation: (
    fileId: number,
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
  removeFromBlackList: (ip: string) => void;
  startRecording: () => void;
  stopRecording: () => void;
  handleChangeOpenPanel: (panel: Panel | undefined) => void;
}

export type PresentationMode = "presentationWithCamera" | "presentationOnly";

export type Presentation = {
  id: string;
  fileId: string;
  presentationId: string;
  url: string;
  authorId: string;
  currentPage: number;
  zoom: number;
  scroll: { x: number; y: number };
  mode: PresentationMode;
  source: Track.Source;
  participant: Participant;
  local: boolean;
};

type ParticipantWithPermissions = {
  participant: RemoteParticipant | LocalParticipant;
  permissions: UserPermissions;
  avatarUrl?: string | null;
  avatarColor: string;
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
  const [isReady, setIsReady] = useState(false);
  const participants = useParticipants();
  const [permissionsMap, setPermissionsMap] = useState<
    Record<RoomRole, UserPermissions>
  >(getDefaultPermissions());
  const [usersRoles, setUsersRoles] = useState<Record<string, RoomRole>>({});
  const [waitingGuests, setWaitingGuests] = useState<IWaitingGuest[]>([]);
  const [presentations, setPresentations] = useState<
    Record<string, Omit<Presentation, "source" | "participant" | "local">>
  >({});
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);

  const localParticipant = participants.find((p) => p.isLocal);
  const remoteParticipants = participants.filter((p) => !p.isLocal);
  const [isRecording, setIsRecording] = useState(false);
  const [egressId, setEgressId] = useState<string>();

  const room = useRoomContext();

  const [unreadCount, setUnreadCount] = useState(0);
  const [openedRightPanel, setOpenedRightPanel] = useState<Panel>();

  const handleChangeOpenPanel = (panel: Panel | undefined) => {
    if (panel !== openedRightPanel) {
      setOpenedRightPanel(panel);
      return;
    }
    setOpenedRightPanel(undefined);
  };

  useEffect(() => {
    if (!room) return;

    const handleMessage = () => {
      if (openedRightPanel !== "chat") {
        setUnreadCount((prev) => prev + 1);
      }
    };

    room.on(RoomEvent.DataReceived, handleMessage);
    room.on(RoomEvent.Disconnected, () => {
      // router.replace("/404");
    });
    return () => {
      room.off(RoomEvent.DataReceived, handleMessage);
    };
  }, [room, openedRightPanel]);

  useEffect(() => {
    if (openedRightPanel === "chat") setUnreadCount(0);
  }, [openedRightPanel]);

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

  function removeFromBlackList(ip: string) {
    sendMessage("remove_from_blacklist", { ip });
  }

  function startPresentation(
    fileId: number,
    url: string,
    mode:
      | "presentationWithCamera"
      | "presentationOnly" = "presentationWithCamera"
  ) {
    sendMessage("presentation_started", { fileId, url, mode });
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

  function startRecording() {
    sendMessage("recording_started", {});
  }

  function stopRecording() {
    if (!egressId) return;
    sendMessage("recording_finished", { egressId });
  }

  if (ws && !isReady) {
    sendMessage("ready", {});
    setIsReady(true);
  }

  useEffect(() => {
    if (!ws) return;

    ws.addEventListener("message", (event: MessageEvent) => {
      const message: RoomWSMessage = JSON.parse(event.data);
      const { event: evt, data } = message;

      switch (evt) {
        case "ready": {
          sendMessage("ready", {});
          break;
        }
        case "init_host":
          setBlacklist(data.blacklist);
          setWaitingGuests(data.guests);
          break;

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
          const newPermissionsMap = Object.entries(message.data).reduce<
            Record<RoomRole, UserPermissions>
          >((acc, [role, permissions]) => {
            acc[role as RoomRole] = { role: role as RoomRole, permissions };
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

        case "presentations_state":
          setPresentations(() => {
            const newPresentations: Record<
              string,
              Omit<Presentation, "source" | "participant" | "local">
            > = {};
            data.presentations.forEach(
              (
                p: Omit<Presentation, "id" | "source" | "participant" | "local">
              ) => {
                newPresentations[p.presentationId] = {
                  ...p,
                  id: p.presentationId,
                };
              }
            );
            return newPresentations;
          });
          break;

        case "presentation_started":
          setPresentations((prev) => ({
            ...prev,
            [data.presentationId]: { ...data, id: data.presentationId },
          }));
          break;

        case "presentation_page_changed":
          setPresentations((prev) => {
            const presentation = prev[data.presentationId];
            if (!presentation || presentation.currentPage === data.page) {
              return prev;
            }
            return {
              ...prev,
              [data.presentationId]: {
                ...presentation,
                currentPage: data.page,
              },
            };
          });
          break;

        case "presentation_zoom_changed":
          setPresentations((prev) => {
            const presentation = prev[data.presentationId];
            if (!presentation || presentation.zoom === data.zoom) {
              return prev;
            }
            return {
              ...prev,
              [data.presentationId]: {
                ...presentation,
                zoom: data.zoom,
              },
            };
          });
          break;

        case "presentation_scroll_changed":
          if (
            !presentations ||
            Object.values(presentations).length === 0 ||
            presentations[data.presentationId]?.authorId ===
              localParticipant?.identity
          ) {
            break;
          }

          setPresentations((prev) => {
            const presentation = prev[data.presentationId];
            if (
              !presentation ||
              (presentation.scroll.x === data.x &&
                presentation.scroll.y === data.y)
            ) {
              return prev;
            }
            return {
              ...prev,
              [data.presentationId]: {
                ...presentation,
                scroll: { x: data.x, y: data.y },
              },
            };
          });
          break;

        case "presentation_mode_changed":
          setPresentations((prev) => {
            const presentation = prev[data.presentationId];
            if (!presentation || presentation.mode === data.mode) {
              return prev;
            }
            return {
              ...prev,
              [data.presentationId]: {
                ...presentation,
                mode: data.mode,
              },
            };
          });
          break;

        case "presentation_finished":
          setPresentations((prev) => {
            const newPresentations = { ...prev };
            delete newPresentations[data.presentationId];
            return newPresentations;
          });
          break;

        case "blacklist_updated":
          setBlacklist(data.blacklist);
          break;

        case "recording_started":
          setEgressId(data.egressId);
          setIsRecording(true);
          break;

        case "recording_finished":
          setIsRecording(false);
          setEgressId(undefined);
          break;
      }
    });
  }, [ws, localUserId, presentations]);

  if (!localParticipant) return null;

  const localRole = usersRoles[localParticipant?.identity] || "participant";

  // TODO: get avatarUrl from participant.metadata
  const local: ParticipantWithPermissions = {
    participant: localParticipant,
    permissions: {
      role: localRole,
      permissions: permissionsMap[localRole]?.permissions || {},
    },
    avatarColor: stringToColor(localParticipant.name || "Anonymous"),
    // avatarUrl: localParticipant.metadata?.avatarUrl || null,
  };

  const remote: ParticipantWithPermissions[] = remoteParticipants.map((p) => {
    const role = usersRoles[p.identity] || "participant";
    // const metadata = p.metadata ? JSON.parse(p.metadata) : {};
    // const avatarUrl = metadata.avatarUrl || null;

    return {
      participant: p,
      permissions: {
        role,
        permissions: permissionsMap[role]?.permissions || {},
      },
      avatarColor: stringToColor(p.name || "Anonymous"),
      // avatarUrl,
    };
  });

  const allPresentations: Presentation[] = useMemo(
    () =>
      Object.values(presentations)
        .map((p) => {
          const participant =
            p.authorId === localParticipant?.identity
              ? localParticipant
              : remote.find((r) => r.participant.identity === p.authorId)
                  ?.participant;

          if (!participant) return null;

          return {
            ...p,
            participant,
            source: Track.Source.Unknown,
            local: participant.sid === localParticipant.sid,
          };
        })
        .filter(Boolean) as (Presentation & { source: Track.Source })[],
    [presentations, localParticipant, remote]
  );

  return {
    local,
    remote,
    permissionsMap,
    waitingGuests,
    presentations: allPresentations,
    blacklist,
    isRecording,
    openedRightPanel,
    unreadCount,
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
    removeFromBlackList,
    startRecording,
    stopRecording,
    handleChangeOpenPanel,
  };
}
