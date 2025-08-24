import { z } from "zod";

export const LivekitTokenQuerySchema = z.object({
  room: z.string().min(1, "room is required"),
  name: z.string().min(1, "name is required"),
  password: z.string().optional(),
  userId: z.string().optional(),
});
