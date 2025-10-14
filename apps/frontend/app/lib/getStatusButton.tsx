import { Button } from "@mui/material";
import { IRoom } from "../types/room.types";
import {
  RoomWithStatus,
  Status,
} from "../components/ui/organisms/RoomList/types";

export const getRoomStatus = (room: IRoom): Status => {
  const label = room.cancelled
    ? "Отменена"
    : new Date(room.startAt) > new Date()
    ? "Предстоящая"
    : room.finished
    ? "Завершена"
    : "Идет";

  const color = room.cancelled
    ? "error"
    : new Date(room.startAt) > new Date()
    ? "info"
    : room.finished
    ? "success"
    : "warning";

  return {
    label,
    color,
  };
};

export const getStatusButton = (room: RoomWithStatus) => {
  return (
    <Button
      variant="outlined"
      size="small"
      sx={{ pointerEvents: "none" }}
      color={room.color}
    >
      {room.label}
    </Button>
  );
};
