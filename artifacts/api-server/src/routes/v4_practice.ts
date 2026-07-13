// ─────────────────────────────────────────────────────────────────────────────
// v4 weakness-driven targeted practice ("genius gap-filling") routes.
//
// Mounted under /api by routes/index.ts. When the teacher flags a concept as
// weak it offers a focused mini-drill ([[PRACTICE_OFFER: concept=N]]); the FE
// opens a drill panel backed by these two endpoints:
//
//   GET  /v4/practice/:slug/:lessonCode/:conceptIndex     → concept name,
//        current mastery (scoreBefore), 3 rotated practice questions, cost.
//   POST /v4/practice/:slug/:lessonCode/:conceptIndex      → grade answers,
//        raise mastery (never lower), clear the weakness when ≥75, return the
//        before→after delta for the in-lesson "40 → 85" moment.
//
// Reuses: resolveActiveSpecialty/getStudentPath (enrolment + unlock gate),
// the isolated Haiku grader (via v4-practice-engine), chargeV4Ai/refundV4Ai
// (idempotent billing), and v4_concept_mastery / v4_weakness_tracker.
// ─────────────────────────────────────────────────────────────────────────────
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { and, eq } from "drizzle-orm";
import {
  db,
  v4LessonsTable,
  v4LessonConceptsTable,
  v4ConceptMasteryTable,
} from "@workspace/db";
import { logger } from "../lib/logger";
import {
  resolveActiveSpecialty,
  getStudentPath,
  syncStudentPathToActiveVersion,
} from "../lib/v4-path-engine";
import {
  getOrGenerateConceptDrills,
  gradeConceptDrill,
  type ConceptDrillQuestion,
} from "../lib/v4-practice-engine";
import { chargeV4Ai, refundV4Ai, canAffordV4Turn, usdToGems } from "../lib/v4-gem-wallet";
import { clearWeakness } from "../lib/v4-memory";
import { V4_TEACHING_MODEL } from "../lib/v4-teaching-core";
import { requireSameOriginCsrf } from "../lib/csrf";

const router: IRouter = Router();

// USD cost of one drill submission (covers the 3 Haiku grade calls + the
// amortized one-time generation). usdToGems floors at 1, so ≈ a few gems.
const PRACTICE_USD = 0.004;
const QUESTIONS_PER_ROUND = 3;

function getUserId(req: Request): number | null {
  return ((req as any).session as any)?.userId ?? null;
}

function requireUser(req: Request, res: Response, next: NextFunction): void {
  const uid = getUserId(req);
  if (!uid) { res.status(401).json({ error: "Unauthorized" }); return; }
  (req as any).userId = uid;
  next();
}

// Deterministic rotation: serve a window of `n` questions from the pool so
// "practice again" (round+1) shows fresh questions, wrapping around.
function rotate(pool: ConceptDrillQuestion[], round: number, n: number): ConceptDrillQuestion[] {
  if (pool.length === 0) return [];
  const start = ((round * n) % pool.length + pool.length) % pool.length;
  const out: ConceptDrillQuestion[] = [];
  for (let i = 0; i < Math.min(n, pool.length); i++) {
    out.push(pool[(start + i) % pool.length]);
  }
  return out;
}

// Shared resolution: enrolment + unlock gate + concept lookup. Returns the
// resolved version, lesson row, concept row, and current mastery score, or
// writes an error response and returns null.
async function resolveContext(
  req: Request,
  res: Response,
): Promise<null | {
  uid: number;
  slug: string;
  versionId: number;
  lessonId: number;
  conceptIndex: number;
  concept: { name: string; explanation: string; masteryCriterion: string };
  scoreBefore: number;
}> {
  const uid = (req as any).userId as number;
  const slug = req.params.slug;
  const lessonCode = decodeURIComponent(req.params.lessonCode);
  const conceptIndex = parseInt(req.params.conceptIndex, 10);
  if (!Number.isInteger(conceptIndex) || conceptIndex < 1) {
    res.status(400).json({ error: "bad_concept_index" });
    return null;
  }

  const resolved = await resolveActiveSpecialty(slug);
  if (!resolved) { res.status(404).json({ error: "specialty_unavailable" }); return null; }

  let studentPath = await getStudentPath(uid, slug);
  if (!studentPath) { res.status(403).json({ error: "no_student_path" }); return null; }
  studentPath = await syncStudentPathToActiveVersion(studentPath, resolved);
  const unlocked: string[] = Array.isArray(studentPath.unlockedLessonCodes)
    ? (studentPath.unlockedLessonCodes as string[])
    : [];
  if (!unlocked.includes(lessonCode)) { res.status(403).json({ error: "lesson_locked" }); return null; }

  const [lesson] = await db
    .select()
    .from(v4LessonsTable)
    .where(and(eq(v4LessonsTable.versionId, resolved.versionId), eq(v4LessonsTable.code, lessonCode)));
  if (!lesson) { res.status(404).json({ error: "lesson_not_found" }); return null; }

  const [concept] = await db
    .select()
    .from(v4LessonConceptsTable)
    .where(and(eq(v4LessonConceptsTable.lessonId, lesson.id), eq(v4LessonConceptsTable.conceptIndex, conceptIndex)));
  if (!concept) { res.status(404).json({ error: "concept_not_found" }); return null; }

  const [mastery] = await db
    .select({ score: v4ConceptMasteryTable.score })
    .from(v4ConceptMasteryTable)
    .where(and(
      eq(v4ConceptMasteryTable.userId, uid),
      eq(v4ConceptMasteryTable.lessonId, lesson.id),
      eq(v4ConceptMasteryTable.conceptIndex, conceptIndex),
    ));

  return {
    uid,
    slug,
    versionId: resolved.versionId,
    lessonId: lesson.id,
    conceptIndex,
    concept: { name: concept.name, explanation: concept.explanation, masteryCriterion: concept.masteryCriterion },
    scoreBefore: mastery?.score ?? 0,
  };
}

// ── GET — load a drill ──────────────────────────────────────────────────────
router.get("/v4/practice/:slug/:lessonCode/:conceptIndex", requireUser, async (req: Request, res: Response): Promise<void> => {
  try {
    const ctx = await resolveContext(req, res);
    if (!ctx) return;
    const round = Math.max(0, parseInt(String(req.query.round ?? "0"), 10) || 0);

    const pool = await getOrGenerateConceptDrills({
      versionId: ctx.versionId,
      lessonId: ctx.lessonId,
      conceptIndex: ctx.conceptIndex,
    });
    if (pool.length === 0) { res.status(503).json({ error: "drill_unavailable" }); return; }

    const questions = rotate(pool, round, QUESTIONS_PER_ROUND);
    const afford = await canAffordV4Turn(ctx.uid, ctx.slug);

    res.json({
      conceptName: ctx.concept.name,
      conceptIndex: ctx.conceptIndex,
      scoreBefore: ctx.scoreBefore,
      round,
      // Only prompt + kind reach the client; rubric/solution stay server-side
      // (re-derived on submit) so answers can't be reverse-engineered.
      questions: questions.map((q) => ({ prompt: q.prompt, kind: q.kind })),
      cost: usdToGems(PRACTICE_USD),
      canAfford: afford.ok,
      noWallet: afford.noWallet,
      balance: afford.balance,
    });
  } catch (e) {
    logger.error?.({ err: String((e as any)?.message ?? e) }, "[v4/practice] GET failed");
    res.status(500).json({ error: "practice_failed" });
  }
});

// ── POST — grade a drill, raise mastery, clear weakness ──────────────────────
router.post("/v4/practice/:slug/:lessonCode/:conceptIndex", requireUser, requireSameOriginCsrf, async (req: Request, res: Response): Promise<void> => {
  try {
    const ctx = await resolveContext(req, res);
    if (!ctx) return;

    const body = (req.body ?? {}) as { answers?: unknown; round?: unknown; attemptNonce?: unknown };
    const round = Math.max(0, parseInt(String(body.round ?? "0"), 10) || 0);
    const answers = Array.isArray(body.answers) ? body.answers.map((a) => String(a ?? "")) : [];
    const attemptNonce = String(body.attemptNonce ?? "x").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "x";

    const pool = await getOrGenerateConceptDrills({
      versionId: ctx.versionId,
      lessonId: ctx.lessonId,
      conceptIndex: ctx.conceptIndex,
    });
    if (pool.length === 0) { res.status(503).json({ error: "drill_unavailable" }); return; }
    const questions = rotate(pool, round, QUESTIONS_PER_ROUND);

    // Pre-charge affordability gate (practice is optional → block, don't drain).
    const afford = await canAffordV4Turn(ctx.uid, ctx.slug);
    if (!afford.ok) {
      res.status(402).json({ error: "insufficient_gems", noWallet: afford.noWallet, balance: afford.balance });
      return;
    }

    // Idempotent charge — same attemptNonce never double-charges.
    const requestId = `v4practice_${ctx.uid}_${ctx.lessonId}_${ctx.conceptIndex}_${attemptNonce}`;
    const charge = await chargeV4Ai({
      requestId,
      userId: ctx.uid,
      subjectId: ctx.slug,
      costUsd: PRACTICE_USD,
      source: "v4_ai_practice",
      model: V4_TEACHING_MODEL,
      note: `تدريب موجَّه — مفهوم ${ctx.concept.name}`,
    });
    if (!charge.charged && charge.insufficient) {
      res.status(402).json({ error: "insufficient_gems", balance: charge.balanceAfter });
      return;
    }
    // Fail closed on a transient DB error — don't run paid grading for free.
    if (!charge.charged && charge.error) {
      res.status(503).json({ error: "charge_failed", message: "تعذّر الخصم — حاول مرة أخرى" });
      return;
    }

    const { perQuestion, avg } = await gradeConceptDrill({
      conceptName: ctx.concept.name,
      explanation: ctx.concept.explanation,
      masteryCriterion: ctx.concept.masteryCriterion,
      questions,
      answers,
    });

    // If the grader mostly failed (transport/parse), refund + 503 so the
    // student isn't penalized for a network blip (mirrors lab/exam behavior).
    const failed = perQuestion.filter((r) => r.evaluatorFailed).length;
    if (perQuestion.length > 0 && failed > perQuestion.length / 2) {
      await refundV4Ai({ requestId, userId: ctx.uid, subjectId: ctx.slug, source: "v4_ai_practice", reason: "grader_failed" }).catch(() => {});
      res.status(503).json({ error: "grader_unavailable" });
      return;
    }

    // Never lower an existing higher score (a weak retry can't regress you).
    const scoreAfter = Math.max(ctx.scoreBefore, avg);
    await db
      .insert(v4ConceptMasteryTable)
      .values({ userId: ctx.uid, lessonId: ctx.lessonId, conceptIndex: ctx.conceptIndex, score: scoreAfter })
      .onConflictDoUpdate({
        target: [v4ConceptMasteryTable.userId, v4ConceptMasteryTable.lessonId, v4ConceptMasteryTable.conceptIndex],
        set: { score: scoreAfter, updatedAt: new Date() },
      });

    // Mastered → no longer a chronic weakness.
    if (scoreAfter >= 75) {
      await clearWeakness({ userId: ctx.uid, lessonId: ctx.lessonId, conceptIndex: ctx.conceptIndex }).catch(() => {});
    }

    res.json({
      conceptName: ctx.concept.name,
      conceptIndex: ctx.conceptIndex,
      scoreBefore: ctx.scoreBefore,
      scoreAfter,
      passed: scoreAfter >= 75,
      perQuestion: perQuestion.map((r) => ({ score: r.score, verdict: r.verdict, explanation: r.explanation })),
      balanceAfter: charge.balanceAfter,
    });
  } catch (e) {
    logger.error?.({ err: String((e as any)?.message ?? e) }, "[v4/practice] POST failed");
    res.status(500).json({ error: "practice_failed" });
  }
});

export default router;
