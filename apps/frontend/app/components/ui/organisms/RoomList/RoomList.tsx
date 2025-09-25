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

function RoomCard({ room, onSave, updating }: RoomCardProps) {
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

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const target = e.currentTarget;
    const { name, value, type } = target;

    setEditData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (target as HTMLInputElement).checked
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
    <div style={{ border: "1px solid #ccc", padding: 10, marginBottom: 10 }}>
      <h2>
        <input
          type="text"
          name="name"
          value={editData.name ?? ""}
          onChange={handleChange}
          disabled={updating}
        />
      </h2>

      <textarea
        name="description"
        value={editData.description ?? ""}
        onChange={handleChange}
        disabled={updating}
      />

      <p>
        Дата начала:
        <input
          type="datetime-local"
          name="startAt"
          value={editData.startAt ?? ""}
          onChange={handleChange}
          disabled={updating}
        />
      </p>

      <p>
        Длительность (мин):
        <input
          type="number"
          name="durationMinutes"
          value={editData.durationMinutes ?? 0}
          onChange={handleChange}
          disabled={updating}
        />
      </p>

      <label>
        Публичная:{" "}
        <input
          type="checkbox"
          name="isPublic"
          checked={editData.isPublic ?? false}
          onChange={handleChange}
          disabled={updating}
        />
      </label>

      <br />

      <label>
        Показывать историю новичкам:{" "}
        <input
          type="checkbox"
          name="showHistoryToNewbies"
          checked={editData.showHistoryToNewbies ?? false}
          onChange={handleChange}
          disabled={updating}
        />
      </label>

      <br />

      <label>
        Пароль:
        <input
          type="text"
          name="password"
          value={editData.password ?? ""}
          onChange={handleChange}
          disabled={updating}
        />
      </label>

      <br />

      <label>
        Зал ожидания:{" "}
        <input
          type="checkbox"
          name="waitingRoomEnabled"
          checked={editData.waitingRoomEnabled ?? false}
          onChange={handleChange}
          disabled={updating}
        />
      </label>

      <br />

      <label>
        Разрешить ранний вход:{" "}
        <input
          type="checkbox"
          name="allowEarlyJoin"
          checked={editData.allowEarlyJoin ?? false}
          onChange={handleChange}
          disabled={updating}
        />
      </label>

      <br />

      <label>
        Отменена:{" "}
        <input
          type="checkbox"
          name="cancelled"
          checked={editData.cancelled ?? false}
          onChange={handleChange}
          disabled={updating}
        />
      </label>

      <div style={{ marginTop: 10 }}>
        <button
          onClick={handleSave}
          disabled={updating}
          style={{
            background: "green",
            color: "white",
            padding: "5px 10px",
            marginRight: "5px",
          }}
        >
          Сохранить
        </button>
        <Link
          href={`/room/${room.shortId}`}
          style={{
            background: "green",
            color: "white",
            padding: "5px 10px",
            marginRight: "5px",
          }}
        >
          Зайти
        </Link>
        <button
          onClick={() => setReportsOpen(true)}
          disabled={updating}
          style={{
            background: "blue",
            color: "white",
            padding: "5px 10px",
          }}
        >
          Показать отчёты
        </button>
      </div>
      <MeetingReportsModal
        shortId={room.shortId}
        isOpen={isReportsOpen}
        onClose={() => setReportsOpen(false)}
      />
    </div>
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
      {reports && reports.sessions.length === 0 && (
        <p>Нет доступных отчётов о встречах</p>
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
