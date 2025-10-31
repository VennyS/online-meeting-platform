import { useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { useEffect, useState } from "react";

export interface RoomLayoutProviderValue {
  openedRightPanel: Panel | undefined;
  unreadCount: number;
  handleChangeOpenPanel: (panel: Panel | undefined) => void;
}

export enum Panel {
  Chat = "chat",
  Participants = "participants",
  Files = "files",
}

export function useRoomLayout(): RoomLayoutProviderValue {
  const [unreadCount, setUnreadCount] = useState(0);
  const [openedRightPanel, setOpenedRightPanel] = useState<Panel>();

  const handleChangeOpenPanel = (panel: Panel | undefined) => {
    if (panel !== openedRightPanel) {
      setOpenedRightPanel(panel);
      return;
    }
    setOpenedRightPanel(undefined);
  };

  const room = useRoomContext();

  useEffect(() => {
    if (!room) return;

    const handleMessage = () => {
      if (openedRightPanel !== "chat") {
        setUnreadCount((prev) => prev + 1);
      }
    };

    room.on(RoomEvent.DataReceived, handleMessage);
    room.on(RoomEvent.Disconnected, () => {
      // router.replace("/404");
    });
    return () => {
      room.off(RoomEvent.DataReceived, handleMessage);
    };
  }, [room, openedRightPanel]);

  return {
    openedRightPanel,
    unreadCount,
    handleChangeOpenPanel,
  };
}
