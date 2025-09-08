import { z } from "zod";

export const CreateRoomSchema = z.object({
  ownerId: z.number().int().positive(),
  name: z.string().min(1, "Название обязательно"),
  description: z.string().optional(),
  startAt: z.coerce.date().optional(),
  durationMinutes: z.number().int().positive().optional(),
  isPublic: z.boolean().optional(),
  showHistoryToNewbies: z.boolean().optional(),
  password: z.string().optional(),
  waitingRoomEnabled: z.boolean().optional(),
  allowEarlyJoin: z.boolean().optional(),
  timeZone: z.string().default("Europe/Moscow"),
});

export const UpdateRoomSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  startAt: z.coerce.date().optional(),
  timeZone: z.string().optional(),
  durationMinutes: z.number().int().positive().optional(),
  isPublic: z.boolean().optional(),
  showHistoryToNewbies: z.boolean().optional(),
  password: z.string().optional(),
  waitingRoomEnabled: z.boolean().optional(),
  allowEarlyJoin: z.boolean().optional(),
  cancelled: z.boolean().optional(),
});

export const ShortIdSchema = z.object({
  shortId: z.string().min(1, "shortId is required"),
});

export const PostMessageSchema = z.object({
  text: z.string().min(1, "Message text is required"),
  user: z.object({
    id: z.number().int().positive(),
    firstName: z.string().min(1),
  }),
});

export const AddParticipantsSchema = z.object({
  userIds: z.array(z.union([z.string(), z.number()])).min(1),
});
