export interface RoomFile {
  id: number;
  fileName: string;
  fileType: FileType;
  fileSize: number;
  url: string;
}

export type FileType = "VIDEO" | "AUDIO" | "TEXT" | "PDF";
