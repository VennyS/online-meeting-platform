"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRoomContext } from "@livekit/components-react";
import { DisconnectReason, RoomEvent } from "livekit-client";
import { useUser } from "./useUser";

export function useDisconnect(roomShortId: string) {
  const router = useRouter();
  const room = useRoomContext();
  const { user } = useUser();

  useEffect(() => {
    if (!room) return;

    const onDisconnect = (reason?: DisconnectReason | undefined) => {
      if (!reason) return;

      if (
        reason === DisconnectReason.ROOM_CLOSED ||
        reason === DisconnectReason.ROOM_DELETED
      ) {
        router.replace(`/room/${roomShortId}/ended`);
      }

      if (reason === DisconnectReason.PARTICIPANT_REMOVED) {
        router.replace(`/room/${roomShortId}/kicked`);
      }

      if (reason === DisconnectReason.CLIENT_INITIATED) {
        if (user && !user.isGuest) {
          router.push("/");
          return;
        }

        router.replace(`room/${roomShortId}/farewell`);
      }
    };

    room.on(RoomEvent.Disconnected, onDisconnect);

    return () => {
      room.off(RoomEvent.Disconnected, onDisconnect);
    };
  });
}
