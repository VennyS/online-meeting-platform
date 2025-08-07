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
        const response = await axiosClassic.get("/token", {
          params: { room: roomName, name: fullName },
        });
        setToken(response.data.token);
        console.log("Token получен:", response.data.token);
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
        <RoomContent />
      </LiveKitRoom>
    </main>
  );
}

const RoomContent = () => {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { updateOnlyOn: [RoomEvent.ActiveSpeakersChanged], onlySubscribed: false }
  );

  return (
    <div className={styles.container}>
      <div className={styles.gridContainer}>
        <GridLayout tracks={tracks}>
          <ParticipantTile />
        </GridLayout>
      </div>
      <ControlBar
        controls={{
          microphone: true,
          camera: true,
          screenShare: false,
          settings: false,
          leave: false,
        }}
      />
      <RoomAudioRenderer />
    </div>
  );
};
