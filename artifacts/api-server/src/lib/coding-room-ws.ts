import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { Server } from "http";
import { verifySession } from "./session";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

export type RoomRole = "host" | "member";

export type WsClient = {
  ws: WebSocket;
  userId: number;
  username: string;
  roomId: number;
  role: RoomRole;
  color: string;
  canWrite: boolean;
  canRun: boolean;
  micEnabled: boolean;
  isOnline: boolean;
  status: "waiting" | "joined";
};

const CURSOR_COLORS = [
  "#F59E0B", "#10B981", "#3B82F6", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
  "#14B8A6", "#F43F5E", "#A855F7", "#0EA5E9", "#22C55E",
];

const rooms = new Map<number, Set<WsClient>>();
const userColorMap = new Map<string, string>();
const roomClosingTimers = new Map<number, ReturnType<typeof setTimeout>>();

function getRoomClients(roomId: number): Set<WsClient> {
  if (!rooms.has(roomId)) rooms.set(roomId, new Set());
  return rooms.get(roomId)!;
}

function assignColor(roomId: number, userId: number): string {
  const key = `${roomId}:${userId}`;
  if (userColorMap.has(key)) return userColorMap.get(key)!;
  const clients = getRoomClients(roomId);
  const usedColors = new Set([...clients].map((c) => c.color));
  const available = CURSOR_COLORS.find((c) => !usedColors.has(c));
  const color = available ?? CURSOR_COLORS[userId % CURSOR_COLORS.length];
  userColorMap.set(key, color);
  return color;
}

function broadcast(roomId: number, msg: object, excludeUserId?: number) {
  const clients = getRoomClients(roomId);
  const data = JSON.stringify(msg);
  for (const client of clients) {
    if (excludeUserId !== undefined && client.userId === excludeUserId) continue;
    if (client.status !== "joined") continue;
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  }
}

function broadcastAll(roomId: number, msg: object) {
  const clients = getRoomClients(roomId);
  const data = JSON.stringify(msg);
  for (const client of clients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  }
}

function broadcastJoined(roomId: number, msg: object) {
  const clients = getRoomClients(roomId);
  const data = JSON.stringify(msg);
  for (const client of clients) {
    if (client.status !== "joined") continue;
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  }
}

function sendTo(client: WsClient, msg: object) {
  if (client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(msg));
  }
}

function getRoomMemberList(roomId: number) {
  return [...getRoomClients(roomId)]
    .filter((c) => c.status === "joined")
    .map((c) => ({
      userId: c.userId,
      username: c.username,
      color: c.color,
      role: c.role,
      canWrite: c.canWrite,
      canRun: c.canRun,
      micEnabled: c.micEnabled,
      isOnline: c.isOnline,
    }));
}

function getWaitingList(roomId: number) {
  return [...getRoomClients(roomId)]
    .filter((c) => c.status === "waiting")
    .map((c) => ({
      userId: c.userId,
      username: c.username,
      color: c.color,
    }));
}

function sendToHost(roomId: number, msg: object) {
  const data = JSON.stringify(msg);
  for (const c of getRoomClients(roomId)) {
    if (c.role === "host" && c.status === "joined" && c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(data);
    }
  }
}

async function getRoomFromDb(roomId: number) {
  const rows = await db.execute(
    sql`SELECT id, host_user_id, invite_type, status FROM coding_rooms WHERE id = ${roomId} LIMIT 1`
  );
  return rows.rows[0] as { id: number; host_user_id: number; invite_type: string; status: string } | undefined;
}

async function getMemberFromDb(roomId: number, userId: number) {
  const rows = await db.execute(
    sql`SELECT user_id, role, can_write, can_run, status FROM coding_room_members
        WHERE room_id = ${roomId} AND user_id = ${userId} LIMIT 1`
  );
  return rows.rows[0] as {
    user_id: number; role: string; can_write: boolean; can_run: boolean; status: string;
  } | undefined;
}

async function updateMemberStatus(roomId: number, userId: number, status: string) {
  await db.execute(
    sql`UPDATE coding_room_members SET status = ${status}, updated_at = NOW()
        WHERE room_id = ${roomId} AND user_id = ${userId}`
  );
}

async function getUserName(userId: number): Promise<string> {
  const rows = await db.execute(
    sql`SELECT display_name FROM users WHERE id = ${userId} LIMIT 1`
  );
  const row = rows.rows[0] as { display_name?: string } | undefined;
  return row?.display_name ?? "طالب";
}

async function handleMessage(client: WsClient, raw: string) {
  let msg: any;
  try { msg = JSON.parse(raw); } catch { return; }

  const { type } = msg;

  switch (type) {
    case "cursor_move": {
      broadcast(client.roomId, {
        type: "cursor_move",
        userId: client.userId,
        color: client.color,
        file: msg.file,
        line: msg.line,
        column: msg.column,
      }, client.userId);
      break;
    }

    case "code_change": {
      if (!client.canWrite && client.role !== "host") {
        sendTo(client, { type: "error", message: "ليس لديك إذن الكتابة" });
        return;
      }
      const fullContent = msg.fullContent ?? "";
      broadcast(client.roomId, {
        type: "code_change",
        userId: client.userId,
        file: msg.file,
        fullContent,
      }, client.userId);
      if (msg.file) {
        await db.execute(
          sql`UPDATE coding_room_files
              SET content = ${fullContent}, updated_at = NOW()
              WHERE room_id = ${client.roomId} AND file_path = ${msg.file}`
        );
      }
      break;
    }

    case "line_lock": {
      if (!client.canWrite && client.role !== "host") return;
      broadcast(client.roomId, {
        type: "line_lock",
        userId: client.userId,
        color: client.color,
        file: msg.file,
        line: msg.line,
        locked: msg.locked,
      }, client.userId);
      break;
    }

    case "file_created": {
      if (!client.canWrite && client.role !== "host") {
        sendTo(client, { type: "error", message: "ليس لديك إذن إنشاء ملفات" });
        return;
      }
      const filePath = (msg.filePath ?? "").trim();
      if (!filePath) return;
      await db.execute(
        sql`INSERT INTO coding_room_files (room_id, file_path, content, created_by_user_id)
            VALUES (${client.roomId}, ${filePath}, ${msg.content ?? ""}, ${client.userId})
            ON CONFLICT (room_id, file_path) DO NOTHING`
      );
      broadcastJoined(client.roomId, {
        type: "file_created",
        userId: client.userId,
        username: client.username,
        filePath,
        content: msg.content ?? "",
      });
      break;
    }

    case "file_deleted": {
      const filePath = msg.filePath;
      if (!filePath) return;
      if (client.role !== "host") {
        broadcast(client.roomId, {
          type: "file_delete_request",
          userId: client.userId,
          username: client.username,
          filePath,
        }, client.userId);
        return;
      }
      await db.execute(
        sql`DELETE FROM coding_room_files
            WHERE room_id = ${client.roomId} AND file_path = ${filePath}`
      );
      broadcastJoined(client.roomId, {
        type: "file_deleted",
        filePath,
        deletedBy: client.userId,
      });
      break;
    }

    case "file_delete_approve": {
      if (client.role !== "host") return;
      const filePath = msg.filePath;
      if (!filePath) return;
      await db.execute(
        sql`DELETE FROM coding_room_files
            WHERE room_id = ${client.roomId} AND file_path = ${filePath}`
      );
      broadcastJoined(client.roomId, {
        type: "file_deleted",
        filePath,
        deletedBy: msg.requestUserId ?? client.userId,
      });
      break;
    }

    case "run_output": {
      if (!client.canRun && client.role !== "host") return;
      broadcastJoined(client.roomId, {
        type: "run_output",
        triggeredBy: client.userId,
        triggeredByName: client.username,
        output: msg.output ?? "",
        language: msg.language ?? "",
        timestamp: new Date().toISOString(),
      });
      break;
    }

    case "run_code": {
      sendToHost(client.roomId, {
        type: "run_request",
        userId: client.userId,
        username: client.username,
      });
      break;
    }

    case "permission_change": {
      if (client.role !== "host") return;
      const { targetUserId } = msg;
      if (!targetUserId) return;

      const existing = await db.execute(
        sql`SELECT can_write, can_run FROM coding_room_members
            WHERE room_id = ${client.roomId} AND user_id = ${targetUserId} LIMIT 1`
      );
      const cur = existing.rows[0] as { can_write: boolean; can_run: boolean } | undefined;
      if (!cur) return;

      const newCanWrite = msg.canWrite !== undefined ? msg.canWrite : cur.can_write;
      const newCanRun = msg.canRun !== undefined ? msg.canRun : cur.can_run;

      await db.execute(
        sql`UPDATE coding_room_members
            SET can_write = ${newCanWrite}, can_run = ${newCanRun}, updated_at = NOW()
            WHERE room_id = ${client.roomId} AND user_id = ${targetUserId}`
      );

      const target = [...getRoomClients(client.roomId)].find((c) => c.userId === targetUserId);
      if (target) {
        target.canWrite = newCanWrite;
        target.canRun = newCanRun;
      }

      broadcastJoined(client.roomId, {
        type: "permission_changed",
        targetUserId,
        canWrite: newCanWrite,
        canRun: newCanRun,
        members: getRoomMemberList(client.roomId),
      });
      break;
    }

    case "kick_member": {
      if (client.role !== "host") return;
      const { targetUserId: kickId } = msg;
      if (!kickId) return;
      const kickTarget = [...getRoomClients(client.roomId)].find((c) => c.userId === kickId);
      if (kickTarget) {
        kickTarget.isOnline = false;
        getRoomClients(client.roomId).delete(kickTarget);
        sendTo(kickTarget, { type: "kicked", message: "تم طردك من الغرفة من قِبل المشرف" });
        kickTarget.ws.close();
      }
      await db.execute(
        sql`UPDATE coding_room_members SET status = 'kicked', updated_at = NOW()
            WHERE room_id = ${client.roomId} AND user_id = ${kickId}`
      );
      broadcastJoined(client.roomId, {
        type: "member_left",
        userId: kickId,
        reason: "kicked",
        members: getRoomMemberList(client.roomId),
      });
      break;
    }

    case "admit_member": {
      if (client.role !== "host") return;
      const admitId = msg.targetUserId;
      if (!admitId) return;
      await db.execute(
        sql`UPDATE coding_room_members SET status = 'joined', updated_at = NOW()
            WHERE room_id = ${client.roomId} AND user_id = ${admitId}`
      );
      const admitTarget = [...getRoomClients(client.roomId)].find((c) => c.userId === admitId);
      if (admitTarget) {
        admitTarget.status = "joined";
        admitTarget.canWrite = false;
        admitTarget.canRun = false;
        const files = await db.execute(
          sql`SELECT file_path, content, language FROM coding_room_files
              WHERE room_id = ${client.roomId} ORDER BY created_at ASC`
        );
        sendTo(admitTarget, {
          type: "room_state",
          roomId: client.roomId,
          role: admitTarget.role,
          color: admitTarget.color,
          canWrite: false,
          canRun: false,
          members: getRoomMemberList(client.roomId),
          pending: [],
          files: files.rows,
        });
      }
      broadcastJoined(client.roomId, {
        type: "member_joined",
        userId: admitId,
        username: admitTarget?.username ?? "طالب",
        color: admitTarget?.color ?? "#94A3B8",
        role: "member",
        canWrite: false,
        canRun: false,
        micEnabled: false,
        members: getRoomMemberList(client.roomId),
      });
      break;
    }

    case "reject_member": {
      if (client.role !== "host") return;
      const rejectedId = msg.targetUserId;
      if (!rejectedId) return;
      await db.execute(
        sql`UPDATE coding_room_members SET status = 'rejected', updated_at = NOW()
            WHERE room_id = ${client.roomId} AND user_id = ${rejectedId}`
      );
      const rejected = [...getRoomClients(client.roomId)].find((c) => c.userId === rejectedId);
      if (rejected) {
        sendTo(rejected, { type: "rejected", message: "رفض المشرف طلب دخولك" });
        rejected.ws.close();
      }
      break;
    }

    case "chat_message": {
      const text = (msg.text ?? "").slice(0, 500).trim();
      if (!text) return;
      broadcastJoined(client.roomId, {
        type: "chat_message",
        userId: client.userId,
        username: client.username,
        color: client.color,
        text,
        timestamp: new Date().toISOString(),
      });
      break;
    }

    case "mic_state": {
      client.micEnabled = !!msg.enabled;
      broadcastJoined(client.roomId, {
        type: "mic_state",
        userId: client.userId,
        enabled: client.micEnabled,
      });
      break;
    }

    case "webrtc_signal": {
      const target = [...getRoomClients(client.roomId)].find((c) => c.userId === msg.targetUserId && c.status === "joined");
      if (target) {
        sendTo(target, {
          type: "webrtc_signal",
          fromUserId: client.userId,
          signal: msg.signal,
        });
      }
      break;
    }

    case "room_closing": {
      if (client.role !== "host") return;
      if (roomClosingTimers.has(client.roomId)) return;
      broadcastAll(client.roomId, {
        type: "room_closing",
        countdown: 30,
      });
      const closingTimer = setTimeout(async () => {
        roomClosingTimers.delete(client.roomId);
        broadcastAll(client.roomId, { type: "room_closed" });
        await db.execute(
          sql`UPDATE coding_rooms SET status = 'closed', closed_at = NOW(), updated_at = NOW()
              WHERE id = ${client.roomId}`
        );
        rooms.delete(client.roomId);
        userColorMap.forEach((_, key) => {
          if (key.startsWith(`${client.roomId}:`)) userColorMap.delete(key);
        });
      }, 30_000);
      roomClosingTimers.set(client.roomId, closingTimer);
      break;
    }

    case "transfer_host": {
      if (client.role !== "host") return;
      const newHostId = msg.targetUserId;
      if (!newHostId) return;
      await db.execute(
        sql`UPDATE coding_rooms SET host_user_id = ${newHostId}, updated_at = NOW()
            WHERE id = ${client.roomId}`
      );
      await db.execute(
        sql`UPDATE coding_room_members SET role = 'host', can_write = true, can_run = true, updated_at = NOW()
            WHERE room_id = ${client.roomId} AND user_id = ${newHostId}`
      );
      await db.execute(
        sql`UPDATE coding_room_members SET role = 'member', can_write = false, can_run = false, updated_at = NOW()
            WHERE room_id = ${client.roomId} AND user_id = ${client.userId}`
      );
      client.role = "member";
      client.canWrite = false;
      client.canRun = false;
      const newHost = [...getRoomClients(client.roomId)].find((c) => c.userId === newHostId);
      if (newHost) {
        newHost.role = "host";
        newHost.canWrite = true;
        newHost.canRun = true;
        sendTo(newHost, { type: "you_are_host", message: "أنت الآن مشرف الغرفة" });
      }
      broadcastJoined(client.roomId, {
        type: "host_changed",
        newHostUserId: newHostId,
        members: getRoomMemberList(client.roomId),
      });
      break;
    }

    default:
      break;
  }
}

async function handleDisconnect(client: WsClient) {
  const clients = getRoomClients(client.roomId);
  const wasInRoom = clients.has(client);
  clients.delete(client);

  if (!wasInRoom) return;

  if (client.status === "waiting") {
    sendToHost(client.roomId, {
      type: "join_request_cancelled",
      userId: client.userId,
    });
    return;
  }

  if (client.isOnline) {
    await updateMemberStatus(client.roomId, client.userId, "left").catch(() => {});
  }

  const remaining = [...clients].filter((c) => c.isOnline && c.status === "joined");
  if (remaining.length === 0) {
    if (roomClosingTimers.has(client.roomId)) {
      clearTimeout(roomClosingTimers.get(client.roomId)!);
      roomClosingTimers.delete(client.roomId);
    }
    for (const stray of clients) {
      sendTo(stray, { type: "room_closed" });
      if (stray.ws.readyState === WebSocket.OPEN) stray.ws.close();
    }
    rooms.delete(client.roomId);
    userColorMap.forEach((_, key) => {
      if (key.startsWith(`${client.roomId}:`)) userColorMap.delete(key);
    });
    return;
  }

  if (client.role === "host") {
    const longestWriter = remaining.filter((c) => c.canWrite).sort((a, b) => a.userId - b.userId)[0];
    const newHost = longestWriter ?? remaining[0];
    newHost.role = "host";
    newHost.canWrite = true;
    newHost.canRun = true;
    await db.execute(
      sql`UPDATE coding_rooms SET host_user_id = ${newHost.userId}, updated_at = NOW()
          WHERE id = ${client.roomId}`
    ).catch(() => {});
    await db.execute(
      sql`UPDATE coding_room_members SET role = 'host', can_write = true, can_run = true, updated_at = NOW()
          WHERE room_id = ${client.roomId} AND user_id = ${newHost.userId}`
    ).catch(() => {});
    await db.execute(
      sql`UPDATE coding_room_members SET role = 'member', can_write = false, can_run = false, updated_at = NOW()
          WHERE room_id = ${client.roomId} AND user_id = ${client.userId} AND user_id <> ${newHost.userId}`
    ).catch(() => {});
    client.role = "member";
    client.canWrite = false;
    client.canRun = false;
    sendTo(newHost, { type: "you_are_host", message: "أنت الآن مشرف الغرفة" });
    broadcastJoined(client.roomId, {
      type: "host_changed",
      newHostUserId: newHost.userId,
      members: getRoomMemberList(client.roomId),
    });
  } else {
    broadcastJoined(client.roomId, {
      type: "member_left",
      userId: client.userId,
      reason: "disconnect",
      members: getRoomMemberList(client.roomId),
    });
  }
}

function wireClientSocket(client: WsClient) {
  client.ws.on("message", (data: Buffer) => {
    if (client.status !== "joined") return;
    handleMessage(client, data.toString()).catch((err) => {
      logger.error({ err: err?.message }, "ws:room: message handler error");
    });
  });

  client.ws.on("close", () => {
    client.isOnline = false;
    handleDisconnect(client).catch((err) => {
      logger.error({ err: err?.message }, "ws:room: disconnect handler error");
    });
  });

  client.ws.on("error", (err) => {
    logger.error({ err: err?.message }, "ws:room: socket error");
  });
}

function isAllowedOrigin(request: IncomingMessage): boolean {
  const origin = request.headers.origin;
  if (!origin) return true;
  let originHost = "";
  try { originHost = new URL(origin).host.toLowerCase(); } catch { return false; }
  if (!originHost) return false;

  const reqHost = (request.headers.host ?? "").toLowerCase();
  if (originHost === reqHost) return true;

  const prodAllowed = new Set<string>(["learnukhba.com", "www.learnukhba.com"]);
  if (prodAllowed.has(originHost)) return true;

  const devDomain = process.env.REPLIT_DEV_DOMAIN?.toLowerCase();
  if (devDomain && originHost === devDomain) return true;

  const isProd = process.env.NODE_ENV === "production";
  if (!isProd && (
    originHost === "localhost" ||
    originHost.startsWith("localhost:") ||
    originHost.startsWith("127.0.0.1") ||
    originHost.endsWith(".replit.dev") ||
    originHost.endsWith(".repl.co") ||
    originHost.endsWith(".replit.app") ||
    originHost.endsWith(".worf.replit.dev")
  )) return true;

  return false;
}

export function initCodingRoomWss(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request: IncomingMessage, socket: any, head: Buffer) => {
    const url = new URL(request.url ?? "", `http://${request.headers.host}`);
    if (!url.pathname.startsWith("/ws/room/")) {
      socket.destroy();
      return;
    }

    const roomIdStr = url.pathname.split("/ws/room/")[1];
    const roomId = parseInt(roomIdStr ?? "", 10);
    if (isNaN(roomId)) {
      socket.destroy();
      return;
    }

    if (!isAllowedOrigin(request)) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }

    const cookieHeader = request.headers.cookie ?? "";
    const sessionMatch = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/);
    const sessionToken = sessionMatch?.[1];
    const session = sessionToken ? verifySession(decodeURIComponent(sessionToken)) : null;

    if (!session?.userId) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, async (ws) => {
      try {
        const userId = session.userId as number;

        const room = await getRoomFromDb(roomId);
        if (!room || room.status === "closed") {
          ws.send(JSON.stringify({ type: "rejected", message: "الغرفة غير موجودة أو مغلقة" }));
          ws.close(1008, "الغرفة غير موجودة أو مغلقة");
          return;
        }

        let member = await getMemberFromDb(roomId, userId);

        if (!member) {
          if (room.invite_type === "public") {
            await db.execute(
              sql`INSERT INTO coding_room_members (room_id, user_id, role, can_write, can_run, status)
                  VALUES (${roomId}, ${userId}, 'member', false, false, 'joined')
                  ON CONFLICT (room_id, user_id) DO UPDATE SET status = 'joined', updated_at = NOW()`
            );
            member = await getMemberFromDb(roomId, userId);
          } else {
            ws.send(JSON.stringify({ type: "rejected", message: "لم تتلقَّ دعوة لهذه الغرفة" }));
            ws.close(1008, "غير مدعو");
            return;
          }
        }

        if (!member) {
          ws.close(1011, "خطأ في الخادم");
          return;
        }

        if (member.status === "kicked") {
          ws.send(JSON.stringify({ type: "rejected", message: "تم طردك من هذه الغرفة" }));
          ws.close(1008, "مطرود");
          return;
        }

        if (member.status === "waiting") {
          ws.send(JSON.stringify({ type: "waiting_approval" }));

          const username = await getUserName(userId);
          const color = assignColor(roomId, userId);
          const waitingClient: WsClient = {
            ws, userId, username, roomId,
            role: "member", color,
            canWrite: false, canRun: false,
            micEnabled: false, isOnline: true,
            status: "waiting",
          };
          getRoomClients(roomId).add(waitingClient);

          sendToHost(roomId, {
            type: "join_request_pending",
            userId,
            username,
            color,
          });

          wireClientSocket(waitingClient);
          return;
        }

        const username = await getUserName(userId);
        const color = assignColor(roomId, userId);

        const isHost = member.role === "host" || userId === room.host_user_id;
        const client: WsClient = {
          ws, userId, username, roomId,
          role: isHost ? "host" : member.role as RoomRole,
          color,
          canWrite: isHost ? true : member.can_write,
          canRun: isHost ? true : member.can_run,
          micEnabled: false,
          isOnline: true,
          status: "joined",
        };

        getRoomClients(roomId).add(client);
        await updateMemberStatus(roomId, userId, "joined");

        const files = await db.execute(
          sql`SELECT file_path, content, language FROM coding_room_files
              WHERE room_id = ${roomId} ORDER BY created_at ASC`
        );

        sendTo(client, {
          type: "room_state",
          roomId,
          role: client.role,
          color,
          canWrite: client.canWrite,
          canRun: client.canRun,
          members: getRoomMemberList(roomId),
          pending: client.role === "host" ? getWaitingList(roomId) : [],
          files: files.rows,
        });

        broadcast(roomId, {
          type: "member_joined",
          userId,
          username,
          color,
          role: client.role,
          canWrite: client.canWrite,
          canRun: client.canRun,
          micEnabled: false,
          members: getRoomMemberList(roomId),
        }, userId);

        wireClientSocket(client);

      } catch (err: any) {
        logger.error({ err: err?.message }, "ws:room: upgrade handler error");
        ws.close(1011, "خطأ في الخادم");
      }
    });
  });

  logger.info("coding-room WebSocket server initialized");
  return wss;
}

export function getRoomOnlineCount(roomId: number): number {
  return [...getRoomClients(roomId)].filter((c) => c.isOnline && c.status === "joined").length;
}
