import { z } from "zod";
import { IRoom } from "@/app/types/room.types";
import { RoomWithStatus } from "../RoomList/types";

export type RoomModalProps = {
  mode: "create" | "edit";
  initialData?: RoomWithStatus;
  onClose: () => void;
  onUpdateRoom?: (room: IRoom) => void;
  onCreateRoom?: (room: IRoom) => void;
};

export const RoomSchema = z.object({
  name: z.string().nonempty("Имя обязательно"),
  description: z.string().optional(),
  startAt: z
    .string()
    .nonempty("Дата начала обязательна")
    .transform((val) => {
      const date = new Date(val);

      if (isNaN(date.getTime()) || date < new Date()) {
        return new Date().toISOString();
      }

      return val;
    }),
  durationMinutes: z
    .union([
      z.number().min(1, "Продолжительность должна быть положительной"),
      z.nan().transform(() => 60),
    ])
    .optional(),
  isPublic: z.boolean().optional(),
  showHistoryToNewbies: z.boolean().optional(),
  waitingRoomEnabled: z.boolean().optional(),
  allowEarlyJoin: z.boolean().optional(),
  isConnectInstantly: z.boolean().optional(),
  password: z.string().optional(),
  canShareScreen: z.enum(["OWNER", "ADMIN", "ALL"]),
  canStartPresentation: z.enum(["OWNER", "ADMIN", "ALL"]),
});

export type RoomData = z.infer<typeof RoomSchema>;
