"use client";

import "@livekit/components-styles";
import {
  ChatIcon,
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useChat,
  useLocalParticipant,
  useParticipants,
  useTracks,
} from "@livekit/components-react";
import { useEffect, useState } from "react";
import { RoomEvent, Track } from "livekit-client";
import { useParams } from "next/navigation";
import { useUser } from "@/app/hooks/useUser";
import { roomService } from "@/app/services/room.service";
import { authService } from "@/app/services/auth.service";
import styles from "./page.module.css";
import cn from "classnames";
import { Panel } from "./types";
import SafeLink from "@/app/components/ui/atoms/SafeLink/SafeLink";
import { parseMessage } from "@/app/lib/parseMessage";

// Guest Form Component
const GuestForm = ({
  guestName,
  setGuestName,
  onSubmit,
}: {
  guestName: string;
  setGuestName: (name: string) => void;
  onSubmit: () => void;
}) => (
  <div className={styles.guestForm}>
    <h2>Введите имя для входа в комнату</h2>
    <input
      type="text"
      value={guestName}
      onChange={(e) => setGuestName(e.target.value)}
      placeholder="Ваше имя"
    />
    <button onClick={onSubmit}>Войти как гость</button>
  </div>
);

const Chat = () => {
  const { chatMessages, send } = useChat();
  const localParticipant = useLocalParticipant();
  const [message, setMessage] = useState("");

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const handleSend = () => {
    if (message.trim() === "") return;
    send(message.trim());
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.chatWrapper}>
      <ul className={styles.messagesWrapper}>
        {chatMessages.map((msg, index) => {
          const isMine =
            msg.from?.sid === localParticipant.localParticipant.sid;
          const from = isMine ? "Вы" : msg.from?.identity;

          return (
            <li
              key={index}
              className={cn(styles.chatLi, { [styles.myMessage]: isMine })}
            >
              <div className={styles.identifyWrapper}>
                <p>
                  {from} <span>{formatTime(msg.timestamp)}</span>
                </p>
              </div>
              <span>{parseMessage(msg.message)}</span>
            </li>
          );
        })}
      </ul>

      <div className={styles.inputWrapper}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Введите сообщение..."
          className={styles.chatInput}
        />
        <button onClick={handleSend} className={styles.sendButton}>
          Отправить
        </button>
      </div>
    </div>
  );
};

// Room Content Component
const RoomContent = ({ roomName }: { roomName: string }) => {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { updateOnlyOn: [RoomEvent.ActiveSpeakersChanged], onlySubscribed: false }
  );
  const [copied, setCopied] = useState(false);
  const [manualText, setManualText] = useState<string | null>(null);
  const [openedRightPanel, setOpenedRightPanel] = useState<Panel>();

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
        <ParticipantsList />
      </div>
      <div
        className={cn(styles.chat, {
          [styles.active]: openedRightPanel === "chat",
        })}
      >
        <Chat />
      </div>
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
        <button title="чат" onClick={() => handleChangeOpenPanel("chat")}>
          <ChatIcon />
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

const ParticipantsList = () => {
  const participants = useParticipants();

  return (
    <div className={styles.participantsList}>
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
  const { user, setUser } = useUser();
  const [token, setToken] = useState<string | null>(null);
  const [guestAllowed, setGuestAllowed] = useState(false);
  const [guestName, setGuestName] = useState("");

  useEffect(() => {
    if (!roomName) return;

    const checkGuestAccess = async () => {
      try {
        const { guestAllowed } = await roomService.guestAllowed(
          roomName as string
        );
        setGuestAllowed(guestAllowed);
      } catch (err) {
        console.error("Ошибка при проверке гостевого доступа:", err);
      }
    };

    checkGuestAccess();
  }, [roomName]);

  const handleGuestSubmit = async () => {
    if (!guestName) return;

    setUser({
      id: 0,
      firstName: guestName,
      lastName: "",
      email: "",
      phoneNumber: "",
      role: "guest",
      roleId: 0,
      emailVerified: false,
      profileImage: "",
      isGuest: true,
    });

    try {
      const response = await authService.getToken(
        roomName as string,
        guestName
      );
      setToken(response.token);
    } catch (err) {
      console.error("Ошибка при получении токена для гостя:", err);
    }
  };

  if (guestAllowed && !user) {
    return (
      <GuestForm
        guestName={guestName}
        setGuestName={setGuestName}
        onSubmit={handleGuestSubmit}
      />
    );
  }

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
        <RoomContent roomName={roomName as string} />
      </LiveKitRoom>
    </main>
  );
}
