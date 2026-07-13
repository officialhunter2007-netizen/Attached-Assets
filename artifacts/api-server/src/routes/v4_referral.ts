// ─────────────────────────────────────────────────────────────────────────────
// v4 referral routes (student-facing).
//
// Mounted under /api. Same cookie-session + same-origin CSRF posture as the
// other v4 student routes (custom X-Nukhba-Csrf header + Origin/Referer check),
// because the global CORS config is `origin: true, credentials: true`.
//
// Endpoints (relative to /api):
//   GET  /v4/referral/info             — caller's referral code + counts (no PII)
//   POST /v4/referral/attribute        — { code } record who referred the caller
//   GET  /v4/referral/reward           — reward pool status + allocations
//   POST /v4/referral/reward/allocate  — { subjectId, gems } direct gems to a wallet
// ─────────────────────────────────────────────────────────────────────────────
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { logger } from "../lib/logger";
import {
  getReferralInfo,
  attributeReferral,
  getReferralRewardStatus,
  allocateReferralReward,
  ReferralError,
} from "../lib/v4-referral";
import { resolveActiveSpecialty } from "../lib/v4-path-engine";
import { requireSameOriginCsrf } from "../lib/csrf";

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

// Map a ReferralError to the right HTTP status. Returns true if handled.
function mapReferralError(e: unknown, res: Response): boolean {
  if (e instanceof ReferralError) {
    let status = 409;
    switch (e.code) {
      case "BAD_CODE":
      case "BAD_AMOUNT":
        status = 400;
        break;
      case "UNKNOWN_CODE":
      case "USER_NOT_FOUND":
        status = 404;
        break;
      case "SELF_REFERRAL":
      case "NOT_ELIGIBLE":
        status = 403;
        break;
      case "ALREADY_REFERRED":
      case "EXCEEDS_BALANCE":
      case "CODE_GEN_FAILED":
        status = 409;
        break;
    }
    res.status(status).json({ error: e.code, message: e.message });
    return true;
  }
  return false;
}

// ── GET /v4/referral/info ────────────────────────────────────────────────────
router.get("/v4/referral/info", requireUser, async (req, res) => {
  const uid: number = (req as any).userId;
  try {
    const info = await getReferralInfo(uid);
    res.json(info);
  } catch (e) {
    if (mapReferralError(e, res)) return;
    logger.error?.(`[v4/referral/info] user=${uid}: ${String((e as any)?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

// ── POST /v4/referral/attribute ─────────────────────────────────────────────
router.post("/v4/referral/attribute", requireUser, requireSameOriginCsrf, async (req, res) => {
  const uid: number = (req as any).userId;
  const body = (req.body ?? {}) as { code?: unknown };
  const code = typeof body.code === "string" ? body.code : "";
  try {
    const result = await attributeReferral(uid, code);
    res.json(result);
  } catch (e) {
    if (mapReferralError(e, res)) return;
    logger.error?.(`[v4/referral/attribute] user=${uid}: ${String((e as any)?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

// ── GET /v4/referral/reward ──────────────────────────────────────────────────
router.get("/v4/referral/reward", requireUser, async (req, res) => {
  const uid: number = (req as any).userId;
  try {
    const status = await getReferralRewardStatus(uid);
    res.json(status);
  } catch (e) {
    if (mapReferralError(e, res)) return;
    logger.error?.(`[v4/referral/reward GET] user=${uid}: ${String((e as any)?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

// ── POST /v4/referral/reward/allocate ───────────────────────────────────────
router.post("/v4/referral/reward/allocate", requireUser, requireSameOriginCsrf, async (req, res) => {
  const uid: number = (req as any).userId;
  const body = (req.body ?? {}) as { subjectId?: unknown; gems?: unknown };
  const subjectId = typeof body.subjectId === "string" ? body.subjectId.trim() : "";
  const gems = Number(body.gems);

  if (!subjectId) {
    res.status(400).json({ error: "subjectId is required" });
    return;
  }
  if (!Number.isInteger(gems) || gems <= 0) {
    res.status(400).json({ error: "gems must be a positive integer" });
    return;
  }

  try {
    // Don't burn referral gems into a wallet for a specialty with no published
    // instruction file — that subject can't be studied.
    const resolved = await resolveActiveSpecialty(subjectId);
    if (!resolved) {
      res.status(404).json({ error: "specialty not available" });
      return;
    }

    const status = await allocateReferralReward(uid, subjectId, gems);
    res.json(status);
  } catch (e) {
    if (mapReferralError(e, res)) return;
    logger.error?.(`[v4/referral/reward/allocate] user=${uid} subj=${subjectId}: ${String((e as any)?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

export default router;
