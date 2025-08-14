import { Router } from "express";
import fetch from "node-fetch";
import { db } from "../../db/client.js";
import { createLivekitToken } from "../../services/livekit.js";

const PROXY_ROUTE = process.env.PROXY_ROUTE!;

export const livekitRouter = Router();

livekitRouter.get("/token", async (req, res) => {
  const { room: roomShortId, name } = req.query;

  if (!roomShortId || !name) {
    return res.status(400).json({ error: "Missing room or name" });
  }

  const room = await db.room.findUnique({
    where: { shortId: String(roomShortId) },
  });
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  let isGuest = false;

  if (!room.isPublic) {
    const cookieHeader = req.headers.cookie || "";
    const authToken = cookieHeader
      .split("; ")
      .find((c) => c.startsWith("auth-token="))
      ?.split("=")[1];

    if (!authToken) {
      return res.status(401).json({ error: "No auth token found" });
    }

    const proxyResponse = await fetch(PROXY_ROUTE, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (!proxyResponse.ok) {
      return res.status(proxyResponse.status).json(await proxyResponse.json());
    }
  } else {
    // Если комната публичная и нет authToken, пользователь — гость
    const cookieHeader = req.headers.cookie || "";
    const authToken = cookieHeader
      .split("; ")
      .find((c) => c.startsWith("auth-token="))
      ?.split("=")[1];
    isGuest = !authToken;
  }

  const livekitToken = await createLivekitToken(
    room.shortId,
    String(name),
    isGuest
  );
  res.json({ token: livekitToken });
});
