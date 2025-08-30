"use client";

import { useEffect, useState } from "react";
import { roomService } from "@/app/services/room.service";
import { IRoom, UpdateRoomDto } from "@/app/types/room.types";
import { formatDateTimeLocal } from "@/app/lib/formatDateTimeLocal";
import styles from "./page.module.css";

export default function RoomList() {
  const [rooms, setRooms] = useState<IRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingRoomId, setUpdatingRoomId] = useState<number | null>(null);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        const data = await roomService.getRooms();
        setRooms(data);
      } catch (err) {
        console.error("Ошибка при загрузке комнат:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  const saveRoom = async (
    roomId: number,
    shortId: string,
    updatedData: UpdateRoomDto
  ) => {
    try {
      setUpdatingRoomId(roomId); // ✅ используем id из IRoom
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

type RoomCardProps = {
  room: IRoom;
  onSave: (data: UpdateRoomDto) => void;
  updating: boolean;
};

function RoomCard({ room, onSave, updating }: RoomCardProps) {
  const [editData, setEditData] = useState<UpdateRoomDto>({
    name: room.name,
    description: room.description ?? "",
    startAt: room.startAt ? formatDateTimeLocal(new Date(room.startAt)) : "",
    durationMinutes: 60,
    isPublic: room.isPublic,
    showHistoryToNewbies: false, // если нет в IRoom, ставим дефолт
    password: "",
    waitingRoomEnabled: room.waitingRoomEnabled,
    allowEarlyJoin: room.allowEarlyJoin,
    cancelled: room.cancelled,
  });

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
    onSave(editData);
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
      </div>
    </div>
  );
}
