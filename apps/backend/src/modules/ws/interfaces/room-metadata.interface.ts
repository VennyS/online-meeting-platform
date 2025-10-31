import { TypedSocket } from './socket-data.interface';

export interface RoomMetadata {
  roomshortId: string;
  name?: string;
  startedAt?: Date;
  showHistoryToNewbies: boolean;
}

export interface Connection {
  socket: TypedSocket;
}
