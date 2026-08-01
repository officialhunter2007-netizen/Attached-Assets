import { Router, Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getRoomOnlineCount, isUserOnlineInRoom } from "../lib/coding-room-ws";
import { chargeV4Ai } from "../lib/v4-gem-wallet";
import { requireSameOriginCsrf } from "../lib/csrf";

const ROOM_TICK_COST_USD = 0.001; // 1 gem per 2-minute tick

const router = Router();

function requireUser(req: Request, res: Response, next: NextFunction): void {
  const uid = ((req as any).session as any)?.userId ?? null;
  if (!uid) { res.status(401).json({ error: "Unauthorized" }); return; }
  next();
}

const DEFAULT_FILE_CONTENT: Record<string, string> = {
  javascript: `console.log("مرحباً من نُخبة! 👋");\n\nfunction greet(name) {\n  return \`أهلاً \${name}\`;\n}\n\nconsole.log(greet("العالم"));\n`,
  typescript: `const greet = (name: string): string => {\n  return \`أهلاً \${name}\`;\n};\n\nconsole.log(greet("العالم"));\n`,
  python: `def greet(name: str) -> str:\n    return f"أهلاً {name}"\n\nprint(greet("العالم"))\n`,
  html: `<!DOCTYPE html>\n<html lang="ar" dir="rtl">\n<head>\n  <meta charset="UTF-8">\n  <title>مشروع نُخبة</title>\n  <style>\n    body { font-family: Tajawal, sans-serif; background: #060912; color: #e2e8f0; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }\n    .card { background: #0d1526; border-radius: 16px; padding: 2rem; text-align: center; border: 1px solid rgba(16,185,129,0.2); }\n    h1 { color: #10B981; }\n  </style>\n</head>\n<body>\n  <div class="card">\n    <h1>مرحباً من نُخبة! 🚀</h1>\n    <p>ابدأ البرمجة هنا</p>\n  </div>\n</body>\n</html>\n`,
  java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("مرحباً من نُخبة!");\n    }\n}\n`,
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "مرحباً من نُخبة!" << endl;\n    return 0;\n}\n`,
  rust: `fn main() {\n    println!("مرحباً من نُخبة!");\n}\n`,
};

const LANG_DEFAULT_FILE: Record<string, { name: string; lang: string }> = {
  javascript: { name: "main.js", lang: "javascript" },
  typescript: { name: "main.ts", lang: "typescript" },
  python: { name: "main.py", lang: "python" },
  html: { name: "index.html", lang: "html" },
  java: { name: "Main.java", lang: "java" },
  cpp: { name: "main.cpp", lang: "cpp" },
  rust: { name: "main.rs", lang: "rust" },
};

function getDefaultFile(languages: string[]): { name: string; content: string; lang: string } {
  for (const lang of languages) {
    const lower = lang.toLowerCase();
    if (LANG_DEFAULT_FILE[lower]) {
      return {
        name: LANG_DEFAULT_FILE[lower].name,
        content: DEFAULT_FILE_CONTENT[lower] ?? "",
        lang: LANG_DEFAULT_FILE[lower].lang,
      };
    }
  }
  return { name: "main.js", content: DEFAULT_FILE_CONTENT.javascript, lang: "javascript" };
}

router.get("/coding-rooms", requireUser, async (req: any, res: any) => {
  try {
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
      languages: Array.isArray(r.languages) ? r.languages : [],
      onlineCount: getRoomOnlineCount(r.id),
    }));

    return res.json({ rooms: result });
  } catch (err: any) {
    return res.status(500).json({ error: "فشل تحميل الغرف", detail: err?.message });
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
    return res.status(500).json({ error: "فشل تحميل السجل", detail: err?.message });
  }
});

router.post("/coding-rooms", requireUser, async (req: any, res: any) => {
  try {
    const userId = req.session.userId as number;
    const { title, description, languages, inviteType } = req.body;

    if (!title?.trim()) return res.status(400).json({ error: "العنوان مطلوب" });
    if (!Array.isArray(languages) || languages.length === 0) {
      return res.status(400).json({ error: "اختر لغة واحدة على الأقل" });
    }

    const result = await db.execute(
      sql`INSERT INTO coding_rooms (title, description, languages, invite_type, host_user_id, status)
          VALUES (
            ${title.trim()},
            ${description?.trim() ?? ""},
            ${JSON.stringify(languages)}::jsonb,
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

    const defaultFile = getDefaultFile(languages);
    await db.execute(
      sql`INSERT INTO coding_room_files (room_id, file_path, content, language, created_by_user_id)
          VALUES (${roomId}, ${defaultFile.name}, ${defaultFile.content}, ${defaultFile.lang}, ${userId})`
    );

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
                'غرفة برمجة مفتوحة',
                ${`غرفة جديدة: ${title.trim()}`},
                ${JSON.stringify({ roomId, roomTitle: title.trim(), hostUserId: userId, public: true })}::jsonb
              )
              ON CONFLICT DO NOTHING`
        ).catch(() => {});
      }
    }

    return res.json({ roomId });
  } catch (err: any) {
    return res.status(500).json({ error: "فشل إنشاء الغرفة", detail: err?.message });
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
      sql`SELECT m.user_id, m.role, m.can_write, m.can_run, m.status, u.display_name AS name
          FROM coding_room_members m
          JOIN users u ON u.id = m.user_id
          WHERE m.room_id = ${roomId}`
    );

    const myMember = (members.rows as any[]).find((m) => m.user_id === userId);

    return res.json({
      room: { ...room, languages: Array.isArray(room.languages) ? room.languages : [] },
      members: members.rows,
      myMember,
      onlineCount: getRoomOnlineCount(roomId),
    });
  } catch (err: any) {
    return res.status(500).json({ error: "فشل تحميل الغرفة", detail: err?.message });
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

    if (room.host_user_id === userId) {
      return res.json({ status: "already_joined" });
    }

    const existing = await db.execute(
      sql`SELECT status FROM coding_room_members
          WHERE room_id = ${roomId} AND user_id = ${userId} LIMIT 1`
    );

    if (existing.rows.length) {
      const existingStatus = (existing.rows[0] as any).status;
      if (existingStatus === "joined") return res.json({ status: "already_joined" });
      if (existingStatus === "waiting") return res.json({ status: "waiting" });
      if (existingStatus === "kicked") return res.status(403).json({ error: "تم طردك من هذه الغرفة" });
      if (existingStatus === "rejected") return res.status(403).json({ error: "تم رفض طلبك من قِبل المشرف" });
    }

    const isPublic = room.invite_type === "public";
    const memberStatus = isPublic ? "joined" : "waiting";

    await db.execute(
      sql`INSERT INTO coding_room_members (room_id, user_id, role, can_write, can_run, status)
          VALUES (${roomId}, ${userId}, 'member', false, false, ${memberStatus})
          ON CONFLICT (room_id, user_id) DO UPDATE
          SET status = ${memberStatus}, updated_at = NOW()`
    );

    if (!isPublic) {
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
              ${`${username} يطلب الدخول إلى غرفتك`},
              ${JSON.stringify({ roomId, requestUserId: userId, username })}::jsonb
            )`
      ).catch(() => {});
    }

    return res.json({ status: isPublic ? "already_joined" : "waiting" });
  } catch (err: any) {
    return res.status(500).json({ error: "فشل طلب الدخول", detail: err?.message });
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
    return res.status(500).json({ error: "فشل قبول الطالب", detail: err?.message });
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
    return res.status(500).json({ error: "فشل رفض الطالب", detail: err?.message });
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
    if (!memberCheck.rows.length) {
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
          VALUES (${r.title}, ${r.description}, ${JSON.stringify(r.languages)}::jsonb, ${r.invite_type}, ${userId}, 'active')
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

    if (oldFiles.rows.length === 0) {
      const oldRoom = await db.execute(
        sql`SELECT languages FROM coding_rooms WHERE id = ${roomId} LIMIT 1`
      );
      const langs = (oldRoom.rows[0] as any)?.languages ?? [];
      const defaultFile = getDefaultFile(Array.isArray(langs) ? langs : []);
      await db.execute(
        sql`INSERT INTO coding_room_files (room_id, file_path, content, language, created_by_user_id)
            VALUES (${newRoomId}, ${defaultFile.name}, ${defaultFile.content}, ${defaultFile.lang}, ${userId})`
      );
    } else {
      for (const f of oldFiles.rows as any[]) {
        await db.execute(
          sql`INSERT INTO coding_room_files (room_id, file_path, content, language, created_by_user_id)
              VALUES (${newRoomId}, ${f.file_path}, ${f.content}, ${f.language ?? ""}, ${userId})`
        );
      }
    }

    return res.json({ newRoomId });
  } catch (err: any) {
    return res.status(500).json({ error: "فشل إعادة فتح الغرفة", detail: err?.message });
  }
});

// ── POST /api/coding-rooms/:roomId/tick — charge 1 gem per 2-minute presence ──
router.post("/coding-rooms/:roomId/tick", requireUser, requireSameOriginCsrf, async (req: Request, res: Response): Promise<void> => {
  const userId = ((req as any).session as any).userId as number;
  const roomId = Number(req.params.roomId);
  if (isNaN(roomId)) { res.status(400).json({ error: "Invalid roomId" }); return; }

  try {
    // Live presence: user must be CONNECTED to the room's WebSocket right now.
    // The durable membership row alone is not proof of presence.
    if (!isUserOnlineInRoom(roomId, userId)) {
      res.status(403).json({ error: "لست متصلاً بهذه الغرفة حالياً" });
      return;
    }

    // Auto-pick highest-balance active wallet for this user
    const wallets = await db.execute(sql`
      SELECT subject_id AS "subjectId"
      FROM student_gem_wallets
      WHERE user_id = ${userId}
        AND gems_balance > 0
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY gems_balance DESC
      LIMIT 1
    `);
    if ((wallets.rows?.length ?? 0) === 0) {
      // No balance — silent pass (don't block access)
      res.json({ ok: true, charged: false, reason: "no_wallet" });
      return;
    }
    const subjectId = String((wallets.rows[0] as any).subjectId);

    // Bucket = 2-minute window; same bucket = idempotent charge
    const bucket = Math.floor(Date.now() / 120_000);
    const charge = await chargeV4Ai({
      requestId: `coding-room:${userId}:${roomId}:${bucket}`,
      userId,
      subjectId,
      costUsd: ROOM_TICK_COST_USD,
      source: "v4_coding_room",
    });

    // Fail-closed on transient DB errors: report retryable failure instead of
    // silently losing a billing tick (chargeV4Ai fail-closed pattern).
    if ((charge as any).error) {
      res.status(503).json({ error: "تعذّر الخصم مؤقتاً — سيُعاد لاحقاً", retryable: true });
      return;
    }

    res.json({ ok: true, charged: charge.charged, gemsBalance: charge.balanceAfter, subjectId });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Internal error" });
  }
});

export default router;
