import { useEffect, useState } from "react";
import { RoomSocket } from "../providers/websocket.provider";

export interface WaitingRoomHostProviderValue {
  waitingGuests: IWaitingGuest[];
  approveGuest: (guestId: string) => void;
  rejectGuest: (guestId: string) => void;
}

export interface IWaitingGuest {
  guestId: string;
  name: string;
  requestedAt: string;
}

export function useWaitingHost(
  socket: RoomSocket | null
): WaitingRoomHostProviderValue {
  const [waitingGuests, setWaitingGuests] = useState<IWaitingGuest[]>([]);

  function approveGuest(guestId: string) {
    socket?.emit("host_approval", { guestId, approved: true });
  }

  function rejectGuest(guestId: string) {
    socket?.emit("host_approval", { guestId, approved: false });
  }

  useEffect(() => {
    if (!socket) return;

    const handleWaitingUpdate = (data: { guests: IWaitingGuest[] }) => {
      setWaitingGuests(data.guests);
    };

    socket.on("waiting_queue_updated", handleWaitingUpdate);

    return () => {
      socket.off("waiting_queue_updated", handleWaitingUpdate);
    };
  });

  return {
    waitingGuests,
    approveGuest,
    rejectGuest,
  };
}
