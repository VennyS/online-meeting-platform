import { Avatar, Box, IconButton, Typography } from "@mui/material";
import stringToColor from "@/app/lib/stringToColor";
import {
  useFeatureContext,
  useIsSpeaking,
  useTrackMutedIndicator,
  VideoTrack,
} from "@livekit/components-react";
import React, { HTMLAttributes } from "react";
import { Track } from "livekit-client";
import {
  isTrackReference,
  ParticipantClickEvent,
  TrackReferenceOrPlaceholder,
} from "@livekit/components-core";
import MicOffOutlinedIcon from "@mui/icons-material/MicOffOutlined";
import { useFocus } from "@/app/providers/focus.provider";
import { Presentation } from "@/app/hooks/useParticipantsWithPermissions";
import { isPresentation } from "@/app/lib/isPresentations";
import CenterFocusStrongOutlinedIcon from "@mui/icons-material/CenterFocusStrongOutlined";
import HighlightOffOutlinedIcon from "@mui/icons-material/HighlightOffOutlined";
import { useParticipantsContext } from "@/app/providers/participants.provider";
import dynamic from "next/dynamic";
interface ParticipantTileProps extends HTMLAttributes<HTMLDivElement> {
  trackReference: TrackReferenceOrPlaceholder | Presentation;
  disableSpeakingIndicator?: boolean | undefined;
  onParticipantClick?: ((event: ParticipantClickEvent) => void) | undefined;
}

const PDFViewer = dynamic(
  () => import("@/app/components/ui/organisms/PDFViewer/PDFViewer"),
  {
    ssr: false,
  }
);

export const ParticipantTile: (
  props: ParticipantTileProps & React.RefAttributes<HTMLDivElement>
) => React.ReactNode = /* @__PURE__ */ React.forwardRef<
  HTMLDivElement,
  ParticipantTileProps
>(function ParticipantTile({ trackReference }: ParticipantTileProps, ref) {
  const autoManageSubscription = useFeatureContext()?.autoSubscription;

  const { changePage, changeZoom, changeScroll, changePresentationMode } =
    useParticipantsContext();

  const isSpeaking = useIsSpeaking(trackReference.participant);
  const { focusTrack, isFocused, setFocusTrack } = useFocus();

  const { isMuted } = useTrackMutedIndicator({
    participant: trackReference.participant,
    source: Track.Source.Microphone,
  });

  const hasVideo =
    isTrackReference(trackReference) &&
    trackReference.publication &&
    trackReference.publication.kind === "video" &&
    trackReference.publication.isSubscribed &&
    !trackReference.publication.isMuted &&
    !!trackReference.publication.track;

  const participantName = trackReference.participant.name || "U";

  const isPres = isPresentation(trackReference);

  const title =
    trackReference.source === Track.Source.ScreenShare
      ? `${participantName} (демонстрация экрана)`
      : participantName;

  const isNotFocusTrack = !!focusTrack && trackReference != focusTrack;

  return (
    <Box
      ref={ref}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        borderRadius: 4,
        bgcolor: "grey.900",
        border:
          isSpeaking && trackReference.source === Track.Source.Camera
            ? "4px solid #4caf50"
            : "4px solid transparent",
        transition: "border-color 0.2s ease-in",
        aspectRatio: isNotFocusTrack ? "1" : null,
        flexShrink: isNotFocusTrack ? "0" : null,
      }}
    >
      {isPres ? (
        <PDFViewer
          isAuthor={trackReference.local && !isNotFocusTrack}
          {...trackReference}
          onPageChange={
            trackReference.local
              ? (page) => changePage(trackReference.presentationId, page)
              : undefined
          }
          onZoomChange={
            trackReference.local
              ? (zoom) => changeZoom(trackReference.presentationId, zoom)
              : undefined
          }
          onScrollChange={
            trackReference.local
              ? (pos) => changeScroll(trackReference.presentationId, pos)
              : undefined
          }
          onChangePresentationMode={
            trackReference.local
              ? (mode) =>
                  changePresentationMode(trackReference.presentationId, mode)
              : undefined
          }
        />
      ) : hasVideo ? (
        <VideoTrack
          title={title}
          trackRef={trackReference}
          manageSubscription={autoManageSubscription}
        />
      ) : (
        <Avatar
          title={title}
          sx={{
            width: "80px",
            height: "80px",
            bgcolor: stringToColor(participantName),
            maxWidth: "65%",
            maxHeight: "65%",
          }}
        >
          {participantName[0].toUpperCase()}
        </Avatar>
      )}

      <IconButton
        sx={{ position: "absolute", top: 8, right: 8 }}
        onClick={
          isFocused(trackReference)
            ? () => setFocusTrack(null)
            : () => setFocusTrack(trackReference)
        }
      >
        {isFocused(trackReference) ? (
          <HighlightOffOutlinedIcon sx={{ color: "white" }} />
        ) : (
          <CenterFocusStrongOutlinedIcon sx={{ color: "white" }} />
        )}
      </IconButton>

      {trackReference.source === Track.Source.Camera && (
        <Box
          sx={{
            position: "absolute",
            bottom: 8,
            left: 8,
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            color: "white",
            borderRadius: 1,
          }}
        >
          <Typography variant="body2">{participantName}</Typography>
          {isMuted && <MicOffOutlinedIcon sx={{ fontSize: 16 }} />}
        </Box>
      )}
    </Box>
  );
});
