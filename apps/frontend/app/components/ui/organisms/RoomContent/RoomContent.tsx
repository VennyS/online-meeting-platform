"use client";

import "@livekit/components-styles";
import {
  ChatIcon,
  ControlBar,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  TrackReference,
  useRoomContext,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import { useEffect, useState } from "react";
import { LocalParticipant, RoomEvent, Track } from "livekit-client";
import { useUser } from "@/app/hooks/useUser";
import styles from "./RoomContent.module.css";
import cn from "classnames";
import { Chat } from "@/app/components/ui/organisms/Chat/Chat";
import { useParticipantsContext } from "@/app/providers/participants.provider";
import { ParticipantsList } from "@/app/components/ui/organisms/ParticipantsList/ParticipantsList";
import { fileService, IFile } from "@/app/services/file.service";
import dynamic from "next/dynamic";
import PresentationList from "@/app/components/ui/organisms/PresentationList/PresentationList";
import { Panel } from "./types";
import { PresentationMode } from "@/app/hooks/useParticipantsWithPermissions";
import { useRouter } from "next/navigation";

const PDFViewer = dynamic(
  () => import("@/app/components/ui/organisms/PDFViewer/PDFViewer"),
  {
    ssr: false,
  }
);

export const RoomContent = ({
  roomId,
  roomName,
}: {
  roomId: string;
  roomName: string;
}) => {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { updateOnlyOn: [RoomEvent.ActiveSpeakersChanged], onlySubscribed: false }
  );

  const [openedRightPanel, setOpenedRightPanel] = useState<Panel>();
  const { user } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);
  const room = useRoomContext();
  const {
    local,
    localPresentation,
    remotePresentations,
    isRecording,
    startPresentation,
    changePage,
    changeZoom,
    changeScroll,
    finishPresentation,
    changePresentationMode,
    startRecording,
    stopRecording,
  } = useParticipantsContext();
  const [files, setFiles] = useState<IFile[]>([]);

  useEffect(() => {
    if (!room) return;

    const handleMessage = () => {
      if (openedRightPanel !== "chat") {
        setUnreadCount((prev) => prev + 1);
      }
    };

    room.on(RoomEvent.DataReceived, handleMessage);
    room.on(RoomEvent.Disconnected, () => {
      // router.replace("/404");
    });
    return () => {
      room.off(RoomEvent.DataReceived, handleMessage);
    };
  }, [room, openedRightPanel]);

  useEffect(() => {
    if (openedRightPanel === "chat") setUnreadCount(0);
  }, [openedRightPanel]);

  useEffect(() => {
    if (!local.participant) return;

    if (local.participant instanceof LocalParticipant) {
      if (!local.permissions.permissions.canShareScreen) {
        const screenTrackPub = Array.from(
          local.participant.trackPublications.values()
        ).find((pub) => pub.source === "screen_share");

        if (screenTrackPub?.track) {
          local.participant.unpublishTrack(screenTrackPub.track);
        }
      }

      if (localPresentation) {
        finishPresentation(localPresentation[0]);
      }
    }
  }, []);

  const handleChangeOpenPanel = (panel: Panel) => {
    if (panel !== openedRightPanel) {
      setOpenedRightPanel(panel);
      return;
    }
    setOpenedRightPanel(undefined);
  };

  useEffect(() => {
    const handleFetchFiles = async () => {
      try {
        const files = await fileService.listFiles(roomId, 0, 10, "PDF");
        setFiles(files);
      } catch (err) {
        console.error("Error fetching files:", err);
      }
    };

    handleFetchFiles();
  }, [roomId]);

  const correctedTracks = tracks.filter((t) => {
    if (t.source !== Track.Source.Camera) return true;
    const participantInPresentation =
      (localPresentation &&
        localPresentation[1].authorId === t.participant.identity &&
        localPresentation[1].mode === "presentationWithCamera") ||
      Array.from(remotePresentations.values()).some(
        (p) =>
          p.authorId === t.participant.identity &&
          p.mode === "presentationWithCamera"
      );
    return !participantInPresentation;
  });

  return (
    <div
      className={cn(styles.container, { [styles.open]: !!openedRightPanel })}
    >
      <div className={styles.gridContainer}>
        {correctedTracks && correctedTracks.length > 0 && (
          <GridLayout tracks={correctedTracks}>
            <ParticipantTile />
          </GridLayout>
        )}
        {!!localPresentation && (
          <div className={styles.pdfContainer}>
            <PDFViewer
              isAuthor
              key={localPresentation[1].url}
              pdfUrl={localPresentation[1].url}
              currentPage={localPresentation[1].currentPage}
              zoom={localPresentation[1].zoom}
              scrollPosition={localPresentation[1].scroll}
              onPageChange={(page: number) => {
                changePage(localPresentation[0], page);
              }}
              onZoomChange={(zoom: number) => {
                changeZoom(localPresentation[0], zoom);
              }}
              onScrollChange={(position: { x: number; y: number }) => {
                changeScroll(localPresentation[0], position);
              }}
              mode={localPresentation[1].mode}
              onChangePresentationMode={(mode: PresentationMode) => {
                changePresentationMode(localPresentation[0], mode);
              }}
            />
            {localPresentation![1].mode === "presentationWithCamera" && (
              <div className={styles.presenterCamera}>
                {(() => {
                  const track = tracks.find(
                    (t) =>
                      t.source === Track.Source.Camera &&
                      t.participant.identity === localPresentation[1].authorId
                  );
                  return (
                    track?.publication && (
                      <VideoTrack trackRef={track as TrackReference} />
                    )
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {Array.from(remotePresentations.entries()).map(
          ([presentationId, presentation]) => (
            <div key={presentationId} className={styles.presentationItem}>
              <div className={styles.presentationWrapper}>
                <PDFViewer
                  key={presentation.url}
                  pdfUrl={presentation.url}
                  currentPage={presentation.currentPage}
                  zoom={presentation.zoom}
                  scrollPosition={presentation.scroll}
                />
                {presentation.mode === "presentationWithCamera" && (
                  <div className={styles.presenterCamera}>
                    {(() => {
                      const track = tracks.find(
                        (t) =>
                          t.source === Track.Source.Camera &&
                          t.participant.identity === presentation.authorId
                      );
                      return (
                        track?.publication && (
                          <VideoTrack trackRef={track as TrackReference} />
                        )
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>

      <div
        className={cn(styles.rightPanel, {
          [styles.active]: openedRightPanel === "participants",
        })}
      >
        <ParticipantsList roomId={roomId} roomName={roomName} />
      </div>
      <div
        className={cn(styles.rightPanel, {
          [styles.active]: openedRightPanel === "chat",
        })}
      >
        {!!user && <Chat />}
      </div>
      <div
        className={cn(styles.rightPanel, {
          [styles.active]: openedRightPanel === "files",
        })}
      >
        <PresentationList files={files} onClick={startPresentation} />
      </div>

      {openedRightPanel && (
        <button
          className={styles.closePanelButton}
          onClick={() => setOpenedRightPanel(undefined)}
        >
          ✕
        </button>
      )}

      <div className={styles.controls}>
        <p>{roomName}</p>
        <ControlBar
          controls={{
            microphone: true,
            camera: true,
            screenShare: local.permissions.permissions.canShareScreen,
            settings: false,
            leave: false,
          }}
        />

        <button onClick={() => handleChangeOpenPanel("participants")}>
          {openedRightPanel === "participants" ? "Закрыть" : "Участники"}
        </button>
        <button onClick={() => handleChangeOpenPanel("files")}>
          {openedRightPanel === "files" ? "Закрыть" : "Презентация"}
        </button>
        <button
          className={styles.chatButton}
          title="чат"
          onClick={() => handleChangeOpenPanel("chat")}
        >
          <ChatIcon />
          {unreadCount > 0 && (
            <div className={styles.notificationDot}>{unreadCount}</div>
          )}
        </button>
        {local.permissions.role === "owner" && (
          <button
            onClick={() => (isRecording ? stopRecording() : startRecording())}
          >
            Запись {isRecording ? "да" : "нет"}
          </button>
        )}
      </div>

      <RoomAudioRenderer />
    </div>
  );
};
