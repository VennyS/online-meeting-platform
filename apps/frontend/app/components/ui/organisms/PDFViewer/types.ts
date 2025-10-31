import { PresentationMode } from "@/app/hooks/usePresentation";

export type PDFViewerProps = {
  url: string;
  currentPage?: number;
  zoom?: number;
  totalPages?: number;
  isAuthor?: boolean;
  onPageChange?: (page: number) => void;
  onZoomChange?: (zoom: number) => void;
  scroll?: { x: number; y: number };
  onScrollChange?: (position: { x: number; y: number }) => void;
  mode?: PresentationMode;
  onChangePresentationMode?: (mode: PresentationMode) => void;
};
