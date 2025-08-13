"use client";

import "@livekit/components-styles";
import {
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import { useEffect, useState } from "react";
import { RoomEvent, Track } from "livekit-client";
import styles from "./page.module.css";
import { useParams } from "next/navigation";
import { useUser } from "@/app/hooks/useUser";
import { axiosClassic } from "@/app/api/interceptors";

export default function Home() {
  const { roomName } = useParams();
  const [token, setToken] = useState<string | null>(null);
  const { user } = useUser();

  const fullName = user ? `${user.firstName} ${user.lastName}` : "User";

  useEffect(() => {
    async function fetchToken() {
      try {
        const response = await axiosClassic.get("auth/token", {
          params: { room: roomName, name: fullName },
        });
        setToken(response.data.token);
      } catch (err) {
        console.error("Ошибка при получении токена:", err);
      }
    }

    fetchToken();
  }, [roomName, fullName]);

  if (!token) return <div>Loading...</div>;

  return (
    <main className={styles.main}>
      <LiveKitRoom
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        token={token}
        connect
        className={styles.roomContainer}
      >
        <RoomContent roomName={roomName as string} />
      </LiveKitRoom>
    </main>
  );
}

const RoomContent = ({ roomName }: { roomName: string }) => {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { updateOnlyOn: [RoomEvent.ActiveSpeakersChanged], onlySubscribed: false }
  );

  const [copied, setCopied] = useState(false);
  const [manualText, setManualText] = useState<string | null>(null);

  const handleCopy = async () => {
    const meetingName = roomName; // тут подставь реальное название
    const meetingDate = new Date().toLocaleString("ru-RU", {
      timeZone: "Europe/Moscow",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const meetingLink = `${window.location.origin}/meet/${roomName}`;

    const text = `Встреча: ${meetingName}
Дата: ${meetingDate} (Москва)
Подключиться: ${meetingLink}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // через 2 сек убрать уведомление
    } catch (err) {
      console.error("Не удалось скопировать:", err);
      setManualText(text); // покажем текст для ручного копирования
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.gridContainer}>
        <GridLayout tracks={tracks}>
          <ParticipantTile />
        </GridLayout>
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
        <button onClick={handleCopy}>Поделиться встречей</button>
      </div>

      {copied && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#4caf50",
            color: "white",
            padding: "10px 20px",
            borderRadius: "8px",
          }}
        >
          Скопировано в буфер обмена
        </div>
      )}

      {manualText && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#f44336",
            color: "white",
            padding: "10px 20px",
            borderRadius: "8px",
            maxWidth: "90%",
          }}
        >
          <div>Не удалось скопировать. Скопируйте вручную:</div>
          <textarea
            readOnly
            value={manualText}
            style={{
              width: "100%",
              height: "100px",
              marginTop: "5px",
              resize: "none",
            }}
          />
        </div>
      )}

      <RoomAudioRenderer />
    </div>
  );
};
