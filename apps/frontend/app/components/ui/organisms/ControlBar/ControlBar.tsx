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

const ControlBar = () => {
  const {
    local: { permissions },
    openedRightPanel,
    unreadCount,
    handleChangeOpenPanel,
    stopRecording,
    startRecording,
  } = useParticipantsContext();

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

  return (
    <div className={styles.controls}>
      <IconButton
        title="Микрофон"
        aria-label="Микрофон"
        onClick={() => microToggle()}
        loading={microPending}
      >
        {microEnabled ? <MicOutlinedIcon /> : <MicOffOutlinedIcon />}
      </IconButton>
      <IconButton
        title="Камера"
        aria-label="Камера"
        onClick={() => cameraToggle()}
        loading={cameraPending}
      >
        {cameraEnabled ? <VideocamOutlinedIcon /> : <VideocamOffOutlinedIcon />}
      </IconButton>
      {permissions.permissions.canShareScreen && (
        <IconButton
          title="Демонстрация экрана"
          aria-label="Демонстрация экрана"
          onClick={() => screenShareToggle()}
          loading={screenSharePending}
        >
          {screenShareEnabled ? (
            <ScreenShareOutlinedIcon />
          ) : (
            <StopScreenShareOutlinedIcon />
          )}
        </IconButton>
      )}

      <IconButton
        title="Запись"
        onClick={() => (room.isRecording ? stopRecording() : startRecording())}
      >
        {room.isRecording ? (
          <RadioButtonCheckedOutlinedIcon color="error" />
        ) : (
          <RadioButtonUncheckedOutlinedIcon />
        )}
      </IconButton>

      <IconButton
        title="Список участников"
        onClick={() => handleChangeOpenPanel("participants")}
      >
        {openedRightPanel === "participants" ? (
          <GroupOffOutlinedIcon />
        ) : (
          <GroupOutlinedIcon />
        )}
      </IconButton>
      <IconButton
        title="Презентация"
        onClick={() => handleChangeOpenPanel("files")}
      >
        {openedRightPanel === "files" ? (
          <CancelPresentationOutlinedIcon />
        ) : (
          <PresentToAllOutlinedIcon />
        )}
      </IconButton>
      <IconButton
        title="Чат"
        className={styles.chatButton}
        onClick={() => handleChangeOpenPanel("chat")}
      >
        {openedRightPanel === "chat" ? (
          <CommentsDisabledOutlinedIcon />
        ) : (
          <CommentOutlinedIcon />
        )}
        {unreadCount > 0 && (
          <div className={styles.notificationDot}>{unreadCount}</div>
        )}
      </IconButton>

      {permissions.role === "owner" && (
        <IconButton
          title="Запись"
          onClick={() =>
            room.isRecording ? stopRecording() : startRecording()
          }
        >
          {room.isRecording ? (
            <RadioButtonCheckedOutlinedIcon color="error" />
          ) : (
            <RadioButtonUncheckedOutlinedIcon />
          )}
        </IconButton>
      )}

      <IconButton
        title="Выйти из комнаты"
        onClick={onDisconnectButtonClick}
        disabled={disconnectButtonDisalbed}
        sx={{
          bgcolor: "error.main",
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
  );
};

export default ControlBar;
