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
import { Role } from "@/app/types/room.types";
import { Modal } from "@/app/components/ui/atoms/Modal/Modal";
import { FileCard } from "../FileCard/FileCard";
import { RoomData, RoomModalProps, RoomSchema } from "./types";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserFilesModal } from "../UserFilesModal/UserFIlesModal";

export default function RoomModal({
  mode,
  initialData,
  onClose,
  onUpdateRoom,
  onCreateRoom,
}: RoomModalProps) {
  const router = useRouter();
  const { totalPdfSize: totalPdfSizeInStorage, user, removeFiles } = useUser();
  const now = new Date();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RoomData>({
    resolver: zodResolver(RoomSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      description: initialData?.description ?? "",
      startAt: formatDateTimeLocal(
        initialData?.startAt ? new Date(initialData.startAt) : now
      ),
      durationMinutes: initialData?.durationMinutes ?? 60,
      isPublic: initialData?.isPublic ?? false,
      showHistoryToNewbies: initialData?.showHistoryToNewbies ?? false,
      waitingRoomEnabled: initialData?.waitingRoomEnabled ?? false,
      allowEarlyJoin: initialData?.allowEarlyJoin ?? true,
      password: "",
      canShareScreen: initialData?.canShareScreen ?? "ALL",
      canStartPresentation: initialData?.canStartPresentation ?? "ALL",
      isConnectInstantly: false,
    },
  });

  const [files, setFiles] = useState<(IFile & { isNew?: boolean })[]>([]);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);

  const totalPdfSizeMb =
    (totalPdfSizeInStorage +
      (files ?? []).reduce((sum, item) => sum + item.fileSize, 0)) /
    1024;

  const isAnyPdfFile = totalPdfSizeInStorage > 0;

  const isPdfStorageOverflowed = totalPdfSizeMb > 100;

  const roleOptions: { label: string; value: Role }[] = [
    { label: "Только владелец", value: "OWNER" },
    { label: "Владелец и админ", value: "ADMIN" },
    { label: "Все", value: "ALL" },
  ];

  useEffect(() => {
    if (mode === "edit" && initialData?.shortId) {
      const fetchFiles = async () => {
        try {
          const data = await fileService.listRoom(initialData.shortId, 0, 50);
          setFiles(data);
        } catch {
          setError("Не удалось загрузить файлы комнаты");
        }
      };
      fetchFiles();
    }
  }, [mode, initialData?.shortId]);

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
        fileSize: Math.round(file.size / 1024),
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

  const onSubmit = async (data: RoomData) => {
    try {
      const startDate = data.startAt
        ? toUtcISOString(data.startAt, "Europe/Moscow")
        : undefined;

      if (mode === "create") {
        const room = await roomService.createRoom({
          ownerId: user!.id,
          name: data.name,
          description: data.description,
          startAt: startDate,
          durationMinutes: data.durationMinutes,
          isPublic: data.isPublic,
          showHistoryToNewbies: data.showHistoryToNewbies,
          password: data.password,
          waitingRoomEnabled: data.waitingRoomEnabled,
          allowEarlyJoin: data.allowEarlyJoin,
          timeZone: "Europe/Moscow",
          canShareScreen: data.canShareScreen,
          canStartPresentation: data.canStartPresentation,
        });

        await handleUploadFiles(room.shortId);
        onCreateRoom?.(room);

        if (data.isConnectInstantly) {
          let nextUrl = `/room/${room.shortId}`;
          if (data.password) nextUrl += `/prejoin`;
          router.push(nextUrl);
        } else {
          onClose();
        }
      } else if (mode === "edit" && initialData) {
        const room = await roomService.updateRoom(initialData.shortId, {
          name: data.name,
          description: data.description,
          startAt: startDate,
          durationMinutes: data.durationMinutes,
          isPublic: data.isPublic,
          showHistoryToNewbies: data.showHistoryToNewbies,
          password: data.password,
          waitingRoomEnabled: data.waitingRoomEnabled,
          allowEarlyJoin: data.allowEarlyJoin,
          canShareScreen: data.canShareScreen,
          canStartPresentation: data.canStartPresentation,
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

  return (
    <Modal
      onClose={onClose}
      title={mode === "edit" ? "Редактирование комнаты" : "Создание комнаты"}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={1.5}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Название"
            {...register("name")}
            error={!!errors.name}
            helperText={errors.name?.message}
            fullWidth
          />
          <TextField
            label="Описание"
            {...register("description")}
            error={!!errors.description}
            helperText={errors.description?.message}
            fullWidth
          />
          <TextField
            label="Дата и время начала"
            type="datetime-local"
            {...register("startAt")}
            error={!!errors.startAt}
            helperText={errors.startAt?.message}
            inputProps={{ min: formatDateTimeLocal(new Date()) }}
            fullWidth
          />
          <TextField
            label="Длительность (минуты)"
            type="number"
            {...register("durationMinutes", { valueAsNumber: true })}
            error={!!errors.durationMinutes}
            helperText={errors.durationMinutes?.message}
            fullWidth
          />
          <FormControlLabel
            control={<Checkbox {...register("isPublic")} />}
            label="По ссылке без авторизации"
            sx={{ mt: "0px !important" }}
          />
          <FormControlLabel
            control={<Checkbox {...register("showHistoryToNewbies")} />}
            label="Показывать историю новым участникам"
            sx={{ mt: "0px !important" }}
          />
          <FormControlLabel
            control={<Checkbox {...register("waitingRoomEnabled")} />}
            label="Включить зал ожидания"
            sx={{ mt: "0px !important" }}
          />
          <FormControlLabel
            control={<Checkbox {...register("allowEarlyJoin")} />}
            label="Разрешить ранний вход"
            sx={{ mt: "0px !important" }}
          />
          <TextField
            label="Пароль"
            type="password"
            {...register("password")}
            error={!!errors.password}
            helperText={errors.password?.message}
            fullWidth
          />
          <FormControl fullWidth sx={{ mt: "16px !important" }}>
            <InputLabel>Может делиться экраном</InputLabel>
            <Controller
              name="canShareScreen"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  label="Может делиться экраном"
                  value={field.value || "ALL"}
                  onChange={(e) => field.onChange(e.target.value)}
                  error={!!errors.canShareScreen}
                >
                  {roleOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              )}
            />
          </FormControl>
          <FormControl fullWidth sx={{ mt: "16px !important" }}>
            <InputLabel>Может делиться презентацией</InputLabel>
            <Controller
              name="canStartPresentation"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  label="Может делиться презентацией"
                  value={field.value || "ALL"}
                  onChange={(e) => field.onChange(e.target.value)}
                  error={!!errors.canStartPresentation}
                >
                  {roleOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              )}
            />
          </FormControl>
          <FormControlLabel
            control={<Checkbox {...register("isConnectInstantly")} />}
            label="Присоединиться сразу после создания"
          />

          <Stack spacing={1.5}>
            <Button
              variant="outlined"
              component="label"
              disabled={isPdfStorageOverflowed}
            >
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
              <Stack spacing={1} mt={2}>
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

            {isPdfStorageOverflowed && (
              <>
                <Typography>
                  Хранилище PDF файлов переполнено. Удалите файлы для текущей
                  встречи
                </Typography>
                {isAnyPdfFile && (
                  <>
                    <Typography>или файлы старых встреч</Typography>
                    <Button onClick={() => setIsFilesModalOpen(true)}>
                      Посмотреть файлы прошлых встреч
                    </Button>
                  </>
                )}
              </>
            )}
          </Stack>

          <Button variant="contained" sx={{ mt: 2 }} type="submit">
            {mode === "edit" ? "Сохранить" : "Создать"}
          </Button>
        </Stack>
      </form>
      {isFilesModalOpen && (
        <UserFilesModal
          isOpen={isFilesModalOpen}
          onClose={() => setIsFilesModalOpen(false)}
          onDelete={removeFiles}
        />
      )}
    </Modal>
  );
}
