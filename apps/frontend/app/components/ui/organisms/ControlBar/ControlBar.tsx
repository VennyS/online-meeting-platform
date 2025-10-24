import React, { useEffect, useState } from "react";
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
import { RoomEvent, Track } from "livekit-client";
import { useParticipantsContext } from "@/app/providers/participants.provider";
import Badge from "@mui/material/Badge";
import { Panel } from "@/app/hooks/useParticipantsWithPermissions";
import { CircularProgress, Menu, MenuItem, useMediaQuery } from "@mui/material";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/hooks/useUser";

const ControlBar = ({ haveFiles }: { haveFiles: boolean }) => {
  const {
    local: { permissions },
    openedRightPanel,
    unreadCount,
    waitingGuests,
    handleChangeOpenPanel,
    stopRecording,
    startRecording,
  } = useParticipantsContext();
  const { user } = useUser();

  const router = useRouter();

  const isMobile = useMediaQuery("(max-width:540px)");

  const room = useRoomContext();
  const [isRecording, setIsRecording] = useState(room.isRecording);
  const [recordingPending, setRecordingPending] = useState(false);

  useEffect(() => {
    if (!room) return;

    const handleStatus = (recording: boolean) => {
      setRecordingPending(false);
      setIsRecording(recording);
    };

    room.on(RoomEvent.RecordingStatusChanged, handleStatus);

    return () => {
      room.off(RoomEvent.RecordingStatusChanged, handleStatus);
    };
  }, [room]);

  const handleRecordingClick = () => {
    setRecordingPending(!isRecording);
    isRecording ? stopRecording() : startRecording();
  };

  const {
    buttonProps: {
      onClick: onDisconnectButtonClick,
      disabled: disconnectButtonDisalbed,
    },
  } = useDisconnectButton({ stopTracks: true });

  const onDisconnectButtonClickWrapped = () => {
    onDisconnectButtonClick();
    if (user && !user.isGuest) {
      router.push("/");
      return;
    }
    router.replace("/farewell");
  };

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

  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) =>
    setMenuAnchor(event.currentTarget);
  const handleCloseMenu = () => setMenuAnchor(null);

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
            loading={recordingPending}
            loadingIndicator={<Loader />}
            onClick={handleRecordingClick}
            sx={IconButtonSx}
          >
            {isRecording ? (
              <RadioButtonCheckedOutlinedIcon color="error" />
            ) : (
              <RadioButtonUncheckedOutlinedIcon />
            )}
          </IconButton>
        )}
      </div>
      {!isMobile && (
        <div className={styles.controlsSection}>
          <Badge badgeContent={waitingGuests.length} max={99} color="primary">
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

          {haveFiles && (
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
          )}

          {permissions.permissions.canShareScreen && (
            <IconButton
              title="Демонстрация экрана"
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
      )}

      <div className={styles.controlsSection}>
        {isMobile && (
          <>
            <Badge
              badgeContent={waitingGuests.length + unreadCount}
              max={99}
              color="primary"
            >
              <IconButton
                title="Меню"
                onClick={handleOpenMenu}
                sx={IconButtonSx}
              >
                <MoreVertOutlinedIcon />
              </IconButton>
            </Badge>

            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={handleCloseMenu}
              anchorOrigin={{ vertical: "top", horizontal: "center" }}
              transformOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
              <MenuItem
                onClick={() => {
                  handleChangeOpenPanel(Panel.Participants);
                  handleCloseMenu();
                }}
              >
                Участники ({waitingGuests.length})
              </MenuItem>

              {haveFiles && (
                <MenuItem
                  onClick={() => {
                    handleChangeOpenPanel(Panel.Files);
                    handleCloseMenu();
                  }}
                >
                  Презентация
                </MenuItem>
              )}

              {permissions.permissions.canShareScreen && (
                <MenuItem
                  onClick={() => {
                    screenShareToggle();
                    handleCloseMenu();
                  }}
                >
                  {screenShareEnabled
                    ? "Остановить экран"
                    : "Поделиться экраном"}
                </MenuItem>
              )}

              <MenuItem
                onClick={() => {
                  handleChangeOpenPanel(Panel.Chat);
                  handleCloseMenu();
                }}
              >
                Чат ({unreadCount})
              </MenuItem>
            </Menu>
          </>
        )}
        <IconButton
          title="Выйти из комнаты"
          onClick={onDisconnectButtonClickWrapped}
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
