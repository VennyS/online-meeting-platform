import { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { Presentation } from "../hooks/useParticipantsWithPermissions";

export function isPresentation(
  track: TrackReferenceOrPlaceholder | Presentation
): track is Presentation {
  return "fileId" in track && "authorId" in track;
}
