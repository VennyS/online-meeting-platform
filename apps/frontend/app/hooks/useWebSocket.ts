import { useContext } from "react";
import { WebSocketContext } from "../providers/websocket.provider";

export const useWebSocket = () => {
  const ctx = useContext(WebSocketContext);
  if (!ctx)
    throw new Error("useAppWebSocket must be used inside WebSocketProvider");
  return ctx;
};
