"use client";

import { useEffect, useState } from "react";
import { roomService } from "@/app/services/room.service";
import {
  IRoom,
  UpdateRoomDto,
  MeetingReports,
  MeetingReport,
  Participant,
  ParticipantSession,
} from "@/app/types/room.types";
import styles from "./RoomList.module.css";
import { MeetingReportsProps, RoomCardProps, RoomListProps } from "./types";
import { toDateTimeLocalString } from "@/app/lib/toDateTimeLocalString";
import { toUtcISOString } from "@/app/lib/toUtcISOString";
import Link from "next/link";
import Modal from "../../atoms/Modal/Modal";
import { fileService, IFile } from "@/app/services/file.service";
import { formatFileSize } from "@/app/lib/formatFileSize";
import {
  Button,
  Card,
  CardActions,
  CardContent,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
} from "@mui/material";

export default function RoomList({
  fetchMode = "user",
  initialRooms = [],
}: RoomListProps) {
  const [rooms, setRooms] = useState<IRoom[]>(initialRooms);
  const [loading, setLoading] = useState(false);
  const [updatingRoomId, setUpdatingRoomId] = useState<number | null>(null);

  useEffect(() => {
    if (fetchMode === "none") return; // ничего не грузим, юзаем initialRooms

    const fetchRooms = async () => {
      try {
        setLoading(true);
        const data =
          fetchMode === "all"
            ? await roomService.getAll()
            : await roomService.getRooms();
        setRooms(data);
      } catch (err) {
        console.error("Ошибка при загрузке комнат:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [fetchMode]);

  const saveRoom = async (
    roomId: number,
    shortId: string,
    updatedData: UpdateRoomDto
  ) => {
    try {
      setUpdatingRoomId(roomId);
      const updated = await roomService.updateRoom(shortId, updatedData);
      setRooms((prev) =>
        prev.map((r) => (r.shortId === shortId ? updated : r))
      );
    } catch (err) {
      console.error("Ошибка при сохранении комнаты:", err);
    } finally {
      setUpdatingRoomId(null);
    }
  };

  if (loading) return <p>Загрузка...</p>;

  return (
    <div className={styles.roomsWrapper}>
      {rooms.map((room) => (
        <RoomCard
          key={room.id}
          room={room}
          onSave={(data) => saveRoom(room.id, room.shortId, data)}
          updating={updatingRoomId === room.id}
        />
      ))}
    </div>
  );
}

export function RoomCard({ room, onSave, updating }: RoomCardProps) {
  const [editData, setEditData] = useState<UpdateRoomDto>({
    name: room.name,
    description: room.description ?? "",
    startAt: room.startAt
      ? toDateTimeLocalString(room.startAt, room.timeZone)
      : "",
    durationMinutes: 60,
    isPublic: room.isPublic,
    showHistoryToNewbies: false,
    password: "",
    waitingRoomEnabled: room.waitingRoomEnabled,
    allowEarlyJoin: room.allowEarlyJoin,
    cancelled: room.cancelled,
  });

  const [isReportsOpen, setReportsOpen] = useState(false);
  const [isFilesOpen, setIsFilesOpen] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.currentTarget;

    setEditData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.currentTarget as HTMLInputElement).checked
          : name === "durationMinutes"
          ? Number(value)
          : value,
    }));
  };

  const handleSave = () => {
    onSave({
      ...editData,
      startAt: editData.startAt
        ? toUtcISOString(editData.startAt, "Europe/Moscow")
        : undefined,
      timeZone: "Europe/Moscow",
    });
  };

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 2,
        p: 2,
        borderRadius: 2,
        boxShadow: 1,
      }}
    >
      <CardContent>
        <Stack spacing={2}>
          <TextField
            label="Название комнаты"
            name="name"
            value={editData.name ?? ""}
            onChange={handleChange}
            size="small"
            disabled={updating}
            fullWidth
          />

          <TextField
            label="Описание"
            name="description"
            value={editData.description ?? ""}
            onChange={handleChange}
            multiline
            rows={2}
            disabled={updating}
            fullWidth
          />

          <Stack direction="row" spacing={2}>
            <TextField
              label="Дата начала"
              type="datetime-local"
              name="startAt"
              value={editData.startAt ?? ""}
              onChange={handleChange}
              disabled={updating}
              fullWidth
            />

            <TextField
              label="Длительность (мин)"
              type="number"
              name="durationMinutes"
              value={editData.durationMinutes ?? 0}
              onChange={handleChange}
              disabled={updating}
              sx={{ width: 150 }}
            />
          </Stack>

          <Stack direction="row" flexWrap="wrap">
            <FormControlLabel
              control={
                <Checkbox
                  name="isPublic"
                  checked={editData.isPublic}
                  onChange={handleChange}
                  disabled={updating}
                />
              }
              label="Публичная"
            />
            <FormControlLabel
              control={
                <Checkbox
                  name="showHistoryToNewbies"
                  checked={editData.showHistoryToNewbies}
                  onChange={handleChange}
                  disabled={updating}
                />
              }
              label="Показывать историю новичкам"
            />
            <FormControlLabel
              control={
                <Checkbox
                  name="waitingRoomEnabled"
                  checked={editData.waitingRoomEnabled}
                  onChange={handleChange}
                  disabled={updating}
                />
              }
              label="Зал ожидания"
            />
            <FormControlLabel
              control={
                <Checkbox
                  name="allowEarlyJoin"
                  checked={editData.allowEarlyJoin}
                  onChange={handleChange}
                  disabled={updating}
                />
              }
              label="Ранний вход"
            />
            <FormControlLabel
              control={
                <Checkbox
                  name="cancelled"
                  checked={editData.cancelled}
                  onChange={handleChange}
                  disabled={updating}
                />
              }
              label="Отменена"
            />
          </Stack>

          <TextField
            label="Пароль"
            name="password"
            type="text"
            value={editData.password ?? ""}
            onChange={handleChange}
            disabled={updating}
            fullWidth
          />
        </Stack>
      </CardContent>

      <CardActions sx={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={handleSave} disabled={updating}>
            Сохранить
          </Button>

          <Button
            component={Link}
            href={`/room/${room.shortId}`}
            variant="outlined"
            color="primary"
          >
            Зайти
          </Button>

          {room.haveReports && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => setReportsOpen(true)}
            >
              Отчёты
            </Button>
          )}
          {room.haveFiles && (
            <Button variant="outlined" onClick={() => setIsFilesOpen(true)}>
              Файлы
            </Button>
          )}
        </Stack>
      </CardActions>

      {room.haveReports && (
        <MeetingReportsModal
          shortId={room.shortId}
          isOpen={isReportsOpen}
          onClose={() => setReportsOpen(false)}
        />
      )}

      {room.haveFiles && (
        <MeetingFilesModal
          shortId={room.shortId}
          isOpen={isFilesOpen}
          onClose={() => setIsFilesOpen(false)}
        />
      )}
    </Card>
  );
}

export const MeetingReportsModal = ({
  shortId,
  isOpen,
  onClose,
}: MeetingReportsProps) => {
  const [reports, setReports] = useState<MeetingReports | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchReports = async () => {
      setLoading(true);
      try {
        const data = await roomService.getMeetingReports(shortId);
        setReports(data);
      } catch (err) {
        setError("Не удалось загрузить отчёты о встречах");
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [shortId, isOpen]);

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose}>
      <button onClick={onClose}>Закрыть</button>
      {loading && <p>Загрузка...</p>}
      {error && <p>{error}</p>}
      {reports && reports.sessions.length === 0 ? (
        <p>Нет доступных отчётов о встречах</p>
      ) : (
        <>
          <button
            onClick={() => roomService.downloadMeetingReportsExcel(shortId)}
            style={{
              background: "orange",
              color: "white",
              padding: "5px 10px",
              marginRight: "5px",
            }}
          >
            Скачать Excel
          </button>

          <button
            onClick={() => roomService.downloadMeetingReportsCsv(shortId)}
            style={{
              background: "purple",
              color: "white",
              padding: "5px 10px",
            }}
          >
            Скачать CSV
          </button>
        </>
      )}
      {reports &&
        reports.sessions.map((session: MeetingReport) => (
          <div key={session.id}>
            <h3>Сессия встречи</h3>
            <p>Начало: {formatDateTime(session.startTime)}</p>
            <p>
              Конец:{" "}
              {session.endTime
                ? formatDateTime(session.endTime)
                : "Все еще идет"}
            </p>
            {!!session.duration && (
              <p>Длительность: {formatDuration(session.duration)}</p>
            )}
            <h4>Участники</h4>
            <ul>
              {session.participants.map((participant: Participant) => (
                <li key={participant.id}>
                  <p>
                    {participant.name} (ID: {participant.userId})
                  </p>
                  <ul>
                    {participant.sessions.map(
                      (s: ParticipantSession, index: number) => (
                        <li key={index}>
                          Вход: {formatDateTime(s.joinTime)}
                          {s.leaveTime &&
                            `, Выход: ${formatDateTime(s.leaveTime)}`}
                        </li>
                      )
                    )}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        ))}
    </Modal>
  );
};

interface MeetingFilesModalProps {
  shortId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const MeetingFilesModal = ({
  shortId,
  isOpen,
  onClose,
}: MeetingFilesModalProps) => {
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
      } catch (err) {
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
      setFiles((prev) => (prev ? prev.filter((f) => f.id !== fileId) : prev));
    } catch (err) {
      console.log(err);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose}>
      <button onClick={onClose}>Закрыть</button>
      {loading && <p>Загрузка...</p>}
      {error && <p>{error}</p>}
      {files && files.length === 0 && <p>Файлы отсутствуют</p>}
      {files &&
        files.map((file: IFile) => (
          <div key={file.id} style={{ marginBottom: 12 }}>
            <input
              type="text"
              value={file.fileName}
              onChange={(e) => {
                const newName = e.target.value;
                setFiles((prev) =>
                  prev
                    ? prev.map((f) =>
                        f.id === file.id ? { ...f, fileName: newName } : f
                      )
                    : prev
                );
              }}
            />
            <p>Тип: {file.fileType}</p>
            <p>Размер: {formatFileSize(file.fileSize)}</p>
            <button onClick={() => handleDelete(file.id)}>Удалить</button>
            <button
              onClick={async () => {
                try {
                  const updated = await fileService.patch(
                    file.id,
                    file.fileName
                  );
                  setFiles((prev) =>
                    prev
                      ? prev.map((f) => (f.id === file.id ? updated : f))
                      : prev
                  );
                } catch (err) {
                  alert("Не удалось обновить имя файла");
                }
              }}
            >
              Обновить
            </button>
            <button
              onClick={async () => {
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
                } catch (err) {
                  console.error(err);
                  alert("Не удалось скачать файл");
                }
              }}
            >
              Скачать
            </button>
          </div>
        ))}
    </Modal>
  );
};

/**
 * Форматирует дату: если есть часы → ч:м:с, если только минуты → м:с, если только секунды → с
 */
function formatDateTime(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours} ч${minutes > 0 ? ` ${minutes} мин` : ""}${
      seconds > 0 ? ` ${seconds} сек` : ""
    }`;
  }
  if (minutes > 0) {
    return `${minutes} мин${seconds > 0 ? ` ${seconds} сек` : ""}`;
  }
  return `${seconds} сек`;
}
