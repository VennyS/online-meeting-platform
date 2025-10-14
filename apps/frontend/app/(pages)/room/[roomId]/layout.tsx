"use client";

import { PrequisitesProvider } from "@/app/providers/prequisites.provider";
import { WebSocketProvider } from "@/app/providers/websocket.provider";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PrequisitesProvider>
      <WebSocketProvider>{children}</WebSocketProvider>
    </PrequisitesProvider>
  );
}
