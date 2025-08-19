import { Router } from "express";
import { db } from "../db/client.js";
import Redis from "ioredis";

export const roomsRouter = Router();
const redis = new Redis(process.env.REDIS_URL!);

roomsRouter.post("/", async (req, res) => {
  const ownerId = parseInt(req.body.ownerId || "0"); // теперь берём из JSON
  if (!ownerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let shortId: string;
  while (true) {
    shortId = Math.random().toString(36).slice(2, 10);
    const exists = await db.room.findUnique({ where: { shortId } });
    if (!exists) break;
  }

  const { isPublic, showHistoryToNewbies } = req.body;

  const room = await db.room.create({
    data: {
      shortId,
      isPublic: !!isPublic,
      ownerId,
      showHistoryToNewbies: !!showHistoryToNewbies, // новое поле
    },
  });

  res.json(room);
});

roomsRouter.get("/:shortId/guest-allowed", async (req, res) => {
  try {
    const { shortId } = req.params;

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

// Получение истории сообщений
roomsRouter.get("/:shortId/history", async (req, res) => {
  try {
    const { shortId } = req.params;

    const room = await db.room.findUnique({
      where: { shortId },
      select: { showHistoryToNewbies: true },
    });

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Если история не нужна, возвращаем пустой массив
    if (!room.showHistoryToNewbies) {
      return res.json({ messages: [] });
    }

    // Иначе читаем из Redis
    const key = `room:${shortId}:messages`;
    const rawMessages = await redis.lrange(key, 0, -1);
    const messages = rawMessages.map((m) => JSON.parse(m));

    res.json({ messages });
  } catch (err) {
    console.error("Error fetching history:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Добавление сообщения
roomsRouter.post("/:shortId/messages", async (req, res) => {
  const { shortId } = req.params;
  const { text, user } = req.body;

  if (!text || !user) {
    return res.status(400).json({ error: "Missing text or user" });
  }

  const room = await db.room.findUnique({
    where: { shortId },
    select: { showHistoryToNewbies: true },
  });

  // Если история не нужна, просто возвращаем сообщение без записи
  if (!room?.showHistoryToNewbies) {
    return res.json({
      id: Math.random().toString(36).slice(2, 10),
      text,
      user,
      createdAt: new Date(),
    });
  }

  const msg = {
    id: Math.random().toString(36).slice(2, 10),
    text,
    user,
    createdAt: new Date(),
  };

  const key = `room:${shortId}:messages`;
  await redis.rpush(key, JSON.stringify(msg));
  await redis.expire(key, 60 * 60 * 24); // TTL 1 день

  res.json(msg);
});
