import { IFile } from "@/app/services/file.service";

export type FileCardProps = {
  file: IFile;
  onRename?: (file: IFile) => void;
  onDownload: (file: IFile) => void;
  onDelete: (fileId: number) => void;
  onNameChange: (fileId: number, newName: string) => void;
};
