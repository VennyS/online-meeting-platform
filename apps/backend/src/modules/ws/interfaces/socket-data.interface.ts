import { Socket } from 'socket.io';

export interface SocketAuth {
  roomShortId?: string;
  userId?: string;
  username?: string;
}

export interface SocketData {
  roomShortId: string;
  userId: string;
  username: string;
  isHost: boolean;
}

export type TypedSocket = Omit<Socket, 'handshake' | 'data'> & {
  handshake: Omit<Socket['handshake'], 'auth'> & {
    auth: SocketAuth;
  };
  data: SocketData;
};
