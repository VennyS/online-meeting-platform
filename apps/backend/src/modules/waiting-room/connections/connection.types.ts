export interface RoomData {
  users: Map<string, UserConnection>;
  settings: {
    showHistoryToNewbies: boolean;
  };
}

export interface UserConnection {
  ws: WebSocket;
  isHost: boolean;
  ip: string;
  username: string;
}
