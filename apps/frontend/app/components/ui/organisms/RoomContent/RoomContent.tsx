"use client";

import "@livekit/components-styles";
import {
  CarouselLayout,
  FocusLayout,
  FocusLayoutContainer,
  GridLayout,
  LayoutContextProvider,
  ParticipantTile,
  RoomAudioRenderer,
  TrackReference,
  useCreateLayoutContext,
  usePinnedTracks,
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
import { ParticipantsPanel } from "@/app/components/ui/organisms/ParticipantsPanel/ParticipantsPanel";
import { fileService, IFile } from "@/app/services/file.service";
import dynamic from "next/dynamic";
import PresentationList from "@/app/components/ui/organisms/PresentationList/PresentationList";
import { RoomContentProps } from "./types";
import {
  Panel,
  PresentationMode,
} from "@/app/hooks/useParticipantsWithPermissions";
import ControlBar from "../ControlBar/ControlBar";
import RightPanel from "../RightPanel/RightPanel";

const PDFViewer = dynamic(
  () => import("@/app/components/ui/organisms/PDFViewer/PDFViewer"),
  {
    ssr: false,
  }
);

export const RoomContent = ({
  roomId,
  roomName,
  hideControls = false,
}: RoomContentProps) => {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { updateOnlyOn: [RoomEvent.ActiveSpeakersChanged], onlySubscribed: false }
  );

  const { user } = useUser();
  const {
    local,
    localPresentation,
    remotePresentations,
    openedRightPanel,
    changePage,
    changeZoom,
    changeScroll,
    finishPresentation,
    changePresentationMode,
  } = useParticipantsContext();
  const [files, setFiles] = useState<IFile[]>([]);

  const panels = [
    {
      key: Panel.Chat,
      title: "Чат",
      content: user ? <Chat /> : null,
    },
    {
      key: Panel.Participants,
      title: "Участники",
      content: <ParticipantsPanel roomId={roomId} roomName={roomName} />,
    },
    {
      key: Panel.Files,
      title: "Файлы",
      content: <PresentationList files={files} />,
    },
  ];

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

  useEffect(() => {
    const handleFetchFiles = async () => {
      try {
        const files = await fileService.list(roomId, 0, 10, "PDF");
        setFiles(files);
      } catch (err) {
        console.error("Error fetching files:", err);
      }
    };

    handleFetchFiles();
  }, [roomId]);

  const correctedTracks = tracks.filter((t) => {
    if (t.participant.permissions?.hidden) return false;
    if (t.source !== Track.Source.Camera) return true;

    const participantInPresentation =
      (localPresentation &&
        localPresentation[1].authorId === t.participant.identity &&
        localPresentation[1].mode === "presentationWithCamera") ||
      Object.values(remotePresentations).some(
        (p) =>
          p.authorId === t.participant.identity &&
          p.mode === "presentationWithCamera"
      );
    return !participantInPresentation;
  });

  const layoutContext = useCreateLayoutContext();

  const focusTrack = usePinnedTracks(layoutContext)?.[0];
  const carouselTracks = tracks.filter((track) => track !== focusTrack);

  return (
    <div
      className={cn(styles.container, { [styles.open]: !!openedRightPanel })}
    >
      <div className={styles.gridContainer}>
        {correctedTracks && correctedTracks.length > 0 && (
          <LayoutContextProvider value={layoutContext}>
            {!focusTrack ? (
              <GridLayout tracks={tracks}>
                <ParticipantTile />
              </GridLayout>
            ) : (
              <FocusLayoutContainer>
                <CarouselLayout tracks={carouselTracks}>
                  <ParticipantTile />
                </CarouselLayout>
                {focusTrack && <FocusLayout trackRef={focusTrack} />}
              </FocusLayoutContainer>
            )}
          </LayoutContextProvider>
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
            {localPresentation![1].mode === "presentationWithCamera" &&
              (() => {
                const track = tracks.find(
                  (t) =>
                    t.source === Track.Source.Camera &&
                    t.participant.identity === localPresentation[1].authorId
                );
                return (
                  track?.publication && (
                    <div className={styles.presenterCamera}>
                      <VideoTrack trackRef={track as TrackReference} />
                    </div>
                  )
                );
              })()}
          </div>
        )}

        {Object.entries(remotePresentations).map(
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
                {presentation.mode === "presentationWithCamera" &&
                  (() => {
                    const track = tracks.find(
                      (t) =>
                        t.source === Track.Source.Camera &&
                        t.participant.identity === presentation.authorId
                    );
                    return (
                      track?.publication && (
                        <div className={styles.presenterCamera}>
                          <VideoTrack trackRef={track as TrackReference} />
                        </div>
                      )
                    );
                  })()}
              </div>
            </div>
          )
        )}
      </div>

      {panels.map(({ key, title, content }) => (
        <RightPanel
          key={key}
          title={title}
          className={cn(styles.rightPanel, {
            [styles.active]: openedRightPanel === key,
          })}
        >
          {content}
        </RightPanel>
      ))}

      {!hideControls && <ControlBar haveFiles={files.length > 0} />}

      <RoomAudioRenderer />
    </div>
  );
};
