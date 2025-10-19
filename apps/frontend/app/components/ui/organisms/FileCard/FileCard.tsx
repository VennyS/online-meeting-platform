import {
  Box,
  Stack,
  Paper,
  TextField,
  Typography,
  IconButton,
} from "@mui/material";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { FileCardProps } from "./types";

export const FileCard = ({
  file,
  onRename,
  onDownload,
  onDelete,
  onNameChange,
}: FileCardProps) => {
  return (
    <Paper
      sx={{
        p: 1.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        border: "1px solid rgba(0,0,0,0.12)",
        borderRadius: 2,
        backgroundColor: "white",
        boxShadow: "var(--Paper-shadow)",
        backgroundImage: "var(--Paper-overlay)",
        transition: "0.2s",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          flexGrow: 1,
          overflow: "hidden",
        }}
      >
        <InsertDriveFileOutlinedIcon color="action" />
        <Stack spacing={0} sx={{ flexGrow: 1 }}>
          <TextField
            variant="standard"
            fullWidth
            value={file.fileName}
            onChange={(e) => onNameChange?.(file.id, e.target.value)}
            onBlur={() => (onRename ? onRename(file) : () => {})}
            disabled={!onRename}
            slotProps={{
              input: {
                disableUnderline: true,
                sx: {
                  fontSize: "0.95rem",
                  fontWeight: 500,
                  p: 0,
                  color: "inherit",
                  WebkitTextFillColor: "currentColor",
                },
              },
            }}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: "0.75rem" }}
          >
            {file.fileType} · {file.fileSize} KB
          </Typography>
        </Stack>
      </Box>

      <Stack direction="row" spacing={0.5}>
        <IconButton
          size="small"
          onClick={() => onDownload(file)}
          title="Скачать"
          sx={{ color: "#000000b5" }}
        >
          <DownloadIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => onDelete(file.id)}
          title="Удалить"
          color="error"
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Paper>
  );
};
