"use client";

import { createContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { RoomSocket } from "../types/socket.types";

interface WebSocketContextValue {
  socket: RoomSocket | null;
  connect: (roomId: string, userId: number, userName: string) => void;
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
  const [socket, setSocket] = useState<RoomSocket | null>(null);

  const connect = (roomShortId: string, userId: number, username: string) => {
    if (socket) return;

    const s = io("http://localhost:3001", {
      path: "/ws",
      transports: ["websocket"],
      auth: {
        roomShortId,
        userId,
        username,
      },
    });

    s.on("connect", () => console.log("✅ Socket.IO connected"));
    s.on("disconnect", (reason) =>
      console.log("❌ Socket.IO disconnected:", reason)
    );
    s.on("connect_error", (err) => console.error("⚠ Socket.IO error:", err));

    setSocket(s);
  };

  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  useEffect(() => {
    return () => disconnect();
  }, []);

  return (
    <WebSocketContext.Provider value={{ socket, connect, disconnect }}>
      {children}
    </WebSocketContext.Provider>
  );
};
