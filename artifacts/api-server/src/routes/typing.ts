import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { chargeV4Ai } from "../lib/v4-gem-wallet";

const LESSON_COST_USD = 0.004; // 4 gems per lesson (1 USD = 1000 gems)

const router = Router();

const MAX_LESSON_ID = 20000;
const AR_FIRST_ID = 10001;

function requireUser(req: Request, res: Response, next: NextFunction): void {
  const uid = ((req as any).session as any)?.userId ?? null;
  if (!uid) { res.status(401).json({ error: "Unauthorized" }); return; }
  next();
}

function requireCsrf(req: Request, res: Response, next: NextFunction): void {
  if (req.headers["x-nukhba-csrf"] !== "1") {
    res.status(403).json({ error: "CSRF check failed" });
    return;
  }
  const origin = req.headers["origin"] ?? req.headers["referer"] ?? "";
  const host = req.headers["host"] ?? "";
  if (origin && !origin.includes(host.split(":")[0])) {
    res.status(403).json({ error: "Origin check failed" });
    return;
  }
  next();
}

router.get("/typing/progress", requireUser, async (req: any, res: any) => {
  try {
    const userId = req.session.userId as number;
    const rows = await db.execute(sql`
      SELECT lesson_id AS "lessonId", stars, best_wpm AS "bestWpm", best_accuracy AS "bestAccuracy"
      FROM typing_progress
      WHERE user_id = ${userId}
    `);
    res.json(rows.rows);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Internal error" });
  }
});

router.post("/typing/progress", requireUser, requireCsrf, async (req: any, res: any) => {
  try {
    const userId = req.session.userId as number;
    const { lessonId, stars, wpm, accuracy } = req.body ?? {};

    const parsedId = Number(lessonId);
    if (
      !Number.isInteger(parsedId) ||
      parsedId < 1 ||
      parsedId > MAX_LESSON_ID
    ) {
      res.status(400).json({ error: "Invalid lessonId" });
      return;
    }

    if (!stars || stars < 1 || stars > 3) {
      res.status(400).json({ error: "Invalid payload" });
      return;
    }

    const parsedWpm = Number(wpm ?? 0);
    const parsedAcc = Number(accuracy ?? 0);
    if (!Number.isFinite(parsedWpm) || parsedWpm < 0 || parsedWpm > 300) {
      res.status(400).json({ error: "Invalid wpm" });
      return;
    }
    if (!Number.isFinite(parsedAcc) || parsedAcc < 0 || parsedAcc > 100) {
      res.status(400).json({ error: "Invalid accuracy" });
      return;
    }

    const isFirstLesson = parsedId === 1 || parsedId === AR_FIRST_ID;

    if (!isFirstLesson) {
      const prevRows = await db.execute(sql`
        SELECT 1 FROM typing_progress
        WHERE user_id = ${userId} AND lesson_id = ${parsedId - 1} AND stars >= 1
        LIMIT 1
      `);
      if ((prevRows.rows?.length ?? 0) === 0) {
        res.status(403).json({ error: "Previous lesson not completed" });
        return;
      }
    }

    await db.execute(sql`
      INSERT INTO typing_progress (user_id, lesson_id, stars, best_wpm, best_accuracy)
      VALUES (${userId}, ${parsedId}, ${stars}, ${parsedWpm}, ${parsedAcc})
      ON CONFLICT (user_id, lesson_id) DO UPDATE
        SET stars = GREATEST(typing_progress.stars, EXCLUDED.stars),
            best_wpm = GREATEST(typing_progress.best_wpm, EXCLUDED.best_wpm),
            best_accuracy = GREATEST(typing_progress.best_accuracy, EXCLUDED.best_accuracy),
            updated_at = NOW()
    `);

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Internal error" });
  }
});

// ── GET /api/typing/wallets — active gem wallets for subject picker ────────────
router.get("/typing/wallets", requireUser, async (req: any, res: any) => {
  try {
    const userId = req.session.userId as number;
    const rows = await db.execute(sql`
      SELECT
        w.subject_id       AS "subjectId",
        w.gems_balance     AS "gemsBalance",
        s.name             AS "specialtyName",
        s.icon             AS "specialtyIcon"
      FROM student_gem_wallets w
      LEFT JOIN v4_specialties s ON s.slug = w.subject_id
      WHERE w.user_id = ${userId}
        AND w.gems_balance > 0
        AND (w.expires_at IS NULL OR w.expires_at > NOW())
      ORDER BY w.gems_balance DESC
    `);
    res.json({ wallets: rows.rows });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Internal error" });
  }
});

// ── POST /api/typing/charge-lesson — deduct 4 gems for lesson completion ──────
router.post("/typing/charge-lesson", requireUser, requireCsrf, async (req: any, res: any) => {
  try {
    const userId = req.session.userId as number;
    const { lessonId, subjectId } = req.body ?? {};

    const parsedId = Number(lessonId);
    if (!Number.isInteger(parsedId) || parsedId < 1 || parsedId > MAX_LESSON_ID) {
      res.status(400).json({ error: "Invalid lessonId" });
      return;
    }
    if (!subjectId || typeof subjectId !== "string") {
      res.status(400).json({ error: "subjectId مطلوب" });
      return;
    }

    const charge = await chargeV4Ai({
      requestId: `typing-lesson:${userId}:${parsedId}`,
      userId,
      subjectId,
      costUsd: LESSON_COST_USD,
      source: "v4_typing_lesson",
    });

    if (charge.error) {
      res.status(402).json({ error: "رصيدك من الجواهر غير كافٍ لإتمام هذا الدرس (4 جواهر)" });
      return;
    }

    res.json({ ok: true, charged: charge.charged, gemsBalance: charge.balanceAfter });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Internal error" });
  }
});

export default router;
