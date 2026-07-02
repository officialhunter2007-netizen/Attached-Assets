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
};

const CURSOR_COLORS = [
  "#F59E0B", "#10B981", "#3B82F6", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
  "#14B8A6", "#F43F5E", "#A855F7", "#0EA5E9", "#22C55E",
];

const rooms = new Map<number, Set<WsClient>>();
const userColorMap = new Map<string, string>();

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
  return [...getRoomClients(roomId)].map((c) => ({
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

async function getRoomFromDb(roomId: number) {
  const rows = await db.execute(
    sql`SELECT id, host_user_id, status FROM coding_rooms WHERE id = ${roomId} LIMIT 1`
  );
  return rows.rows[0] as { id: number; host_user_id: number; status: string } | undefined;
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
    sql`SELECT name FROM users WHERE id = ${userId} LIMIT 1`
  );
  const row = rows.rows[0] as { name?: string } | undefined;
  return row?.name ?? "طالب";
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
      if (!client.canWrite) {
        sendTo(client, { type: "error", message: "ليس لديك إذن الكتابة" });
        return;
      }
      broadcast(client.roomId, {
        type: "code_change",
        userId: client.userId,
        file: msg.file,
        changes: msg.changes,
      }, client.userId);
      await db.execute(
        sql`UPDATE coding_room_files
            SET content = ${msg.fullContent ?? ""}, updated_at = NOW()
            WHERE room_id = ${client.roomId} AND file_path = ${msg.file}`
      );
      break;
    }

    case "line_lock": {
      if (!client.canWrite) return;
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
      if (!client.canWrite) return;
      await db.execute(
        sql`INSERT INTO coding_room_files (room_id, file_path, content, created_by_user_id)
            VALUES (${client.roomId}, ${msg.filePath}, ${msg.content ?? ""}, ${client.userId})
            ON CONFLICT (room_id, file_path) DO NOTHING`
      );
      broadcast(client.roomId, {
        type: "file_created",
        userId: client.userId,
        username: client.username,
        filePath: msg.filePath,
        content: msg.content ?? "",
      }, client.userId);
      break;
    }

    case "file_deleted": {
      if (client.role !== "host") {
        broadcast(client.roomId, {
          type: "file_delete_request",
          userId: client.userId,
          username: client.username,
          filePath: msg.filePath,
        }, client.userId);
        return;
      }
      await db.execute(
        sql`DELETE FROM coding_room_files
            WHERE room_id = ${client.roomId} AND file_path = ${msg.filePath}`
      );
      broadcast(client.roomId, {
        type: "file_deleted",
        filePath: msg.filePath,
        deletedBy: client.userId,
      });
      break;
    }

    case "file_delete_approve": {
      if (client.role !== "host") return;
      await db.execute(
        sql`DELETE FROM coding_room_files
            WHERE room_id = ${client.roomId} AND file_path = ${msg.filePath}`
      );
      broadcast(client.roomId, {
        type: "file_deleted",
        filePath: msg.filePath,
        deletedBy: msg.requestUserId,
      });
      break;
    }

    case "run_code": {
      if (!client.canRun && client.role !== "host") {
        broadcast(client.roomId, {
          type: "run_request",
          userId: client.userId,
          username: client.username,
        }, client.userId);
        return;
      }
      broadcast(client.roomId, {
        type: "run_output",
        triggeredBy: client.userId,
        triggeredByName: client.username,
        output: msg.output,
        language: msg.language,
        timestamp: new Date().toISOString(),
      });
      break;
    }

    case "permission_change": {
      if (client.role !== "host") return;
      const { targetUserId, canWrite, canRun, micEnabled } = msg;
      await db.execute(
        sql`UPDATE coding_room_members
            SET can_write = ${canWrite ?? false},
                can_run = ${canRun ?? false},
                updated_at = NOW()
            WHERE room_id = ${client.roomId} AND user_id = ${targetUserId}`
      );
      const target = [...getRoomClients(client.roomId)].find(
        (c) => c.userId === targetUserId
      );
      if (target) {
        if (canWrite !== undefined) target.canWrite = canWrite;
        if (canRun !== undefined) target.canRun = canRun;
        if (micEnabled !== undefined) target.micEnabled = micEnabled;
      }
      broadcast(client.roomId, {
        type: "permission_changed",
        targetUserId,
        canWrite: canWrite ?? false,
        canRun: canRun ?? false,
        micEnabled: micEnabled ?? false,
        members: getRoomMemberList(client.roomId),
      });
      break;
    }

    case "kick_member": {
      if (client.role !== "host") return;
      const { targetUserId: kickId } = msg;
      const kickTarget = [...getRoomClients(client.roomId)].find(
        (c) => c.userId === kickId
      );
      if (kickTarget) {
        sendTo(kickTarget, { type: "kicked", message: "تم طردك من الغرفة من قِبل المشرف" });
        kickTarget.ws.close();
      }
      await db.execute(
        sql`UPDATE coding_room_members SET status = 'kicked', updated_at = NOW()
            WHERE room_id = ${client.roomId} AND user_id = ${kickId}`
      );
      broadcast(client.roomId, {
        type: "member_left",
        userId: kickId,
        reason: "kicked",
        members: getRoomMemberList(client.roomId),
      });
      break;
    }

    case "admit_member": {
      if (client.role !== "host") return;
      await db.execute(
        sql`UPDATE coding_room_members SET status = 'joined', updated_at = NOW()
            WHERE room_id = ${client.roomId} AND user_id = ${msg.targetUserId}`
      );
      broadcast(client.roomId, {
        type: "member_admitted",
        userId: msg.targetUserId,
      });
      break;
    }

    case "reject_member": {
      if (client.role !== "host") return;
      await db.execute(
        sql`UPDATE coding_room_members SET status = 'rejected', updated_at = NOW()
            WHERE room_id = ${client.roomId} AND user_id = ${msg.targetUserId}`
      );
      const rejected = [...getRoomClients(client.roomId)].find(
        (c) => c.userId === msg.targetUserId
      );
      if (rejected) {
        sendTo(rejected, { type: "rejected", message: "رفض المشرف طلب دخولك" });
        rejected.ws.close();
      }
      break;
    }

    case "chat_message": {
      broadcast(client.roomId, {
        type: "chat_message",
        userId: client.userId,
        username: client.username,
        color: client.color,
        text: msg.text,
        timestamp: new Date().toISOString(),
      });
      break;
    }

    case "mic_state": {
      client.micEnabled = msg.enabled;
      broadcast(client.roomId, {
        type: "mic_state",
        userId: client.userId,
        enabled: msg.enabled,
      }, client.userId);
      break;
    }

    case "webrtc_signal": {
      const target = [...getRoomClients(client.roomId)].find(
        (c) => c.userId === msg.targetUserId
      );
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
      broadcast(client.roomId, {
        type: "room_closing",
        countdown: 30,
      }, client.userId);
      setTimeout(async () => {
        broadcast(client.roomId, { type: "room_closed" });
        await db.execute(
          sql`UPDATE coding_rooms SET status = 'closed', closed_at = NOW()
              WHERE id = ${client.roomId}`
        );
        rooms.delete(client.roomId);
      }, 30_000);
      break;
    }

    case "transfer_host": {
      if (client.role !== "host") return;
      const newHostId = msg.targetUserId;
      await db.execute(
        sql`UPDATE coding_rooms SET host_user_id = ${newHostId}, updated_at = NOW()
            WHERE id = ${client.roomId}`
      );
      await db.execute(
        sql`UPDATE coding_room_members SET role = 'host', updated_at = NOW()
            WHERE room_id = ${client.roomId} AND user_id = ${newHostId}`
      );
      await db.execute(
        sql`UPDATE coding_room_members SET role = 'member', updated_at = NOW()
            WHERE room_id = ${client.roomId} AND user_id = ${client.userId}`
      );
      client.role = "member";
      const newHost = [...getRoomClients(client.roomId)].find(
        (c) => c.userId === newHostId
      );
      if (newHost) newHost.role = "host";
      broadcast(client.roomId, {
        type: "host_changed",
        newHostUserId: newHostId,
        members: getRoomMemberList(client.roomId),
      });
      break;
    }

    case "update_room_settings": {
      if (client.role !== "host") return;
      await db.execute(
        sql`UPDATE coding_rooms
            SET title = ${msg.title ?? sql`title`},
                description = ${msg.description ?? sql`description`},
                languages = ${JSON.stringify(msg.languages ?? [])},
                invite_type = ${msg.inviteType ?? sql`invite_type`},
                updated_at = NOW()
            WHERE id = ${client.roomId}`
      );
      broadcast(client.roomId, {
        type: "room_settings_updated",
        title: msg.title,
        description: msg.description,
        languages: msg.languages,
        inviteType: msg.inviteType,
      });
      break;
    }

    default:
      break;
  }
}

async function handleDisconnect(client: WsClient) {
  const clients = getRoomClients(client.roomId);
  clients.delete(client);

  await updateMemberStatus(client.roomId, client.userId, "left");

  const remaining = [...clients];
  if (remaining.length === 0) {
    return;
  }

  if (client.role === "host") {
    const longestWriter = remaining
      .filter((c) => c.canWrite)
      .sort((a, b) => a.userId - b.userId)[0];
    const newHost = longestWriter ?? remaining[0];

    newHost.role = "host";
    await db.execute(
      sql`UPDATE coding_rooms SET host_user_id = ${newHost.userId}, updated_at = NOW()
          WHERE id = ${client.roomId}`
    );
    await db.execute(
      sql`UPDATE coding_room_members SET role = 'host', updated_at = NOW()
          WHERE room_id = ${client.roomId} AND user_id = ${newHost.userId}`
    );

    sendTo(newHost, {
      type: "you_are_host",
      message: "أنت الآن مشرف الغرفة",
    });

    broadcast(client.roomId, {
      type: "host_changed",
      newHostUserId: newHost.userId,
      members: getRoomMemberList(client.roomId),
    });
  } else {
    broadcast(client.roomId, {
      type: "member_left",
      userId: client.userId,
      reason: "disconnect",
      members: getRoomMemberList(client.roomId),
    });
  }
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
          ws.close(1008, "الغرفة غير موجودة أو مغلقة");
          return;
        }

        const member = await getMemberFromDb(roomId, userId);
        if (!member || (member.status !== "joined" && member.status !== "reconnecting")) {
          ws.send(JSON.stringify({ type: "waiting_approval" }));
          ws.close(1008, "بانتظار موافقة المشرف");
          return;
        }

        const username = await getUserName(userId);
        const color = assignColor(roomId, userId);

        const client: WsClient = {
          ws,
          userId,
          username,
          roomId,
          role: member.role as RoomRole,
          color,
          canWrite: member.can_write,
          canRun: member.can_run,
          micEnabled: false,
          isOnline: true,
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

        ws.on("message", (data: Buffer) => {
          handleMessage(client, data.toString()).catch((err) => {
            logger.error({ err: err?.message }, "ws:room: message handler error");
          });
        });

        ws.on("close", () => {
          client.isOnline = false;
          handleDisconnect(client).catch((err) => {
            logger.error({ err: err?.message }, "ws:room: disconnect handler error");
          });
        });

        ws.on("error", (err) => {
          logger.error({ err: err?.message }, "ws:room: socket error");
        });

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
  return getRoomClients(roomId).size;
}
