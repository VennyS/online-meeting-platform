import { z } from "zod";

export const CreateRoomSchema = z.object({
  ownerId: z.number().int().positive(),
  isPublic: z.boolean().optional(),
  showHistoryToNewbies: z.boolean().optional(),
  password: z.string().min(1).optional(),
  waitingRoomEnabled: z.boolean().optional(),
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
