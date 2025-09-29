"use client";

import { getWebSocketUrl } from "@/app/config/websocketUrl";
import { useUser } from "@/app/hooks/useUser";
import { authService } from "@/app/services/auth.service";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./page.module.css";
import { LiveKitRoom } from "@livekit/components-react";
import { ParticipantsProvider } from "@/app/providers/participants.provider";
import { RoomContent } from "@/app/components/ui/organisms/RoomContent/RoomContent";
import { useWebSocket } from "@/app/hooks/useWebSocket";

export default function MeetingRoom() {
  const { roomId } = useParams();
  const [roomName, setRoomName] = useState<string>("");
  const { token, setToken, user, loading } = useUser();
  const { ws, connect } = useWebSocket();
  const router = useRouter();

  const fullName = user ? `${user.firstName} ${user.lastName}` : "User";

  useEffect(() => {
    if (!token) {
      router.replace(`/room/${roomId}/prejoin`);
    }
  }, [token, user, roomId, router]);

  // WebSocket для хоста
  useEffect(() => {
    if (!roomId || !user || !token) return;
    connect(roomId as string, user.id, fullName);
  }, [roomId, user]);

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
