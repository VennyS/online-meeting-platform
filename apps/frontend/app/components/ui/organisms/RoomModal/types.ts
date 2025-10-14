import { z } from "zod";
import { IRoom } from "@/app/types/room.types";
import { RoomWithStatus } from "../RoomList/types";

export type RoomModalProps = {
  mode: "create" | "edit";
  initialData?: RoomWithStatus;
  onClose: () => void;
  onUpdateRoom?: (room: RoomWithStatus) => void;
  onCreateRoom?: (room: RoomWithStatus) => void;
};

export const RoomSchema = z.object({
  name: z.string().nonempty("Имя обязательно"),
  description: z.string().optional(),
  startAt: z
    .string()
    .nonempty("Дата начала обязательна")
    .refine(
      (val) => {
        const date = new Date(val);
        if (isNaN(date.getTime())) return false;

        const now = new Date();

        now.setSeconds(0, 0);
        date.setSeconds(0, 0);

        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

        return date >= fiveMinutesAgo;
      },
      {
        message: "Дата не должна быть в прошлом",
      }
    ),
  durationMinutes: z
    .number()
    .min(1, "Продолжительность должна быть положительной")
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
