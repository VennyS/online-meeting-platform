export const RoomRoleMap = {
  owner: "Владелец",
  admin: "Администратор",
  participant: "Участник",
};

export type Role = "OWNER" | "ADMIN" | "ALL";

export interface UserPermissions {
  role: RoomRole;
  permissions: Permissions;
}

export type RoomRole = "owner" | "admin" | "participant";

export interface Permissions {
  canShareScreen?: boolean;
  canStartPresentation?: boolean;
}
