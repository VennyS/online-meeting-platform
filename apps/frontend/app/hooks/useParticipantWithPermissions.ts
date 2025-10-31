import {
  useLocalParticipant,
  useRemoteParticipants,
} from "@livekit/components-react";
import { useEffect, useState } from "react";
import { LocalParticipant, RemoteParticipant } from "livekit-client";
import stringToColor from "../lib/stringToColor";
import {
  RoomRole,
  UserPermissions,
  Permissions,
} from "../types/administration.types";
import { RoomSocket } from "../types/socket.types";

export interface ParticipantsWithPermissions {
  local: ParticipantWithPermissions;
  remote: ParticipantWithPermissions[];
  permissionsMap: Record<RoomRole, UserPermissions>;
  updateRolePermissions: (
    targetRole: RoomRole,
    permission: keyof Permissions,
    value: boolean
  ) => void;
  updateUserRole: (targetUserId: string, newRole: RoomRole) => void;
}

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
  socket: RoomSocket | null
): ParticipantsWithPermissions {
  const { localParticipant: local } = useLocalParticipant();
  const remote = useRemoteParticipants();

  const [permissionsMap, setPermissionsMap] = useState<
    Record<RoomRole, UserPermissions>
  >(getDefaultPermissions());
  const [usersRoles, setUsersRoles] = useState<Record<string, RoomRole>>({});

  function updateRolePermissions(
    targetRole: RoomRole,
    permission: keyof Permissions,
    value: boolean
  ) {
    socket?.emit("update_permission", { targetRole, permission, value });
  }

  function updateUserRole(targetUserId: string, newRole: RoomRole) {
    socket?.emit("update_role", { targetUserId, newRole });
  }

  useEffect(() => {
    if (!socket) return;

    const handlePermissionsUpdated = (data: {
      role: RoomRole;
      permissions: Partial<Permissions>;
    }) => {
      setPermissionsMap((prev) => ({
        ...prev,
        [data.role]: {
          ...prev[data.role],
          permissions: data.permissions,
        },
      }));
    };

    const handlePermissionInit = (data: Record<RoomRole, Permissions>) => {
      const newPermissionsMap = Object.entries(data).reduce<
        Record<RoomRole, UserPermissions>
      >((acc, [role, permissions]) => {
        acc[role as RoomRole] = { role: role as RoomRole, permissions };
        return acc;
      }, {} as Record<RoomRole, UserPermissions>);
      setPermissionsMap(newPermissionsMap);
    };

    const handleRoleUpdate = (data: {
      role: RoomRole;
      userId: string | number;
    }) => {
      setUsersRoles((prev) => ({
        ...prev,
        [String(data.userId)]: data.role,
      }));
    };

    const handleRolesUpdate = (data: { roles: Record<string, RoomRole> }) => {
      console.log("Received roles", data);

      const roles: Record<string, RoomRole> = {};
      for (const [id, role] of Object.entries(data.roles)) {
        roles[String(id)] = role;
      }
      setUsersRoles((prev) => ({
        ...prev,
        ...roles,
      }));
    };

    socket.on("permissions_updated", handlePermissionsUpdated);
    socket.on("permissions_init", handlePermissionInit);
    socket.on("role_updated", handleRoleUpdate);
    socket.on("roles_updated", handleRolesUpdate);

    return () => {
      socket.off("permissions_updated", handlePermissionsUpdated);
      socket.off("permissions_init", handlePermissionInit);
      socket.off("role_updated", handleRoleUpdate);
      socket.off("roles_updated", handleRolesUpdate);
    };
  });

  const localRole = usersRoles[local?.identity] || "participant";

  const localParticipant: ParticipantWithPermissions = {
    participant: local,
    permissions: {
      role: localRole,
      permissions: permissionsMap[localRole]?.permissions || {},
    },
    avatarColor: stringToColor(local.name || "Anonymous"),
    // avatarUrl: localParticipant.metadata?.avatarUrl || null,
  };

  const remoteParticipant: ParticipantWithPermissions[] = remote.map((p) => {
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

  return {
    local: localParticipant,
    remote: remoteParticipant,
    permissionsMap,
    updateRolePermissions,
    updateUserRole,
  };
}
