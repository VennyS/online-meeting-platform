"use client";

import { WebSocketProvider } from "@/app/providers/websocket.provider";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WebSocketProvider>{children}</WebSocketProvider>;
}
