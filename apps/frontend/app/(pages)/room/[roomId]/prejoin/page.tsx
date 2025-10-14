"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
  Alert,
  Collapse,
  Fade,
} from "@mui/material";
import { useUser } from "@/app/hooks/useUser";
import { authService } from "@/app/services/auth.service";
import { RoomWSMessage } from "@/app/types/room.types";
import { AxiosError } from "axios";
import { useWebSocket } from "@/app/hooks/useWebSocket";
import { usePrequisites } from "@/app/providers/prequisites.provider";

export default function PrejoinPage() {
  const { roomId } = useParams();
  const router = useRouter();
  const { user, setUser, setToken, loading: isUserLoading } = useUser();
  const { connect } = useWebSocket();

  const [guestName, setGuestName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const { prequisites, isLoading: isPrequisitesLoading } = usePrequisites();

  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    if (isPrequisitesLoading) return;

    if (prequisites.isBlackListed) router.replace("/404");

    if (
      !prequisites.allowEarlyJoin &&
      new Date(prequisites.startAt) > new Date()
    ) {
      startCountdown(prequisites.startAt);
    }
  }, [prequisites]);

  useEffect(() => {
    if (isUserLoading || isPrequisitesLoading) return;

    if (!prequisites.guestAllowed && !user) {
      router.replace("https://ru.noimann.academy/");
    }
  }, [prequisites, isUserLoading, isPrequisitesLoading, user]);

  const startCountdown = (startDate: Date) => {
    const interval = setInterval(() => {
      const now = new Date();
      const diff = new Date(startDate).getTime() - now.getTime();
      if (diff <= 0) return clearInterval(interval);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds });
    }, 1000);
  };

  useEffect(() => {
    if (
      !isPrequisitesLoading &&
      user &&
      !user.isGuest &&
      prequisites.isOwner &&
      roomId &&
      !prequisites.isFinished
    ) {
      handleRoomOwnerAccess();
    }
  }, [user, prequisites.isOwner, roomId]);

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

    ws.addEventListener("message", (event: MessageEvent) => {
      const message: RoomWSMessage = JSON.parse(event.data);
      const { event: evt, data } = message;

      switch (evt) {
        case "ready":
          ws.send(
            JSON.stringify({
              event: "guest_join_request",
              data: { name: userName },
            })
          );
          break;
        case "guest_approved":
          handleApprovedAccess(userId, userName, data.token);
          break;
        case "guest_rejected":
          setError("Ваш запрос был отклонён");
          setIsConnecting(false);
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
        setError(
          err instanceof AxiosError && err.response?.status === 401
            ? "Неверный пароль"
            : "Ошибка подключения"
        );
        return;
      }
    }

    if (prequisites.waitingRoomEnabled) {
      connectWebSocket(userId, userName);
      return;
    }

    if (!livekitToken) {
      try {
        const response = await authService.getToken(
          roomId as string,
          userName,
          password,
          userId
        );
        livekitToken = response.token;
      } catch {
        setError("Ошибка при подключении");
        return;
      }
    }

    handleApprovedAccess(userId, userName, livekitToken);
  };

  const isTimerVisible =
    !prequisites.allowEarlyJoin &&
    new Date(prequisites.startAt) > new Date() &&
    !!timeLeft;

  if (prequisites.isFinished)
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        p={2}
        sx={{ backgroundColor: "primary.main", boxSizing: "border-box" }}
      >
        <Typography variant="h4" color="white">
          Встреча завершена
        </Typography>
      </Box>
    );
  if (prequisites.cancelled) return;
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    minHeight="100vh"
    p={2}
    sx={{ backgroundColor: "primary.main", boxSizing: "border-box" }}
  >
    <Typography variant="h4" color="white">
      Встреча отменена
    </Typography>
  </Box>;

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      p={2}
    >
      <Fade in timeout={300}>
        <Card sx={{ maxWidth: 480, width: "100%", borderRadius: 3 }}>
          <CardContent>
            {isPrequisitesLoading ? (
              <Stack alignItems="center" spacing={2}>
                <CircularProgress />
                <Typography>Загрузка данных...</Typography>
              </Stack>
            ) : (
              <Stack spacing={3}>
                <Box>
                  <Typography variant="h5" fontWeight={700}>
                    {prequisites.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {prequisites.description}
                  </Typography>
                </Box>

                <Collapse
                  in={isTimerVisible}
                  sx={{ m: isTimerVisible ? "auto" : "0px !important" }}
                >
                  {isTimerVisible && (
                    <Box textAlign="center">
                      <Typography variant="h6" fontWeight={600} gutterBottom>
                        Встреча начнётся через:
                      </Typography>
                      <Stack
                        direction="row"
                        justifyContent="center"
                        spacing={2}
                      >
                        {timeLeft?.days! > 0 && (
                          <TimeChip value={timeLeft!.days} label="дней" />
                        )}
                        <TimeChip value={timeLeft!.hours} label="часов" />
                        <TimeChip value={timeLeft!.minutes} label="минут" />
                        <TimeChip value={timeLeft!.seconds} label="секунд" />
                      </Stack>
                    </Box>
                  )}
                </Collapse>

                {prequisites.guestAllowed && !user && (
                  <TextField
                    label="Ваше имя"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    disabled={isConnecting || isTimerVisible}
                    slotProps={{
                      input: { disableUnderline: true },
                    }}
                  />
                )}

                {prequisites.passwordRequired && (
                  <TextField
                    label="Пароль"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isConnecting || isTimerVisible}
                    slotProps={{
                      input: { disableUnderline: true },
                    }}
                  />
                )}

                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleAccessRequest}
                  disabled={
                    isConnecting ||
                    isTimerVisible ||
                    (!user && !guestName) ||
                    (prequisites.passwordRequired && !password)
                  }
                >
                  {isConnecting ? "Подключение..." : "Войти"}
                </Button>

                <Collapse
                  in={!!error}
                  sx={{ m: !!error ? "auto" : "0px !important" }}
                >
                  <Alert severity="error">{error}</Alert>
                </Collapse>

                <Collapse
                  in={isConnecting && !error}
                  sx={{ m: isConnecting && !error ? "auto" : "0px !important" }}
                >
                  <Alert severity="info">
                    Ожидаем одобрения от организатора...
                  </Alert>
                </Collapse>
              </Stack>
            )}
          </CardContent>
        </Card>
      </Fade>
    </Box>
  );
}

const TimeChip = ({ value, label }: { value: number; label: string }) => (
  <Stack alignItems="center" spacing={0.5}>
    <Typography fontWeight={700} fontSize="1.4rem">
      {String(value).padStart(2, "0")}
    </Typography>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
  </Stack>
);
