import { createContext, useContext, useState, ReactNode } from "react";
import { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { Presentation } from "../hooks/useParticipantsWithPermissions";
import { isPresentation } from "../lib/isPresentations";
import { isTrackReferenceOrPlaceholder } from "../lib/isTrackReferenceOfPlaceholder";

type FocusTarget = TrackReferenceOrPlaceholder | Presentation | null;

interface FocusContextValue {
  focusTrack: FocusTarget;
  setFocusTrack: (track: FocusTarget) => void;
  clearFocus: () => void;
  isFocused: (track: FocusTarget) => boolean;
}

const FocusContext = createContext<FocusContextValue | null>(null);

export const FocusProvider = ({ children }: { children: React.ReactNode }) => {
  const [focusTrack, setFocusTrack] = useState<FocusTarget>(null);

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

  return (
    <FocusContext.Provider
      value={{ focusTrack, setFocusTrack, clearFocus, isFocused }}
    >
      {children}
    </FocusContext.Provider>
  );
};

export const useFocus = () => {
  const ctx = useContext(FocusContext);
  if (!ctx) {
    throw new Error("useFocus must be used within a FocusProvider");
  }
  return ctx;
};
