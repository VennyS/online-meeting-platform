"use client";

import { useEffect, useState } from "react";
import { roomService } from "@/app/services/room.service";
import { IRoom } from "@/app/types/room.types";
import { RoomListProps } from "./types";

import {
  Box,
  Button,
  Divider,
  Paper,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { RoomReportsModal } from "../RoomReportsModal/RoomReportsModal";
import { RoomFilesModal } from "../RoomFilesModal/RoomFilesModal";

import RoomCardGrid from "../RoomCardGrid/RoomCardGrid";
import { RoomTable } from "../RoomTable/RoomTable";
import RoomModal from "../RoomModal/RoomModal";

export enum Modal {
  Files = "chat",
  Reports = "reports",
  Create = "create",
  Edit = "edit",
}

export type ModalState =
  | { modal: Modal.Files; shortId: string }
  | { modal: Modal.Reports; shortId: string }
  | { modal: Modal.Create }
  | { modal: Modal.Edit; room: IRoom }
  | { modal: undefined };

export default function RoomList({
  fetchMode = "user",
  initialRooms = [],
}: RoomListProps) {
  const [rooms, setRooms] = useState<IRoom[]>(initialRooms);
  const [loading, setLoading] = useState(false);
  const [modalState, setModalState] = useState<ModalState>({
    modal: undefined,
  });

  const onUpdateRoom = (room: IRoom) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === room.id ? { ...room, r } : r))
    );
  };

  const onCreateRoom = (room: IRoom) => {
    setRooms((prev) => [room, ...prev]);
  };

  const isMobile = useMediaQuery("(max-width:700px)");

  useEffect(() => {
    if (fetchMode === "none") return;

    const fetchRooms = async () => {
      try {
        setLoading(true);
        const data =
          fetchMode === "all"
            ? await roomService.getAll()
            : await roomService.getRooms();
        setRooms(data);
      } catch (err) {
        console.error("Ошибка при загрузке комнат:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [fetchMode]);

  function onModalClose() {
    setModalState({ modal: undefined });
  }

  return (
    <>
      <Box
        sx={{
          mb: 2,
          p: { xs: 2, sm: 3 },
          borderRadius: 2,
          textAlign: "center",
          maxWidth: "800px",
        }}
      >
        <Typography variant="h3" sx={{ mb: "8px" }}>
          Добро пожаловать!
        </Typography>
        <Typography
          variant="subtitle1"
          fontSize="1.5rem"
          sx={{ color: "text.secondary", lineHeight: "1.4" }}
        >
          Создавайте встречи, записывайте их, транслируйте экран или
          презентацию, отслеживайте отчёты. Всё просто, удобно и быстро.
        </Typography>
        <Button
          onClick={() => setModalState({ modal: Modal.Create })}
          variant="contained"
          sx={{ mt: 2 }}
        >
          Новая встреча
        </Button>
      </Box>

      <Paper
        elevation={1}
        sx={{
          width: "100%",
          padding: { xs: "12px", sm: "16px" },
          paddingBottom: "0 !important",
          boxSizing: "border-box",
          borderRadius: "12px",
        }}
      >
        <Box sx={{ padding: { xs: "12px", sm: "16px" } }}>
          <Typography
            variant="h2"
            sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}
          >
            Встречи
          </Typography>
        </Box>

        <Divider />
        <Box sx={{ padding: { xs: "12px", sm: "16px" } }}>
          {rooms.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Typography fontWeight={400}>
                История встреч отсутствует, но Вам выдалась возможность положить
                ей начало
              </Typography>
              <Button
                onClick={() => setModalState({ modal: Modal.Create })}
                variant="outlined"
              >
                Новая встреча
              </Button>
            </Box>
          ) : isMobile ? (
            <RoomCardGrid
              rooms={rooms}
              onModalOpen={(params) => setModalState(params)}
            />
          ) : (
            <RoomTable
              rooms={rooms}
              onModalOpen={(params) => setModalState(params)}
            />
          )}
        </Box>
      </Paper>

      {modalState?.modal === Modal.Reports && modalState.shortId && (
        <RoomReportsModal
          shortId={modalState.shortId}
          isOpen
          onClose={onModalClose}
        />
      )}

      {modalState?.modal === Modal.Files && modalState.shortId && (
        <RoomFilesModal
          shortId={modalState.shortId}
          isOpen
          onClose={onModalClose}
        />
      )}

      {modalState?.modal === Modal.Create && (
        <RoomModal
          mode={modalState.modal}
          onClose={onModalClose}
          onCreateRoom={onCreateRoom}
        />
      )}

      {modalState?.modal === Modal.Edit && (
        <RoomModal
          mode={modalState.modal}
          onClose={onModalClose}
          initialData={modalState.room}
          onUpdateRoom={onUpdateRoom}
        />
      )}
    </>
  );
}
