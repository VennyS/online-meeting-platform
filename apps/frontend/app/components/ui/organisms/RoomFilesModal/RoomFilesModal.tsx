"use client";

import { useEffect, useState } from "react";
import { Box, Typography, CircularProgress, Alert, Stack } from "@mui/material";
import { fileService, IFile } from "@/app/services/file.service";
import { Modal } from "../../atoms/Modal/Modal";
import { RoomFilesModalProps } from "./types";
import { FileCard } from "../FileCard/FileCard";

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
        const data = await fileService.listRoom(shortId, 0, 50);
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
    } catch {
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

  const handleNameChange = (fileId: number, newName: string) => {
    setFiles((prev) =>
      prev
        ? prev.map((f) => (f.id === fileId ? { ...f, fileName: newName } : f))
        : prev
    );
  };

  if (!isOpen) return null;

  return (
    <Modal title="Файлы встречи" onClose={onClose}>
      <Box>
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
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
              <FileCard
                key={file.id}
                file={file}
                onRename={handleRename}
                onDownload={handleDownload}
                onDelete={handleDelete}
                onNameChange={handleNameChange}
              />
            ))}
          </Stack>
        )}
      </Box>
    </Modal>
  );
};
