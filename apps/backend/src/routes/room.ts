import { Router } from "express";
import { db } from "../db/client.js";
import Redis from "ioredis";
import {
  AddParticipantsSchema,
  CreateRoomSchema,
  PostMessageSchema,
  ShortIdSchema,
  UpdateRoomSchema,
} from "../schemas/room.schema.js";
import bcrypt from "bcrypt";
import { extractAuthToken } from "../utils/auth.js";

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
    name,
    description,
    startAt,
    durationMinutes,
    isPublic,
    showHistoryToNewbies,
    password,
    waitingRoomEnabled,
    allowEarlyJoin,
  } = parseResult.data;

  let shortId: string;
  while (true) {
    shortId = Math.random().toString(36).slice(2, 10);
    const exists = await db.room.findUnique({ where: { shortId } });
    if (!exists) break;
  }

  const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

  const room = await db.room.create({
    data: {
      shortId,
      ownerId,
      name,
      description: description || null,
      startAt: startAt,
      durationMinutes: durationMinutes ?? null,
      isPublic: !!isPublic,
      showHistoryToNewbies: !!showHistoryToNewbies,
      passwordHash: hashedPassword,
      waitingRoomEnabled: !!waitingRoomEnabled,
      allowEarlyJoin: allowEarlyJoin ?? true,
    },
  });

  res.json({
    ...room,
    passwordHash: undefined,
  });
});

roomsRouter.get("/:shortId/prequisites", async (req, res) => {
  try {
    const parsed = ShortIdSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid shortId" });
    }

    const { shortId } = parsed.data;
    const room = await db.room.findUnique({
      where: { shortId },
      select: {
        name: true,
        description: true,
        startAt: true,
        isPublic: true,
        passwordHash: true,
        waitingRoomEnabled: true,
        allowEarlyJoin: true,
        ownerId: true,
        cancelled: true,
      },
    });

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Получаем userID из куки auth-token
    const cookieHeader = req.headers.cookie;
    const authResult = extractAuthToken(cookieHeader);
    const userId = authResult?.payload?.id;

    res.json({
      name: room.name,
      description: room.description,
      startAt: room.startAt,
      guestAllowed: room.isPublic,
      passwordRequired: !!room.passwordHash,
      waitingRoomEnabled: room.waitingRoomEnabled,
      allowEarlyJoin: room.allowEarlyJoin,
      isOwner: userId ? room.ownerId === userId : false,
      cancelled: room.cancelled,
    });
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

roomsRouter.get("/", async (req, res) => {
  try {
    const cookieHeader = req.headers.cookie;
    const authResult = extractAuthToken(cookieHeader);
    const userId = authResult?.payload?.id;

    const rooms = await db.room.findMany({
      orderBy: { startAt: "desc" },
      where: { ownerId: userId },
      select: {
        id: true,
        shortId: true,
        name: true,
        description: true,
        startAt: true,
        durationMinutes: true,
        isPublic: true,
        showHistoryToNewbies: true,
        waitingRoomEnabled: true,
        allowEarlyJoin: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
        cancelled: true,
      },
    });

    res.json(rooms);
  } catch (err) {
    console.error("Error fetching rooms:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

roomsRouter.get("/all", async (req, res) => {
  try {
    const cookieHeader = req.headers.cookie;
    const authResult = extractAuthToken(cookieHeader);
    const roleId = authResult?.payload?.roleId;

    if (roleId !== 4) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const rooms = await db.room.findMany({
      orderBy: { startAt: "desc" },
      select: {
        id: true,
        shortId: true,
        name: true,
        description: true,
        startAt: true,
        durationMinutes: true,
        isPublic: true,
        showHistoryToNewbies: true,
        waitingRoomEnabled: true,
        allowEarlyJoin: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
        cancelled: true,
      },
    });

    res.json(rooms);
  } catch (err) {
    console.error("Error fetching rooms:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

roomsRouter.patch("/:shortId", async (req, res) => {
  try {
    const parsedParams = ShortIdSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return res.status(400).json({ error: "Invalid shortId" });
    }

    const parsedBody = UpdateRoomSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({
        error: "Invalid request body",
        details: parsedBody.error.issues,
      });
    }

    const { shortId } = parsedParams.data;
    const { password, ...data } = parsedBody.data;

    let passwordHash: string | undefined;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const updatedRoom = await db.room.update({
      where: { shortId },
      data: {
        ...data,
        passwordHash,
      },
    });

    res.json({
      ...updatedRoom,
      passwordHash: undefined,
    });
  } catch (err) {
    console.error("Error updating room:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

roomsRouter.post("/:shortId/participants", async (req, res) => {
  try {
    const parsedParams = ShortIdSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return res.status(400).json({ error: "Invalid shortId" });
    }

    const parsedBody = AddParticipantsSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({
        error: "Invalid request body",
        details: parsedBody.error.issues,
      });
    }

    const { shortId } = parsedParams.data;
    const { userIds } = parsedBody.data;

    const room = await db.room.findUnique({
      where: { shortId },
      select: { id: true },
    });

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    const created = await db.allowedParticipant.createMany({
      data: userIds.map((uid) => ({
        roomId: room.id,
        userId: typeof uid === "string" ? parseInt(uid, 10) : uid,
      })),
      skipDuplicates: true,
    });

    res.json({ added: created.count });
  } catch (err) {
    console.error("Error adding participants:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
