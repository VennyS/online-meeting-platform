export type PDFViewerProps = {
  pdfUrl: string;
  currentPage?: number;
  zoom?: number;
  totalPages?: number;
  showControls?: boolean;
  onPageChange?: (page: number) => void;
  onZoomChange?: (zoom: number) => void;
  scrollPosition?: { x: number; y: number };
  onScrollChange?: (position: { x: number; y: number }) => void;
};
