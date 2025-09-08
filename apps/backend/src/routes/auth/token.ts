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

    const room = await db.room.findUnique({ where: { shortId: roomShortId } });
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Получаем userId и токен
    const authResult = extractAuthToken(req.headers.cookie);
    const authToken = authResult?.token;
    const payload = authResult?.payload;
    const userId = payload?.id ?? optionalUserId;

    // Проверка через прокси для авторизации, если комната не публичная
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
    }

    const isOwner = userId ? room.ownerId === userId : false;

    // Проверка пароля для владельцев
    if (room.passwordHash && !isOwner) {
      if (!password) {
        return res.status(401).json({ error: "Password required" });
      }
      const isPasswordValid = await bcrypt.compare(password, room.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid password" });
      }
    }

    // Проверка таблицы разрешённых участников
    if (!room.isPublic && !isOwner) {
      const numericUserId = Number(userId);

      if (!numericUserId) {
        return res.status(401).json({ error: "Invalid user ID" });
      }

      const allowed = await db.allowedParticipant.findFirst({
        where: { roomId: room.id, userId: numericUserId },
      });
      if (!allowed) {
        return res
          .status(403)
          .json({ error: "Forbidden: not allowed in this room" });
      }
    }

    const role = isOwner ? "owner" : "member";
    const isGuest = !authToken && room.isPublic;

    const livekitToken = await createLivekitToken(
      room.shortId,
      String(userId),
      name,
      isGuest,
      role
    );

    res.json({
      token: livekitToken,
      metadata: { isOwner, isGuest, role, name: room.name },
    });
  } catch (err) {
    console.error("❌ Error generating LiveKit token:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
