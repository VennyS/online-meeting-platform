import React from "react";
import IconButton from "@mui/material/IconButton";
import MicOutlinedIcon from "@mui/icons-material/MicOutlined";
import MicOffOutlinedIcon from "@mui/icons-material/MicOffOutlined";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import VideocamOffOutlinedIcon from "@mui/icons-material/VideocamOffOutlined";
import ScreenShareOutlinedIcon from "@mui/icons-material/ScreenShareOutlined";
import StopScreenShareOutlinedIcon from "@mui/icons-material/StopScreenShareOutlined";
import PresentToAllOutlinedIcon from "@mui/icons-material/PresentToAllOutlined";
import CancelPresentationOutlinedIcon from "@mui/icons-material/CancelPresentationOutlined";
import RadioButtonUncheckedOutlinedIcon from "@mui/icons-material/RadioButtonUncheckedOutlined";
import RadioButtonCheckedOutlinedIcon from "@mui/icons-material/RadioButtonCheckedOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import GroupOffOutlinedIcon from "@mui/icons-material/GroupOffOutlined";
import CommentOutlinedIcon from "@mui/icons-material/CommentOutlined";
import CommentsDisabledOutlinedIcon from "@mui/icons-material/CommentsDisabledOutlined";
import CallEndOutlinedIcon from "@mui/icons-material/CallEndOutlined";
import styles from "./ControlBar.module.css";
import {
  useDisconnectButton,
  useRoomContext,
  useTrackToggle,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { useParticipantsContext } from "@/app/providers/participants.provider";
import Badge from "@mui/material/Badge";
import { Panel } from "@/app/hooks/useParticipantsWithPermissions";
import { CircularProgress } from "@mui/material";

const ControlBar = () => {
  const {
    local: { permissions },
    openedRightPanel,
    unreadCount,
    remote,
    handleChangeOpenPanel,
    stopRecording,
    startRecording,
  } = useParticipantsContext();

  const participantsCount = remote.length + 1;
  const room = useRoomContext();

  const {
    buttonProps: {
      onClick: onDisconnectButtonClick,
      disabled: disconnectButtonDisalbed,
    },
  } = useDisconnectButton({ stopTracks: true });
  const {
    toggle: microToggle,
    enabled: microEnabled,
    pending: microPending,
  } = useTrackToggle({
    source: Track.Source.Microphone,
  });

  const {
    toggle: cameraToggle,
    enabled: cameraEnabled,
    pending: cameraPending,
  } = useTrackToggle({
    source: Track.Source.Camera,
  });
  const {
    toggle: screenShareToggle,
    enabled: screenShareEnabled,
    pending: screenSharePending,
  } = useTrackToggle({
    source: Track.Source.ScreenShare,
  });

  const IconButtonSx = {
    paddingX: "12px",
    bgcolor: "grey.300",
    color: "#000000b5",
    borderRadius: "40%",
  };

  const Loader = () => {
    return <CircularProgress color="inherit" size={28} />;
  };

  return (
    <div className={styles.controls}>
      <div className={styles.controlsSection}>
        <IconButton
          title="Микрофон"
          aria-label="Микрофон"
          onClick={() => microToggle()}
          loading={microPending}
          loadingIndicator={<Loader />}
          sx={IconButtonSx}
        >
          {microEnabled ? <MicOutlinedIcon /> : <MicOffOutlinedIcon />}
        </IconButton>
        <IconButton
          title="Камера"
          aria-label="Камера"
          onClick={() => cameraToggle()}
          loading={cameraPending}
          loadingIndicator={<Loader />}
          sx={IconButtonSx}
        >
          {cameraEnabled ? (
            <VideocamOutlinedIcon />
          ) : (
            <VideocamOffOutlinedIcon />
          )}
        </IconButton>
        {permissions.role === "owner" && (
          <IconButton
            title="Запись"
            onClick={() =>
              room.isRecording ? stopRecording() : startRecording()
            }
            sx={IconButtonSx}
          >
            {room.isRecording ? (
              <RadioButtonCheckedOutlinedIcon color="error" />
            ) : (
              <RadioButtonUncheckedOutlinedIcon />
            )}
          </IconButton>
        )}
      </div>
      <div className={styles.controlsSection}>
        <Badge badgeContent={participantsCount} max={99} color="primary">
          <IconButton
            title="Список участников"
            onClick={() => handleChangeOpenPanel(Panel.Participants)}
            sx={IconButtonSx}
          >
            {openedRightPanel === Panel.Participants ? (
              <GroupOffOutlinedIcon />
            ) : (
              <GroupOutlinedIcon />
            )}
          </IconButton>
        </Badge>
        <IconButton
          title="Презентация"
          onClick={() => handleChangeOpenPanel(Panel.Files)}
          sx={IconButtonSx}
        >
          {openedRightPanel === Panel.Files ? (
            <CancelPresentationOutlinedIcon />
          ) : (
            <PresentToAllOutlinedIcon />
          )}
        </IconButton>
        {permissions.permissions.canShareScreen && (
          <IconButton
            title="Демонстрация экрана"
            aria-label="Демонстрация экрана"
            onClick={() => screenShareToggle()}
            loading={screenSharePending}
            loadingIndicator={<Loader />}
            sx={IconButtonSx}
          >
            {screenShareEnabled ? (
              <ScreenShareOutlinedIcon />
            ) : (
              <StopScreenShareOutlinedIcon />
            )}
          </IconButton>
        )}
        <Badge badgeContent={unreadCount} max={99} color="primary">
          <IconButton
            title="Чат"
            className={styles.chatButton}
            onClick={() => handleChangeOpenPanel(Panel.Chat)}
            sx={IconButtonSx}
          >
            {openedRightPanel === Panel.Chat ? (
              <CommentsDisabledOutlinedIcon />
            ) : (
              <CommentOutlinedIcon />
            )}
          </IconButton>
        </Badge>
      </div>

      <div className={styles.controlsSection}>
        <IconButton
          title="Выйти из комнаты"
          onClick={onDisconnectButtonClick}
          disabled={disconnectButtonDisalbed}
          sx={{
            bgcolor: "error.main",
            borderRadius: "40%",
            paddingX: "12px",
            color: "white",
            "&:hover": {
              bgcolor: "error.dark",
            },
            "&.Mui-disabled": {
              bgcolor: "grey.400",
              color: "white",
            },
          }}
        >
          <CallEndOutlinedIcon />
        </IconButton>
      </div>
    </div>
  );
};

export default ControlBar;
