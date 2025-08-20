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

    const { room: roomShortId, name, password } = parsed.data;

    const room = await db.room.findUnique({
      where: { shortId: roomShortId },
    });
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    if (room.passwordHash) {
      if (!password) {
        return res.status(401).json({ error: "Password required" });
      }

      const isPasswordValid = await bcrypt.compare(password, room.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid password" });
      }
    }

    let isGuest = false;
    const authToken = extractAuthToken(req.headers.cookie);

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

    const livekitToken = await createLivekitToken(room.shortId, name, isGuest);
    res.json({ token: livekitToken });
  } catch (err) {
    console.error("❌ Error generating LiveKit token:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
