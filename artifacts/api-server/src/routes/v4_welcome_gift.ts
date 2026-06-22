// ─────────────────────────────────────────────────────────────────────────────
// v4 welcome-gift routes (student-facing).
//
// Mounted under /api. Same cookie-session + same-origin CSRF posture as the
// other v4 student routes (custom X-Nukhba-Csrf header + Origin/Referer check),
// because the global CORS config is `origin: true, credentials: true`.
//
// Endpoints (relative to /api):
//   GET  /v4/welcome-gift            — status (pool + allocations)
//   POST /v4/welcome-gift/shown      — mark the first-entry modal as shown
//   POST /v4/welcome-gift/allocate   — { subjectId, gems, finalize? }
// ─────────────────────────────────────────────────────────────────────────────
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { logger } from "../lib/logger";
import {
  getWelcomeGiftStatus,
  markWelcomeGiftShown,
  allocateWelcomeGift,
  WelcomeGiftError,
} from "../lib/v4-welcome-gift";
import { resolveActiveSpecialty } from "../lib/v4-path-engine";

const router: IRouter = Router();

function getUserId(req: Request): number | null {
  return ((req as any).session as any)?.userId ?? null;
}

function requireUser(req: Request, res: Response, next: NextFunction): void {
  const uid = getUserId(req);
  if (!uid) { res.status(401).json({ error: "Unauthorized" }); return; }
  (req as any).userId = uid;
  next();
}

// Same custom-header + same-origin CSRF defense as the other v4 routes.
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

function mapGiftError(e: unknown, res: Response): boolean {
  if (e instanceof WelcomeGiftError) {
    const status = e.code === "WELCOME_GIFT_BAD_AMOUNT" ? 400 : 409;
    res.status(status).json({ error: e.code, message: e.message });
    return true;
  }
  return false;
}

// ── GET /v4/welcome-gift ────────────────────────────────────────────────────
router.get("/v4/welcome-gift", requireUser, async (req, res) => {
  const uid: number = (req as any).userId;
  try {
    const status = await getWelcomeGiftStatus(uid);
    res.json(status);
  } catch (e) {
    logger.error?.(`[v4/welcome-gift GET] user=${uid}: ${String((e as any)?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

// ── POST /v4/welcome-gift/shown ─────────────────────────────────────────────
router.post("/v4/welcome-gift/shown", requireUser, requireSameOriginCsrf, async (req, res) => {
  const uid: number = (req as any).userId;
  try {
    const status = await markWelcomeGiftShown(uid);
    res.json(status);
  } catch (e) {
    logger.error?.(`[v4/welcome-gift/shown] user=${uid}: ${String((e as any)?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

// ── POST /v4/welcome-gift/allocate ──────────────────────────────────────────
router.post("/v4/welcome-gift/allocate", requireUser, requireSameOriginCsrf, async (req, res) => {
  const uid: number = (req as any).userId;
  const body = (req.body ?? {}) as { subjectId?: unknown; gems?: unknown; finalize?: unknown };
  const subjectId = typeof body.subjectId === "string" ? body.subjectId.trim() : "";
  const gems = Number(body.gems);
  const finalize = body.finalize === true;

  if (!subjectId) {
    res.status(400).json({ error: "subjectId is required" });
    return;
  }
  if (!Number.isInteger(gems) || gems < 0) {
    res.status(400).json({ error: "gems must be a non-negative integer" });
    return;
  }

  try {
    // Don't burn the gift into a wallet for a specialty that has no published
    // instruction file — that subject can't be studied.
    const resolved = await resolveActiveSpecialty(subjectId);
    if (!resolved) {
      res.status(404).json({ error: "specialty not available" });
      return;
    }

    const status = await allocateWelcomeGift(uid, subjectId, gems, { finalize });
    res.json(status);
  } catch (e) {
    if (mapGiftError(e, res)) return;
    logger.error?.(`[v4/welcome-gift/allocate] user=${uid} subj=${subjectId}: ${String((e as any)?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

export default router;
