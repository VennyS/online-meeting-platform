"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  TextField,
  Stack,
  Paper,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DownloadIcon from "@mui/icons-material/Download";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import { fileService } from "@/app/services/file.service";
import { Modal } from "../../atoms/Modal/Modal";
import { RoomFilesModalProps } from "./types";
import { IFile } from "../PresentationList/PresentationList";

export const RoomFilesModal = ({
  shortId,
  isOpen,
  onClose,
}: RoomFilesModalProps) => {
  const [files, setFiles] = useState<IFile[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchFiles = async () => {
      setLoading(true);
      try {
        const data = await fileService.list(shortId, 0, 50);
        setFiles(data);
      } catch {
        setError("Не удалось загрузить файлы встречи");
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [shortId, isOpen]);

  const handleDelete = async (fileId: number) => {
    try {
      await fileService.delete(fileId);
      setFiles((prev) => prev?.filter((f) => f.id !== fileId) ?? null);
    } catch (err) {
      console.error(err);
      alert("Не удалось удалить файл");
    }
  };

  const handleRename = async (file: IFile) => {
    try {
      await fileService.patch(file.id, file.fileName);
    } catch {
      alert("Не удалось обновить имя файла");
    }
  };

  const handleDownload = async (file: IFile) => {
    try {
      const res = await fetch(file.url);
      if (!res.ok) throw new Error("Ошибка скачивания");
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = file.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch {
      alert("Не удалось скачать файл");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <Modal title="Файлы встречи" onClose={onClose}>
      <Box>
        {loading && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              py: 4,
            }}
          >
            <CircularProgress />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && files && files.length === 0 && (
          <Typography color="text.secondary" align="center" py={3}>
            Файлы отсутствуют
          </Typography>
        )}

        {!loading && files && files.length > 0 && (
          <Stack spacing={1.5}>
            {files.map((file) => (
              <Paper
                key={file.id}
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
                      onChange={(e) => {
                        const newName = e.target.value;
                        setFiles((prev) =>
                          prev
                            ? prev.map((f) =>
                                f.id === file.id
                                  ? { ...f, fileName: newName }
                                  : f
                              )
                            : prev
                        );
                      }}
                      onBlur={() => handleRename(file)}
                      slotProps={{
                        input: {
                          disableUnderline: true,
                          sx: { fontSize: "0.95rem", fontWeight: 500, p: 0 },
                        },
                      }}
                    />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: "0.75rem" }}
                    >
                      {file.fileType} · {formatFileSize(file.fileSize)}
                    </Typography>
                  </Stack>
                </Box>

                <Stack direction="row" spacing={0.5}>
                  <IconButton
                    size="small"
                    onClick={() => handleDownload(file)}
                    title="Скачать"
                    sx={{ color: "#000000b5" }}
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(file.id)}
                    title="Удалить"
                    color="error"
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Box>
    </Modal>
  );
};
