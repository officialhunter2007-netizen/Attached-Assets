import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, referralsTable } from "@workspace/db";
import { RegisterUserBody, LoginUserBody, UpdateMeBody } from "@workspace/api-zod";
import { hashPassword, verifyPassword, generateReferralCode } from "../lib/auth";

const router: IRouter = Router();

declare module "express-serve-static-core" {
  interface Request {
    session?: { userId?: number };
  }
}

function getUserId(req: any): number | null {
  return req.session?.userId ?? null;
}

router.get("/auth/me", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  const { passwordHash: _, ...profile } = user;
  res.json({
    ...profile,
    badges: user.badges ?? [],
  });
});

router.patch("/auth/me", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  const data = parsed.data;
  if (data.displayName !== undefined) updates.displayName = data.displayName;
  if (data.onboardingDone !== undefined) updates.onboardingDone = data.onboardingDone;
  if (data.points !== undefined) updates.points = data.points;
  if (data.streakDays !== undefined) updates.streakDays = data.streakDays;
  if (data.lastActive !== undefined) updates.lastActive = data.lastActive;
  if (data.badges !== undefined) updates.badges = data.badges;
  if (data.nukhbaPlan !== undefined) updates.nukhbaPlan = data.nukhbaPlan;
  if (data.region !== undefined) updates.region = data.region;

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, userId))
    .returning();

  const { passwordHash: _, ...profile } = updated;
  res.json({ ...profile, badges: updated.badges ?? [] });
});

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password, displayName, referralCode } = parsed.data;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(400).json({ error: "البريد الإلكتروني مسجل مسبقاً" });
    return;
  }

  const passwordHash = hashPassword(password);
  const myReferralCode = generateReferralCode();

  const ADMIN_EMAILS = ["amr@gmail.com"];

  const [user] = await db.insert(usersTable).values({
    email,
    passwordHash,
    displayName: displayName ?? null,
    referralCode: myReferralCode,
    role: ADMIN_EMAILS.includes(email.toLowerCase()) ? "admin" : "user",
    onboardingDone: false,
    points: 0,
    streakDays: 0,
    badges: [],
  }).returning();

  (req as any).session = { userId: user.id };

  // ── Process referral code if provided ──
  if (referralCode) {
    try {
      const [referrer] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.referralCode, referralCode.toUpperCase()));

      if (referrer && referrer.id !== user.id) {
        const existingReferrals = await db
          .select()
          .from(referralsTable)
          .where(eq(referralsTable.referrerUserId, referrer.id));

        const newCount = existingReferrals.length + 1;
        // Grant reward ONLY on the very first 5 referrals — never again
        const grantsAccess = newCount === 5 && (referrer.referralSessionsLeft ?? 0) === 0;

        await db.insert(referralsTable).values({
          referrerUserId: referrer.id,
          referredUserId: user.id,
          referralCode: referralCode.toUpperCase(),
          accessDaysGranted: grantsAccess ? 3 : 0,
        });

        if (grantsAccess) {
          await db.update(usersTable)
            .set({ referralSessionsLeft: 3 })
            .where(eq(usersTable.id, referrer.id));
        }
      }
    } catch {
      // referral processing failure should not block registration
    }
  }

  const { passwordHash: _, ...profile } = user;
  res.status(201).json({ ...profile, badges: user.badges ?? [] });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
    return;
  }

  (req as any).session = { userId: user.id };

  const { passwordHash: _, ...profile } = user;
  res.json({ ...profile, badges: user.badges ?? [] });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  (req as any).session = null;
  res.json({ success: true });
});

router.post("/auth/complete-first-lesson", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await db.update(usersTable)
    .set({ firstLessonComplete: true })
    .where(eq(usersTable.id, userId));
  res.json({ success: true });
});

export default router;
