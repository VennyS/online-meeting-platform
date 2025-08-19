import { Router } from "express";
import { db } from "../db/client.js";
import Redis from "ioredis";
import {
  CreateRoomSchema,
  PostMessageSchema,
  ShortIdSchema,
} from "../schemas/room.schema.js";

export const roomsRouter = Router();
const redis = new Redis(process.env.REDIS_URL!);

roomsRouter.post("/", async (req, res) => {
  const parseResult = CreateRoomSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res
      .status(400)
      .json({ error: "Invalid data", details: parseResult.error.issues });
  }

  const {
    ownerId,
    isPublic,
    showHistoryToNewbies,
    password,
    waitingRoomEnabled,
  } = parseResult.data;

  let shortId: string;
  while (true) {
    shortId = Math.random().toString(36).slice(2, 10);
    const exists = await db.room.findUnique({ where: { shortId } });
    if (!exists) break;
  }

  const room = await db.room.create({
    data: {
      shortId,
      isPublic: !!isPublic,
      ownerId,
      showHistoryToNewbies: !!showHistoryToNewbies,
      password,
      waitingRoomEnabled: !!waitingRoomEnabled,
    },
  });

  res.json(room);
});

roomsRouter.get("/:shortId/guest-allowed", async (req, res) => {
  try {
    const parsed = ShortIdSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid shortId" });
    }

    const { shortId } = parsed.data;
    const room = await db.room.findUnique({
      where: { shortId },
      select: { isPublic: true },
    });

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    res.json({ guestAllowed: room.isPublic });
  } catch (err) {
    console.error("Error checking guest access:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

roomsRouter.get("/:shortId/history", async (req, res) => {
  try {
    const parsed = ShortIdSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid shortId" });
    }

    const { shortId } = parsed.data;

    const room = await db.room.findUnique({
      where: { shortId },
      select: { showHistoryToNewbies: true },
    });

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    if (!room.showHistoryToNewbies) {
      return res.json({ messages: [] });
    }

    const key = `room:${shortId}:messages`;
    const rawMessages = await redis.lrange(key, 0, -1);
    const messages = rawMessages.map((m) => JSON.parse(m));

    res.json({ messages });
  } catch (err) {
    console.error("Error fetching history:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

roomsRouter.post("/:shortId/messages", async (req, res) => {
  try {
    const parsedParams = ShortIdSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return res.status(400).json({ error: "Invalid shortId" });
    }

    const parsedBody = PostMessageSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({
        error: "Invalid request body",
        details: parsedBody.error.issues,
      });
    }

    const { shortId } = parsedParams.data;
    const { text, user } = parsedBody.data;

    const room = await db.room.findUnique({
      where: { shortId },
      select: { showHistoryToNewbies: true },
    });

    const msg = {
      id: Math.random().toString(36).slice(2, 10),
      text,
      user,
      createdAt: new Date(),
    };

    if (!room?.showHistoryToNewbies) {
      return res.json(msg);
    }

    const key = `room:${shortId}:messages`;
    await redis.rpush(key, JSON.stringify(msg));
    await redis.expire(key, 60 * 60 * 24); // TTL 1 день

    res.json(msg);
  } catch (err) {
    console.error("Error saving message:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
