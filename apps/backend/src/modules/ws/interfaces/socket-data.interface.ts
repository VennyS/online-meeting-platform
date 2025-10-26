import { Socket } from 'socket.io';

export interface SocketAuth {
  roomShortId?: string;
  userId?: number;
  username?: string;
}

export interface SocketData {
  roomShortId: string;
  userId: number;
  username: string;
  isHost: boolean;
  ip: string;
}

export type TypedSocket = Omit<Socket, 'handshake' | 'data'> & {
  handshake: Omit<Socket['handshake'], 'auth'> & {
    auth: SocketAuth;
  };
  data: SocketData;
};
