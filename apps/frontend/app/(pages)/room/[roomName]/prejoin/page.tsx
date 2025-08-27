"use client";

import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import styles from "./page.module.css";
import { useUser } from "@/app/hooks/useUser";
import { authService } from "@/app/services/auth.service";
import { roomService } from "@/app/services/room.service";
import { IPrequisites, RoomWSMessage } from "@/app/types/room.types";
import { AxiosError } from "axios";

const PrejoinPage = () => {
  const { roomName } = useParams();
  const [guestName, setGuestName] = useState("");
  const { user, setUser, setToken } = useUser();
  const router = useRouter();
  const [prequisites, setPrequisites] = useState<IPrequisites>({
    guestAllowed: false,
    passwordRequired: false,
    waitingRoomEnabled: false,
    isOwner: false,
    allowEarlyJoin: false,
    name: "",
    description: "",
    startAt: new Date(),
  });
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRoomOwner, setIsRoomOwner] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    const checkPrerequisites = async () => {
      if (!roomName) return;

      try {
        const data = await roomService.prequisites(roomName as string);
        setPrequisites(data);
        setIsRoomOwner(data.isOwner);

        // Если разрешен ранний вход и встреча еще не началась
        if (
          data.allowEarlyJoin &&
          data.startAt &&
          new Date(data.startAt) > new Date()
        ) {
          startCountdown(data.startAt);
        }
      } catch (error) {
        console.error("Error fetching prerequisites:", error);
      }
    };

    checkPrerequisites();
  }, [roomName, user]);

  const startCountdown = (startDate: Date) => {
    const interval = setInterval(() => {
      const now = new Date();
      const difference = new Date(startDate).getTime() - now.getTime();

      if (difference <= 0) {
        clearInterval(interval);
        setTimeLeft(null);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(interval);
  };

  // Если пользователь уже авторизован и является владельцем - пропускаем prejoin
  useEffect(() => {
    if (user && !user.isGuest && isRoomOwner && roomName) {
      handleRoomOwnerAccess();
    }
  }, [user, isRoomOwner, roomName]);

  const handleRoomOwnerAccess = async () => {
    try {
      const fullName = `${user!.firstName} ${user!.lastName}`;
      const response = await authService.getToken(roomName as string, fullName);

      setToken(response.token);
      router.replace(`/room/${roomName}`);
    } catch (err) {
      console.error("Error accessing room as owner:", err);
    }
  };

  const connectWebSocket = (
    userId: number,
    userName: string,
    isHost: boolean = false
  ) => {
    setIsConnecting(true);

    const websocket = new WebSocket(
      `ws://localhost:3001/ws?roomId=${roomName}&userId=${userId}&isHost=${isHost}`
    );

    websocket.onopen = () => {
      console.log("✅ Connected to WebSocket");
    };

    websocket.onmessage = (event) => {
      console.log("📨 Message from server:", event.data);

      const message: RoomWSMessage = JSON.parse(event.data);

      if (message.type === "init") {
        if (!isHost) {
          // Отправляем запрос на вход
          websocket.send(
            JSON.stringify({
              type: "guest_join_request",
              name: userName,
            })
          );
        }
      }

      if (message.type === "guest_approved") {
        handleApprovedAccess(userId, userName, message.token);
      }

      if (message.type === "guest_rejected") {
        setError("Ваш запрос был отклонен");
        setIsConnecting(false);
      }
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
      setError("Ошибка подключения");
      setIsConnecting(false);
    };

    websocket.onclose = () => {
      console.log("WebSocket connection closed");
      setIsConnecting(false);
    };

    setWs(websocket);
  };

  const handleApprovedAccess = (
    userId: number,
    userName: string,
    token: string
  ) => {
    setToken(token);

    setUser({
      id: userId,
      firstName: userName,
      lastName: "",
      email: "",
      phoneNumber: "",
      role: "guest",
      roleId: 0,
      emailVerified: false,
      profileImage: "",
      isGuest: true,
    });

    router.replace(`/room/${roomName}`);
  };

  const handleAccessRequest = async () => {
    if (!user && !guestName) return;
    setError("");

    const userName = !user ? guestName : `${user.firstName} ${user.lastName}`;
    const userId = !user ? Math.floor(Math.random() * 1_000_000) : user.id;

    let livekitToken: string | null = null;

    // 1️⃣ Если нужен пароль — получаем токен сразу
    if (prequisites.passwordRequired) {
      try {
        const response = await authService.getToken(
          roomName as string,
          userName,
          password,
          userId
        );
        livekitToken = response.token;
      } catch (err) {
        if (err instanceof AxiosError && err.response?.status === 401) {
          setError("Неправильный пароль");
        } else {
          setError("Ошибка при подключении");
        }
        return; // стопаем, если пароль неправильный
      }
    }

    // 2️⃣ Если включён waiting room — подключаемся к WS
    if (prequisites.waitingRoomEnabled) {
      connectWebSocket(userId, userName, false);
      return; // дальше ждать одобрения хоста
    }

    // 3️⃣ Если нет waiting room или пароль уже дали токен — пропускаем в комнату
    if (!livekitToken) {
      try {
        const response = await authService.getToken(
          roomName as string,
          userName,
          password,
          userId
        );
        livekitToken = response.token;
      } catch (err) {
        setError("Ошибка при подключении");
        return;
      }
    }

    // Финальный доступ
    handleApprovedAccess(userId, userName, livekitToken);
  };

  const isTimerVisible =
    prequisites.allowEarlyJoin &&
    prequisites.startAt &&
    new Date(prequisites.startAt) > new Date() &&
    timeLeft;

  return (
    <div className={styles.guestForm}>
      {isTimerVisible && (
        <div className={styles.timer}>
          <h3>Встреча начнется через:</h3>
          <div className={styles.timerDigits}>
            {timeLeft.days > 0 && (
              <div className={styles.timeUnit}>
                <span className={styles.timeValue}>{timeLeft.days}</span>
                <span className={styles.timeLabel}>дней</span>
              </div>
            )}
            <div className={styles.timeUnit}>
              <span className={styles.timeValue}>
                {timeLeft.hours.toString().padStart(2, "0")}
              </span>
              <span className={styles.timeLabel}>часов</span>
            </div>
            <div className={styles.timeUnit}>
              <span className={styles.timeValue}>
                {timeLeft.minutes.toString().padStart(2, "0")}
              </span>
              <span className={styles.timeLabel}>минут</span>
            </div>
            <div className={styles.timeUnit}>
              <span className={styles.timeValue}>
                {timeLeft.seconds.toString().padStart(2, "0")}
              </span>
              <span className={styles.timeLabel}>секунд</span>
            </div>
          </div>
          <p>Ожидайте начала встречи...</p>
        </div>
      )}

      {prequisites.guestAllowed && !user && (
        <>
          <h2>Введите имя для входа в комнату</h2>
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Ваше имя"
            disabled={isConnecting || isTimerVisible !== null}
          />
        </>
      )}
      {prequisites.passwordRequired && (
        <>
          <h2>Введите пароль для входа в комнату</h2>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ваш пароль"
            disabled={isConnecting || isTimerVisible !== null}
          />
        </>
      )}

      <button
        onClick={handleAccessRequest}
        disabled={
          isConnecting ||
          isTimerVisible !== null ||
          (!user && !guestName) ||
          (prequisites.passwordRequired && !password)
        }
      >
        {isConnecting ? "Подключение..." : "Войти как гость"}
      </button>

      {error && <p className={styles.error}>{error}</p>}
      {isConnecting && <p>Ожидаем одобрения от организатора встречи...</p>}
    </div>
  );
};

export default PrejoinPage;
