import { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { Presentation } from "../types/presentation.types";

export function isPresentation(
  track: TrackReferenceOrPlaceholder | Presentation
): track is Presentation {
  return "fileId" in track && "authorId" in track;
}
