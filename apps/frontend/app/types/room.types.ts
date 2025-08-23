export interface IRoom {
  id: number;
  shortId: string;
  isPublic: boolean;
  ownerId: number;
  createdAt: string;
}

export interface IWaitingGuest {
  guestId: string;
  name: string;
  requestedAt: string;
}

export interface IPrequisites {
  guestAllowed: boolean;
  passwordRequired: boolean;
  waitingRoomEnabled: boolean;
  isOwner: boolean;
}

export interface Permissions {
  canShareScreen?: boolean;
}

export interface UserPermissions {
  role: RoomRole;
  permissions: Permissions;
}

export type RoomRole = "owner" | "admin" | "participant";

export type RoomWSMessage =
  | { type: "init"; role: RoomRole }
  | { type: "waiting_queue_updated"; guests: IWaitingGuest[] }
  | { type: "new_guest_waiting"; guest: IWaitingGuest }
  | { type: "role_updated"; role: RoomRole; userId: string }
  | {
      type: "permissions_updated";
      role: RoomRole;
      permissions: Partial<Permissions>;
    };
