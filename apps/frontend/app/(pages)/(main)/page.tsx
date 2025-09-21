"use client";

import Link from "next/link";
import RoomList from "@/app/components/ui/organisms/RoomList/RoomList";
import styles from "./page.module.css";

export default function Main() {
  return (
    <main className={styles.main}>
      <Link href="/create-meet">Создать звонок</Link>
      <RoomList />
    </main>
  );
}
