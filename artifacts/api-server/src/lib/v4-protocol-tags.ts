/**
 * v4-protocol-tags.ts — Parser + persistence for the v4 teaching protocol tags.
 *
 * Tags the teacher MAY emit (case-sensitive, square brackets, plain ASCII
 * inside the brackets — the regex must not be tripped by RTL marks):
 *
 *   [LESSON_MASTERED]
 *   [SESSION_COMPLETE]
 *   [MASTERY: concept=<index> value=<0..100>]
 *   [NEEDS_REVIEW: concept=<index>]
 *   [DIFFICULTY_UP] / [DIFFICULTY_DOWN]
 *   [UNIT_COMPLETE] / [STAGE_COMPLETE] / [LEVEL_COMPLETE]
 *   [[CREATE_LAB_ENV: kind=<diagnostic|decision|application|analysis|connection>]]
 *
 * The parser is forgiving on whitespace inside the bracket payload but
 * strict on the keyword + brackets so we don't accidentally consume
 * student Arabic prose that happens to contain similar words.
 *
 * The parser ONLY extracts — it never mutates DB. `applyTagEffects` is
 * the single place where tags become side-effects, so it's also the
 * single place to audit (one log line per applied effect).
 */

import { and, eq, sql } from "drizzle-orm";
import { LAB_PASS_THRESHOLD } from "./v4-lab-exam-engine";
import {
  db,
  v4StudentPathsTable,
  v4ConceptMasteryTable,
  v4LessonConceptsTable,
  v4LessonsTable,
} from "@workspace/db";
import { logger } from "./logger";
import { bumpWeakness, clearWeakness, enforceLessonMasteryGate } from "./v4-memory";
import { publishProgressEvent } from "./v4-progress-events";

export type V4ProtocolTag =
  | { kind: "lesson_mastered" }
  | { kind: "session_complete" }
  | { kind: "mastery"; conceptIndex: number; value: number }
  | { kind: "needs_review"; conceptIndex: number }
  | { kind: "difficulty"; direction: "up" | "down" }
  | { kind: "unit_complete" }
  | { kind: "stage_complete" }
  | { kind: "level_complete" }
  | { kind: "create_lab_env"; labKind: string }
  // R5 — emitted by the lab/exam evaluator (or, defensively, by the teacher
  // chat stream) when a student finishes a lab or exam. Pure signalling: the
  // actual persistence is owned by the lab/exam submit routes; the tag
  // handler just publishes an SSE event so the live map can react without
  // a refresh.
  | { kind: "lab_mastered"; labCode: string; score: number }
  | {
      kind: "exam_mastered";
      examCode: string;
      scope: "unit" | "stage" | "level";
      score: number;
    };

const SIMPLE_TAGS: Record<string, V4ProtocolTag> = {
  LESSON_MASTERED: { kind: "lesson_mastered" },
  SESSION_COMPLETE: { kind: "session_complete" },
  DIFFICULTY_UP: { kind: "difficulty", direction: "up" },
  DIFFICULTY_DOWN: { kind: "difficulty", direction: "down" },
  UNIT_COMPLETE: { kind: "unit_complete" },
  STAGE_COMPLETE: { kind: "stage_complete" },
  LEVEL_COMPLETE: { kind: "level_complete" },
};

const PARAM_TAG_RE = /\[(MASTERY|NEEDS_REVIEW)\s*:\s*([^\]]+)\]/g;
const LAB_TAG_RE = /\[\[\s*CREATE_LAB_ENV\s*:\s*([^\]]+)\]\]/g;
const SIMPLE_TAG_RE = /\[(LESSON_MASTERED|SESSION_COMPLETE|DIFFICULTY_UP|DIFFICULTY_DOWN|UNIT_COMPLETE|STAGE_COMPLETE|LEVEL_COMPLETE)\]/g;
// R5 — `[LAB_MASTERED: lab_code=1.1.1.م1, score=80]`
//      `[EXAM_MASTERED: exam_code=1.1.exam, kind=stage, score=85]`
// Accept both `lab_id`/`lab_code` (and `exam_id`/`exam_code`) so a teacher
// who emits either spelling works. The payload allows Arabic characters
// (lab codes contain "م") and standard separators.
const LAB_MASTERED_TAG_RE = /\[LAB_MASTERED\s*:\s*([^\]]+)\]/g;
const EXAM_MASTERED_TAG_RE = /\[EXAM_MASTERED\s*:\s*([^\]]+)\]/g;
// VIZ animation tag — emitted by the teacher to request an inline visual
// component (python_trace, js_trace, packet_flow, accounting_t_account,
// regex_match). Format: [[VIZ: template=<name>, payload=<JSON>]] — JSON
// may contain commas/braces/quotes; we match non-greedily up to the
// closing `]]` followed by either EOL/whitespace or another tag.
// Produces NO DB side-effects (front-end-only render hint), and is
// intentionally NOT stripped from prose by `stripProtocolTags` so the
// FE renderer can locate it inside the message body. Exported so
// callers (logging, telemetry, prompt-compliance checks) can detect
// VIZ usage without duplicating the pattern.
export const VIZ_TAG_RE = /\[\[\s*VIZ\s*:\s*([^\]]*?(?:\][^\]]*?)*?)\]\]/g;

/** Cheap, non-mutating check used by telemetry / prompt compliance: did
 *  this teacher chunk emit at least one VIZ tag? Does not validate
 *  payload — only proves the tag is present. */
export function hasVizTag(text: string): boolean {
  if (!text) return false;
  // Use a fresh local regex so callers don't share `lastIndex` state.
  return /\[\[\s*VIZ\s*:/.test(text);
}

/** Extract VIZ markers as `{template, payloadRaw}` pairs. Returns []
 *  when none present. Used by logging and (in the future) server-side
 *  validation of teacher VIZ payloads — does NOT parse the JSON. */
export function extractVizMarkers(text: string): Array<{ template: string; payloadRaw: string }> {
  if (!text) return [];
  const out: Array<{ template: string; payloadRaw: string }> = [];
  const re = new RegExp(VIZ_TAG_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const body = (m[1] ?? "").trim();
    const tmpl = body.match(/template\s*=\s*([a-zA-Z0-9_\-]+)/)?.[1] ?? "";
    const payload = body.match(/payload\s*=\s*([\s\S]+)$/)?.[1]?.trim() ?? "";
    if (tmpl) out.push({ template: tmpl, payloadRaw: payload });
  }
  return out;
}

// CODE_TASK marker — emitted by the teacher when it wants to PUSH the student
// to write code in the Nukhba editor. Pure UI-signal (no DB side-effect): the
// FE captures the requirement and, when the student opens محرّر نُخبة, shows it
// as a designed popup. Format: `[[CODE_TASK: lang=python | <requirement>]]`
// (the `lang=` prefix is optional). Stripped from prose by stripProtocolTags
// so the raw marker never reaches the student; the requirement is delivered to
// the FE via the `done` SSE event instead.
// The closing `]](?!\])` is tempered so a requirement that itself ends in a
// bracket (e.g. `... جرّبها على [3, 9, 5]`) closes on the LAST `]]` — otherwise
// the requirement would be truncated and a stray `]` would leak into prose.
const CODE_TASK_TAG_RE = /\[\[\s*CODE_TASK\s*:\s*([\s\S]*?)\]\](?!\])/g;

/** Extract the LAST CODE_TASK marker from a chunk of teacher prose. Returns
 *  null when none present. `lang` is the optional `lang=` prefix (lowercased)
 *  or null — callers may infer the language from the requirement otherwise. */
export function extractCodeTask(
  text: string,
): { requirement: string; lang: string | null } | null {
  if (!text) return null;
  const re = new RegExp(CODE_TASK_TAG_RE.source, "g");
  let m: RegExpExecArray | null;
  let last: { requirement: string; lang: string | null } | null = null;
  while ((m = re.exec(text)) !== null) {
    let body = (m[1] ?? "").trim();
    if (!body) continue;
    let lang: string | null = null;
    const langMatch = body.match(/^lang\s*=\s*([a-zA-Z0-9_+#-]+)\s*[|\n]?/);
    if (langMatch) {
      lang = langMatch[1].toLowerCase();
      body = body.slice(langMatch[0].length).trim();
    }
    if (body) last = { requirement: body, lang };
  }
  return last;
}

/** Extract all v4 protocol tags from a chunk of teacher prose.
 *
 * Tag ORDER matters: `[MASTERY ...]` emitted BEFORE `[LESSON_MASTERED]` in
 * the same message must be applied first so the task #6 mastery gate sees
 * the freshly-written score. We therefore collect every match together
 * with its `index` in the source string and sort by that index — the
 * three regex families are otherwise disjoint and don't overlap so source
 * position is a total order.
 */
export function parseProtocolTags(text: string): V4ProtocolTag[] {
  if (!text) return [];
  const collected: Array<{ at: number; tag: V4ProtocolTag }> = [];

  let m: RegExpExecArray | null;
  SIMPLE_TAG_RE.lastIndex = 0;
  while ((m = SIMPLE_TAG_RE.exec(text)) !== null) {
    const t = SIMPLE_TAGS[m[1]];
    if (t) collected.push({ at: m.index, tag: t });
  }

  PARAM_TAG_RE.lastIndex = 0;
  while ((m = PARAM_TAG_RE.exec(text)) !== null) {
    const name = m[1];
    const payload = m[2];
    const conceptMatch = payload.match(/concept\s*=\s*(\d+)/i);
    if (!conceptMatch) continue;
    const conceptIndex = parseInt(conceptMatch[1], 10);
    if (!Number.isFinite(conceptIndex) || conceptIndex < 1) continue;

    if (name === "MASTERY") {
      const valueMatch = payload.match(/value\s*=\s*(\d+)/i);
      if (!valueMatch) continue;
      const value = Math.max(0, Math.min(100, parseInt(valueMatch[1], 10)));
      collected.push({ at: m.index, tag: { kind: "mastery", conceptIndex, value } });
    } else {
      collected.push({ at: m.index, tag: { kind: "needs_review", conceptIndex } });
    }
  }

  LAB_TAG_RE.lastIndex = 0;
  while ((m = LAB_TAG_RE.exec(text)) !== null) {
    const payload = m[1];
    const kindMatch = payload.match(/kind\s*=\s*([a-zA-Z_]+)/);
    const labKind = kindMatch ? kindMatch[1].toLowerCase() : "application";
    collected.push({ at: m.index, tag: { kind: "create_lab_env", labKind } });
  }

  LAB_MASTERED_TAG_RE.lastIndex = 0;
  while ((m = LAB_MASTERED_TAG_RE.exec(text)) !== null) {
    const payload = m[1];
    const codeMatch = payload.match(/lab_(?:code|id)\s*=\s*([^,\s\]]+)/);
    if (!codeMatch) continue;
    const labCode = codeMatch[1].trim();
    if (!labCode) continue;
    const scoreMatch = payload.match(/score\s*=\s*(\d+)/);
    const score = scoreMatch ? Math.max(0, Math.min(100, parseInt(scoreMatch[1], 10))) : 0;
    collected.push({ at: m.index, tag: { kind: "lab_mastered", labCode, score } });
  }

  EXAM_MASTERED_TAG_RE.lastIndex = 0;
  while ((m = EXAM_MASTERED_TAG_RE.exec(text)) !== null) {
    const payload = m[1];
    const codeMatch = payload.match(/exam_(?:code|id)\s*=\s*([^,\s\]]+)/);
    if (!codeMatch) continue;
    const examCode = codeMatch[1].trim();
    if (!examCode) continue;
    const kindMatch = payload.match(/kind\s*=\s*(unit|stage|level)/i);
    const scope = (kindMatch ? kindMatch[1].toLowerCase() : "unit") as "unit" | "stage" | "level";
    const scoreMatch = payload.match(/score\s*=\s*(\d+)/);
    const score = scoreMatch ? Math.max(0, Math.min(100, parseInt(scoreMatch[1], 10))) : 0;
    collected.push({ at: m.index, tag: { kind: "exam_mastered", examCode, scope, score } });
  }

  collected.sort((a, b) => a.at - b.at);
  return collected.map((c) => c.tag);
}

export type TagEffectsContext = {
  userId: number;
  subjectSlug: string;
  /** Numeric PK of the lesson the teacher is currently on. */
  lessonId: number;
  /** Canonical "L.S.U.Lesson" code of the lesson. */
  lessonCode: string;
};

export type AppliedEffects = {
  lessonAdvanced: boolean;
  nextLessonCode: string | null;
  sessionComplete: boolean;
  unitComplete: boolean;
  stageComplete: boolean;
  levelComplete: boolean;
  conceptMasteryUpdates: Array<{ conceptIndex: number; score: number }>;
  needsReview: number[];
  difficultyAdjustments: Array<"up" | "down">;
  labEnvRequests: string[];
  /** Set when [LESSON_MASTERED] was emitted but the mastery gate (task #6)
   *  refused advancement because one or more concepts are still < 75. The
   *  SSE final event carries this so the FE can tell the student the
   *  teacher tried to graduate them too early. */
  masteryGateBlocked?: { missing: Array<{ conceptIndex: number; score: number }> };
};

/**
 * Apply parsed tags to the DB. Idempotent on a per-tag basis — re-running
 * with the same tags produces the same final state (mastery scores are
 * SET, not added; lesson advancement is no-op if currentLesson already
 * moved past).
 *
 * Returns a summary of what changed so the SSE final event can carry the
 * deltas to the FE (map highlights, balance widget refresh, etc.).
 */
export async function applyTagEffects(
  ctx: TagEffectsContext,
  tags: V4ProtocolTag[],
): Promise<AppliedEffects> {
  const result: AppliedEffects = {
    lessonAdvanced: false,
    nextLessonCode: null,
    sessionComplete: false,
    unitComplete: false,
    stageComplete: false,
    levelComplete: false,
    conceptMasteryUpdates: [],
    needsReview: [],
    difficultyAdjustments: [],
    labEnvRequests: [],
  };

  // ت٦ — Pre-load valid concept indices for this lesson so phantom concept tags
  // (hallucinated by a model with an off-by-one or fabricated index) are dropped
  // silently instead of creating orphan mastery rows that corrupt the LDIAG
  // weighted average and the gate check.
  let validConceptIndices: Set<number> | null = null;
  const hasMasteryTags = tags.some(t => t.kind === "mastery" || t.kind === "needs_review");
  if (hasMasteryTags) {
    try {
      const conceptRows = await db
        .select({ conceptIndex: v4LessonConceptsTable.conceptIndex })
        .from(v4LessonConceptsTable)
        .where(eq(v4LessonConceptsTable.lessonId, ctx.lessonId));
      // Only activate the guard when the DB has rows for this lesson.
      // If the lesson has no authored concepts yet (possible during dev), skip
      // the filter so normal operation isn't blocked.
      if (conceptRows.length > 0) {
        validConceptIndices = new Set(conceptRows.map(r => r.conceptIndex));
      }
    } catch (e) {
      logger.warn?.(`[v4-protocol-tags] concept pre-load failed lesson=${ctx.lessonId}: ${String((e as any)?.message ?? e)}`);
    }
  }

  for (const t of tags) {
    try {
      switch (t.kind) {
        case "mastery": {
          // ت٦ — drop tags for concept indices that don't exist in this lesson
          if (validConceptIndices && !validConceptIndices.has(t.conceptIndex)) {
            logger.warn?.(`[v4-protocol-tags] ignored mastery tag for non-existent conceptIndex=${t.conceptIndex} lesson=${ctx.lessonId}`);
            break;
          }
          await db
            .insert(v4ConceptMasteryTable)
            .values({
              userId: ctx.userId,
              lessonId: ctx.lessonId,
              conceptIndex: t.conceptIndex,
              score: t.value,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [
                v4ConceptMasteryTable.userId,
                v4ConceptMasteryTable.lessonId,
                v4ConceptMasteryTable.conceptIndex,
              ],
              // ع١ — monotonic guard: GREATEST ensures a [MASTERY: value=85] that
              // fires after a previous [MASTERY: value=90] never regresses the score.
              // Without this an out-of-order retry or a repeated tag in the same turn
              // could silently lower a high score to a lower one.
              set: { score: sql`GREATEST(${v4ConceptMasteryTable.score}, ${t.value})`, updatedAt: new Date() },
            });
          result.conceptMasteryUpdates.push({ conceptIndex: t.conceptIndex, score: t.value });
          // ذ١ — when the concept reaches mastery threshold, clear the cross-session
          // weakness tracker so Layer 4 stops surfacing it as an unresolved gap.
          // Best-effort: failure must not block the tag's main mastery write.
          if (t.value >= 75) {
            void clearWeakness({
              userId: ctx.userId,
              lessonId: ctx.lessonId,
              conceptIndex: t.conceptIndex,
            }).catch(() => {});
          }
          break;
        }
        case "needs_review": {
          // ت٦ — drop tags for concept indices that don't exist in this lesson
          if (validConceptIndices && !validConceptIndices.has(t.conceptIndex)) {
            logger.warn?.(`[v4-protocol-tags] ignored needs_review tag for non-existent conceptIndex=${t.conceptIndex} lesson=${ctx.lessonId}`);
            break;
          }
          // Soft signal — set the concept's score to a "gap" band so
          // the next session-prompt layer flags it. No upsert
          // collision: we read-then-write inside a single statement.
          await db
            .insert(v4ConceptMasteryTable)
            .values({
              userId: ctx.userId,
              lessonId: ctx.lessonId,
              conceptIndex: t.conceptIndex,
              score: 40,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [
                v4ConceptMasteryTable.userId,
                v4ConceptMasteryTable.lessonId,
                v4ConceptMasteryTable.conceptIndex,
              ],
              set: {
                // ع٢ — protect earned mastery from hallucinated NEEDS_REVIEW:
                // if the concept is already mastered (score ≥ 75), demote it
                // to "shaky" (60) — not "weak" (40). A truly mastered concept
                // should not be erased by a single teacher signal that may be
                // a hallucination. If the concept was already below 75, the
                // original LEAST(score, 40) behavior is preserved.
                score: sql`CASE WHEN ${v4ConceptMasteryTable.score} >= 75 THEN 60 ELSE LEAST(${v4ConceptMasteryTable.score}, 40) END`,
                updatedAt: new Date(),
              },
            });
          result.needsReview.push(t.conceptIndex);
          // task #6: a NEEDS_REVIEW is the canonical "the student keeps
          // tripping on this" signal — bump the cross-session weakness
          // tracker so Layer 4 can surface it in future sessions. Best-
          // effort; failure does not block the tag's other effects.
          await bumpWeakness({
            userId: ctx.userId,
            lessonId: ctx.lessonId,
            conceptIndex: t.conceptIndex,
          });
          break;
        }
        case "lesson_mastered": {
          // task #6 mastery gate: refuse advancement unless every concept
          // of the lesson has a stored score ≥ 75. The check runs AFTER
          // any [MASTERY: …] tags emitted in the same message because
          // tags are applied in order — so a teacher emitting both
          // "MASTERY value=80" and "LESSON_MASTERED" in the same turn
          // gets its mastery write committed first, then the gate sees
          // the updated row.
          const gate = await enforceLessonMasteryGate({
            userId: ctx.userId,
            lessonId: ctx.lessonId,
          });
          if (!gate.allMastered) {
            result.masteryGateBlocked = { missing: gate.missing };
            logger.info?.(
              `[v4-protocol-tags] LESSON_MASTERED blocked by gate user=${ctx.userId} lesson=${ctx.lessonCode} missing=${gate.missing.map((m) => `${m.conceptIndex}:${m.score}`).join(",")}`,
            );
            break;
          }
          const advanced = await advanceLessonPointer(ctx);
          result.lessonAdvanced = advanced.advanced;
          result.nextLessonCode = advanced.nextCode;
          break;
        }
        case "session_complete":
          result.sessionComplete = true;
          break;
        case "unit_complete":
          result.unitComplete = true;
          break;
        case "stage_complete":
          result.stageComplete = true;
          break;
        case "level_complete":
          result.levelComplete = true;
          break;
        case "difficulty":
          result.difficultyAdjustments.push(t.direction);
          break;
        case "create_lab_env":
          // Lab env spinning is task #7. Surface as a "request" so the FE
          // can show "المعلم اقترح معملاً" and the task #7 router can
          // pick it up later.
          result.labEnvRequests.push(t.labKind);
          break;
        case "lab_mastered": {
          // R5 — purely a signalling tag. Durable persistence of a lab
          // attempt is owned by POST /v4/specialties/:slug/labs/:lab/submit
          // (writes to v4_lab_completions in a transaction, charges gems,
          // updates mastery). The tag exists so the teacher chat stream
          // can ALSO surface a "lab done" celebration on the open map
          // without waiting for a refresh — e.g. when the teacher
          // narrates the result inline. Idempotent w.r.t. the submit
          // route because the FE handler is duplicate-safe (score band
          // re-derivation matches; node already marked completed).
          try {
            publishProgressEvent(ctx.userId, ctx.subjectSlug, {
              kind: "node_completed",
              slug: ctx.subjectSlug,
              nodeId: t.labCode,
              nodeKind: "lab",
              score: t.score,
              passed: t.score >= LAB_PASS_THRESHOLD,
            });
            if (t.score >= LAB_PASS_THRESHOLD) {
              publishProgressEvent(ctx.userId, ctx.subjectSlug, {
                kind: "celebration",
                slug: ctx.subjectSlug,
                scope: "lab",
                name: t.labCode,
                score: t.score,
              });
            }
          } catch (e) {
            logger.warn?.(`[v4-protocol-tags] lab_mastered publish failed: ${String((e as any)?.message ?? e)}`);
          }
          break;
        }
        case "exam_mastered": {
          // R5 — see lab_mastered. The submit route remains the source of
          // truth for v4_exam_attempts + the unlock recompute; this tag
          // only adds a live UI hint for teacher-stream contexts. We do
          // NOT republish a nodes_unlocked event here because the tag
          // payload doesn't (and shouldn't) carry the unlock set — the
          // submit route owns that read-after-write.
          try {
            const nodeKind: "unit_test" | "stage_test" | "level_test" =
              t.scope === "unit" ? "unit_test" : t.scope === "stage" ? "stage_test" : "level_test";
            publishProgressEvent(ctx.userId, ctx.subjectSlug, {
              kind: "node_completed",
              slug: ctx.subjectSlug,
              nodeId: t.examCode,
              nodeKind,
              score: t.score,
              passed: t.score >= 70,
            });
            if (t.score >= 70) {
              publishProgressEvent(ctx.userId, ctx.subjectSlug, {
                kind: "celebration",
                slug: ctx.subjectSlug,
                scope: t.scope,
                name: t.examCode,
                score: t.score,
              });
            }
          } catch (e) {
            logger.warn?.(`[v4-protocol-tags] exam_mastered publish failed: ${String((e as any)?.message ?? e)}`);
          }
          break;
        }
      }
    } catch (e) {
      logger.warn?.(
        `[v4-protocol-tags] effect failed user=${ctx.userId} lesson=${ctx.lessonCode} tag=${t.kind}: ${String((e as any)?.message ?? e)}`,
      );
    }
  }

  return result;
}

/**
 * Parse a canonical "L.S.U.Lesson" lesson code into a numeric tuple so
 * codes compare numerically (1.1.1.10 > 1.1.1.9). Strings that don't
 * match the 4-segment shape sort to the end via Number.POSITIVE_INFINITY.
 */
function parseLessonCode(code: string): [number, number, number, number] {
  const parts = code.split(".").map((s) => parseInt(s, 10));
  return [
    Number.isFinite(parts[0]) ? parts[0] : Number.POSITIVE_INFINITY,
    Number.isFinite(parts[1]) ? parts[1] : Number.POSITIVE_INFINITY,
    Number.isFinite(parts[2]) ? parts[2] : Number.POSITIVE_INFINITY,
    Number.isFinite(parts[3]) ? parts[3] : Number.POSITIVE_INFINITY,
  ];
}

function compareLessonCodes(a: string, b: string): number {
  const ax = parseLessonCode(a);
  const bx = parseLessonCode(b);
  for (let i = 0; i < 4; i++) {
    if (ax[i] !== bx[i]) return ax[i] - bx[i];
  }
  return 0;
}

/**
 * Move the student's currentLessonCode to the next unlocked lesson, and
 * unlock the NEXT lesson after that one (so the map always shows one
 * lesson ahead as "available").
 *
 * Ordering is NUMERIC on the 4 segments of the canonical "L.S.U.Lesson"
 * code — codes are NOT zero-padded, so lexicographic sort puts ".10"
 * before ".9". We parse to a tuple and compare numerically end-to-end,
 * both for the in-memory unlocked list and for the SQL successor lookup
 * (we fetch all codes for the version and pick numerically, since there
 * is no portable way to do tuple-aware comparison in SQL).
 */
async function advanceLessonPointer(ctx: TagEffectsContext): Promise<{
  advanced: boolean;
  nextCode: string | null;
}> {
  const [path] = await db
    .select()
    .from(v4StudentPathsTable)
    .where(and(
      eq(v4StudentPathsTable.userId, ctx.userId),
      eq(v4StudentPathsTable.subjectId, ctx.subjectSlug),
    ));
  if (!path) return { advanced: false, nextCode: null };

  const unlocked: string[] = Array.isArray(path.unlockedLessonCodes)
    ? [...(path.unlockedLessonCodes as string[])]
    : [];
  // If teacher emitted LESSON_MASTERED for a lesson the student isn't on,
  // ignore — only the current lesson can advance.
  if (path.currentLessonCode !== ctx.lessonCode) {
    return { advanced: false, nextCode: path.currentLessonCode };
  }

  // Test-out model: the lesson pointer only ever advances WITHIN the current
  // unit. Mastering the last lesson of a unit must NOT auto-open the next unit
  // — the next unit is gated behind THIS unit's exam (opened by the shared
  // progression engine on exam submit / map reconcile), not by lesson mastery.
  //
  // Ordering is NUMERIC on the 4 segments (codes are NOT zero-padded, so a
  // lexicographic sort wrongly puts ".10" before ".9").
  const currentUnitPrefix = ctx.lessonCode.split(".").slice(0, 3).join(".");
  const sameUnit = (c: string) => c.split(".").slice(0, 3).join(".") === currentUnitPrefix;

  unlocked.sort(compareLessonCodes);
  // Smallest already-unlocked code in the SAME unit strictly greater than current.
  let nextCode: string | null =
    unlocked.find((c) => sameUnit(c) && compareLessonCodes(c, ctx.lessonCode) > 0) ?? null;

  if (!nextCode) {
    // Look for the immediate SAME-UNIT successor in v4_lessons and unlock it.
    // Fetch all codes for the version and pick the numeric successor in JS
    // (SQL `code > x` compares lexicographically and would skip ".10").
    const allCodes = await db
      .select({ code: v4LessonsTable.code })
      .from(v4LessonsTable)
      .where(eq(v4LessonsTable.versionId, path.versionId));
    const successor = allCodes
      .map((r: { code: string }) => r.code)
      .filter((c: string) => sameUnit(c) && compareLessonCodes(c, ctx.lessonCode) > 0)
      .sort(compareLessonCodes)[0];
    if (successor) {
      nextCode = successor;
      if (!unlocked.includes(successor)) unlocked.push(successor);
    }
  }

  if (!nextCode) {
    // Reached the end of this unit — stay put. The next unit opens only by
    // passing this unit's exam, not by mastering its last lesson.
    return { advanced: false, nextCode: path.currentLessonCode };
  }

  await db
    .update(v4StudentPathsTable)
    .set({
      currentLessonCode: nextCode,
      unlockedLessonCodes: unlocked,
      updatedAt: new Date(),
    })
    .where(eq(v4StudentPathsTable.id, path.id));

  return { advanced: true, nextCode };
}

/** Strip all protocol tags from prose before sending it to the student.
 *  IMPORTANT: does NOT trim — word-boundary spaces in mid-stream chunks
 *  must survive so the client can concatenate deltas without fusing
 *  Arabic words. Callers that need final trimming should do it themselves. */
export function stripProtocolTags(text: string): string {
  if (!text) return text;
  return text
    .replace(CODE_TASK_TAG_RE, "")
    .replace(LAB_TAG_RE, "")
    .replace(LAB_MASTERED_TAG_RE, "")
    .replace(EXAM_MASTERED_TAG_RE, "")
    .replace(PARAM_TAG_RE, "")
    .replace(SIMPLE_TAG_RE, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}
