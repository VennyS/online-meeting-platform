"use client";

import "@livekit/components-styles";
import {
  ChatIcon,
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useParticipants,
  useRoomContext,
  useTracks,
} from "@livekit/components-react";
import { useEffect, useState } from "react";
import { RemoteParticipant, RoomEvent, Track } from "livekit-client";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/app/hooks/useUser";
import { roomService } from "@/app/services/room.service";
import { authService } from "@/app/services/auth.service";
import styles from "./page.module.css";
import cn from "classnames";
import { Panel } from "./types";
import { Chat } from "@/app/components/ui/organisms/Chat/Chat";
import { IWaitingGuest } from "@/app/types/room.types";

// Room Content Component
const RoomContent = ({
  roomName,
  waitingGuests,
  approveGuest,
  rejectGuest,
}: {
  roomName: string;
  waitingGuests: IWaitingGuest[];
  approveGuest: (guestId: string) => void;
  rejectGuest: (guestId: string) => void;
}) => {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { updateOnlyOn: [RoomEvent.ActiveSpeakersChanged], onlySubscribed: false }
  );
  const [copied, setCopied] = useState(false);
  const [manualText, setManualText] = useState<string | null>(null);
  const [openedRightPanel, setOpenedRightPanel] = useState<Panel>();
  const user = useUser();
  const [unreadCount, setUnreadCount] = useState(0);
  const room = useRoomContext();

  useEffect(() => {
    if (!room) return;

    const handleMessage = (
      payload: Uint8Array,
      participant?: RemoteParticipant
    ) => {
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

  const generateMeetingInfo = () => {
    const meetingDate = new Date().toLocaleString("ru-RU", {
      timeZone: "Europe/Moscow",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const meetingLink = `${window.location.origin}/meet/${roomName}`;

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

  return (
    <div
      className={cn(styles.container, { [styles.open]: !!openedRightPanel })}
    >
      <div className={styles.gridContainer}>
        <GridLayout tracks={tracks}>
          <ParticipantTile />
        </GridLayout>
      </div>
      <div
        className={cn(styles.participants, {
          [styles.active]: openedRightPanel === "participants",
        })}
      >
        <ParticipantsList
          waitingGuests={waitingGuests}
          approveGuest={approveGuest}
          rejectGuest={rejectGuest}
        />
      </div>
      <div
        className={cn(styles.chat, {
          [styles.active]: openedRightPanel === "chat",
        })}
      >
        {!!user.user && <Chat roomName={roomName} user={user.user} />}
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
            screenShare: false,
            settings: false,
            leave: false,
          }}
        />
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

const ParticipantsList = ({
  waitingGuests,
  approveGuest,
  rejectGuest,
}: {
  waitingGuests: IWaitingGuest[];
  approveGuest: (guestId: string) => void;
  rejectGuest: (guestId: string) => void;
}) => {
  const participants = useParticipants();

  return (
    <div className={styles.participantsList}>
      <h2>Ожидающие гости</h2>
      <div>
        {waitingGuests.map((guest) => (
          <div key={guest.guestId} className={styles.participantWrapper}>
            <p>{guest.name}</p>
            <button onClick={() => approveGuest(guest.guestId)}>
              Одобрить
            </button>
            <button onClick={() => rejectGuest(guest.guestId)}>
              Отклонить
            </button>
          </div>
        ))}
      </div>
      <h2>Участники встречи</h2>
      <div>
        {participants.map((participant) => (
          <div key={participant.sid} className={styles.participantWrapper}>
            <p>{participant.name || participant.identity || "Аноним"}</p>
            <p>{participant.metadata === "guest" ? "Гость" : "Пользователь"}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Main Component
export default function MeetingRoom() {
  const { roomName } = useParams();
  const { token, setToken, user } = useUser();
  const [waitingGuests, setWaitingGuests] = useState<IWaitingGuest[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const router = useRouter();

  useEffect(() => {
    console.log(token, user);
    if (!token) {
      router.replace(`/room/${roomName}/prejoin`);
    }
  }, [token, user, roomName, router]);

  // WebSocket для хоста
  useEffect(() => {
    if (!roomName || !user || user.isGuest) return;

    // Если пользователь - хост комнаты
    const isHost = true; // Здесь нужно проверить, что user - владелец комнаты

    if (isHost) {
      const websocket = new WebSocket(
        `ws://localhost:3001/ws?roomId=${roomName}&userId=${user.id}&isHost=true`
      );

      websocket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === "waiting_queue_updated") {
          setWaitingGuests(message.guests);
        }
      };

      setWs(websocket);

      return () => {
        websocket.close();
      };
    }
  }, [roomName, user]);

  const fullName = user ? `${user.firstName} ${user.lastName}` : "User";

  useEffect(() => {
    if (!roomName || !user || user.isGuest) return;

    const fetchToken = async () => {
      try {
        const response = await authService.getToken(
          roomName as string,
          fullName
        );
        setToken(response.token);
      } catch (err) {
        console.error("Ошибка при получении токена для пользователя:", err);
      }
    };

    fetchToken();
  }, [roomName, user]);

  const approveGuest = (guestId: string) => {
    if (ws) {
      ws.send(
        JSON.stringify({
          type: "host_approval",
          guestId,
          approved: true,
        })
      );
    }
  };

  const rejectGuest = (guestId: string) => {
    if (ws) {
      ws.send(
        JSON.stringify({
          type: "host_approval",
          guestId,
          approved: false,
        })
      );
    }
  };

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
        <RoomContent
          roomName={roomName as string}
          waitingGuests={waitingGuests}
          approveGuest={approveGuest}
          rejectGuest={rejectGuest}
        />
      </LiveKitRoom>
    </main>
  );
}
