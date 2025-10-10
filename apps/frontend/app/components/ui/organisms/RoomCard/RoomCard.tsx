import {
  Button,
  Card,
  CardActions,
  CardContent,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
} from "@mui/material";
import { toDateTimeLocalString } from "@/app/lib/toDateTimeLocalString";
import { toUtcISOString } from "@/app/lib/toUtcISOString";
import Link from "next/link";
import { RoomCardProps } from "./types";
import { UpdateRoomDto } from "@/app/types/room.types";
import { useState } from "react";
import { RoomFilesModal } from "../RoomFilesModal/RoomFilesModal";
import { RoomReportsModal } from "../RoomReportsModal/RoomReportsModal";

export function RoomCard({ room, onSave, updating }: RoomCardProps) {
  const [editData, setEditData] = useState<UpdateRoomDto>({
    name: room.name,
    description: room.description ?? "",
    startAt: room.startAt
      ? toDateTimeLocalString(room.startAt, room.timeZone)
      : "",
    durationMinutes: 60,
    isPublic: room.isPublic,
    showHistoryToNewbies: false,
    password: "",
    waitingRoomEnabled: room.waitingRoomEnabled,
    allowEarlyJoin: room.allowEarlyJoin,
    cancelled: room.cancelled,
  });

  const [isReportsOpen, setReportsOpen] = useState(false);
  const [isFilesOpen, setIsFilesOpen] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.currentTarget;

    setEditData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.currentTarget as HTMLInputElement).checked
          : name === "durationMinutes"
          ? Number(value)
          : value,
    }));
  };

  const handleSave = () => {
    onSave({
      ...editData,
      startAt: editData.startAt
        ? toUtcISOString(editData.startAt, "Europe/Moscow")
        : undefined,
      timeZone: "Europe/Moscow",
    });
  };

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 2,
        p: 2,
        borderRadius: 2,
        boxShadow: 1,
      }}
    >
      <CardContent>
        <Stack spacing={2}>
          <TextField
            label="Название комнаты"
            name="name"
            value={editData.name ?? ""}
            onChange={handleChange}
            size="small"
            disabled={updating}
            fullWidth
          />

          <TextField
            label="Описание"
            name="description"
            value={editData.description ?? ""}
            onChange={handleChange}
            multiline
            rows={2}
            disabled={updating}
            fullWidth
          />

          <Stack direction="row" spacing={2}>
            <TextField
              label="Дата начала"
              type="datetime-local"
              name="startAt"
              value={editData.startAt ?? ""}
              onChange={handleChange}
              disabled={updating}
              fullWidth
            />

            <TextField
              label="Длительность (мин)"
              type="number"
              name="durationMinutes"
              value={editData.durationMinutes ?? 0}
              onChange={handleChange}
              disabled={updating}
              sx={{ width: 150 }}
            />
          </Stack>

          <Stack direction="row" flexWrap="wrap">
            <FormControlLabel
              control={
                <Checkbox
                  name="isPublic"
                  checked={editData.isPublic}
                  onChange={handleChange}
                  disabled={updating}
                />
              }
              label="Публичная"
            />
            <FormControlLabel
              control={
                <Checkbox
                  name="showHistoryToNewbies"
                  checked={editData.showHistoryToNewbies}
                  onChange={handleChange}
                  disabled={updating}
                />
              }
              label="Показывать историю новичкам"
            />
            <FormControlLabel
              control={
                <Checkbox
                  name="waitingRoomEnabled"
                  checked={editData.waitingRoomEnabled}
                  onChange={handleChange}
                  disabled={updating}
                />
              }
              label="Зал ожидания"
            />
            <FormControlLabel
              control={
                <Checkbox
                  name="allowEarlyJoin"
                  checked={editData.allowEarlyJoin}
                  onChange={handleChange}
                  disabled={updating}
                />
              }
              label="Ранний вход"
            />
            <FormControlLabel
              control={
                <Checkbox
                  name="cancelled"
                  checked={editData.cancelled}
                  onChange={handleChange}
                  disabled={updating}
                />
              }
              label="Отменена"
            />
          </Stack>

          <TextField
            label="Пароль"
            name="password"
            type="text"
            value={editData.password ?? ""}
            onChange={handleChange}
            disabled={updating}
            fullWidth
          />
        </Stack>
      </CardContent>

      <CardActions sx={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={handleSave} disabled={updating}>
            Сохранить
          </Button>

          <Button
            component={Link}
            href={`/room/${room.shortId}`}
            variant="outlined"
            color="primary"
          >
            Зайти
          </Button>

          {room.haveReports && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => setReportsOpen(true)}
            >
              Отчёты
            </Button>
          )}
          {room.haveFiles && (
            <Button variant="outlined" onClick={() => setIsFilesOpen(true)}>
              Файлы
            </Button>
          )}
        </Stack>
      </CardActions>

      {room.haveReports && (
        <RoomReportsModal
          shortId={room.shortId}
          isOpen={isReportsOpen}
          onClose={() => setReportsOpen(false)}
        />
      )}

      {room.haveFiles && (
        <RoomFilesModal
          shortId={room.shortId}
          isOpen={isFilesOpen}
          onClose={() => setIsFilesOpen(false)}
        />
      )}
    </Card>
  );
}
