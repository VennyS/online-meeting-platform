import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth/check.js";
import { livekitRouter } from "./routes/auth/token.js";
import { roomsRouter } from "./routes/room.js";

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

// Запуск
app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});
