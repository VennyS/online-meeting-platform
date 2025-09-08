import { useParticipants } from "@livekit/components-react";
import { LocalParticipant, RemoteParticipant } from "livekit-client";
import { useEffect } from "react";
import {
  IWaitingGuest,
  Permissions,
  RoomRole,
  RoomWSMessage,
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
  participant: RemoteParticipant | LocalParticipant; // объект из LiveKit
  permissions: UserPermissions;
};

const getDefaultPermissions = (): Record<RoomRole, UserPermissions> => ({
  owner: {
    role: "owner",
    permissions: {
      canShareScreen: true,
    },
  },
  admin: {
    role: "admin",
    permissions: {
      canShareScreen: true,
    },
  },
  participant: {
    role: "participant",
    permissions: {
      canShareScreen: true,
    },
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

  function updateRolePermissions(
    targetRole: RoomRole,
    permission: keyof Permissions,
    value: boolean
  ) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(
      JSON.stringify({
        type: "update_permission",
        targetRole,
        permission,
        value,
      })
    );
  }

  function updateUserRole(targetUserId: string, newRole: RoomRole) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(
      JSON.stringify({
        type: "update_role",
        targetUserId,
        newRole,
      })
    );
  }

  const approveGuest = (guestId: string) => {
    if (!ws) return;
    ws.send(JSON.stringify({ type: "host_approval", guestId, approved: true }));
  };

  const rejectGuest = (guestId: string) => {
    if (!ws) return;
    ws.send(
      JSON.stringify({ type: "host_approval", guestId, approved: false })
    );
  };

  useEffect(() => {
    if (!ws) return;
    ws.onmessage = (event: MessageEvent) => {
      const message: RoomWSMessage = JSON.parse(event.data);

      switch (message.type) {
        case "permissions_updated":
          setPermissionsMap((prev) => ({
            ...prev,
            [message.role]: {
              ...prev[message.role],
              permissions: message.permissions,
            },
          }));
          break;
        case "role_updated":
          setUsersRoles((prev) => ({
            ...prev,
            [message.userId]: message.role,
          }));
          break;
        case "roles_updated":
          setUsersRoles((prev) => ({
            ...prev,
            ...message.roles,
          }));
          break;
        case "waiting_queue_updated":
          setWaitingGuests(message.guests);
          break;
        case "new_guest_waiting":
          setWaitingGuests((prev) => [...prev, message.guest]);
          break;
        case "init":
          setUsersRoles((prev) => ({
            ...prev,
            [localUserId]: message.role,
          }));
          break;
      }
    };
  }, [ws]);

  if (!localParticipant) return null;

  const localRole = usersRoles[localUserId] || "participant";

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
