"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { roomService } from "../../services/room.service";
import { useUser } from "../../hooks/useUser";
import styles from "./page.module.css";
import RoomList from "@/app/components/ui/organisms/RoomList/RoomList";

export default function Main() {
  const router = useRouter();
  const { user } = useUser();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number | "">("");
  const [isPublic, setIsPublic] = useState(false);
  const [showHistoryToNewbies, setShowHistoryToNewbies] = useState(false);
  const [password, setPassword] = useState("");
  const [waitingRoomEnabled, setWaitingRoomEnabled] = useState(false);
  const [allowEarlyJoin, setAllowEarlyJoin] = useState(true);
  const [isConnectInstantly, setIsConnectInstantly] = useState(true);

  const handleCreateRoom = async () => {
    try {
      const room = await roomService.createRoom({
        ownerId: user!.id,
        name,
        description,
        startAt: startAt ? new Date(startAt).toISOString() : undefined,
        durationMinutes:
          durationMinutes === "" ? undefined : Number(durationMinutes),
        isPublic,
        showHistoryToNewbies,
        password,
        waitingRoomEnabled,
        allowEarlyJoin,
      });

      if (isConnectInstantly) {
        let nextUrl = `/room/${room.shortId}`;
        if (password) {
          nextUrl += `/prejoin`;
        }

        router.push(nextUrl);
      }
    } catch (error) {
      console.error("Ошибка при создании комнаты:", error);
    }
  };

  return (
    <main className={styles.main}>
      <div>
        <label htmlFor="name">Название:</label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Например: Встреча команды"
        />
      </div>

      <div>
        <label htmlFor="description">Описание:</label>
        <input
          type="text"
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Необязательно"
        />
      </div>

      <div>
        <label htmlFor="startAt">Дата и время начала:</label>
        <input
          type="datetime-local"
          id="startAt"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="duration">Длительность (минуты):</label>
        <input
          type="number"
          id="duration"
          value={durationMinutes}
          onChange={(e) =>
            setDurationMinutes(
              e.target.value === "" ? "" : Number(e.target.value)
            )
          }
          placeholder="Например: 60"
        />
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          По ссылке без авторизации
        </label>
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={showHistoryToNewbies}
            onChange={(e) => setShowHistoryToNewbies(e.target.checked)}
          />
          Показывать историю новым участникам
        </label>
      </div>

      <div>
        <label htmlFor="password">Пароль (если есть):</label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Введите пароль"
        />
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={waitingRoomEnabled}
            onChange={(e) => setWaitingRoomEnabled(e.target.checked)}
          />
          Включить зал ожидания
        </label>
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={allowEarlyJoin}
            onChange={(e) => setAllowEarlyJoin(e.target.checked)}
          />
          Разрешить ранний вход
        </label>
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={isConnectInstantly}
            onChange={(e) => setIsConnectInstantly(e.target.checked)}
          />
          Сразу же подключится
        </label>
      </div>

      <button onClick={handleCreateRoom}>Создать звонок</button>

      <RoomList />
    </main>
  );
}
