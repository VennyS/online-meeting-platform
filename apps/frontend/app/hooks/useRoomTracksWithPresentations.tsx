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
      if (!tracks) return presentations;

      // Копия, чтобы не мутировать оригинал
      let trackArray: TrackReferenceOrPlaceholder[] = tracks.map((t) =>
        t.publication
          ? t
          : ({
              ...t,
              publication: undefined,
            } as TrackReferenceOrPlaceholder)
      );

      // Пробегаем по всем презентациям
      const result: (TrackReferenceOrPlaceholder | Presentation)[] = [];

      presentations.forEach((p) => {
        if (p.mode === "presentationWithCamera") {
          // Находим камеру участника, который ведёт презентацию
          const cameraTrackIndex = trackArray.findIndex(
            (t) =>
              t.source === Track.Source.Camera &&
              t.participant.sid === p.participant.sid
          );

          if (cameraTrackIndex !== -1) {
            const [cameraTrack] = trackArray.splice(cameraTrackIndex, 1);
            // Проверяем, что это реальный трек (а не placeholder)
            if ("publication" in cameraTrack && cameraTrack.publication) {
              p = { ...p, video: cameraTrack };
            }
          }
        }

        // Локальные презентации вверх списка
        if (p.local) {
          result.unshift(p);
        } else {
          result.push(p);
        }
      });

      // Добавляем оставшиеся треки (камеры/экраны без презентаций)
      return [...result, ...trackArray];
    }, [tracks, presentations]);

  return normalizedTracks;
}
