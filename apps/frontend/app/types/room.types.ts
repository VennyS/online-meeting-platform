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
