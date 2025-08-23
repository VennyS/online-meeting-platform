import { WebSocketServer, WebSocket } from "ws";
import { Redis } from "ioredis";
import { createLivekitToken } from "../services/livekit.js";
import { db } from "../db/client.js";

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

  wss.on("connection", async (ws, request) => {
    console.log("🔗 New WS connection:", request.url);

    try {
      const url = new URL(request.url!, `http://${request.headers.host}`);
      const roomId = url.searchParams.get("roomId");
      const userId = url.searchParams.get("userId");

      if (!roomId || !userId) {
        ws.close(1008, "Need roomId and userId");
        return;
      }

      const room = await db.room.findUnique({
        where: { shortId: roomId },
        select: { ownerId: true },
      });

      const isHost = room?.ownerId.toString() === userId;

      if (!connections.has(roomId)) {
        connections.set(roomId, new Map());
      }
      connections.get(roomId)!.set(userId, {
        ws,
        isHost,
        roomId,
        userId,
      });

      console.log(`✅ ${userId} joined room ${roomId}`);

      ws.send(
        JSON.stringify({
          type: "init",
          role: isHost ? "owner" : "participant",
        })
      );

      if (isHost) {
        sendWaitingQueueToHost(roomId, userId);
      }

      // присвоим дефолтную роль (если не задана)
      setDefaultRole(roomId, userId, isHost ? "owner" : "participant");

      ws.on("message", async (data) => {
        try {
          const message = JSON.parse(data.toString());

          switch (message.type) {
            case "guest_join_request":
              await handleGuestJoinRequest(roomId, message, userId);
              break;
            case "host_approval":
              await handleHostApproval(roomId, message);
              break;
            case "update_permission":
              if (!(await isOwnerOrAdmin(roomId, userId))) return;
              await handlePermissionUpdate(roomId, message);
              break;
            case "update_role":
              if (!(await isOwnerOrAdmin(roomId, userId))) return;
              await handleRoleUpdate(roomId, message);
              break;
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

  async function isOwnerOrAdmin(
    roomId: string,
    userId: string
  ): Promise<boolean> {
    const role = await redis.hget(`room:${roomId}:roles`, userId);
    return role === "owner" || role === "admin";
  }

  async function setDefaultRole(roomId: string, userId: string, role: string) {
    const key = `room:${roomId}:roles`;
    const existing = await redis.hget(key, userId);
    if (!existing) {
      await redis.hset(key, userId, role);
      broadcast(roomId, {
        type: "role_updated",
        userId,
        role,
      });
    }
  }

  async function handleRoleUpdate(roomId: string, message: any) {
    const { targetUserId, newRole } = message;
    const key = `room:${roomId}:roles`;
    await redis.hset(key, targetUserId, newRole);

    broadcast(roomId, {
      type: "role_updated",
      userId: targetUserId,
      role: newRole,
    });
  }

  async function handlePermissionUpdate(roomId: string, message: any) {
    const { targetRole, permission, value } = message;

    // Читаем текущие права из Redis
    const key = `room:${roomId}:permissions`;
    let permissions: any = {};
    const stored = await redis.get(key);
    if (stored) {
      permissions = JSON.parse(stored);
    }

    // Обновляем
    if (!permissions[targetRole]) {
      permissions[targetRole] = {};
    }
    permissions[targetRole][permission] = value;

    // Сохраняем
    await redis.set(key, JSON.stringify(permissions));

    // Шлем всем участникам
    broadcast(roomId, {
      type: "permissions_updated",
      role: targetRole,
      permissions: permissions[targetRole],
    });
  }

  // === Хелперы ===
  function broadcast(roomId: string, msg: any) {
    const roomConnections = connections.get(roomId);
    if (!roomConnections) return;

    const json = JSON.stringify(msg);
    for (const conn of roomConnections.values()) {
      if (conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.send(json);
      }
    }
  }

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
