import { RoomFile } from "@/app/types/files.types";

export type FileCardProps = {
  file: RoomFile;
  onRename?: (file: RoomFile) => void;
  onDownload: (file: RoomFile) => void;
  onDelete: (fileId: number) => void;
  onNameChange?: (fileId: number, newName: string) => void;
};
