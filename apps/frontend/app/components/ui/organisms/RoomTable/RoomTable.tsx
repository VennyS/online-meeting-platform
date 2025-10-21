import { Box, Button, Typography } from "@mui/material";
import Link from "next/link";
import { RoomTableProps } from "./types";
import { Modal } from "../RoomList/RoomList";
import { getStatusButton } from "@/app/lib/getStatusButton";
import MeetingRoomOutlinedIcon from "@mui/icons-material/MeetingRoomOutlined";

export function RoomTable({ rooms, onModalOpen }: RoomTableProps) {
  return (
    <Box sx={{ width: "100%" }}>
      {rooms.map((room) => (
        <Box
          key={room.id}
          onClick={() => onModalOpen({ modal: Modal.Edit, room: room })}
          sx={{
            backgroundColor: "rgb(255, 255, 255)",
            color: "rgb(17, 24, 39)",
            mb: 1.5,
            border: "1px solid rgba(0, 0, 0, 0.12)",
            borderRadius: 1,
            overflow: "hidden",
            transition: "0.2s",
            cursor: "pointer",
            "&:hover": {
              borderColor: "rgb(37, 99, 235)",
              boxShadow: "rgba(0, 0, 0, 0.08) 0px 2px 12px",
              transform: "translateY(-1px)",
            },
          }}
        >
          <div
            style={{
              padding: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <MeetingRoomOutlinedIcon sx={{ color: "rgb(55, 65, 81)" }} />
              <div>
                <Typography variant="body1">{room.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(room.startAt).toLocaleString("ru-RU")}
                </Typography>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {getStatusButton(room)}
              <Button
                variant="outlined"
                color="primary"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onModalOpen({ modal: Modal.Reports, shortId: room.shortId });
                }}
                disabled={!room.haveReports}
              >
                Отчёты
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onModalOpen({ modal: Modal.Files, shortId: room.shortId });
                }}
                disabled={!room.haveFiles}
              >
                Файлы
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onModalOpen({ modal: Modal.Edit, room: room });
                }}
                variant="outlined"
                color="primary"
                size="small"
                disabled={room.label != "Предстоящая"}
              >
                Изменить
              </Button>
              <Button
                component={Link}
                href={`/room/${room.shortId}`}
                onClick={(e) => e.stopPropagation()}
                variant="contained"
                color="primary"
                size="small"
                disabled={room.label != "Предстоящая" && room.label != "Идет"}
              >
                Зайти
              </Button>
            </div>
          </div>
        </Box>
      ))}
    </Box>
  );
}
