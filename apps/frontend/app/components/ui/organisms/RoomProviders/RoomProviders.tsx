import { BlacklistProvider } from "@/app/providers/blacklist.provider";
import { ChatProvider } from "@/app/providers/chat.provider";
import { ParticipantsProvider } from "@/app/providers/participants.provider";
import { PresentationProvider } from "@/app/providers/presentation.provider";
import { RecordingProvider } from "@/app/providers/recording.provider";
import { RoomLayoutProvider } from "@/app/providers/room-layout.provider";
import { WaitingHostProvider } from "@/app/providers/waiting.host.provider";
import { RoomSocket } from "@/app/types/socket.types";

export const RoomProviders = ({
  socket,
  children,
}: {
  socket: RoomSocket | null;
  children: React.ReactNode;
}) => {
  return (
    <ParticipantsProvider socket={socket}>
      <PresentationProvider socket={socket}>
        <ChatProvider socket={socket}>
          <RecordingProvider socket={socket}>
            <BlacklistProvider socket={socket}>
              <WaitingHostProvider socket={socket}>
                <RoomLayoutProvider>{children}</RoomLayoutProvider>
              </WaitingHostProvider>
            </BlacklistProvider>
          </RecordingProvider>
        </ChatProvider>
      </PresentationProvider>
    </ParticipantsProvider>
  );
};
