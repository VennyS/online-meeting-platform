"use client";

import { useUser } from "@/app/hooks/useUser";
import { authService } from "@/app/services/auth.service";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./page.module.css";
import { LiveKitRoom } from "@livekit/components-react";
import { ParticipantsProvider } from "@/app/providers/participants.provider";
import { RoomContent } from "@/app/components/ui/organisms/RoomContent/RoomContent";
import { useWebSocket } from "@/app/hooks/useWebSocket";
import { usePrequisites } from "@/app/providers/prequisites.provider";
import { BlacklistProvider } from "@/app/providers/blacklist.provider";
import { WaitingHostProvider } from "@/app/providers/waiting.host.provider";
import { RecordingProvider } from "@/app/providers/recording.provider";
import { ChatProvider } from "@/app/providers/chat.provider";
import { PresentationProvider } from "@/app/providers/presentation.provider";
import { RoomLayoutProvider } from "@/app/providers/room-layout.provider";

export default function MeetingRoom() {
  const { roomId } = useParams();
  const [roomName, setRoomName] = useState<string>("");
  const { token, setToken, user } = useUser();
  const { socket, connect } = useWebSocket();
  const router = useRouter();

  const { prequisites, isLoading } = usePrequisites();

  const fullName = user ? `${user.firstName} ${user.lastName}` : "User";

  useEffect(() => {
    if (!token) {
      router.replace(`/room/${roomId}/prejoin`);
    }
  }, [token, user, roomId, router]);

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
        connect={
          !!token &&
          !isLoading &&
          !prequisites.isFinished &&
          !prequisites.cancelled
        }
        className={styles.roomContainer}
      >
        {user && (
          <ParticipantsProvider socket={socket}>
            <PresentationProvider socket={socket}>
              <ChatProvider socket={socket}>
                <RecordingProvider socket={socket}>
                  <BlacklistProvider socket={socket}>
                    <WaitingHostProvider socket={socket}>
                      <RoomLayoutProvider>
                        <RoomContent
                          roomId={roomId as string}
                          roomName={roomName}
                        />
                      </RoomLayoutProvider>
                    </WaitingHostProvider>
                  </BlacklistProvider>
                </RecordingProvider>
              </ChatProvider>
            </PresentationProvider>
          </ParticipantsProvider>
        )}
      </LiveKitRoom>
    </main>
  );
}
