import { Box, Button, List, ListItem, ListItemText } from "@mui/material";
import Typography from "@mui/material/Typography";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import { useParticipantsContext } from "@/app/providers/participants.provider";
import { useEffect } from "react";

export interface IFile {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
}

interface PresentationListProps {
  files: IFile[];
}

export const PresentationList = ({ files }: PresentationListProps) => {
  const { localPresentation, startPresentation, finishPresentation } =
    useParticipantsContext();
  const localFileId = localPresentation?.[1].fileId;
  const localFileIdNumber = localFileId ? Number(localFileId) : undefined;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (files.length === 0) {
    return <Typography>Нет файлов для отображения</Typography>;
  }

  return (
    <List>
      {files.map((file) => (
        <ListItem
          key={file.id}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            mb: 1,
          }}
          secondaryAction={
            <Button
              variant="contained"
              size="small"
              onClick={
                localFileIdNumber !== file.id
                  ? () => startPresentation(file.id, file.url)
                  : () => finishPresentation(localPresentation![0])
              }
            >
              {localFileIdNumber !== file.id ? "Транслировать" : "Завершить"}
            </Button>
          }
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <InsertDriveFileOutlinedIcon color="action" />
            <ListItemText
              primary={file.fileName}
              secondary={`Размер: ${formatFileSize(file.fileSize)}`}
            />
          </Box>
        </ListItem>
      ))}
    </List>
  );
};

export default PresentationList;
