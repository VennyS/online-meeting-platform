"use client";

import styles from "./page.module.css";
import { useRouter } from "next/navigation";

export default function CreateCallButton() {
  const router = useRouter();

  const handleCreateRoom = () => {
    const shortId = Math.random().toString(36).slice(2, 10); // 8 символов случайных
    router.push(`/room/${shortId}`);
  };

  return (
    <main className={styles.main}>
      <button onClick={handleCreateRoom} className={styles.button}>
        Создать звонок
      </button>
    </main>
  );
}
