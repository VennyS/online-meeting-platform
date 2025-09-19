"use client";

import React, { useState, useCallback } from "react";
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
}: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number>(totalPages);

  // Когда документ загружен — обновляем количество страниц
  const handleDocumentLoad = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
      // Если пришло 0 страниц (т.е. totalPages не был передан), уведомим родителя
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
    onZoomChange?.(Math.min(zoom + 0.25, 3)); // макс. зум 300%
  };

  const handleZoomOut = () => {
    onZoomChange?.(Math.max(zoom - 0.25, 0.25)); // мин. зум 25%
  };

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

      <div className={styles.pdfContainer}>
        <Document file={pdfUrl} onLoadSuccess={handleDocumentLoad}>
          <Page
            pageNumber={currentPage}
            scale={zoom}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      </div>
    </div>
  );
};

export default PDFViewer;
