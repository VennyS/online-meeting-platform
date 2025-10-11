"use client";

import RoomList from "@/app/components/ui/organisms/RoomList/RoomList";
import styles from "./page.module.css";

export default function Main() {
  return (
    <main className={styles.main}>
      <RoomList />
    </main>
  );
}
