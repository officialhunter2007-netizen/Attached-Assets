// Phase 3 hardening — in-memory server-side exam-attempt store. Holds the
// canonical telemetry counters for each in-flight exam attempt so the
// student client cannot lie about correctness or attempt counts. The store
// is intentionally NOT persisted across server restarts: an exam attempt's
// max lifetime is 8h and a server restart mid-exam invalidates it (the
// student's client will see /submit return 404 and can simply re-enter exam
// mode to mint a new attempt). This trade-off is deliberate to keep the
// hardening surface small and avoid an extra DB migration; the student
// experience is unaffected outside of restart windows.

export type ExamAttempt = {
  id: string;
  userId: number;
  subjectId: string;
  envSnapshot: any;
  startedAt: number;
  totalSubmitsByTask: Record<string, number>;
  failedSubmitsByTask: Record<string, number>;
  firstAttemptCorrectByTask: Record<string, boolean>;
  /**
   * The full canonical set of check-form task keys present in the env at
   * attempt-creation time. Used as the denominator in computeMastery so a
   * student can't "cherry-pick" — answer one easy check correctly, skip the
   * rest, and finalize at avg=100. Un-submitted keys count as 0.
   */
  expectedCheckKeys: string[];
  finalized: boolean;
};

const MAX_AGE_MS = 8 * 60 * 60 * 1000;
const SWEEP_EVERY_MS = 30 * 60 * 1000;
const MAX_TASK_KEYS_PER_ATTEMPT = 64;

const attempts = new Map<string, ExamAttempt>();
let lastSweepAt = 0;

function maybeSweep(): void {
  const now = Date.now();
  if (now - lastSweepAt < SWEEP_EVERY_MS) return;
  lastSweepAt = now;
  for (const [id, a] of attempts.entries()) {
    if (now - a.startedAt > MAX_AGE_MS) attempts.delete(id);
  }
}

export function createAttempt(p: {
  id: string;
  userId: number;
  subjectId: string;
  envSnapshot: any;
}): ExamAttempt {
  maybeSweep();
  const a: ExamAttempt = {
    id: p.id,
    userId: p.userId,
    subjectId: p.subjectId,
    envSnapshot: p.envSnapshot,
    startedAt: Date.now(),
    totalSubmitsByTask: {},
    failedSubmitsByTask: {},
    firstAttemptCorrectByTask: {},
    expectedCheckKeys: enumerateCheckTaskKeys(p.envSnapshot),
    finalized: false,
  };
  attempts.set(p.id, a);
  return a;
}

/**
 * Walk the env snapshot and produce the canonical set of check-form task
 * keys, using the SAME formula as the /exam/submit handler:
 *   `(componentTitle || screenId || "form").trim().slice(0, 60)`
 * Capped at MAX_TASK_KEYS_PER_ATTEMPT so a pathological env can't blow
 * memory. Duplicates collapse, matching server submit-side behavior.
 */
function enumerateCheckTaskKeys(envSnapshot: any): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  try {
    const screens: any[] = Array.isArray(envSnapshot?.screens) ? envSnapshot.screens : [];
    for (const screen of screens) {
      const screenId: string = typeof screen?.id === "string" ? screen.id : "";
      const comps: any[] = Array.isArray(screen?.components) ? screen.components : [];
      for (const comp of comps) {
        if (comp?.type !== "form" || comp?.submit?.type !== "check") continue;
        const title: string = typeof comp?.title === "string" ? comp.title : "";
        const key = (title || screenId || "form").trim().slice(0, 60);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        out.push(key);
        if (out.length >= MAX_TASK_KEYS_PER_ATTEMPT) return out;
      }
    }
  } catch {
    // Malformed env — return whatever we accumulated; computeMastery will
    // treat an empty list as "no expected checks" and fall back to the
    // submitted-keys denominator.
  }
  return out;
}

export function getAttempt(id: string, userId: number): ExamAttempt | null {
  if (typeof id !== "string" || !id) return null;
  const a = attempts.get(id);
  if (!a) return null;
  if (a.userId !== userId) return null; // ownership check
  if (Date.now() - a.startedAt > MAX_AGE_MS) {
    attempts.delete(id);
    return null;
  }
  return a;
}

export function recordSubmission(a: ExamAttempt, taskKey: string, correct: boolean): void {
  if (!taskKey) return;
  const trimmedKey = taskKey.slice(0, 80);
  // Cap attempt's task-key cardinality to avoid unbounded memory from a
  // misbehaving client posting random keys.
  if (
    !(trimmedKey in a.totalSubmitsByTask)
    && Object.keys(a.totalSubmitsByTask).length >= MAX_TASK_KEYS_PER_ATTEMPT
  ) {
    return;
  }
  a.totalSubmitsByTask[trimmedKey] = (a.totalSubmitsByTask[trimmedKey] || 0) + 1;
  if (!correct) {
    a.failedSubmitsByTask[trimmedKey] = (a.failedSubmitsByTask[trimmedKey] || 0) + 1;
  }
  // first-attempt correctness is set exactly once per task — on the first
  // submission for that task, recording whether it was correct.
  if (!(trimmedKey in a.firstAttemptCorrectByTask)) {
    a.firstAttemptCorrectByTask[trimmedKey] = correct;
  }
}

export function computeMastery(a: ExamAttempt): {
  avgMastery: number;
  perTask: Array<{ key: string; score: number; failed: number; firstOk: boolean; attempted: boolean }>;
  totalSubmits: number;
  totalFailed: number;
} {
  // Denominator: the canonical expectedCheckKeys list captured at attempt-
  // creation. A student who answers one easy check and skips the rest now
  // gets avg = 100/N, not avg = 100. Falls back to submitted keys only if
  // the env had no enumerable check forms (defensive — /exam/start already
  // refuses such envs with EXAM_INELIGIBLE_NO_CHECK).
  const baseKeys = a.expectedCheckKeys.length > 0
    ? a.expectedCheckKeys
    : Object.keys(a.totalSubmitsByTask);
  const submittedExtras = Object.keys(a.totalSubmitsByTask).filter((k) => !baseKeys.includes(k));
  const allKeys = [...baseKeys, ...submittedExtras];
  let masterySum = 0;
  let masteryCount = 0;
  const perTask: Array<{ key: string; score: number; failed: number; firstOk: boolean; attempted: boolean }> = [];
  for (const key of allKeys) {
    const total = a.totalSubmitsByTask[key] ?? 0;
    const attempted = total > 0;
    let score = 0;
    let failed = 0;
    let firstOk = false;
    if (attempted) {
      failed = a.failedSubmitsByTask[key] ?? 0;
      firstOk = a.firstAttemptCorrectByTask[key] === true;
      const base = firstOk ? 1 : Math.max(0, 1 - failed / 3);
      score = Math.round(base * 100);
    }
    masterySum += score;
    masteryCount++;
    perTask.push({ key, score, failed, firstOk, attempted });
  }
  const avgMastery = masteryCount > 0 ? Math.round(masterySum / masteryCount) : 0;
  const totalSubmits = Object.values(a.totalSubmitsByTask).reduce((x, y) => x + y, 0);
  const totalFailed = Object.values(a.failedSubmitsByTask).reduce((x, y) => x + y, 0);
  return { avgMastery, perTask, totalSubmits, totalFailed };
}

export function finalizeAttempt(a: ExamAttempt): void {
  a.finalized = true;
}

// ── Server-side answer checker ────────────────────────────────────────────
// Mirrors the client-side check in component-renderer.tsx so the SAME
// correctness verdict is reached on the server and the client UI doesn't
// drift from the recorded telemetry. We keep this self-contained here
// (rather than importing a shared module) because the server has no
// frontend dependencies and the comparison logic is small and stable.

const ARABIC_DIGITS_RE = /[٠-٩]/g;
function normalizeArabicDigits(s: string): string {
  return s.replace(ARABIC_DIGITS_RE, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

export function checkAnswer(
  expected: Record<string, unknown> | undefined,
  got: Record<string, unknown>,
  toleranceFrac: number,
): { ok: boolean; wrongFields: string[] } {
  const wrong: string[] = [];
  if (!expected || typeof expected !== "object") return { ok: false, wrongFields: ["__no_expected__"] };
  const tol = typeof toleranceFrac === "number" ? toleranceFrac : 0.01;
  for (const [k, ex] of Object.entries(expected)) {
    const raw = String(got[k] ?? "").trim();
    if (typeof ex === "number") {
      const normalized = normalizeArabicDigits(raw).replace(/[,،٬\s]/g, "");
      const n = parseFloat(normalized);
      if (isNaN(n) || Math.abs(n - ex) > Math.abs(ex * tol) + 0.0001) wrong.push(k);
    } else {
      const norm = (s: string) => normalizeArabicDigits(s).toLowerCase().replace(/\s+/g, "");
      if (norm(raw) !== norm(String(ex))) wrong.push(k);
    }
  }
  return { ok: wrong.length === 0, wrongFields: wrong };
}

// Find a check-type form component in the env snapshot by (screenId,
// componentTitle). Returns null if not found OR if the component is not a
// check-type submit (mutate/ask-ai don't have a deterministic correctness
// gate the server can validate without running the engine, so they are
// recorded as "ok" by the client and we trust client-side validation for
// those — they affect mastery only via failed validation messages, which a
// forging client could already simulate without server help).
export function findCheckComponent(
  envSnapshot: any,
  screenId: string,
  componentTitle: string,
): { expected: Record<string, unknown>; tolerance: number; correctMessage?: string; incorrectMessage?: string } | null {
  if (!envSnapshot || typeof envSnapshot !== "object") return null;
  const screens: any[] = Array.isArray(envSnapshot.screens) ? envSnapshot.screens : [];
  const screen = screens.find((s) => s?.id === screenId);
  if (!screen) return null;
  const comps: any[] = Array.isArray(screen.components) ? screen.components : [];
  const comp = comps.find((c) => (c?.title || "") === componentTitle && c?.submit?.type === "check");
  if (!comp) return null;
  return {
    expected: comp.submit.expected,
    tolerance: typeof comp.submit.tolerance === "number" ? comp.submit.tolerance : 0.01,
    correctMessage: typeof comp.submit.correctMessage === "string" ? comp.submit.correctMessage : undefined,
    incorrectMessage: typeof comp.submit.incorrectMessage === "string" ? comp.submit.incorrectMessage : undefined,
  };
}
