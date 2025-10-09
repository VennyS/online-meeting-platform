import { Box, Button, List, ListItem, ListItemText } from "@mui/material";
import Typography from "@mui/material/Typography";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import { useParticipantsContext } from "@/app/providers/participants.provider";
import PresentToAllOutlinedIcon from "@mui/icons-material/PresentToAllOutlined";
import CancelPresentationOutlinedIcon from "@mui/icons-material/CancelPresentationOutlined";

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
  const { presentations, startPresentation, finishPresentation } =
    useParticipantsContext();
  const localPresentation = presentations.find((p) => p.local);
  const localFileId = localPresentation?.fileId;
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
            maxWidth: "100%",
          }}
          secondaryAction={
            <Button
              variant="contained"
              size="small"
              onClick={
                localFileIdNumber !== file.id
                  ? () => startPresentation(file.id, file.url)
                  : () => finishPresentation(localPresentation!.presentationId)
              }
              sx={{ p: "4px" }}
            >
              {localFileIdNumber !== file.id ? (
                <PresentToAllOutlinedIcon />
              ) : (
                <CancelPresentationOutlinedIcon />
              )}
            </Button>
          }
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              overflowWrap: "anywhere",
            }}
          >
            <InsertDriveFileOutlinedIcon color="action" />
            <ListItemText
              primary={file.fileName}
              secondary={`${formatFileSize(file.fileSize)}`}
            />
          </Box>
        </ListItem>
      ))}
    </List>
  );
};

export default PresentationList;
