import { Router, Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getRoomOnlineCount } from "../lib/coding-room-ws";

const router = Router();

function requireUser(req: Request, res: Response, next: NextFunction): void {
  const uid = ((req as any).session as any)?.userId ?? null;
  if (!uid) { res.status(401).json({ error: "Unauthorized" }); return; }
  next();
}

router.get("/coding-rooms", requireUser, async (req: any, res: any) => {
  try {
    const userId = req.session.userId as number;
    const rooms = await db.execute(
      sql`SELECT
            r.id, r.title, r.description, r.languages, r.invite_type,
            r.host_user_id, r.status, r.created_at,
            u.display_name AS host_name
          FROM coding_rooms r
          JOIN users u ON u.id = r.host_user_id
          WHERE r.status = 'active'
          ORDER BY r.created_at DESC
          LIMIT 50`
    );

    const rows = rooms.rows as any[];
    const result = rows.map((r) => ({
      ...r,
      onlineCount: getRoomOnlineCount(r.id),
    }));

    return res.json({ rooms: result });
  } catch (err: any) {
    return res.status(500).json({ error: "فشل تحميل الغرف" });
  }
});

router.get("/coding-rooms/my-history", requireUser, async (req: any, res: any) => {
  try {
    const userId = req.session.userId as number;
    const history = await db.execute(
      sql`SELECT
            r.id, r.title, r.languages, r.host_user_id, r.closed_at, r.created_at,
            u.display_name AS host_name,
            (
              SELECT json_agg(json_build_object('userId', m2.user_id, 'name', u2.display_name))
              FROM coding_room_members m2
              JOIN users u2 ON u2.id = m2.user_id
              WHERE m2.room_id = r.id AND m2.status = 'joined'
              LIMIT 10
            ) AS participants
          FROM coding_rooms r
          JOIN users u ON u.id = r.host_user_id
          JOIN coding_room_members m ON m.room_id = r.id AND m.user_id = ${userId}
          WHERE r.status = 'closed'
          ORDER BY r.closed_at DESC NULLS LAST
          LIMIT 30`
    );
    return res.json({ history: history.rows });
  } catch (err: any) {
    return res.status(500).json({ error: "فشل تحميل السجل" });
  }
});

router.post("/coding-rooms", requireUser, async (req: any, res: any) => {
  try {
    const userId = req.session.userId as number;
    const { title, description, languages, inviteType, invitedUserIds } = req.body;

    if (!title || !languages || !Array.isArray(languages) || languages.length === 0) {
      return res.status(400).json({ error: "العنوان واللغات مطلوبة" });
    }

    const result = await db.execute(
      sql`INSERT INTO coding_rooms (title, description, languages, invite_type, host_user_id, status)
          VALUES (
            ${title},
            ${description ?? ""},
            ${JSON.stringify(languages)},
            ${inviteType ?? "private"},
            ${userId},
            'active'
          )
          RETURNING id`
    );

    const roomId = (result.rows[0] as any).id as number;

    await db.execute(
      sql`INSERT INTO coding_room_members (room_id, user_id, role, can_write, can_run, status)
          VALUES (${roomId}, ${userId}, 'host', true, true, 'joined')`
    );

    if (inviteType === "private" && Array.isArray(invitedUserIds)) {
      for (const invitedId of invitedUserIds) {
        if (typeof invitedId !== "number") continue;
        await db.execute(
          sql`INSERT INTO coding_room_invitations (room_id, invited_user_id, invited_by_user_id)
              VALUES (${roomId}, ${invitedId}, ${userId})
              ON CONFLICT (room_id, invited_user_id) DO NOTHING`
        );
        await db.execute(
          sql`INSERT INTO notifications (user_id, type, title, body, data)
              VALUES (
                ${invitedId},
                'room_invite',
                'دعوة لغرفة برمجة',
                ${`تمت دعوتك للانضمام إلى غرفة: ${title}`},
                ${JSON.stringify({ roomId, roomTitle: title, hostUserId: userId })}
              )`
        );
      }
    }

    if (inviteType === "public") {
      const onlineUsers = await db.execute(
        sql`SELECT id FROM users
            WHERE last_session_at > NOW() - INTERVAL '30 minutes'
              AND id != ${userId}
            LIMIT 200`
      );
      for (const row of onlineUsers.rows as any[]) {
        await db.execute(
          sql`INSERT INTO notifications (user_id, type, title, body, data)
              VALUES (
                ${row.id},
                'room_invite',
                'دعوة عامة لغرفة برمجة',
                ${`غرفة جديدة مفتوحة: ${title}`},
                ${JSON.stringify({ roomId, roomTitle: title, hostUserId: userId, public: true })}
              )
              ON CONFLICT DO NOTHING`
        );
      }
    }

    return res.json({ roomId });
  } catch (err: any) {
    return res.status(500).json({ error: "فشل إنشاء الغرفة" });
  }
});

router.get("/coding-rooms/:roomId", requireUser, async (req: any, res: any) => {
  try {
    const userId = req.session.userId as number;
    const roomId = parseInt(req.params.roomId, 10);
    if (isNaN(roomId)) return res.status(400).json({ error: "معرف غير صحيح" });

    const rooms = await db.execute(
      sql`SELECT r.*, u.display_name AS host_name
          FROM coding_rooms r
          JOIN users u ON u.id = r.host_user_id
          WHERE r.id = ${roomId} LIMIT 1`
    );
    if (!rooms.rows.length) return res.status(404).json({ error: "الغرفة غير موجودة" });

    const room = rooms.rows[0] as any;

    const members = await db.execute(
      sql`SELECT m.user_id, m.role, m.can_write, m.can_run, m.status, u.name
          FROM coding_room_members m
          JOIN users u ON u.id = m.user_id
          WHERE m.room_id = ${roomId}`
    );

    const myMember = (members.rows as any[]).find((m) => m.user_id === userId);

    return res.json({
      room,
      members: members.rows,
      myMember,
      onlineCount: getRoomOnlineCount(roomId),
    });
  } catch (err: any) {
    return res.status(500).json({ error: "فشل تحميل الغرفة" });
  }
});

router.post("/coding-rooms/:roomId/request-join", requireUser, async (req: any, res: any) => {
  try {
    const userId = req.session.userId as number;
    const roomId = parseInt(req.params.roomId, 10);
    if (isNaN(roomId)) return res.status(400).json({ error: "معرف غير صحيح" });

    const rooms = await db.execute(
      sql`SELECT id, host_user_id, invite_type, status FROM coding_rooms
          WHERE id = ${roomId} LIMIT 1`
    );
    if (!rooms.rows.length) return res.status(404).json({ error: "الغرفة غير موجودة" });
    const room = rooms.rows[0] as any;
    if (room.status !== "active") return res.status(400).json({ error: "الغرفة مغلقة" });

    const existing = await db.execute(
      sql`SELECT status FROM coding_room_members
          WHERE room_id = ${roomId} AND user_id = ${userId} LIMIT 1`
    );
    if (existing.rows.length) {
      const existingStatus = (existing.rows[0] as any).status;
      if (existingStatus === "joined") return res.json({ status: "already_joined" });
      if (existingStatus === "waiting") return res.json({ status: "waiting" });
      if (existingStatus === "kicked") return res.status(403).json({ error: "تم طردك من هذه الغرفة" });
    }

    await db.execute(
      sql`INSERT INTO coding_room_members (room_id, user_id, role, can_write, can_run, status)
          VALUES (${roomId}, ${userId}, 'member', false, false, 'waiting')
          ON CONFLICT (room_id, user_id) DO UPDATE
          SET status = 'waiting', updated_at = NOW()`
    );

    const userRow = await db.execute(
      sql`SELECT display_name FROM users WHERE id = ${userId} LIMIT 1`
    );
    const username = (userRow.rows[0] as any)?.display_name ?? "طالب";

    await db.execute(
      sql`INSERT INTO notifications (user_id, type, title, body, data)
          VALUES (
            ${room.host_user_id},
            'join_request',
            'طلب دخول للغرفة',
            ${`${username} يطلب الدخول إلى غرفتك: ${roomId}`},
            ${JSON.stringify({ roomId, requestUserId: userId, username })}
          )`
    );

    return res.json({ status: "waiting" });
  } catch (err: any) {
    return res.status(500).json({ error: "فشل طلب الدخول" });
  }
});

router.post("/coding-rooms/:roomId/admit", requireUser, async (req: any, res: any) => {
  try {
    const userId = req.session.userId as number;
    const roomId = parseInt(req.params.roomId, 10);
    const { targetUserId } = req.body;

    const hostCheck = await db.execute(
      sql`SELECT role FROM coding_room_members
          WHERE room_id = ${roomId} AND user_id = ${userId} LIMIT 1`
    );
    if (!hostCheck.rows.length || (hostCheck.rows[0] as any).role !== "host") {
      return res.status(403).json({ error: "فقط المشرف يستطيع قبول الطلبات" });
    }

    await db.execute(
      sql`UPDATE coding_room_members SET status = 'joined', updated_at = NOW()
          WHERE room_id = ${roomId} AND user_id = ${targetUserId}`
    );

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: "فشل قبول الطالب" });
  }
});

router.post("/coding-rooms/:roomId/reject", requireUser, async (req: any, res: any) => {
  try {
    const userId = req.session.userId as number;
    const roomId = parseInt(req.params.roomId, 10);
    const { targetUserId } = req.body;

    const hostCheck = await db.execute(
      sql`SELECT role FROM coding_room_members
          WHERE room_id = ${roomId} AND user_id = ${userId} LIMIT 1`
    );
    if (!hostCheck.rows.length || (hostCheck.rows[0] as any).role !== "host") {
      return res.status(403).json({ error: "فقط المشرف يستطيع رفض الطلبات" });
    }

    await db.execute(
      sql`UPDATE coding_room_members SET status = 'rejected', updated_at = NOW()
          WHERE room_id = ${roomId} AND user_id = ${targetUserId}`
    );

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: "فشل رفض الطالب" });
  }
});

router.post("/coding-rooms/:roomId/leave", requireUser, async (req: any, res: any) => {
  try {
    const userId = req.session.userId as number;
    const roomId = parseInt(req.params.roomId, 10);

    await db.execute(
      sql`UPDATE coding_room_members SET status = 'left', updated_at = NOW()
          WHERE room_id = ${roomId} AND user_id = ${userId}`
    );

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: "فشل مغادرة الغرفة" });
  }
});

router.post("/coding-rooms/:roomId/close", requireUser, async (req: any, res: any) => {
  try {
    const userId = req.session.userId as number;
    const roomId = parseInt(req.params.roomId, 10);

    const hostCheck = await db.execute(
      sql`SELECT role FROM coding_room_members
          WHERE room_id = ${roomId} AND user_id = ${userId} LIMIT 1`
    );
    if (!hostCheck.rows.length || (hostCheck.rows[0] as any).role !== "host") {
      return res.status(403).json({ error: "فقط المشرف يستطيع إغلاق الغرفة" });
    }

    await db.execute(
      sql`UPDATE coding_rooms SET status = 'closed', closed_at = NOW(), updated_at = NOW()
          WHERE id = ${roomId}`
    );

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: "فشل إغلاق الغرفة" });
  }
});

router.get("/coding-rooms/:roomId/files", requireUser, async (req: any, res: any) => {
  try {
    const userId = req.session.userId as number;
    const roomId = parseInt(req.params.roomId, 10);

    const memberCheck = await db.execute(
      sql`SELECT status FROM coding_room_members
          WHERE room_id = ${roomId} AND user_id = ${userId} LIMIT 1`
    );
    if (!memberCheck.rows.length || (memberCheck.rows[0] as any).status !== "joined") {
      return res.status(403).json({ error: "لست عضواً في هذه الغرفة" });
    }

    const files = await db.execute(
      sql`SELECT file_path, content, language, created_by_user_id, created_at, updated_at
          FROM coding_room_files
          WHERE room_id = ${roomId}
          ORDER BY created_at ASC`
    );

    return res.json({ files: files.rows });
  } catch (err: any) {
    return res.status(500).json({ error: "فشل تحميل الملفات" });
  }
});

router.get("/coding-rooms/:roomId/download", requireUser, async (req: any, res: any) => {
  try {
    const userId = req.session.userId as number;
    const roomId = parseInt(req.params.roomId, 10);

    const memberCheck = await db.execute(
      sql`SELECT status FROM coding_room_members
          WHERE room_id = ${roomId} AND user_id = ${userId} LIMIT 1`
    );
    if (!memberCheck.rows.length) {
      return res.status(403).json({ error: "لست عضواً في هذه الغرفة" });
    }

    const files = await db.execute(
      sql`SELECT file_path, content FROM coding_room_files
          WHERE room_id = ${roomId} ORDER BY created_at ASC`
    );

    return res.json({ files: files.rows });
  } catch (err: any) {
    return res.status(500).json({ error: "فشل تحميل الكود" });
  }
});

router.post("/coding-rooms/:roomId/reopen", requireUser, async (req: any, res: any) => {
  try {
    const userId = req.session.userId as number;
    const roomId = parseInt(req.params.roomId, 10);

    const room = await db.execute(
      sql`SELECT id, title, description, languages, invite_type, host_user_id, status
          FROM coding_rooms WHERE id = ${roomId} LIMIT 1`
    );
    if (!room.rows.length) return res.status(404).json({ error: "الغرفة غير موجودة" });
    const r = room.rows[0] as any;
    if (r.host_user_id !== userId) {
      return res.status(403).json({ error: "فقط المشرف الأصلي يستطيع إعادة الفتح" });
    }

    const newRoom = await db.execute(
      sql`INSERT INTO coding_rooms (title, description, languages, invite_type, host_user_id, status)
          VALUES (${r.title}, ${r.description}, ${JSON.stringify(r.languages)}, ${r.invite_type}, ${userId}, 'active')
          RETURNING id`
    );
    const newRoomId = (newRoom.rows[0] as any).id as number;

    await db.execute(
      sql`INSERT INTO coding_room_members (room_id, user_id, role, can_write, can_run, status)
          VALUES (${newRoomId}, ${userId}, 'host', true, true, 'joined')`
    );

    const oldFiles = await db.execute(
      sql`SELECT file_path, content, language FROM coding_room_files WHERE room_id = ${roomId}`
    );
    for (const f of oldFiles.rows as any[]) {
      await db.execute(
        sql`INSERT INTO coding_room_files (room_id, file_path, content, language, created_by_user_id)
            VALUES (${newRoomId}, ${f.file_path}, ${f.content}, ${f.language ?? ""}, ${userId})`
      );
    }

    return res.json({ newRoomId });
  } catch (err: any) {
    return res.status(500).json({ error: "فشل إعادة فتح الغرفة" });
  }
});

export default router;
