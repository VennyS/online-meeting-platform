"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Divider,
  Stack,
  Paper,
} from "@mui/material";
import { roomService } from "@/app/services/room.service";
import { MeetingReports } from "@/app/types/room.types";
import { RoomReportsProps } from "./types";
import { Modal } from "../../atoms/Modal/Modal";

export const RoomReportsModal = ({
  shortId,
  isOpen,
  onClose,
}: RoomReportsProps) => {
  const [reports, setReports] = useState<MeetingReports | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchReports = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await roomService.getMeetingReports(shortId);
        setReports(data);
      } catch (err) {
        setError("Не удалось загрузить отчёты о встречах");
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [shortId, isOpen]);

  return (
    <Modal title="Отчёты о встречах" onClose={onClose}>
      <Box>
        {loading && (
          <Box
            sx={{
              py: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CircularProgress />
          </Box>
        )}

        {!loading && error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && reports?.sessions.length === 0 && (
          <Typography color="text.secondary" align="center" py={4}>
            Отчёты отсутствуют
          </Typography>
        )}

        {!loading && !error && reports && reports.sessions.length > 0 && (
          <Stack spacing={2}>
            {reports.sessions.map((session) => (
              <Paper
                key={session.id}
                sx={{
                  p: 2,
                  border: "1px solid rgba(0,0,0,0.12)",
                  borderRadius: 2,
                  backgroundColor: "white",
                  boxShadow: "var(--Paper-shadow)",
                  backgroundImage: "var(--Paper-overlay)",
                  transition: "0.2s",
                }}
              >
                <Typography variant="subtitle1" fontWeight={600}>
                  Сессия #{session.id}
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  Начало:{" "}
                  {new Date(session.startTime).toLocaleString("ru-RU", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                  {session.endTime && (
                    <>
                      {" | "}Окончание:{" "}
                      {new Date(session.endTime).toLocaleString("ru-RU", {
                        timeStyle: "short",
                      })}
                    </>
                  )}
                </Typography>

                {!!session.duration && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Длительность: {Math.round(session.duration)} мин
                  </Typography>
                )}

                <Divider sx={{ my: 1.5 }} />

                <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5 }}>
                  Участники:
                </Typography>

                <Stack spacing={1}>
                  {session.participants.map((p) => (
                    <Box
                      key={p.id}
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        p: 1,
                        borderRadius: 1,
                        bgcolor: "grey.50",
                      }}
                    >
                      <Typography fontWeight={500}>{p.name}</Typography>
                      {p.sessions.map((s, idx) => (
                        <Typography
                          key={idx}
                          variant="body2"
                          color="text.secondary"
                        >
                          — Вошёл:{" "}
                          {new Date(s.joinTime).toLocaleTimeString("ru-RU")}
                          {s.leaveTime &&
                            ` | Вышел: ${new Date(
                              s.leaveTime
                            ).toLocaleTimeString("ru-RU")}`}
                        </Typography>
                      ))}
                    </Box>
                  ))}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Box>
    </Modal>
  );
};
