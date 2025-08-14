import { Router } from "express";
import fetch from "node-fetch";

export const authRouter = Router();

authRouter.get("/check", async (req, res) => {
  const PROXY_ROUTE = process.env.PROXY_ROUTE!;
  const cookieHeader = req.headers.cookie || "";
  const token = cookieHeader
    .split("; ")
    .find((c) => c.startsWith("auth-token="))
    ?.split("=")[1];

  if (!token) {
    return res.status(401).json({ error: "No auth token found" });
  }

  try {
    const response = await fetch(PROXY_ROUTE, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error("❌ Failed to verify token:", error);
    res.status(500).json({ error: "Failed to verify token" });
  }
});
