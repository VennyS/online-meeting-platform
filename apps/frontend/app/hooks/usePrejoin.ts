"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/hooks/useUser";
import { authService } from "@/app/services/auth.service";
import { usePrequisites } from "@/app/providers/prequisites.provider";
import { connectSocket } from "@/app/config/connectSocket";

export function usePrejoin(roomShortId: string) {
  const router = useRouter();
  const { user, setUser, setToken, loading: userLoading } = useUser();
  const { prequisites, isLoading: preqLoading } = usePrequisites();

  const [guestName, setGuestName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [countdown, setCountdown] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  // 🕒 Таймер до старта встречи
  useEffect(() => {
    if (!prequisites?.startAt) return;
    if (
      prequisites.allowEarlyJoin ||
      new Date(prequisites.startAt) <= new Date()
    )
      return;

    const timer = setInterval(() => {
      const diff = new Date(prequisites.startAt).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown(null);
        clearInterval(timer);
        return;
      }

      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown({ days: d, hours: h, minutes: m, seconds: s });
    }, 1000);

    return () => clearInterval(timer);
  }, [prequisites.startAt, prequisites.allowEarlyJoin]);

  // 👑 Автовход владельца
  useEffect(() => {
    if (
      user &&
      !user.isGuest &&
      prequisites.isOwner &&
      roomShortId &&
      !prequisites.isFinished &&
      !prequisites.cancelled
    ) {
      (async () => {
        try {
          const name = `${user.firstName} ${user.lastName}`;
          const { token } = await authService.getToken(roomShortId, name);
          setToken(token);
          router.replace(`/room/${roomShortId}`);
        } catch (e) {
          console.error("Autojoin error:", e);
        }
      })();
    }
  }, [user, prequisites.isOwner, roomShortId]);

  // 🚪 Основной вход
  const handleJoin = useCallback(async () => {
    setError("");
    setConnecting(true);

    const name = user ? `${user.firstName} ${user.lastName}` : guestName;
    const tempId = user?.id ?? Math.floor(Math.random() * 1e6);

    if (!name || (prequisites.passwordRequired && !password)) {
      setConnecting(false);
      return;
    }

    // Комната с залом ожидания
    if (prequisites.waitingRoomEnabled) {
      const socket = connectSocket(roomShortId, name);

      socket.on("guest_approved", ({ guestId, token }) => {
        setToken(token);
        setUser({
          ...user!,
          id: guestId,
          isGuest: true,
          firstName: name,
          lastName: "",
        });
        router.replace(`/room/${roomShortId}`);
      });

      socket.on("guest_rejected", () => {
        setError("Запрос отклонён");
        setConnecting(false);
      });

      socket.on("connect_error", () => {
        setError("Ошибка подключения");
        setConnecting(false);
      });

      return;
    }

    // Обычный вход
    try {
      const { token } = await authService.getToken(
        roomShortId,
        name,
        password,
        tempId
      );
      setToken(token);
      if (!user)
        setUser({
          id: tempId,
          firstName: name,
          lastName: "",
          email: "",
          phoneNumber: "",
          role: "guest",
          roleId: 0,
          emailVerified: false,
          profileImage: "",
          isGuest: true,
        });

      router.replace(`/room/${roomShortId}`);
    } catch (e: any) {
      setError(e.response?.status === 401 ? "Неверный пароль" : "Ошибка входа");
    } finally {
      setConnecting(false);
    }
  }, [
    user,
    guestName,
    password,
    prequisites,
    roomShortId,
    setToken,
    setUser,
    router,
  ]);

  const fieldDisabled = connecting || !!countdown;
  const buttonDisabled =
    connecting ||
    !!countdown ||
    (!user && !guestName.trim()) ||
    (prequisites.passwordRequired && !password);

  return {
    prequisites,
    user,
    userLoading,
    preqLoading,
    guestName,
    setGuestName,
    password,
    setPassword,
    error,
    connecting,
    countdown,
    fieldDisabled,
    buttonDisabled,
    handleJoin,
  };
}
