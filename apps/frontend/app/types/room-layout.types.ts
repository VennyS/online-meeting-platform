import { TrackReferenceOrPlaceholder } from "@livekit/components-core";
import { Presentation } from "./presentation.types";

export type FocusTarget = TrackReferenceOrPlaceholder | Presentation | null;

export enum Panel {
  Chat = "chat",
  Participants = "participants",
  Files = "files",
}
