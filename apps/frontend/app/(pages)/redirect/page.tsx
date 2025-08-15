"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function RedirectPage() {
  const searchParams = useSearchParams();
  const to = searchParams.get("to");

  if (!to) return <p>Неверный адрес</p>;

  const decoded = decodeURIComponent(to);

  return (
    <div style={{ padding: 20 }}>
      <h2>Вы покидаете сайт</h2>
      <p>Сейчас вы перейдёте по внешней ссылке:</p>
      <p style={{ wordBreak: "break-word" }}>{decoded}</p>
      <Link
        href={decoded}
        style={{
          display: "inline-block",
          marginTop: 10,
          padding: "8px 16px",
          background: "#0070f3",
          color: "#fff",
          borderRadius: 4,
          textDecoration: "none",
        }}
      >
        Перейти
      </Link>
    </div>
  );
}
