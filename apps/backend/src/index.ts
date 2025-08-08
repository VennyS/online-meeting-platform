import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { AccessToken } from "livekit-server-sdk";
import fetch from "node-fetch";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

const API_KEY = process.env.LIVEKIT_API_KEY!;
const API_SECRET = process.env.LIVEKIT_API_SECRET!;

app.use(
  cors({
    origin: "https://meet.noimann.academy",
    credentials: true,
  })
);

// 🔑 Token
app.get("/auth/token", async (req, res) => {
  const { room, name } = req.query;

  if (!room || !name) {
    return res.status(400).json({ error: "Missing room or name" });
  }

  try {
    const at = new AccessToken(API_KEY, API_SECRET, {
      identity: String(name),
    });

    at.addGrant({ roomJoin: true, room: String(room) });

    const token = await at.toJwt();
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate token" });
  }
});

// 🔁 Proxy auth check
app.get("/auth/check", async (req, res) => {
  const cookieHeader = req.headers.cookie || "";

  const token = cookieHeader
    .split("; ")
    .find((c) => c.startsWith("auth-token="))
    ?.split("=")[1];

  if (!token) {
    return res.status(401).json({ error: "No auth token found" });
  }

  try {
    const response = await fetch("https://ru.noimann.academy/api/auth/check", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to verify token" });
  }
});

app.listen(port, () => {
  console.log(`✅ Token server running on http://localhost:${port}`);
});
