import {
  TrackReferenceOrPlaceholder,
  useTracks,
} from "@livekit/components-react";
import { RoomEvent, Track } from "livekit-client";
import { useMemo } from "react";
import { Presentation } from "./useParticipantsWithPermissions";
import { useParticipantsContext } from "../providers/participants.provider";

interface UseRoomTracksWithPresentationsOptions {
  includeCamera?: boolean;
  includeScreen?: boolean;
  withPlaceholder?: boolean;
}

export function useRoomTracksWithPresentations({
  includeCamera = true,
  includeScreen = true,
  withPlaceholder = true,
}: UseRoomTracksWithPresentationsOptions) {
  const { presentations } = useParticipantsContext();

  const sources = [
    ...(includeCamera
      ? [{ source: Track.Source.Camera, withPlaceholder }]
      : []),
    ...(includeScreen
      ? [{ source: Track.Source.ScreenShare, withPlaceholder: false }]
      : []),
  ];

  const tracks = useTracks(sources, {
    updateOnlyOn: [RoomEvent.ActiveSpeakersChanged],
    onlySubscribed: false,
  });

  const normalizedTracks: (TrackReferenceOrPlaceholder | Presentation)[] =
    useMemo(() => {
      const trackArray: (TrackReferenceOrPlaceholder | Presentation)[] = tracks
        ? tracks.map((t) =>
            t.publication
              ? t
              : ({
                  ...t,
                  publication: undefined,
                } as TrackReferenceOrPlaceholder)
          )
        : [];

      presentations.forEach((p) => {
        if (p.local) {
          trackArray.unshift(p);
        } else {
          trackArray.push(p);
        }
      });

      return trackArray;
    }, [tracks, presentations]);

  return normalizedTracks;
}
