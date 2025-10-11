"use client";

const base =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost";

if (!(URL as any).parse) {
  (URL as any).parse = (str: string) => new URL(str, base);
}

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { Document, Page, pdfjs } from "react-pdf";
import styles from "./PDFViewer.module.css";
import { PDFViewerProps } from "./types";
import cn from "classnames";
import { IconButton, Stack, Switch, Typography } from "@mui/material";
import ChevronLeftOutlinedIcon from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlinedIcon from "@mui/icons-material/ChevronRightOutlined";
import ZoomInOutlinedIcon from "@mui/icons-material/ZoomInOutlined";
import ZoomOutOutlinedIcon from "@mui/icons-material/ZoomOutOutlined";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  `pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`,
  "https://unpkg.com/"
).toString();

const PDFViewer = ({
  url,
  currentPage = 1,
  zoom = 1,
  totalPages = 0,
  onPageChange,
  onZoomChange,
  isAuthor = false,
  scrollPosition = { x: 0, y: 0 },
  onScrollChange,
  mode = "presentationWithCamera",
  onChangePresentationMode,
}: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number>(totalPages);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  const handleDocumentLoad = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
      if (totalPages === 0 && onPageChange) {
        onPageChange(Math.min(currentPage, numPages));
      }
    },
    [totalPages, currentPage, onPageChange]
  );

  const handlePrevPage = () => {
    if (!isAuthor) return;

    if (currentPage > 1) {
      onPageChange?.(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (!isAuthor) return;

    if (numPages > 0 && currentPage < numPages) {
      onPageChange?.(currentPage + 1);
    }
  };

  const handleZoomIn = () => {
    if (!isAuthor) return;

    onZoomChange?.(Math.min(zoom + 0.25, 3));
  };

  const handleZoomOut = () => {
    if (!isAuthor) return;

    onZoomChange?.(Math.max(zoom - 0.25, 0.25));
  };

  const handleModeChange = () => {
    if (!isAuthor || !onChangePresentationMode) return;
    onChangePresentationMode(
      mode === "presentationWithCamera"
        ? "presentationOnly"
        : "presentationWithCamera"
    );
  };

  useEffect(() => {
    const container = pdfContainerRef.current;
    if (container) {
      container.scrollLeft = scrollPosition.x;
      container.scrollTop = scrollPosition.y;
    }
  }, [scrollPosition, currentPage, zoom]);

  useEffect(() => {
    if (!isAuthor) return;
    const container = pdfContainerRef.current;
    if (!container || !onScrollChange) return;

    const handleScroll = () => {
      const { scrollLeft, scrollTop } = container;
      onScrollChange({ x: scrollLeft, y: scrollTop });
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [onScrollChange]);

  const documentElement = useMemo(
    () => (
      <Document key={url} file={url} onLoadSuccess={handleDocumentLoad}>
        <Page
          pageNumber={currentPage}
          scale={zoom}
          renderTextLayer={false}
          renderAnnotationLayer={false}
        />
      </Document>
    ),
    [url, currentPage, zoom]
  );

  return (
    <div className={styles.container}>
      {isAuthor && (
        <Stack
          direction="row"
          alignItems="center"
          px={1}
          sx={{
            bgcolor: "background.paper",
          }}
        >
          {numPages > 1 && (
            <>
              <IconButton onClick={handlePrevPage} disabled={currentPage <= 1}>
                <ChevronLeftOutlinedIcon />
              </IconButton>
              <Typography variant="body2">
                Страница {currentPage} {numPages > 0 ? `из ${numPages}` : ""}
              </Typography>
              <IconButton
                onClick={handleNextPage}
                disabled={currentPage >= numPages}
              >
                <ChevronRightOutlinedIcon />
              </IconButton>
            </>
          )}
          <IconButton onClick={handleZoomOut}>
            <ZoomOutOutlinedIcon />
          </IconButton>
          <Typography variant="body2">{Math.round(zoom * 100)}%</Typography>
          <IconButton onClick={handleZoomIn}>
            <ZoomInOutlinedIcon />
          </IconButton>
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.5}
            sx={{ ml: 1 }}
          >
            <VideocamOutlinedIcon sx={{ color: "rgba(0, 0, 0, 0.54);" }} />
            <Switch
              checked={mode === "presentationWithCamera"}
              onChange={handleModeChange}
              color="primary"
              size="small"
            />
          </Stack>
        </Stack>
      )}

      <div
        className={cn(styles.pdfContainer, { [styles.scrollBlock]: !isAuthor })}
        ref={pdfContainerRef}
      >
        {documentElement}
      </div>
    </div>
  );
};

export default PDFViewer;
