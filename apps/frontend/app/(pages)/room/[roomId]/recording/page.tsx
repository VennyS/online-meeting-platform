"use client";

import { useWebSocket } from "@/app/hooks/useWebSocket";
import {
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  useTracks,
} from "@livekit/components-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import React, { useEffect } from "react";
import styles from "./page.module.css";
import { ParticipantsProvider } from "@/app/providers/participants.provider";
import { RoomContent } from "@/app/components/ui/organisms/RoomContent/RoomContent";
import { RoomEvent, Track } from "livekit-client";

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
          <RoomContent roomId={roomShortId as string} roomName="recording" />
        </ParticipantsProvider>
      </LiveKitRoom>
    </main>
  );
};

export default RecordingPage;
