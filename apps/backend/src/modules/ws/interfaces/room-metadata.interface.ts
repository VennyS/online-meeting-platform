export interface RoomMetadata {
  roomshortId: string;
  name?: string;
  startedAt?: Date;
  showHistoryToNewbies: boolean;
}

export interface Connection {
  socketId: string;
}
