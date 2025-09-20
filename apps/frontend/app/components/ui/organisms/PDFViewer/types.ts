export type PDFViewerProps = {
  pdfUrl: string;
  currentPage?: number;
  zoom?: number;
  totalPages?: number;
  isAuthor?: boolean;
  onPageChange?: (page: number) => void;
  onZoomChange?: (zoom: number) => void;
  scrollPosition?: { x: number; y: number };
  onScrollChange?: (position: { x: number; y: number }) => void;
};
