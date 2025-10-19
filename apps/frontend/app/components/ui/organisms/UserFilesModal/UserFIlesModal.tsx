"use client";

import { useEffect, useState } from "react";
import { Box, Button, Stack, Typography, Alert } from "@mui/material";
import { Modal } from "@/app/components/ui/atoms/Modal/Modal";
import { fileService, IFile } from "@/app/services/file.service";
import { FileCard } from "../FileCard/FileCard";
import { useUser } from "@/app/hooks/useUser";

interface UserFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserFilesModal({ isOpen, onClose }: UserFilesModalProps) {
  const [files, setFiles] = useState<IFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { removeFiles } = useUser();

  useEffect(() => {
    if (!isOpen) return;

    const fetchFiles = async () => {
      setLoading(true);
      try {
        const data = await fileService.listUser("PDF");
        setFiles(data);
      } catch {
        setError("Не удалось загрузить ваши файлы");
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [isOpen]);

  const handleDelete = async (fileId: number) => {
    try {
      removeFiles(files.filter((f) => f.id === fileId));
      await fileService.delete(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch {
      alert("Не удалось удалить файл");
    }
  };

  const handleDownload = async (file: IFile) => {
    try {
      const res = await fetch(file.url);
      if (!res.ok) throw new Error("Ошибка скачивания");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.fileName;
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Не удалось скачать файл");
    }
  };

  return (
    <Modal onClose={onClose} title="Ваши файлы">
      <Stack spacing={1.5}>
        {error && <Alert severity="error">{error}</Alert>}
        {loading && <Typography>Загрузка...</Typography>}
        {!loading && files.length === 0 && (
          <Typography>Файлы не найдены</Typography>
        )}
        {!loading &&
          files.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              onDelete={handleDelete}
              onDownload={handleDownload}
              onNameChange={() => {}}
            />
          ))}
      </Stack>
    </Modal>
  );
}
