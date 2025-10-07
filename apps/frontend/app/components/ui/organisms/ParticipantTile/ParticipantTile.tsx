import { Avatar, Box, Typography } from "@mui/material";
import stringToColor from "@/app/lib/stringToColor";
import {
  ParticipantTileProps,
  useEnsureTrackRef,
  useFeatureContext,
  useIsSpeaking,
  useMaybeLayoutContext,
  useTrackMutedIndicator,
  VideoTrack,
} from "@livekit/components-react";
import React from "react";
import { Track } from "livekit-client";
import {
  isTrackReference,
  isTrackReferencePinned,
} from "@livekit/components-core";
import MicOffOutlinedIcon from "@mui/icons-material/MicOffOutlined";

export const ParticipantTile: (
  props: ParticipantTileProps & React.RefAttributes<HTMLDivElement>
) => React.ReactNode = /* @__PURE__ */ React.forwardRef<
  HTMLDivElement,
  ParticipantTileProps
>(function ParticipantTile({ trackRef }: ParticipantTileProps, ref) {
  const trackReference = useEnsureTrackRef(trackRef);
  const layoutContext = useMaybeLayoutContext();
  const autoManageSubscription = useFeatureContext()?.autoSubscription;

  const isSpeaking = useIsSpeaking(trackReference.participant);

  const { isMuted } = useTrackMutedIndicator({
    participant: trackReference.participant,
    source: Track.Source.Microphone,
  });
  const handleSubscribe = React.useCallback(
    (subscribed: boolean) => {
      if (
        trackReference.source &&
        !subscribed &&
        layoutContext &&
        layoutContext.pin.dispatch &&
        isTrackReferencePinned(trackReference, layoutContext.pin.state)
      ) {
        layoutContext.pin.dispatch({ msg: "clear_pin" });
      }
    },
    [trackReference, layoutContext]
  );

  const hasVideo =
    isTrackReference(trackReference) &&
    trackReference.publication &&
    trackReference.publication.kind === "video" &&
    trackReference.publication.isSubscribed &&
    !trackReference.publication.isMuted &&
    !!trackReference.publication.track;

  const participantName = trackReference.participant.name || "U";

  const title =
    trackReference.source === Track.Source.ScreenShare
      ? `${participantName} (демонстрация экрана)`
      : participantName;

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
        border: isSpeaking ? "4px solid #4caf50" : "4px solid transparent",
        transition: "border-color 0.2s ease-in",
      }}
    >
      {hasVideo ? (
        <VideoTrack
          title={title}
          trackRef={trackReference}
          onSubscriptionStatusChanged={handleSubscribe}
          manageSubscription={autoManageSubscription}
        />
      ) : (
        <Avatar
          title={title}
          sx={{
            width: "80px",
            height: "80px",
            bgcolor: stringToColor(participantName),
          }}
        >
          {participantName[0].toUpperCase()}
        </Avatar>
      )}

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
