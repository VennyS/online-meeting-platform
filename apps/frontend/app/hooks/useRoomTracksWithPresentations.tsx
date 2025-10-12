import {
  isTrackReference,
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
      if (!tracks) return presentations;

      const trackArray: TrackReferenceOrPlaceholder[] = tracks
        .map((t) =>
          t.publication
            ? t
            : ({
                ...t,
                publication: undefined,
              } as TrackReferenceOrPlaceholder)
        )
        .filter(
          (t) => !t.participant.isLocal || !t.participant.permissions?.hidden
        );

      const result: (TrackReferenceOrPlaceholder | Presentation)[] = [];

      presentations.forEach((p) => {
        if (p.mode === "presentationWithCamera") {
          const cameraTrackIndex = trackArray.findIndex(
            (t) =>
              t.source === Track.Source.Camera &&
              t.participant.sid === p.participant.sid
          );

          if (cameraTrackIndex !== -1) {
            const [cameraTrack] = trackArray.splice(cameraTrackIndex, 1);

            if (
              isTrackReference(cameraTrack) &&
              cameraTrack.publication.track &&
              !cameraTrack.publication.isMuted
            ) {
              p = { ...p, video: cameraTrack };
            }
          }
        }

        if (p.local) {
          result.unshift(p);
        } else {
          result.push(p);
        }
      });

      return [...result, ...trackArray];
    }, [tracks, presentations]);

  return normalizedTracks;
}
