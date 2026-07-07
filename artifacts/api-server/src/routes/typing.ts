import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

const MAX_LESSON_ID = 400;

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

    if (parsedId > 1) {
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

export default router;
