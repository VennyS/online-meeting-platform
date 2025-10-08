import { Presentation } from "@/app/hooks/useParticipantsWithPermissions";
import {
  TrackReferenceOrPlaceholder,
  useGridLayout,
} from "@livekit/components-react";
import React from "react";
import { ParticipantTile } from "../ParticipantTile/ParticipantTile";

export interface GridLayoutProps {
  tracks: (TrackReferenceOrPlaceholder | Presentation)[];
  className?: string;
}

type TrackOrPresentation = TrackReferenceOrPlaceholder | Presentation;

export function usePagination(
  itemsPerPage: number,
  trackReferences: TrackOrPresentation[]
) {
  const [currentPage, setCurrentPage] = React.useState(1);

  const totalPageCount = Math.max(
    Math.ceil(trackReferences.length / itemsPerPage),
    1
  );

  React.useEffect(() => {
    if (currentPage > totalPageCount) {
      setCurrentPage(totalPageCount);
    }
  }, [currentPage, totalPageCount]);

  const lastItemIndex = currentPage * itemsPerPage;
  const firstItemIndex = lastItemIndex - itemsPerPage;

  const changePage = (direction: "next" | "previous") => {
    setCurrentPage((state) => {
      if (direction === "next") {
        return Math.min(state + 1, totalPageCount);
      } else {
        return Math.max(state - 1, 1);
      }
    });
  };

  const goToPage = (num: number) => {
    setCurrentPage(Math.max(1, Math.min(num, totalPageCount)));
  };

  const tracksOnPage = trackReferences.slice(firstItemIndex, lastItemIndex);

  return {
    totalPageCount,
    nextPage: () => changePage("next"),
    prevPage: () => changePage("previous"),
    setPage: goToPage,
    firstItemIndex,
    lastItemIndex,
    tracks: tracksOnPage,
    currentPage,
  };
}

export function GridLayout({ tracks, ...props }: GridLayoutProps) {
  const gridEl = React.createRef<HTMLDivElement>();

  const { layout } = useGridLayout(gridEl, tracks.length);
  const pagination = usePagination(layout.maxTiles, tracks);

  return (
    <div
      ref={gridEl}
      {...props}
      className={`lk-grid-layout ${props.className}`}
      data-lk-pagination={pagination.totalPageCount > 1}
    >
      {pagination.tracks.map((track, index) => {
        return (
          <ParticipantTile
            key={track.source + track.participant.sid + index}
            trackReference={track}
          />
        );
      })}
    </div>
  );
}
