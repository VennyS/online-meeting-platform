"use client";

import { createContext, useEffect, useState } from "react";
import { getWebSocketUrl } from "@/app/config/websocketUrl";

interface WebSocketContextValue {
  ws: WebSocket | null;
  connect: (
    roomId: string,
    userId: number,
    userName: string
  ) => WebSocket | undefined;
  disconnect: () => void;
}

export const WebSocketContext = createContext<WebSocketContextValue | null>(
  null
);

export const WebSocketProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [ws, setWs] = useState<WebSocket | null>(null);

  const connect = (
    roomId: string,
    userId: number,
    userName: string
  ): WebSocket | undefined => {
    if (ws) return;

    const websocket = new WebSocket(getWebSocketUrl(roomId, userId, userName));
    websocket.onopen = () => console.log("✅ WS connected");
    websocket.onclose = () => console.log("❌ WS closed");
    websocket.onerror = (err) => console.error("⚠ WS error", err);

    setWs(websocket);

    return websocket;
  };

  const disconnect = () => {
    if (ws) {
      ws.close();
      setWs(null);
    }
  };

  useEffect(() => {
    return () => disconnect();
  }, []);

  return (
    <WebSocketContext.Provider value={{ ws, connect, disconnect }}>
      {children}
    </WebSocketContext.Provider>
  );
};
