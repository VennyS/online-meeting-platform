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
  updateRolePermissions: (
    targetRole: RoomRole,
    permission: keyof Permissions,
    value: boolean
  ) => void;
  updateUserRole: (targetUserId: string, newRole: RoomRole) => void;
  waitingGuests: IWaitingGuest[];
  approveGuest: (guestId: string) => void;
  rejectGuest: (guestId: string) => void;
  permissionsMap: Record<RoomRole, UserPermissions>;
}

type ParticipantWithPermissions = {
  participant: RemoteParticipant | LocalParticipant;
  permissions: UserPermissions;
};

// ---------- Хук ----------
const getDefaultPermissions = (): Record<RoomRole, UserPermissions> => ({
  owner: { role: "owner", permissions: { canShareScreen: true } },
  admin: { role: "admin", permissions: { canShareScreen: true } },
  participant: { role: "participant", permissions: { canShareScreen: true } },
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

  // Универсальный отправитель сообщений
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

  const approveGuest = (guestId: string) => {
    sendMessage("host_approval", { guestId, approved: true });
  };

  const rejectGuest = (guestId: string) => {
    sendMessage("host_approval", { guestId, approved: false });
  };

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

        case "guest_approved":
          // можно обработать токен если нужно
          break;

        case "guest_rejected":
          // здесь просто игнорируем или делаем что-то
          break;
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
    updateRolePermissions,
    updateUserRole,
    waitingGuests,
    approveGuest,
    rejectGuest,
    permissionsMap,
  };
}
