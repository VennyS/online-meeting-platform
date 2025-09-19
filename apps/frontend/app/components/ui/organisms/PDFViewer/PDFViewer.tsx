"use client";

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

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  `pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`,
  "https://unpkg.com/"
).toString();

const PDFViewer = ({
  pdfUrl,
  currentPage = 1,
  zoom = 1,
  totalPages = 0,
  onPageChange,
  onZoomChange,
  showControls = false,
  scrollPosition = { x: 0, y: 0 },
  onScrollChange,
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
    if (currentPage > 1) {
      onPageChange?.(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (numPages > 0 && currentPage < numPages) {
      onPageChange?.(currentPage + 1);
    }
  };

  const handleZoomIn = () => {
    onZoomChange?.(Math.min(zoom + 0.25, 3));
  };

  const handleZoomOut = () => {
    onZoomChange?.(Math.max(zoom - 0.25, 0.25));
  };

  useEffect(() => {
    const container = pdfContainerRef.current;
    if (container) {
      container.scrollLeft = scrollPosition.x;
      container.scrollTop = scrollPosition.y;
    }
  }, [scrollPosition, currentPage, zoom]);

  useEffect(() => {
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
      <Document key={pdfUrl} file={pdfUrl} onLoadSuccess={handleDocumentLoad}>
        <Page
          pageNumber={currentPage}
          scale={zoom}
          renderTextLayer={false}
          renderAnnotationLayer={false}
        />
      </Document>
    ),
    [pdfUrl, currentPage, zoom] // только эти зависимости
  );

  return (
    <div className={styles.container}>
      {showControls && (
        <div className={styles.controls}>
          <button onClick={handlePrevPage} disabled={currentPage <= 1}>
            Предыдущая
          </button>
          <span className={styles.pageInfo}>
            Страница {currentPage} {numPages > 0 ? `из ${numPages}` : ""}
          </span>
          <button onClick={handleNextPage} disabled={currentPage >= numPages}>
            Следующая
          </button>

          <button onClick={handleZoomOut}>−</button>
          <span className={styles.zoomInfo}>{Math.round(zoom * 100)}%</span>
          <button onClick={handleZoomIn}>+</button>
        </div>
      )}

      <div className={styles.pdfContainer} ref={pdfContainerRef}>
        {documentElement}
      </div>
    </div>
  );
};

export default PDFViewer;
