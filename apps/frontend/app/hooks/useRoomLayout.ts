import { useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { useEffect, useState } from "react";
import { FocusTarget, Panel } from "../types/room-layout.types";
import { useRoomTracksWithPresentations } from "./useRoomTracksWithPresentations";
import { isPresentation } from "../lib/isPresentations";
import { isTrackReferenceOrPlaceholder } from "../lib/isTrackReferenceOfPlaceholder";

export interface RoomLayoutProviderValue {
  openedRightPanel: Panel | undefined;
  unreadCount: number;
  focusTrack: FocusTarget;
  isButtonNeeded: boolean;
  handleChangeOpenPanel: (panel: Panel | undefined) => void;
  setFocusTrack: (track: FocusTarget) => void;
  clearFocus: () => void;
  isFocused: (track: FocusTarget) => boolean;
}

export function useRoomLayout(): RoomLayoutProviderValue {
  const [unreadCount, setUnreadCount] = useState(0);
  const [openedRightPanel, setOpenedRightPanel] = useState<Panel>();

  const room = useRoomContext();

  const [focusTrack, setFocusTrack] = useState<FocusTarget>(null);
  const tracks = useRoomTracksWithPresentations({
    includeCamera: true,
    includeScreen: true,
    withPlaceholder: true,
  });
  const [isButtonNeeded, setIsButtonNeeded] = useState(true);

  const handleChangeOpenPanel = (panel: Panel | undefined) => {
    if (panel !== openedRightPanel) {
      setOpenedRightPanel(panel);
      return;
    }
    setOpenedRightPanel(undefined);
  };

  const clearFocus = () => setFocusTrack(null);

  const isFocused = (track: FocusTarget) => {
    if (!focusTrack || !track) return false;

    if (isPresentation(focusTrack) && isPresentation(track)) {
      return focusTrack.presentationId === track.presentationId;
    }

    if (
      isTrackReferenceOrPlaceholder(focusTrack) &&
      isTrackReferenceOrPlaceholder(track)
    ) {
      return (
        focusTrack.participant.sid === track.participant.sid &&
        focusTrack.publication?.trackSid === track.publication?.trackSid
      );
    }

    return false;
  };

  useEffect(() => {
    if (openedRightPanel === "chat") {
      setUnreadCount(0);
    }
  }, [openedRightPanel]);

  useEffect(() => {
    if (!room) return;

    const handleMessage = () => {
      if (openedRightPanel !== "chat") {
        setUnreadCount((prev) => prev + 1);
      }
    };

    room.on(RoomEvent.DataReceived, handleMessage);

    return () => {
      room.off(RoomEvent.DataReceived, handleMessage);
    };
  }, [room, openedRightPanel]);

  useEffect(() => {
    if (tracks.length < 2) {
      setIsButtonNeeded(false);
      setFocusTrack(null);
      return;
    }
    setIsButtonNeeded(true);
  }, [tracks]);

  useEffect(() => {
    if (!focusTrack) return;

    const updated = tracks.find((t) => {
      if (isPresentation(focusTrack) && isPresentation(t)) {
        return focusTrack.presentationId === t.presentationId;
      }

      if (
        isTrackReferenceOrPlaceholder(focusTrack) &&
        isTrackReferenceOrPlaceholder(t)
      ) {
        return (
          focusTrack.participant.sid === t.participant.sid &&
          focusTrack.publication?.trackSid === t.publication?.trackSid
        );
      }

      return false;
    });

    if (!updated) {
      setFocusTrack(null);
    } else if (updated !== focusTrack) {
      setFocusTrack(updated);
    }
  }, [tracks]);

  return {
    openedRightPanel,
    unreadCount,
    focusTrack,
    isButtonNeeded,
    handleChangeOpenPanel,
    setFocusTrack,
    clearFocus,
    isFocused,
  };
}
