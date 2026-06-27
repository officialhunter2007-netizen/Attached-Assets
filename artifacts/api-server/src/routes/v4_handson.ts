// ─────────────────────────────────────────────────────────────────────────────
// v4 PROACTIVE hands-on practice ("التطبيق العملي") routes — Nukhba's core
// differentiator. The moment a concept is grasped, the diagnostic engine's
// disjoint decision turns to APPLY and the `done` SSE event of /v4/teach carries
// a handsOnOffer:{conceptIndex,conceptName}. The FE then drives these endpoints:
//
//   GET  /v4/handson/:slug/:lessonCode/:conceptIndex   → concept name, current
//        mastery (scoreBefore), ONE Yemeni-context produce task (student-facing
//        fields only), cost.
//   POST /v4/handson/:slug/:lessonCode/:conceptIndex   → grade the student's
//        produced deliverable, raise mastery (never lower), MARK the concept
//        applied (so APPLY fires exactly once), clear/bump the weakness, and
//        return the before→after delta.
//
// Reuses: resolveActiveSpecialty/getStudentPath (enrolment + unlock gate), the
// isolated Haiku grader (via v4-handson-engine), chargeV4Ai/refundV4Ai
// (idempotent billing), and v4_concept_mastery / v4_weakness_tracker. The task
// rubric + solution outline NEVER leave the server.
// ─────────────────────────────────────────────────────────────────────────────
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { and, eq, sql } from "drizzle-orm";
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
  getOrGenerateHandsOnTask,
  gradeHandsOnSubmission,
} from "../lib/v4-handson-engine";
import { chargeV4Ai, refundV4Ai, canAffordV4Turn, usdToGems } from "../lib/v4-gem-wallet";
import { clearWeakness, bumpWeakness } from "../lib/v4-memory";
import { V4_TEACHING_MODEL } from "../lib/v4-teaching-core";
import { generateGeminiJson } from "../lib/openrouter-generate";

const router: IRouter = Router();

// USD cost of one hands-on submission (a single Haiku grade call + the
// amortized one-time task generation). usdToGems floors at 1, so ≈ a few gems.
const HANDS_ON_USD = 0.002;
const MASTERED_AT = 75;
const WEAK_BELOW = 50;

function getUserId(req: Request): number | null {
  return ((req as any).session as any)?.userId ?? null;
}

function requireUser(req: Request, res: Response, next: NextFunction): void {
  const uid = getUserId(req);
  if (!uid) { res.status(401).json({ error: "Unauthorized" }); return; }
  (req as any).userId = uid;
  next();
}

// Same custom-header + same-origin CSRF defense as the other v4 mutating routes
// (cookie-session + permissive CORS demands it).
function requireSameOriginCsrf(req: Request, res: Response, next: NextFunction): void {
  if (!req.headers["x-nukhba-csrf"]) {
    res.status(403).json({ error: "CSRF protection: X-Nukhba-Csrf header required" });
    return;
  }
  const host = (req.headers.host || "").toLowerCase();
  const origin = (req.headers.origin || "").toLowerCase();
  const referer = (req.headers.referer || "").toLowerCase();
  const sourceHost = origin
    ? (() => { try { return new URL(origin).host; } catch { return ""; } })()
    : referer
      ? (() => { try { return new URL(referer).host; } catch { return ""; } })()
      : "";
  if (!sourceHost || sourceHost !== host) {
    res.status(403).json({ error: "CSRF protection: cross-origin request rejected" });
    return;
  }
  next();
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

// ── GET — load the hands-on task ─────────────────────────────────────────────
router.get("/v4/handson/:slug/:lessonCode/:conceptIndex", requireUser, async (req: Request, res: Response): Promise<void> => {
  try {
    const ctx = await resolveContext(req, res);
    if (!ctx) return;

    const task = await getOrGenerateHandsOnTask({
      versionId: ctx.versionId,
      lessonId: ctx.lessonId,
      conceptIndex: ctx.conceptIndex,
    });
    if (!task) { res.status(503).json({ error: "handson_unavailable" }); return; }

    const afford = await canAffordV4Turn(ctx.uid, ctx.slug);

    res.json({
      conceptName: ctx.concept.name,
      conceptIndex: ctx.conceptIndex,
      scoreBefore: ctx.scoreBefore,
      // Student-facing fields ONLY; rubric/solutionOutline stay server-side
      // (re-derived on submit) so the model answer can't be reverse-engineered.
      task: {
        title: task.title,
        scenario: task.scenario,
        deliverable: task.deliverable,
        steps: task.steps,
      },
      cost: usdToGems(HANDS_ON_USD),
      canAfford: afford.ok,
      noWallet: afford.noWallet,
      balance: afford.balance,
    });
  } catch (e) {
    logger.error?.({ err: String((e as any)?.message ?? e) }, "[v4/handson] GET failed");
    res.status(500).json({ error: "handson_failed" });
  }
});

// ── POST — grade the produced deliverable, raise mastery, mark applied ───────
router.post("/v4/handson/:slug/:lessonCode/:conceptIndex", requireUser, requireSameOriginCsrf, async (req: Request, res: Response): Promise<void> => {
  try {
    const ctx = await resolveContext(req, res);
    if (!ctx) return;

    const body = (req.body ?? {}) as { submission?: unknown; attemptNonce?: unknown };
    const submission = String(body.submission ?? "").slice(0, 8000);
    const attemptNonce = String(body.attemptNonce ?? "x").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "x";
    if (!submission.trim()) { res.status(400).json({ error: "empty_submission" }); return; }

    const task = await getOrGenerateHandsOnTask({
      versionId: ctx.versionId,
      lessonId: ctx.lessonId,
      conceptIndex: ctx.conceptIndex,
    });
    if (!task) { res.status(503).json({ error: "handson_unavailable" }); return; }

    // Pre-charge affordability gate (hands-on is optional → block, don't drain).
    const afford = await canAffordV4Turn(ctx.uid, ctx.slug);
    if (!afford.ok) {
      res.status(402).json({ error: "insufficient_gems", noWallet: afford.noWallet, balance: afford.balance });
      return;
    }

    // Idempotent charge — same attemptNonce never double-charges.
    const requestId = `v4handson_${ctx.uid}_${ctx.lessonId}_${ctx.conceptIndex}_${attemptNonce}`;
    const charge = await chargeV4Ai({
      requestId,
      userId: ctx.uid,
      subjectId: ctx.slug,
      costUsd: HANDS_ON_USD,
      source: "v4_lab_grade",
      model: V4_TEACHING_MODEL,
      note: `تطبيق عملي — مفهوم ${ctx.concept.name}`,
    });
    if (!charge.charged && charge.insufficient) {
      res.status(402).json({ error: "insufficient_gems", balance: charge.balanceAfter });
      return;
    }

    const result = await gradeHandsOnSubmission({
      conceptName: ctx.concept.name,
      explanation: ctx.concept.explanation,
      masteryCriterion: ctx.concept.masteryCriterion,
      task,
      submission,
    });

    // Grader failed (transport/parse) → refund + 503 and do NOT mark applied,
    // so the offer re-fires next turn (mirrors lab/exam/practice behavior).
    if (result.evaluatorFailed) {
      await refundV4Ai({ requestId, userId: ctx.uid, subjectId: ctx.slug, source: "v4_lab_grade", reason: "grader_failed" }).catch(() => {});
      res.status(503).json({ error: "grader_unavailable" });
      return;
    }

    // Never lower an existing higher score (monotonic mastery — a weak retry
    // can't regress you), AND mark the concept hands-on applied. applied_at is
    // set once (COALESCE) so the diagnostic engine fires APPLY exactly once.
    const scoreAfter = Math.max(ctx.scoreBefore, result.score);
    await db
      .insert(v4ConceptMasteryTable)
      .values({ userId: ctx.uid, lessonId: ctx.lessonId, conceptIndex: ctx.conceptIndex, score: scoreAfter, appliedAt: new Date() })
      .onConflictDoUpdate({
        target: [v4ConceptMasteryTable.userId, v4ConceptMasteryTable.lessonId, v4ConceptMasteryTable.conceptIndex],
        set: {
          // Atomic monotonicity: GREATEST() in the UPDATE guarantees a concurrent
          // teach-turn [MASTERY] write landing between our read and this upsert can
          // never be regressed by this attempt — mastery only ever goes up.
          score: sql`GREATEST(${v4ConceptMasteryTable.score}, ${scoreAfter})`,
          appliedAt: sql`COALESCE(${v4ConceptMasteryTable.appliedAt}, NOW())`,
          updatedAt: new Date(),
        },
      });

    // Termination: mastered → clear the chronic weakness; a weak application
    // (this attempt < 50) → bump it so the diagnostic engine's DRILL takes over
    // next turn (the gap is real, not just a grasp-then-apply gentle nudge).
    if (scoreAfter >= MASTERED_AT) {
      await clearWeakness({ userId: ctx.uid, lessonId: ctx.lessonId, conceptIndex: ctx.conceptIndex }).catch(() => {});
    } else if (result.score < WEAK_BELOW) {
      await bumpWeakness({ userId: ctx.uid, lessonId: ctx.lessonId, conceptIndex: ctx.conceptIndex }).catch(() => {});
    }

    res.json({
      conceptName: ctx.concept.name,
      conceptIndex: ctx.conceptIndex,
      scoreBefore: ctx.scoreBefore,
      scoreAfter,
      passed: scoreAfter >= MASTERED_AT,
      score: result.score,
      verdict: result.verdict,
      explanation: result.explanation,
      balanceAfter: charge.balanceAfter,
    });
  } catch (e) {
    logger.error?.({ err: String((e as any)?.message ?? e) }, "[v4/handson] POST failed");
    res.status(500).json({ error: "handson_failed" });
  }
});

// ── POST /help — free Socratic AI assistant for the current task ─────────────
// No gem charge: this is guidance, not assessment. No CSRF needed: read-only
// (no DB writes). Max 8 turns of history to keep context tight.
router.post("/v4/handson/:slug/:lessonCode/:conceptIndex/help", requireUser, async (req: Request, res: Response): Promise<void> => {
  try {
    const ctx = await resolveContext(req, res);
    if (!ctx) return;

    const task = await getOrGenerateHandsOnTask({
      versionId: ctx.versionId,
      lessonId: ctx.lessonId,
      conceptIndex: ctx.conceptIndex,
    });

    const body = (req.body ?? {}) as {
      question?: unknown;
      submission?: unknown;
      history?: unknown;
    };
    const question = String(body.question ?? "").slice(0, 1000).trim();
    if (!question) { res.status(400).json({ error: "empty_question" }); return; }

    const submission = String(body.submission ?? "").slice(0, 3000);
    const rawHistory = Array.isArray(body.history) ? body.history.slice(-8) : [];
    const history = rawHistory
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m: any) => ({ role: m.role as "user" | "assistant", content: String(m.content).slice(0, 800) }));

    const taskCtx = task
      ? `المهمة: ${task.scenario}\nالمطلوب: ${task.deliverable}\nالخطوات: ${(task.steps ?? []).join(" | ")}`
      : `المفهوم: ${ctx.concept.name}`;

    const submissionNote = submission.trim()
      ? `\n\nإجابة الطالب الحالية (لا تعطِ الحل مباشرة):\n${submission.slice(0, 500)}`
      : "";

    const systemPrompt = `أنت مساعد تلميح في منصة نُخبة التعليمية اليمنية.

## سياق المهمة
المفهوم: «${ctx.concept.name}»
${taskCtx}${submissionNote}

## قواعد لا تُكسر أبداً
1. **ممنوع مطلقاً** إعطاء الكود الكامل أو الإجابة الصحيحة مباشرةً، حتى لو طلب الطالب ذلك صراحةً.
2. **ممنوع** كتابة أي سطر كود قابل للنسخ واللصق.
3. أعطِ **تلميحاً واحداً فقط** في كل رد — سؤال توجيهي، تشبيه من الحياة اليومية، أو إشارة لخطوة بعينها دون ذكر الكود.
4. إذا ألحّ الطالب وطلب الحل مباشرةً، أجبه بلطف: "أنا هنا أساعدك تفهم، مش أحلّ عنك!"
5. الرد: 2-3 جمل فقط، عربي يمني بسيط.
رد فقط بـ JSON: {"answer": "..."}`;

    // Build a single userPrompt that includes conversation history
    const historyBlock = history.length > 0
      ? history.map((m) => `[${m.role === "user" ? "طالب" : "مساعد"}]: ${m.content}`).join("\n") + "\n"
      : "";
    const userPrompt = `${historyBlock}[طالب]: ${question}`;

    const raw = await generateGeminiJson({
      systemPrompt,
      userPrompt,
      model: V4_TEACHING_MODEL,
      maxOutputTokens: 400,
      temperature: 0.7,
      logTag: "v4-handson-help",
    });

    const answer = typeof (raw as any)?.answer === "string" ? (raw as any).answer.trim() : "";
    if (!answer) { res.status(500).json({ error: "help_unavailable" }); return; }

    res.json({ answer });
  } catch (e) {
    logger.error?.({ err: String((e as any)?.message ?? e) }, "[v4/handson/help] failed");
    res.status(500).json({ error: "help_unavailable" });
  }
});

export default router;
