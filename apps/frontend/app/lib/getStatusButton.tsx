import { Button } from "@mui/material";
import { IRoom } from "../types/room.types";

export const getStatusButton = (room: IRoom) => {
  const label = room.cancelled
    ? "Отменена"
    : new Date(room.startAt) > new Date()
    ? "Предстоящая"
    : new Date(room.startAt) < new Date()
    ? "Завершена"
    : "Идет";

  const color = room.cancelled
    ? "error"
    : new Date(room.startAt) > new Date()
    ? "info"
    : new Date(room.startAt) < new Date()
    ? "success"
    : "warning";

  return (
    <Button
      variant="outlined"
      size="small"
      sx={{ pointerEvents: "none" }}
      color={color}
    >
      {label}
    </Button>
  );
};
