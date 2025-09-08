import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth/check.js";
import { livekitRouter } from "./routes/auth/token.js";
import { roomsRouter } from "./routes/room.js";
import { createServer } from "http";
import { createWaitingWebSocketServer } from "./ws/server.js";

dotenv.config();
const app = express();
const port = process.env.PORT || 3001;

const ORIGIN = process.env.ORIGIN!;
console.log("🔧 Config:");
console.log("  ORIGIN:", ORIGIN);

app.use(
  cors({
    origin: ORIGIN,
    credentials: true,
  })
);

app.use(express.json());

// Подключаем роуты
app.use("/auth", authRouter); // /auth/check
app.use("/auth", livekitRouter); // /auth/token
app.use("/room", roomsRouter); // /room/*

const server = createServer(app);

createWaitingWebSocketServer(server);

// Запуск
server.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});
