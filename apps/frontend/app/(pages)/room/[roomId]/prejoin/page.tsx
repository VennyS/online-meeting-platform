"use client";

import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import styles from "./page.module.css";
import { useUser } from "@/app/hooks/useUser";
import { authService } from "@/app/services/auth.service";
import { roomService } from "@/app/services/room.service";
import {
  IPrequisites,
  RoomWSMessage,
  RoomWSSendMessage,
} from "@/app/types/room.types";
import { AxiosError } from "axios";
import { useWebSocket } from "@/app/hooks/useWebSocket";

const PrejoinPage = () => {
  const { roomId } = useParams();
  const [guestName, setGuestName] = useState("");
  const { user, setUser, setToken, loading: isUserLoading } = useUser();
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
    cancelled: false,
    isFinished: false,
    isBlackListed: false,
  });
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRoomOwner, setIsRoomOwner] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
  const [isPrequisitesLoading, setIsPrequisitesLoading] = useState(true);
  const { connect } = useWebSocket();

  useEffect(() => {
    const checkPrerequisites = async () => {
      if (!roomId) return;

      try {
        setIsPrequisitesLoading(true);
        const data = await roomService.prequisites(roomId as string);
        setPrequisites(data);
        setIsRoomOwner(data.isOwner);

        if (data.isBlackListed) {
          router.replace("/404");
        }

        if (
          !data.allowEarlyJoin &&
          data.startAt &&
          new Date(data.startAt) > new Date()
        ) {
          startCountdown(data.startAt);
        }
      } catch (err) {
        if (err instanceof AxiosError && err.response?.status === 404) {
          router.replace("/404");
        }
        console.error("Error fetching prerequisites:", error);
      } finally {
        setIsPrequisitesLoading(false);
      }
    };

    checkPrerequisites();
  }, [roomId, user]);

  useEffect(() => {
    if (isUserLoading || isPrequisitesLoading) return;

    if (!prequisites.guestAllowed && !user) {
      router.replace("https://ru.noimann.academy/");
    }
  }, [prequisites, isUserLoading, isPrequisitesLoading, user]);

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

  useEffect(() => {
    if (
      !isPrequisitesLoading &&
      user &&
      !user.isGuest &&
      isRoomOwner &&
      roomId &&
      !prequisites.isFinished
    ) {
      handleRoomOwnerAccess();
    }
  }, [user, isRoomOwner, roomId]);

  const handleRoomOwnerAccess = async () => {
    try {
      const fullName = `${user!.firstName} ${user!.lastName}`;
      const response = await authService.getToken(roomId as string, fullName);

      setToken(response.token);
      router.replace(`/room/${roomId}`);
    } catch (err) {
      console.error("Error accessing room as owner:", err);
    }
  };

  const connectWebSocket = (userId: number, userName: string) => {
    setIsConnecting(true);
    const ws = connect(roomId as string, userId, userName);

    if (!ws) return;

    ws.onopen = () => {};

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setError("Ошибка подключения");
      setIsConnecting(false);
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
      setIsConnecting(false);
    };

    ws.addEventListener("message", (event: MessageEvent) => {
      const message: RoomWSMessage = JSON.parse(event.data);
      const { event: evt, data } = message;

      switch (evt) {
        case "ready":
          const joinRequest: RoomWSSendMessage = {
            event: "guest_join_request",
            data: { name: userName },
          };
          ws.send(JSON.stringify(joinRequest));
          break;
        case "guest_approved":
          handleApprovedAccess(userId, userName, data.token);
          break;

        case "guest_rejected":
          setError("Ваш запрос был отклонен");
          setIsConnecting(false);
          break;

        default:
          console.warn("⚠️ Неизвестное событие от сервера:", evt, data);
          break;
      }
    });
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

    router.replace(`/room/${roomId}`);
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
          roomId as string,
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
        return;
      }
    }

    if (prequisites.waitingRoomEnabled) {
      connectWebSocket(userId, userName);
      return;
    }

    // 3️⃣ Если нет waiting room или пароль уже дали токен — пропускаем в комнату
    if (!livekitToken) {
      try {
        const response = await authService.getToken(
          roomId as string,
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
    !prequisites.allowEarlyJoin &&
    prequisites.startAt &&
    new Date(prequisites.startAt) > new Date() &&
    !!timeLeft;

  if (prequisites.isFinished)
    return <span>Встреча не существует или завершена</span>;
  if (prequisites.cancelled) return <span>Встреча отменена</span>;

  return (
    <div className={styles.guestForm}>
      <div>
        <h2>{prequisites.name}</h2>
        <span>{prequisites.description}</span>
      </div>

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
            disabled={isConnecting || isTimerVisible === true}
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
            disabled={isConnecting || isTimerVisible === true}
          />
        </>
      )}

      <button
        onClick={handleAccessRequest}
        disabled={
          isConnecting ||
          !!isTimerVisible ||
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
