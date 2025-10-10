"use client";

import { useEffect, useState } from "react";
import { roomService } from "@/app/services/room.service";
import { IRoom, UpdateRoomDto } from "@/app/types/room.types";
import styles from "./RoomList.module.css";
import { RoomListProps } from "./types";
import { RoomCard } from "../RoomCard/RoomCard";

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
