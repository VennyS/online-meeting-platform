import { TypedSocket } from './socket-data.interface';

export interface RoomMetadata {
  roomshortId: string;
  name?: string;
  startedAt?: Date;
  showHistoryToNewbies: boolean;
  host?: TypedSocket;
}

export interface Connection {
  socketId: string;
}
