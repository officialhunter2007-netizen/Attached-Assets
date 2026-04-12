import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { RegisterUserBody, LoginUserBody, UpdateMeBody } from "@workspace/api-zod";
import { hashPassword, verifyPassword } from "../lib/auth";
import { OAuth2Client } from "google-auth-library";

const router: IRouter = Router();

const ADMIN_EMAILS = ["officialhunter2007@gmail.com"];

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

  const { email, password, displayName } = parsed.data;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(400).json({ error: "البريد الإلكتروني مسجل مسبقاً" });
    return;
  }

  const passwordHash = hashPassword(password);

  const [user] = await db.insert(usersTable).values({
    email,
    passwordHash,
    displayName: displayName ?? null,
    role: ADMIN_EMAILS.includes(email.toLowerCase()) ? "admin" : "user",
    onboardingDone: false,
    points: 0,
    streakDays: 0,
    badges: [],
  }).returning();

  (req as any).session = { userId: user.id };

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

  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
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

function getAppDomain(): string {
  if (process.env.APP_DOMAIN) return process.env.APP_DOMAIN.trim();
  const prodDomains = process.env.REPLIT_DOMAINS;
  if (prodDomains) return prodDomains.split(",")[0].trim();
  return process.env.REPLIT_DEV_DOMAIN ?? "";
}

function getGoogleClient() {
  const callbackUrl = `https://${getAppDomain()}/api/auth/google/callback`;
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl
  );
}

function getFrontendUrl(path = "") {
  return `https://${getAppDomain()}${path}`;
}

function setSessionCookie(res: any, userId: number) {
  const isProd = process.env.NODE_ENV === "production";
  const encoded = Buffer.from(JSON.stringify({ userId })).toString("base64");
  res.cookie("session", encoded, {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

router.get("/auth/google", (req, res): void => {
  const domain = getAppDomain();
  const callbackUrl = `https://${domain}/api/auth/google/callback`;
  console.log("[OAuth] Resolved domain:", domain);
  console.log("[OAuth] Callback URL:", callbackUrl);

  const client = getGoogleClient();

  const url = client.generateAuthUrl({
    access_type: "offline",
    scope: ["profile", "email"],
    prompt: "select_account",
  });

  res.redirect(url);
});

router.get("/auth/google/callback", async (req, res): Promise<void> => {
  try {
    const code = req.query.code as string;

    const client = getGoogleClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const infoRes = await client.request<{
      id: string;
      email: string;
      name: string;
      picture: string;
    }>({ url: "https://www.googleapis.com/oauth2/v2/userinfo" });
    const gUser = infoRes.data;

    let [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.googleId, gUser.id));

    if (user) {
      if (gUser.picture && user.profileImage !== gUser.picture) {
        await db.update(usersTable)
          .set({ profileImage: gUser.picture })
          .where(eq(usersTable.id, user.id));
        user = { ...user, profileImage: gUser.picture };
      }
    } else if (!user) {
      const [byEmail] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, gUser.email));

      if (byEmail) {
        [user] = await db
          .update(usersTable)
          .set({ googleId: gUser.id, profileImage: gUser.picture || null })
          .where(eq(usersTable.id, byEmail.id))
          .returning();
      } else {
        [user] = await db
          .insert(usersTable)
          .values({
            email: gUser.email,
            googleId: gUser.id,
            displayName: gUser.name,
            profileImage: gUser.picture || null,
            role: ADMIN_EMAILS.includes(gUser.email.toLowerCase()) ? "admin" : "user",
            onboardingDone: false,
            points: 0,
            streakDays: 0,
            badges: [],
          })
          .returning();

        setSessionCookie(res, user.id);
        res.redirect(getFrontendUrl("/welcome"));
        return;
      }
    }

    setSessionCookie(res, user.id);
    res.redirect(getFrontendUrl(user.onboardingDone ? "/learn" : "/welcome"));
  } catch (err) {
    res.redirect(getFrontendUrl("/?auth_error=1"));
  }
});

export default router;
