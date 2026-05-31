/**
 * v4-progress-events.ts — Per-user in-memory SSE bus for student-progress
 * events (R5 — LAB_MASTERED / EXAM_MASTERED).
 *
 * Single-process pub/sub. Each subscriber is a live Express `res` whose
 * connection is held open as an `text/event-stream`. Publishers (the
 * lab/exam submit endpoints, and the protocol-tag handler for any
 * teacher-emitted LAB_MASTERED/EXAM_MASTERED tag) call `publishProgressEvent`
 * which fans the JSON event out to every subscriber for that user.
 *
 * Out of scope (acknowledged): cross-process broadcast. Replit deploys
 * one Node process per app, so an in-memory Map<userId, Set<res>> is
 * sufficient. A future multi-worker deploy would swap this for
 * Redis pub/sub — the public API (`publishProgressEvent`,
 * `subscribeProgressEvents`) is the natural seam.
 */
import type { Response } from "express";
import { logger } from "./logger";

/**
 * All progress events carry the subject `slug` so the FE can defensively
 * ignore any payload that doesn't match its open map. The bus also keys
 * subscriptions by `(userId, slug)` so cross-specialty bleed is impossible
 * even before the FE filter runs — but the slug-in-payload is kept as
 * a belt-and-braces guard.
 */
export type V4ProgressEvent =
  | {
      kind: "node_completed";
      slug: string;
      nodeId: string;          // canonical code: "1.1.1.م1" | "1.1.1.exam" | …
      nodeKind: "lab" | "unit_test" | "stage_test" | "level_test";
      score: number;           // 0..100
      passed: boolean;
    }
  | {
      kind: "nodes_unlocked";
      slug: string;
      codes: string[];         // newly-unlocked lesson codes
      nextLessonCode: string | null;
    }
  | {
      kind: "celebration";
      slug: string;
      scope: "lab" | "unit" | "stage" | "level";
      name: string;            // display label ("اختبار المرحلة 2" / lab title)
      score: number;
    };

type Subscriber = {
  res: Response;
  /** Cached per-subscriber heartbeat handle so unsubscribe can clear it. */
  heartbeat?: NodeJS.Timeout;
};

/** Bus keyed by `${userId}:${slug}` — see scoping note on V4ProgressEvent. */
const subscribers = new Map<string, Set<Subscriber>>();
const keyOf = (userId: number, slug: string): string => `${userId}:${slug}`;

/**
 * Register an open SSE response for `(userId, slug)`. The caller is
 * responsible for having already written the SSE headers + flushed
 * them. Returns an unsubscribe function the route should call on
 * `req.close`.
 */
export function subscribeProgressEvents(userId: number, slug: string, res: Response): () => void {
  if (!Number.isFinite(userId) || userId <= 0 || !slug) {
    return () => {};
  }
  const key = keyOf(userId, slug);
  const sub: Subscriber = { res };
  // Heartbeat every 20s — keeps the proxy from killing the stream while
  // also acting as a liveness check. Comment lines are ignored by the
  // EventSource spec.
  sub.heartbeat = setInterval(() => {
    try {
      if (!res.writableEnded) res.write(`: hb ${Date.now()}\n\n`);
    } catch {}
  }, 20_000);
  let set = subscribers.get(key);
  if (!set) {
    set = new Set();
    subscribers.set(key, set);
  }
  set.add(sub);

  return () => {
    try { if (sub.heartbeat) clearInterval(sub.heartbeat); } catch {}
    const s = subscribers.get(key);
    if (s) {
      s.delete(sub);
      if (s.size === 0) subscribers.delete(key);
    }
  };
}

/**
 * Fan an event out to every open SSE for this (user, slug). Best-effort:
 * dead sockets are silently dropped — write failures here don't propagate
 * to the publishing route. The `event.slug` field MUST match the second
 * argument; we don't cross-check to keep this hot path cheap, but the
 * type signature pushes callers toward correctness.
 */
export function publishProgressEvent(userId: number, slug: string, event: V4ProgressEvent): void {
  if (!slug) return;
  const set = subscribers.get(keyOf(userId, slug));
  if (!set || set.size === 0) return;
  const frame = `data: ${JSON.stringify(event)}\n\n`;
  for (const sub of Array.from(set)) {
    try {
      if (sub.res.writableEnded) {
        if (sub.heartbeat) clearInterval(sub.heartbeat);
        set.delete(sub);
        continue;
      }
      sub.res.write(frame);
    } catch (e) {
      try { if (sub.heartbeat) clearInterval(sub.heartbeat); } catch {}
      set.delete(sub);
      logger.warn?.(`[v4-progress-events] write failed user=${userId} slug=${slug}: ${String((e as any)?.message ?? e)}`);
    }
  }
  if (set.size === 0) subscribers.delete(keyOf(userId, slug));
}

/** Debug-only — returns how many open streams this (user, slug) has. */
export function progressSubscriberCount(userId: number, slug: string): number {
  return subscribers.get(keyOf(userId, slug))?.size ?? 0;
}
