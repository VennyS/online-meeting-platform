import { io } from "socket.io-client";
import { RoomSocket } from "../types/socket.types";
import { envConfig } from "./config";

const GUEST_WAITING_NAMESPACE = "waiting-room";
const API_URL = envConfig.apiUrl ?? "http://localhost:3001";

export function connectSocket(
  roomShortId: string,
  username: string,
  userId?: number
): RoomSocket {
  const url = userId ? API_URL : `${API_URL}/${GUEST_WAITING_NAMESPACE}`;

  const connectedSocket = io(url, {
    path: "/ws",
    transports: ["websocket"],
    auth: {
      roomShortId,
      username,
      userId: userId,
    },
  });

  return connectedSocket;
}
