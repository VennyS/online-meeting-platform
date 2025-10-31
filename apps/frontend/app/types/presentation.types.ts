import { TrackReference } from "@livekit/components-react";
import { Participant, Track } from "livekit-client";

export type PresentationMode = "presentationWithCamera" | "presentationOnly";

export type Presentation = {
  id: string;
  fileId: string;
  presentationId: string;
  url: string;
  authorId: string;
  page: number;
  zoom: number;
  scroll: { x: number; y: number };
  mode: PresentationMode;
  source: Track.Source;
  participant: Participant;
  local: boolean;
  video?: TrackReference;
};

export type PresentationDto = Omit<
  Presentation,
  "id" | "source" | "participant" | "local" | "video"
>;
