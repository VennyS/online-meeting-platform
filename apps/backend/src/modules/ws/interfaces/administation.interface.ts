export type RoomRole = 'owner' | 'admin' | 'participant';

export interface Permissions {
  canShareScreen?: boolean;
  canStartPresentation?: boolean;
}

export interface UpdatePermissionData {
  targetRole: RoomRole;
  permission: keyof Permissions;
  value: boolean;
}

export interface UpdateRoleData {
  targetUserId: string;
  newRole: RoomRole;
}
