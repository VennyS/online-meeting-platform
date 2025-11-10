"use client";

import { PrejoinStatusProvider } from "@/app/providers/prejoin-status.provider";
import { PrequisitesProvider } from "@/app/providers/prequisites.provider";
import { WebSocketProvider } from "@/app/providers/websocket.provider";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PrejoinStatusProvider>
      <PrequisitesProvider>
        <WebSocketProvider>{children}</WebSocketProvider>
      </PrequisitesProvider>
    </PrejoinStatusProvider>
  );
}
