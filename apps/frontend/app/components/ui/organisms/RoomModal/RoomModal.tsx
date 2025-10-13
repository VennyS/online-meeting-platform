"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import { roomService } from "@/app/services/room.service";
import { useUser } from "@/app/hooks/useUser";
import { toUtcISOString } from "@/app/lib/toUtcISOString";
import { formatDateTimeLocal } from "@/app/lib/formatDateTimeLocal";
import { fileService, IFile } from "@/app/services/file.service";
import { Permissions, Role } from "@/app/types/room.types";
import { Modal } from "@/app/components/ui/atoms/Modal/Modal";
import { FileCard } from "../FileCard/FileCard";
import { RoomModalProps } from "./types";

export default function RoomModal({
  mode,
  initialData,
  onClose,
  onUpdateRoom,
  onCreateRoom,
}: RoomModalProps) {
  const router = useRouter();
  const { user } = useUser();
  const now = new Date();

  // ======== Form states ========
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? ""
  );
  const [startAt, setStartAt] = useState(
    formatDateTimeLocal(
      initialData?.startAt ? new Date(initialData.startAt) : now
    )
  );
  const [durationMinutes, setDurationMinutes] = useState<number | "">(
    initialData?.durationMinutes ?? ""
  );
  const [isPublic, setIsPublic] = useState(initialData?.isPublic ?? false);
  const [showHistoryToNewbies, setShowHistoryToNewbies] = useState(
    initialData?.showHistoryToNewbies ?? false
  );
  const [password, setPassword] = useState("");
  const [waitingRoomEnabled, setWaitingRoomEnabled] = useState(
    initialData?.waitingRoomEnabled ?? false
  );
  const [allowEarlyJoin, setAllowEarlyJoin] = useState(
    initialData?.allowEarlyJoin ?? true
  );
  const [isConnectInstantly, setIsConnectInstantly] = useState(false);
  const [canShareScreen, setCanShareScreen] = useState<Role>(
    initialData?.canShareScreen ?? "ALL"
  );
  const [canStartPresentation, setCanSharePresentation] = useState<Role>(
    initialData?.canStartPresentation ?? "ALL"
  );

  const [files, setFiles] = useState<(IFile & { isNew?: boolean })[]>([]);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const roleOptions: { label: string; value: Role }[] = [
    { label: "Только владелец", value: "OWNER" },
    { label: "Владелец и админ", value: "ADMIN" },
    { label: "Все", value: "ALL" },
  ];

  useEffect(() => {
    if (mode === "edit" && initialData?.shortId) {
      const fetchFiles = async () => {
        try {
          const data = await fileService.list(initialData.shortId, 0, 50);
          setFiles(data);
        } catch {
          setError("Не удалось загрузить файлы комнаты");
        }
      };
      fetchFiles();
    }
  }, [mode, initialData?.shortId]);

  const handlePermissionChange = (
    permission: keyof Permissions,
    value: Role
  ) => {
    if (permission === "canShareScreen") setCanShareScreen(value);
    else setCanSharePresentation(value);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    const invalidFiles = selectedFiles.filter(
      (file) => file.type !== "application/pdf"
    );
    if (invalidFiles.length > 0) {
      setUploadStatus("Пожалуйста, выберите только файлы в формате PDF");
      return;
    }

    const newFiles: (IFile & { isNew?: boolean })[] = selectedFiles.map(
      (file, index) => ({
        id: Date.now() + index,
        fileName: file.name,
        fileType: "PDF",
        fileSize: file.size,
        url: URL.createObjectURL(file),
        isNew: true,
      })
    );

    setFiles((prev) => [...prev, ...newFiles]);
    setUploadStatus(null);
  };

  const handleUploadFiles = async (roomShortId: string) => {
    const newFiles = files.filter((f) => f.isNew);
    if (newFiles.length === 0) return;

    try {
      const fileObjects: File[] = await Promise.all(
        newFiles.map(async (file) => {
          const blob = await fetch(file.url).then((res) => res.blob());
          return new File([blob], file.fileName, { type: "application/pdf" });
        })
      );

      const urls = await fileService.uploadFiles(roomShortId, fileObjects);

      const uploadedFiles: (IFile & { isNew?: boolean })[] = newFiles.map(
        (file, index) => ({
          ...file,
          url: urls[index],
          isNew: false,
        })
      );

      setFiles((prev) => [...prev.filter((f) => !f.isNew), ...uploadedFiles]);

      setUploadStatus("Файлы успешно загружены");
    } catch (err) {
      console.error(err);
      setUploadStatus(`Ошибка при загрузке файлов: ${err}`);
    }
  };

  const handleDelete = async (fileId: number) => {
    try {
      // Если файл уже загружен на сервер (имеет настоящий ID)
      if (files.find((f) => f.id === fileId)?.url.includes("blob:") === false) {
        await fileService.delete(fileId);
      }
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch {
      alert("Не удалось удалить файл");
    }
  };

  const handleRename = async (file: IFile) => {
    try {
      // Если файл уже загружен на сервер
      if (!file.url.includes("blob:")) {
        await fileService.patch(file.id, file.fileName);
      }
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
      prev.map((f) => (f.id === fileId ? { ...f, fileName: newName } : f))
    );
  };

  // ======== Submit ========
  const handleSubmit = async () => {
    try {
      const startDate = startAt
        ? toUtcISOString(startAt, "Europe/Moscow")
        : undefined;

      if (mode === "create") {
        const room = await roomService.createRoom({
          ownerId: user!.id,
          name,
          description,
          startAt: startDate,
          durationMinutes:
            durationMinutes === "" ? undefined : Number(durationMinutes),
          isPublic,
          showHistoryToNewbies,
          password,
          waitingRoomEnabled,
          allowEarlyJoin,
          timeZone: "Europe/Moscow",
          canShareScreen,
          canStartPresentation,
        });

        await handleUploadFiles(room.shortId);
        onCreateRoom?.(room);

        if (isConnectInstantly) {
          let nextUrl = `/room/${room.shortId}`;
          if (password) nextUrl += `/prejoin`;
          router.push(nextUrl);
        } else {
          onClose();
        }
      } else if (mode === "edit" && initialData) {
        const room = await roomService.updateRoom(initialData.shortId, {
          name,
          description,
          startAt: startDate,
          durationMinutes:
            durationMinutes === "" ? undefined : Number(durationMinutes),
          isPublic,
          showHistoryToNewbies,
          password,
          waitingRoomEnabled,
          allowEarlyJoin,
          canShareScreen,
          canStartPresentation,
        });

        await handleUploadFiles(initialData.shortId);

        onUpdateRoom?.(room);
        onClose();
      }
    } catch (err) {
      console.error(err);
      setError("Произошла ошибка при сохранении комнаты");
    }
  };

  // ======== Render ========
  return (
    <Modal
      onClose={onClose}
      title={mode === "edit" ? "Редактирование комнаты" : "Создание комнаты"}
    >
      <Stack spacing={1.5}>
        {error && <Alert severity="error">{error}</Alert>}

        <TextField
          label="Название"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
        />
        <TextField
          label="Описание"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
        />

        <TextField
          label="Дата и время начала"
          type="datetime-local"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
          inputProps={{ min: formatDateTimeLocal(now) }}
          fullWidth
        />

        <TextField
          label="Длительность (минуты)"
          type="number"
          value={durationMinutes}
          onChange={(e) =>
            setDurationMinutes(
              e.target.value === "" ? "" : Number(e.target.value)
            )
          }
          fullWidth
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              sx={{ mt: "0px !important" }}
            />
          }
          label="По ссылке без авторизации"
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={showHistoryToNewbies}
              onChange={(e) => setShowHistoryToNewbies(e.target.checked)}
            />
          }
          sx={{ mt: "0px !important" }}
          label="Показывать историю новым участникам"
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={waitingRoomEnabled}
              onChange={(e) => setWaitingRoomEnabled(e.target.checked)}
            />
          }
          sx={{ mt: "0px !important" }}
          label="Включить зал ожидания"
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={allowEarlyJoin}
              onChange={(e) => setAllowEarlyJoin(e.target.checked)}
            />
          }
          sx={{ mt: "0px !important" }}
          label="Разрешить ранний вход"
        />

        <TextField
          label="Пароль"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
        />

        <FormControl fullWidth sx={{ mt: "16px !important" }}>
          <InputLabel>Может делиться экраном</InputLabel>
          <Select
            value={canShareScreen}
            label="Может делиться экраном"
            onChange={(e) =>
              handlePermissionChange("canShareScreen", e.target.value as Role)
            }
          >
            {roleOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth sx={{ mt: "16px !important" }}>
          <InputLabel>Может делиться презентацией</InputLabel>
          <Select
            value={canStartPresentation}
            label="Может делиться презентацией"
            onChange={(e) =>
              handlePermissionChange(
                "canStartPresentation",
                e.target.value as Role
              )
            }
          >
            {roleOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box>
          <Button variant="outlined" component="label">
            Выберите PDF файлы
            <input
              type="file"
              accept="application/pdf"
              multiple
              hidden
              onChange={handleFileChange}
            />
          </Button>
          {uploadStatus && (
            <Typography variant="body2" color="text.secondary">
              {uploadStatus}
            </Typography>
          )}
          {files.length > 0 && (
            <Stack spacing={1.5} mt={2}>
              {files.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                  onNameChange={handleNameChange}
                />
              ))}
            </Stack>
          )}
        </Box>

        <Button variant="contained" onClick={handleSubmit} sx={{ mt: 2 }}>
          {mode === "edit" ? "Сохранить" : "Создать"}
        </Button>
      </Stack>
    </Modal>
  );
}
