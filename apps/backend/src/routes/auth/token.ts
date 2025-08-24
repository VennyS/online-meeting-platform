import { Router } from "express";
import fetch from "node-fetch";
import { db } from "../../db/client.js";
import { createLivekitToken } from "../../services/livekit.js";
import { LivekitTokenQuerySchema } from "../../schemas/auth.schema.js";
import { extractAuthToken } from "../../utils/auth.js";
import bcrypt from "bcrypt";

export const livekitRouter = Router();
const PROXY_ROUTE = process.env.PROXY_ROUTE!;

livekitRouter.get("/token", async (req, res) => {
  try {
    const parsed = LivekitTokenQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid query params", details: parsed.error.issues });
    }

    const {
      room: roomShortId,
      name,
      password,
      userId: optionalUserId,
    } = parsed.data;

    const room = await db.room.findUnique({
      where: { shortId: roomShortId },
    });
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Получаем информацию о пользователе из токена
    const authToken = extractAuthToken(req.headers.cookie);
    const tokenPayload = authToken
      ? extractAuthToken(req.headers.cookie)
      : null;
    const userId = tokenPayload?.id ? tokenPayload.id : optionalUserId;

    // Проверяем, является ли пользователь владельцем комнаты
    const isOwner = userId ? room.ownerId === userId : false;

    // Если пользователь НЕ владелец, проверяем пароль
    if (room.passwordHash && !isOwner) {
      if (!password) {
        return res.status(401).json({ error: "Password required" });
      }

      const isPasswordValid = await bcrypt.compare(password, room.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid password" });
      }
    }

    let isGuest = false;

    if (!room.isPublic) {
      if (!authToken) {
        return res.status(401).json({ error: "No auth token found" });
      }

      const proxyResponse = await fetch(PROXY_ROUTE, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!proxyResponse.ok) {
        return res
          .status(proxyResponse.status)
          .json(await proxyResponse.json());
      }
    } else {
      // Публичная комната → гость, если нет токена
      isGuest = !authToken;
    }

    // Для владельца устанавливаем роль owner
    const role = isOwner ? "owner" : isGuest ? "guest" : "member";

    const livekitToken = await createLivekitToken(
      room.shortId,
      String(userId),
      name,
      isGuest,
      role
    );

    res.json({
      token: livekitToken,
      metadata: {
        isOwner,
        isGuest,
        role,
      },
    });
  } catch (err) {
    console.error("❌ Error generating LiveKit token:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
