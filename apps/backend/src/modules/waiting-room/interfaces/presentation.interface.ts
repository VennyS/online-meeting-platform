export type PresentationMode = 'presentationWithCamera' | 'presentationOnly';

export interface IPresentation {
  presentationId: string;
  authorId: string;
  url: string;
  currentPage: number;
  zoom: number;
  scroll: {
    x: number;
    y: number;
  };
  mode: PresentationMode;
}
