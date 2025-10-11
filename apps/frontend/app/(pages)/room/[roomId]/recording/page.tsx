"use client";

import { useWebSocket } from "@/app/hooks/useWebSocket";
import { LiveKitRoom, useLocalParticipant } from "@livekit/components-react";
import {
  notFound,
  useParams,
  useRouter,
  useSearchParams,
} from "next/navigation";
import React, { useEffect } from "react";
import styles from "./page.module.css";
import { ParticipantsProvider } from "@/app/providers/participants.provider";
import { RoomContent } from "@/app/components/ui/organisms/RoomContent/RoomContent";

const EGRESS_CREDENTIAL = "egress";

const RecordingPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("livekitToken");
  const { roomId: roomShortId } = useParams();
  const { ws, connect } = useWebSocket();

  const egressId = 0;

  if (!token || !roomShortId) {
    router.replace("/404");
  }

  useEffect(() => {
    connect(roomShortId as string, egressId, "egress");
  });

  console.log("START_RECORDING");

  return (
    <main className={styles.main}>
      <LiveKitRoom
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        token={token!}
        connect
        className={styles.roomContainer}
      >
        <ParticipantsProvider localUserId={egressId} ws={ws}>
          <RecordingPageContent roomShortId={roomShortId as string} />
        </ParticipantsProvider>
      </LiveKitRoom>
    </main>
  );
};

const RecordingPageContent = ({ roomShortId }: { roomShortId: string }) => {
  const localInfo = useLocalParticipant();

  useEffect(() => {
    const identity = localInfo.localParticipant.identity;
    const name = localInfo.localParticipant.name;

    if (!identity) return;

    if (identity !== EGRESS_CREDENTIAL && name !== EGRESS_CREDENTIAL) {
      notFound();
    }
  }, [localInfo]);

  return <RoomContent roomId={roomShortId} roomName="recording" hideControls />;
};

export default RecordingPage;
