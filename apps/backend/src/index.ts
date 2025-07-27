import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { AccessToken } from "livekit-server-sdk";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

const API_KEY = process.env.LIVEKIT_API_KEY!;
const API_SECRET = process.env.LIVEKIT_API_SECRET!;

// ✅ Разрешаем CORS всем (для разработки — норм)
app.use(cors());

app.get("/token", async (req, res) => {
  const { room, name } = req.query;

  if (!room || !name) {
    return res.status(400).json({ error: "Missing room or name" });
  }

  const at = new AccessToken(API_KEY, API_SECRET, {
    identity: String(name),
  });

  at.addGrant({ roomJoin: true, room: String(room) });

  try {
    const token = await at.toJwt();
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate token" });
  }
});

app.listen(port, () => {
  console.log(`✅ Token server running on http://localhost:${port}`);
});
