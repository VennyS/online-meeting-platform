import { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { Presentation } from "../types/presentation.types";

export function isTrackReferenceOrPlaceholder(
  track: TrackReferenceOrPlaceholder | Presentation | null
): track is TrackReferenceOrPlaceholder {
  return (
    !!track &&
    "publication" in track &&
    "participant" in track &&
    "source" in track
  );
}
