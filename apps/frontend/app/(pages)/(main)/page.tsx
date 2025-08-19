"use client";

import styles from "./page.module.css";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { roomService } from "../../services/room.service";
import { useUser } from "../../hooks/useUser";

export default function CreateCallButton() {
  const router = useRouter();
  const { user } = useUser();
  const [isPublic, setIsPublic] = useState(false);
  const [showHistoryToNewbies, setShowHistoryToNewbies] = useState(false);

  const handleCreateRoom = async () => {
    try {
      const room = await roomService.createRoom(
        user!.id,
        isPublic,
        showHistoryToNewbies
      );
      router.push(`/room/${room.shortId}`);
    } catch (error) {
      console.error("Ошибка при создании комнаты:", error);
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.radioGroup}>
        <h3>Тип доступа:</h3>
        <label>
          <input
            type="radio"
            name="accessType"
            checked={!isPublic}
            onChange={() => setIsPublic(false)}
          />
          Только авторизованные
        </label>
        <label>
          <input
            type="radio"
            name="accessType"
            checked={isPublic}
            onChange={() => setIsPublic(true)}
          />
          По ссылке без авторизации
        </label>
      </div>

      <div className={styles.radioGroup}>
        <h3>Показывать историю новым участникам:</h3>
        <label>
          <input
            type="radio"
            name="historyVisibility"
            checked={!showHistoryToNewbies}
            onChange={() => setShowHistoryToNewbies(false)}
          />
          Скрыть историю
        </label>
        <label>
          <input
            type="radio"
            name="historyVisibility"
            checked={showHistoryToNewbies}
            onChange={() => setShowHistoryToNewbies(true)}
          />
          Показать историю
        </label>
      </div>

      <button onClick={handleCreateRoom} className={styles.button}>
        Создать звонок
      </button>
    </main>
  );
}
