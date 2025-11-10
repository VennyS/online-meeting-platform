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
import { RoomContent } from "@/app/components/ui/organisms/RoomContent/RoomContent";
import { envConfig } from "@/app/config/config";
import { RoomProviders } from "@/app/components/ui/organisms/RoomProviders/RoomProviders";

const EGRESS_CREDENTIAL = "egress";

const RecordingPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("livekitToken");
  const { roomShortId } = useParams() as { roomShortId: string };
  const { socket, connect } = useWebSocket();

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
        serverUrl={envConfig.livekitUrl}
        token={token!}
        connect
        className={styles.roomContainer}
      >
        <RoomProviders socket={socket}>
          <RecordingPageContent roomShortId={roomShortId} />
        </RoomProviders>
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

  return (
    <RoomContent roomShortId={roomShortId} roomName="recording" hideControls />
  );
};

export default RecordingPage;
