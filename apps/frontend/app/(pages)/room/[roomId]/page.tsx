"use client";

import "@livekit/components-styles";
import {
  ChatIcon,
  ControlBar,
  LiveKitRoom,
  RoomAudioRenderer,
  TrackLoop,
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
  const [copied, setCopied] = useState(false);
  const [manualText, setManualText] = useState<string | null>(null);
  const [openedRightPanel, setOpenedRightPanel] = useState<Panel>();
  const user = useUser();
  const [unreadCount, setUnreadCount] = useState(0);
  const room = useRoomContext();
  const { local, presentation, startPresentation, changePage } =
    useParticipantsContext();
  const [files, setFiles] = useState<IFile[]>([]);

  const onPageChange = (page: number) => {
    changePage(page);
  };

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
    }
  }, [local.permissions.permissions.canShareScreen, local.participant]);

  const generateMeetingInfo = () => {
    const meetingDate = new Date().toLocaleString("ru-RU", {
      timeZone: "Europe/Moscow",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const meetingLink = `${window.location.origin}/room/${roomId}`;

    return `Встреча: ${roomName}
Дата: ${meetingDate} (Москва)
Подключиться: ${meetingLink}`;
  };

  const handleChangeOpenPanel = (panel: Panel) => {
    if (panel !== openedRightPanel) {
      setOpenedRightPanel(panel);
      return;
    }
    setOpenedRightPanel(undefined);
  };

  const handleCopy = async () => {
    const text = generateMeetingInfo();

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Не удалось скопировать:", err);
      setManualText(text);
    }
  };

  const handleFetchFiles = async () => {
    const files = await fileService.listFiles(roomId);
    setFiles(files);

    startPresentation(files[0].url);
  };

  return (
    <div
      className={cn(styles.container, { [styles.open]: !!openedRightPanel })}
    >
      <div>
        <div className={styles.gridContainer}>
          <TrackLoop tracks={tracks}>
            <p>member</p>
          </TrackLoop>
          {presentation && (
            <PDFViewer
              showControls={
                presentation.authorId === local.participant.identity
              }
              pdfUrl={presentation.url}
              onPageChange={onPageChange}
              currentPage={presentation.currentPage}
            />
          )}
        </div>
      </div>
      <div
        className={cn(styles.rightPanel, {
          [styles.active]: openedRightPanel === "participants",
        })}
      >
        <ParticipantsList />
      </div>
      <div
        className={cn(styles.rightPanel, {
          [styles.active]: openedRightPanel === "chat",
        })}
      >
        {!!user.user && <Chat roomName={roomId} user={user.user} />}
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
        {local.permissions.permissions.canStartPresentation && (
          <button onClick={handleFetchFiles}>Транслировать презентацию</button>
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
        <button onClick={handleCopy}>Поделиться встречей</button>
      </div>

      {copied && (
        <div className={styles.copiedToast}>Скопировано в буфер обмена</div>
      )}
      {manualText && (
        <div className={styles.manualCopy}>
          <div>Не удалось скопировать. Скопируйте вручную:</div>
          <textarea
            readOnly
            value={manualText}
            className={styles.manualTextarea}
          />
        </div>
      )}
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
