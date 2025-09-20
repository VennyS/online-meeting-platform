"use client";

import "@livekit/components-styles";
import {
  ChatIcon,
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useRoomContext,
  useTracks,
} from "@livekit/components-react";
import { useEffect, useState } from "react";
import { LocalParticipant, RoomEvent, Track } from "livekit-client";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/app/hooks/useUser";
import { authService } from "@/app/services/auth.service";
import styles from "./page.module.css";
import cn from "classnames";
import { Panel } from "./types";
import { Chat } from "@/app/components/ui/organisms/Chat/Chat";
import {
  ParticipantsProvider,
  useParticipantsContext,
} from "@/app/providers/participants.provider";
import { ParticipantsList } from "@/app/components/ui/organisms/ParticipantsList/ParticipantsList";
import { getWebSocketUrl } from "@/app/config/websocketUrl";
import { fileService, IFile } from "@/app/services/file.service";
import dynamic from "next/dynamic";
import PresentationList from "@/app/components/ui/organisms/PresentationList/PresentationList";

const PDFViewer = dynamic(
  () => import("@/app/components/ui/organisms/PDFViewer/PDFViewer"),
  {
    ssr: false,
  }
);

// Room Content Component
const RoomContent = ({
  roomId,
  roomName,
}: {
  roomId: string;
  roomName: string;
}) => {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { updateOnlyOn: [RoomEvent.ActiveSpeakersChanged], onlySubscribed: false }
  );

  const [openedRightPanel, setOpenedRightPanel] = useState<Panel>();
  const { user } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);
  const room = useRoomContext();
  const {
    local,
    presentation,
    startPresentation,
    changePage,
    changeZoom,
    changeScroll,
    finishPresentation,
  } = useParticipantsContext();
  const [files, setFiles] = useState<IFile[]>([]);

  const showPresentationButton =
    local.permissions.permissions.canStartPresentation &&
    user &&
    files.length > 0 &&
    (!presentation ||
      (!!presentation && String(user.id) === presentation.authorId));

  useEffect(() => {
    if (!room) return;

    const handleMessage = () => {
      // если чат не открыт → увеличиваем счетчик
      if (openedRightPanel !== "chat") {
        setUnreadCount((prev) => prev + 1);
      }
    };

    room.on(RoomEvent.DataReceived, handleMessage);
    return () => {
      room.off(RoomEvent.DataReceived, handleMessage);
    };
  }, [room, openedRightPanel]);

  useEffect(() => {
    if (openedRightPanel === "chat") setUnreadCount(0);
  }, [openedRightPanel]);

  useEffect(() => {
    if (!local.participant) return;

    // проверяем что это локальный участник
    if (local.participant instanceof LocalParticipant) {
      if (!local.permissions.permissions.canShareScreen) {
        // выключаем стрим, если он идет
        const screenTrackPub = Array.from(
          local.participant.trackPublications.values()
        ).find((pub) => pub.source === "screen_share");

        if (screenTrackPub?.track) {
          local.participant.unpublishTrack(screenTrackPub.track);
        }
      }

      if (
        !local.permissions.permissions.canStartPresentation &&
        presentation &&
        user &&
        presentation.authorId === String(user.id)
      ) {
        finishPresentation();
      }
    }
  }, [local.permissions.permissions.canShareScreen, local.participant]);

  const handleChangeOpenPanel = (panel: Panel) => {
    if (panel !== openedRightPanel) {
      setOpenedRightPanel(panel);
      return;
    }
    setOpenedRightPanel(undefined);
  };

  useEffect(() => {
    const handleFetchFiles = async () => {
      try {
        const files = await fileService.listFiles(roomId, 0, 10, "PDF");
        setFiles(files);
      } catch (err) {
        console.error("Error fetching files:", err);
      }
    };

    handleFetchFiles();
  }, []);

  return (
    <div
      className={cn(styles.container, { [styles.open]: !!openedRightPanel })}
    >
      <div className={styles.gridContainer}>
        {presentation ? (
          <div className={styles.presentationMain}>
            <PDFViewer
              key={presentation.url}
              isAuthor={presentation.authorId === local.participant.identity}
              pdfUrl={presentation.url}
              onPageChange={changePage}
              onZoomChange={changeZoom}
              currentPage={presentation.currentPage}
              zoom={presentation.zoom}
              onScrollChange={changeScroll}
              scrollPosition={presentation.scroll}
            />
            <div className={styles.participantsStrip}>
              <GridLayout tracks={tracks}>
                <ParticipantTile />
              </GridLayout>
            </div>
          </div>
        ) : (
          <GridLayout tracks={tracks}>
            <ParticipantTile />
          </GridLayout>
        )}
      </div>

      <div
        className={cn(styles.rightPanel, {
          [styles.active]: openedRightPanel === "participants",
        })}
      >
        <ParticipantsList roomId={roomId} roomName={roomName} />
      </div>
      <div
        className={cn(styles.rightPanel, {
          [styles.active]: openedRightPanel === "chat",
        })}
      >
        {!!user && <Chat roomName={roomId} user={user} />}
      </div>

      <div
        className={cn(styles.rightPanel, {
          [styles.active]: openedRightPanel === "files",
        })}
      >
        <PresentationList files={files} onClick={startPresentation} />
      </div>

      {openedRightPanel && (
        <button
          className={styles.closePanelButton}
          onClick={() => setOpenedRightPanel(undefined)}
        >
          ✕
        </button>
      )}

      <div className={styles.controls}>
        <p>{roomName}</p>
        <ControlBar
          controls={{
            microphone: true,
            camera: true,
            screenShare: local.permissions.permissions.canShareScreen,
            settings: false,
            leave: false,
          }}
        />
        {showPresentationButton && (
          <button
            onClick={() => {
              !presentation
                ? handleChangeOpenPanel("files")
                : finishPresentation();
            }}
          >
            {!presentation ? "Транслировать презентацию" : "Стоп"}
          </button>
        )}
        <button onClick={() => handleChangeOpenPanel("participants")}>
          {openedRightPanel === "participants" ? "Закрыть" : "Открыть"}
        </button>
        <button
          className={styles.chatButton}
          title="чат"
          onClick={() => handleChangeOpenPanel("chat")}
        >
          <ChatIcon />
          {unreadCount > 0 && (
            <div className={styles.notificationDot}>{unreadCount}</div>
          )}
        </button>
      </div>

      <RoomAudioRenderer />
    </div>
  );
};

// Main Component
export default function MeetingRoom() {
  const { roomId } = useParams();
  const [roomName, setRoomName] = useState<string>("");
  const { token, setToken, user } = useUser();
  const [ws, setWs] = useState<WebSocket | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      router.replace(`/room/${roomId}/prejoin`);
    }
  }, [token, user, roomId, router]);

  // WebSocket для хоста
  useEffect(() => {
    if (!roomId || !user) return;

    const websocket = new WebSocket(getWebSocketUrl(roomId as string, user.id));

    setWs(websocket);
  }, [roomId, user]);

  const fullName = user ? `${user.firstName} ${user.lastName}` : "User";

  useEffect(() => {
    if (!roomId || !user || user.isGuest) return;

    const fetchToken = async () => {
      try {
        const response = await authService.getToken(roomId as string, fullName);
        setToken(response.token);
        setRoomName(response.metadata.name);
      } catch (err) {
        console.error("Ошибка при получении токена для пользователя:", err);
      }
    };

    fetchToken();
  }, [roomId, user]);

  if (!token && user) {
    return <div>Loading...</div>;
  }

  return (
    <main className={styles.main}>
      <LiveKitRoom
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        token={token!}
        connect
        className={styles.roomContainer}
      >
        {user && (
          <ParticipantsProvider localUserId={user.id} ws={ws}>
            <RoomContent roomId={roomId as string} roomName={roomName} />
          </ParticipantsProvider>
        )}
      </LiveKitRoom>
    </main>
  );
}
