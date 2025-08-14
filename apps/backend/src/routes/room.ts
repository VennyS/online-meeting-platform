import { Router } from "express";
import { db } from "../db/client.js";

export const roomsRouter = Router();

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

  const { isPublic } = req.body;
  const room = await db.room.create({
    data: { shortId, isPublic: !!isPublic, ownerId },
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
