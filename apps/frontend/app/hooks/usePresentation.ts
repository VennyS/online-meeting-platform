import { useEffect, useMemo, useState } from "react";
import { RoomSocket } from "../providers/websocket.provider";
import { Participant, Track } from "livekit-client";
import { TrackReference } from "@livekit/components-core";
import {
  useLocalParticipant,
  useRemoteParticipants,
} from "@livekit/components-react";

export type PresentationMode = "presentationWithCamera" | "presentationOnly";

export type Presentation = {
  id: string;
  fileId: string;
  presentationId: string;
  url: string;
  authorId: string;
  page: number;
  zoom: number;
  scroll: { x: number; y: number };
  mode: PresentationMode;
  source: Track.Source;
  participant: Participant;
  local: boolean;
  video?: TrackReference;
};

export type PresentationDto = Omit<
  Presentation,
  "id" | "source" | "participant" | "local" | "video"
>;

export interface PresentationProviderValue {
  presentations: Presentation[];
  start: (
    fileId: number,
    url: string,
    mode?: "presentationWithCamera" | "presentationOnly"
  ) => void;
  changePage: (presentationId: string, newPage: number) => void;
  changeZoom: (presentationId: string, newZoom: number) => void;
  changeScroll: (
    presentationId: string,
    position: { x: number; y: number }
  ) => void;
  changeMode: (
    presentationId: string,
    mode: "presentationWithCamera" | "presentationOnly"
  ) => void;
  finishPresentation: (presentationId: string) => void;
}

export function usePresentation(
  socket: RoomSocket | null
): PresentationProviderValue {
  const [presentations, setPresentations] = useState<
    Record<string, Omit<Presentation, "source" | "participant" | "local">>
  >({});
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();

  const allPresentations: Presentation[] = useMemo(
    () =>
      Object.values(presentations)
        .map((p) => {
          const participant =
            p.authorId === localParticipant?.identity
              ? localParticipant
              : remoteParticipants.find((r) => r.identity === p.authorId);

          if (!participant) return null;

          let sid: string;

          return {
            ...p,
            participant,
            source: Track.Source.Unknown,
            local: participant.sid === localParticipant.sid,
          };
        })
        .filter(Boolean) as (Presentation & { source: Track.Source })[],
    [presentations, localParticipant, remoteParticipants]
  );

  function start(
    fileId: number,
    url: string,
    mode:
      | "presentationWithCamera"
      | "presentationOnly" = "presentationWithCamera"
  ) {
    socket?.emit("presentation_started", { fileId, url, mode });
  }

  function changePage(presentationId: string, newPage: number) {
    socket?.emit("presentation_page_changed", {
      presentationId,
      page: newPage,
    });
  }

  function changeZoom(presentationId: string, newZoom: number) {
    socket?.emit("presentation_zoom_changed", {
      presentationId,
      zoom: newZoom,
    });
  }

  function changeScroll(
    presentationId: string,
    position: { x: number; y: number }
  ) {
    socket?.emit("presentation_scroll_changed", {
      presentationId,
      scroll: position,
    });
  }

  function changeMode(
    presentationId: string,
    mode: "presentationWithCamera" | "presentationOnly"
  ) {
    socket?.emit("presentation_mode_changed", { presentationId, mode });
  }

  function finishPresentation(presentationId: string) {
    socket?.emit("presentation_finished", { presentationId });
  }

  useEffect(() => {
    if (!socket) return;

    const onInit = (data: { presentations: PresentationDto[] }) => {
      setPresentations(() => {
        const newPresentations: Record<
          string,
          Omit<Presentation, "source" | "participant" | "local">
        > = {};
        data.presentations.forEach(
          (
            p: Omit<Presentation, "id" | "source" | "participant" | "local">
          ) => {
            newPresentations[p.presentationId] = {
              ...p,
              id: p.presentationId,
            };
          }
        );
        return newPresentations;
      });
    };

    const onStarted = (data: PresentationDto) => {
      setPresentations((prev) => ({
        ...prev,
        [data.presentationId]: { ...data, id: data.presentationId },
      }));
    };

    const onPageChanged = (
      data: Pick<Presentation, "presentationId" | "page">
    ) => {
      setPresentations((prev) => {
        const presentation = prev[data.presentationId];
        if (!presentation || presentation.page === data.page) {
          return prev;
        }
        return {
          ...prev,
          [data.presentationId]: {
            ...presentation,
            currentPage: data.page,
          },
        };
      });
    };
    const onZoomChanged = (
      data: Pick<Presentation, "presentationId" | "zoom">
    ) => {
      setPresentations((prev) => {
        const presentation = prev[data.presentationId];
        if (!presentation || presentation.zoom === data.zoom) {
          return prev;
        }
        return {
          ...prev,
          [data.presentationId]: {
            ...presentation,
            zoom: data.zoom,
          },
        };
      });
    };

    const onScrollChanged = (
      data: Pick<Presentation, "presentationId" | "scroll">
    ) => {
      if (
        !presentations ||
        Object.values(presentations).length === 0 ||
        presentations[data.presentationId]?.authorId ===
          localParticipant?.identity
      ) {
        return;
      }

      setPresentations((prev) => {
        const presentation = prev[data.presentationId];
        if (
          !presentation ||
          (presentation.scroll.x === data.scroll.x &&
            presentation.scroll.y === data.scroll.y)
        ) {
          return prev;
        }
        return {
          ...prev,
          [data.presentationId]: {
            ...presentation,
            scroll: data.scroll,
          },
        };
      });
    };

    const onModeChanged = (
      data: Pick<Presentation, "presentationId" | "mode">
    ) => {
      setPresentations((prev) => {
        const presentation = prev[data.presentationId];
        if (!presentation || presentation.mode === data.mode) {
          return prev;
        }
        return {
          ...prev,
          [data.presentationId]: {
            ...presentation,
            mode: data.mode,
          },
        };
      });
    };
    const onFinish = (data: Pick<Presentation, "presentationId">) => {
      setPresentations((prev) => {
        const newPresentations = { ...prev };
        delete newPresentations[data.presentationId];
        return newPresentations;
      });
    };

    socket.on("presentations_init", onInit);
    socket.on("presentation_started", onStarted);
    socket.on("presentation_page_changed", onPageChanged);
    socket.on("presentation_zoom_changed", onZoomChanged);
    socket.on("presentation_scroll_changed", onScrollChanged);
    socket.on("presentation_mode_changed", onModeChanged);
    socket.on("presentation_finished", onFinish);

    return () => {
      socket.off("presentations_init", onInit);
      socket.off("presentation_started", onStarted);
      socket.off("presentation_page_changed", onPageChanged);
      socket.off("presentation_zoom_changed", onZoomChanged);
      socket.off("presentation_scroll_changed", onScrollChanged);
      socket.off("presentation_mode_changed", onModeChanged);
      socket.off("presentation_finished", onFinish);
    };
  });

  return {
    presentations: allPresentations,
    start,
    changePage,
    changeZoom,
    changeScroll,
    changeMode,
    finishPresentation,
  };
}
