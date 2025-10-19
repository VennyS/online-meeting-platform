"use client";

import "@livekit/components-styles";

import {
  FocusLayoutContainer,
  RoomAudioRenderer,
} from "@livekit/components-react";
import { useEffect, useState } from "react";
import { useUser } from "@/app/hooks/useUser";
import styles from "./RoomContent.module.css";
import cn from "classnames";
import { Chat } from "@/app/components/ui/organisms/Chat/Chat";
import { useParticipantsContext } from "@/app/providers/participants.provider";
import { ParticipantsPanel } from "@/app/components/ui/organisms/ParticipantsPanel/ParticipantsPanel";
import { fileService, IFile } from "@/app/services/file.service";
import PresentationList from "@/app/components/ui/organisms/PresentationList/PresentationList";
import { RoomContentProps } from "./types";
import { Panel } from "@/app/hooks/useParticipantsWithPermissions";
import ControlBar from "../ControlBar/ControlBar";
import RightPanel from "../RightPanel/RightPanel";
import React from "react";
import { ParticipantTile } from "../ParticipantTile/ParticipantTile";
import { useFocus } from "@/app/providers/focus.provider";
import { GridLayout } from "../GridLayout/GridLayout";
import { useRoomTracksWithPresentations } from "@/app/hooks/useRoomTracksWithPresentations";
import { UserFilesModal } from "../UserFilesModal/UserFIlesModal";
import { Typography } from "@mui/material";

export const RoomContent = ({
  roomId,
  roomName,
  hideControls = false,
}: RoomContentProps) => {
  const tracks = useRoomTracksWithPresentations({
    includeCamera: true,
    includeScreen: true,
    withPlaceholder: true,
  });

  const { user } = useUser();
  const { openedRightPanel, overflowInfo, resetOverflowInfo, deleteFiles } =
    useParticipantsContext();
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
    const handleFetchFiles = async () => {
      try {
        const files = await fileService.listRoom(roomId, 0, 10, "PDF");
        setFiles(files);
      } catch (err) {
        console.error("Error fetching files:", err);
      }
    };

    handleFetchFiles();
  }, [roomId]);

  const onCloseModal = async () => {
    if (!overflowInfo || overflowInfo.totalVideoSize < overflowInfo.constraint)
      return;

    await fileService.delete(overflowInfo.causedById);
    resetOverflowInfo();
  };

  useEffect(() => {
    return () => {
      onCloseModal();
    };
  }, []);

  const { focusTrack } = useFocus();
  const carouselTracks = tracks.filter((t) => {
    if (!focusTrack || Array.isArray(focusTrack)) return true;

    const focused = focusTrack.participant.identity;
    const focusedSource = focusTrack.source;

    return !(t.participant.identity === focused && t.source === focusedSource);
  });

  return (
    <div
      className={cn(styles.container, { [styles.open]: !!openedRightPanel })}
    >
      <div className={styles.gridContainer}>
        {tracks && tracks.length > 0 && (
          <>
            {!focusTrack ? (
              <GridLayout tracks={tracks} className={styles.gridLayout} />
            ) : (
              <FocusLayoutContainer className={styles.focusLayoutContainer}>
                <div className={styles.carouselLayout}>
                  {carouselTracks.map((t) => {
                    return (
                      <ParticipantTile
                        key={t.participant.identity + t.source}
                        trackReference={t}
                        className={styles.carouselTile}
                      />
                    );
                  })}
                </div>
                {focusTrack && (
                  <ParticipantTile
                    trackReference={focusTrack}
                    className={styles.focusTrackContainer}
                  />
                )}
              </FocusLayoutContainer>
            )}
          </>
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
      {!!overflowInfo && (
        <UserFilesModal
          isOpen={!!overflowInfo}
          fileType={"VIDEO"}
          onClose={onCloseModal}
          onDelete={deleteFiles}
        >
          <Typography variant="h3">
            Хранилище записей переполнено, удалите ненужные файлы или закройте
            модальное окно, чтобы удалить текущую запись. Закрытие вкладки
            приведет к такому же результату.
          </Typography>
        </UserFilesModal>
      )}

      <RoomAudioRenderer />
    </div>
  );
};
