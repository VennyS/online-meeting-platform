import { WebSocketServer, WebSocket } from "ws";
import { Redis } from "ioredis";
import { createLivekitToken } from "../services/livekit.js";

const redis = new Redis(process.env.REDIS_URL!);

interface UserConnection {
  ws: WebSocket;
  isHost: boolean;
  roomId: string;
  userId: string;
}

export function createWaitingWebSocketServer(server: any) {
  const wss = new WebSocketServer({ server });

  // roomId -> Map<userId, UserConnection>
  const connections = new Map<string, Map<string, UserConnection>>();

  wss.on("connection", (ws, request) => {
    console.log("🔗 New WS connection:", request.url);

    try {
      const url = new URL(request.url!, `http://${request.headers.host}`);
      const roomId = url.searchParams.get("roomId");
      const userId = url.searchParams.get("userId");
      const isHost = url.searchParams.get("isHost") === "true";

      if (!roomId || !userId) {
        ws.close(1008, "Need roomId and userId");
        return;
      }

      // Сохраняем подключение с информацией о хосте
      if (!connections.has(roomId)) {
        connections.set(roomId, new Map());
      }

      connections.get(roomId)!.set(userId, {
        ws,
        isHost,
        roomId,
        userId,
      });

      console.log(`✅ ${userId} joined room ${roomId} (host: ${isHost})`);

      // Если это хост - отправляем ему текущую очередь ожидания
      if (isHost) {
        sendWaitingQueueToHost(roomId, userId);
      }

      // Обработка сообщений
      ws.on("message", async (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log("📨 Received:", message);

          if (message.type === "guest_join_request") {
            await handleGuestJoinRequest(roomId, message, userId);
          }

          if (message.type === "host_approval") {
            await handleHostApproval(roomId, message);
          }
        } catch (error) {
          console.error("Error processing message:", error);
        }
      });

      ws.on("close", () => {
        connections.get(roomId)?.delete(userId);
        console.log(`❌ ${userId} left room ${roomId}`);
      });
    } catch (error) {
      console.error("Connection error:", error);
      ws.close(1011, "Server error");
    }
  });

  // Гость хочет присоединиться
  async function handleGuestJoinRequest(
    roomId: string,
    message: any,
    guestId: string
  ) {
    const guestInfo = {
      guestId,
      name: message.name,
      requestedAt: new Date().toISOString(),
    };

    await redis.rpush(`room:${roomId}:waiting`, JSON.stringify(guestInfo));
    notifyHostsAboutNewGuest(roomId, guestInfo);
    updateWaitingQueueForAllHosts(roomId);
  }

  // Хост одобряет/отклоняет гостя
  async function handleHostApproval(roomId: string, message: any) {
    const { guestId, approved, guestName } = message;

    const guestConn = connections.get(roomId)?.get(guestId);
    if (!guestConn || guestConn.ws.readyState !== WebSocket.OPEN) return;

    if (approved) {
      // Генерация настоящего LiveKit токена
      const token = await createLivekitToken(
        roomId, // название комнаты
        guestId, // уникальный идентификатор гостя
        true, // isGuest = true
        "guest" // роль
      );

      guestConn.ws.send(
        JSON.stringify({
          type: "guest_approved",
          token,
          roomId,
        })
      );
    } else {
      guestConn.ws.send(
        JSON.stringify({
          type: "guest_rejected",
          reason: "Host rejected your request",
        })
      );
    }

    await removeGuestFromWaiting(roomId, guestId);
    updateWaitingQueueForAllHosts(roomId);
  }

  // Уведомляем хостов о новом госте
  async function notifyHostsAboutNewGuest(roomId: string, guestInfo: any) {
    const roomConnections = connections.get(roomId);
    if (!roomConnections) return;

    for (const [userId, conn] of roomConnections.entries()) {
      if (conn.isHost && conn.ws.readyState === WebSocket.OPEN) {
        console.log(`📤 Notifying host ${userId} about new guest`);
        conn.ws.send(
          JSON.stringify({
            type: "new_guest_waiting",
            guest: guestInfo,
          })
        );
      }
    }
  }

  // Обновляем очередь у всех хостов
  async function updateWaitingQueueForAllHosts(roomId: string) {
    const roomConnections = connections.get(roomId);
    if (!roomConnections) return;

    const waitingList = await redis.lrange(`room:${roomId}:waiting`, 0, -1);
    const parsedWaitingList = waitingList.map((item) => JSON.parse(item));

    for (const [userId, conn] of roomConnections.entries()) {
      if (conn.isHost && conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.send(
          JSON.stringify({
            type: "waiting_queue_updated",
            guests: parsedWaitingList,
          })
        );
      }
    }
  }

  // Отправляем хосту текущую очередь
  async function sendWaitingQueueToHost(roomId: string, hostId: string) {
    const hostConn = connections.get(roomId)?.get(hostId);
    if (!hostConn) return;

    const waitingList = await redis.lrange(`room:${roomId}:waiting`, 0, -1);

    if (hostConn.ws.readyState === WebSocket.OPEN) {
      hostConn.ws.send(
        JSON.stringify({
          type: "waiting_queue",
          guests: waitingList.map((item) => JSON.parse(item)),
        })
      );
    }
  }

  // Удаляем гостя из очереди
  async function removeGuestFromWaiting(roomId: string, guestId: string) {
    const waitingList = await redis.lrange(`room:${roomId}:waiting`, 0, -1);
    const updatedList = waitingList.filter((item) => {
      const guest = JSON.parse(item);
      return guest.guestId !== guestId;
    });

    await redis.del(`room:${roomId}:waiting`);
    for (const guest of updatedList) {
      await redis.rpush(`room:${roomId}:waiting`, guest);
    }
  }

  console.log("🚀 Waiting Room WebSocket server ready");
  return wss;
}
