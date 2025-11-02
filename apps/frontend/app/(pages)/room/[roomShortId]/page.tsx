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
import { envConfig } from "@/app/config/config";
import { LoadingPage } from "@/app/components/ui/organisms/LoadingPage/LoadingPage";
import { useRoomGuard } from "@/app/hooks/useRoomGuard";
import { usePrejoinRedirect } from "@/app/hooks/usePrejoinRedirect";

export default function MeetingRoom() {
  const { roomShortId } = useParams() as { roomShortId: string };
  usePrejoinRedirect(roomShortId);
  useRoomGuard(roomShortId);
  const [roomName, setRoomName] = useState<string>("");
  const { token, setToken, user } = useUser();
  const { socket, connect } = useWebSocket();

  const { prequisites, isLoading } = usePrequisites();

  const fullName = user ? `${user.firstName} ${user.lastName}` : "User";

  useEffect(() => {
    if (!roomShortId || !user || user.isGuest) return;

    const fetchToken = async () => {
      try {
        const response = await authService.getToken(
          roomShortId as string,
          fullName
        );
        setToken(response.token);
        setRoomName(response.metadata.name);

        connect(roomShortId as string, user.id, fullName);
      } catch (err) {
        console.error("Ошибка при получении токена для пользователя:", err);
      }
    };

    fetchToken();
  }, [roomShortId, user]);

  if (!token && user) {
    return <LoadingPage />;
  }

  return (
    <main className={styles.main}>
      <LiveKitRoom
        serverUrl={envConfig.livekitUrl}
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
                          roomShortId={roomShortId as string}
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
