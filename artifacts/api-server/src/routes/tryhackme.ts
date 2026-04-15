import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { TRYHACKME_ROOM_MAPPINGS, CYBERSECURITY_SUBJECT_IDS, getRoomsForSubjectStage, getAllRoomsForSubject, getRoomByCode } from "../data/tryhackme-rooms.js";

const router: IRouter = Router();

function getUserId(req: any): number | null {
  return req.session?.userId ?? null;
}

const profileCache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

async function fetchTHMProfile(username: string): Promise<any | null> {
  const cached = profileCache.get(username);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  try {
    const res = await fetch(`https://tryhackme.com/api/user/rank/${encodeURIComponent(username)}`, {
      headers: { "User-Agent": "Nukhba-Education/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    profileCache.set(username, { data, ts: Date.now() });
    return data;
  } catch {
    return null;
  }
}

async function fetchTHMBadges(username: string): Promise<any[]> {
  try {
    const res = await fetch(`https://tryhackme.com/api/badges/get/${encodeURIComponent(username)}`, {
      headers: { "User-Agent": "Nukhba-Education/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

router.post("/tryhackme/link", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { username } = req.body;
  if (!username || typeof username !== "string" || username.trim().length < 2) {
    res.status(400).json({ error: "اسم المستخدم غير صالح" });
    return;
  }

  const clean = username.trim();
  const profile = await fetchTHMProfile(clean);
  if (!profile || profile.userRank === 0) {
    res.status(404).json({ error: "لم يتم العثور على حساب TryHackMe بهذا الاسم" });
    return;
  }

  await db.update(usersTable)
    .set({ tryhackmeUsername: clean })
    .where(eq(usersTable.id, userId));

  res.json({ success: true, username: clean, profile });
});

router.post("/tryhackme/unlink", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  await db.update(usersTable)
    .set({ tryhackmeUsername: null })
    .where(eq(usersTable.id, userId));

  res.json({ success: true });
});

router.get("/tryhackme/profile", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user?.tryhackmeUsername) {
    res.json({ linked: false });
    return;
  }

  const profile = await fetchTHMProfile(user.tryhackmeUsername);
  const badges = await fetchTHMBadges(user.tryhackmeUsername);

  res.json({
    linked: true,
    username: user.tryhackmeUsername,
    profile,
    badges,
  });
});

router.get("/tryhackme/rooms/:subjectId", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { subjectId } = req.params;
  const stageIndex = parseInt(req.query.stage as string);

  if (!isNaN(stageIndex)) {
    const rooms = getRoomsForSubjectStage(subjectId, stageIndex);
    res.json({ rooms });
  } else {
    const rooms = getAllRoomsForSubject(subjectId);
    res.json({ rooms });
  }
});

router.get("/tryhackme/check-room/:roomCode", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { roomCode } = req.params;
  if (!roomCode || !/^[a-zA-Z0-9_-]+$/.test(roomCode)) {
    res.status(400).json({ error: "Invalid room code" });
    return;
  }

  const room = getRoomByCode(roomCode);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  let roomExists = false;
  try {
    const checkRes = await fetch(
      `https://tryhackme.com/api/room/${encodeURIComponent(roomCode)}`,
      { headers: { "User-Agent": "Nukhba-Education/1.0" }, signal: AbortSignal.timeout(8000) }
    );
    roomExists = checkRes.ok;
  } catch {}

  res.json({
    roomCode,
    room: room || null,
    roomExists,
    linked: !!user?.tryhackmeUsername,
    username: user?.tryhackmeUsername || null,
  });
});

router.get("/tryhackme/progress", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user?.tryhackmeUsername) {
    res.json({ linked: false, progress: null });
    return;
  }

  const profile = await fetchTHMProfile(user.tryhackmeUsername);
  const badges = await fetchTHMBadges(user.tryhackmeUsername);

  const subjectId = (req.query.subjectId as string) || null;
  const allRooms = subjectId ? getAllRoomsForSubject(subjectId) : [];

  res.json({
    linked: true,
    username: user.tryhackmeUsername,
    profile: profile ? {
      userRank: profile.userRank,
      points: profile.points,
      streak: profile.streak || 0,
    } : null,
    badges: badges.slice(0, 20),
    totalRoomsInSubject: allRooms.length,
    rooms: allRooms.map(r => ({
      code: r.code,
      name: r.name,
      nameAr: r.nameAr,
      difficulty: r.difficulty,
    })),
  });
});

router.get("/tryhackme/mappings", async (_req, res): Promise<void> => {
  res.json({ mappings: TRYHACKME_ROOM_MAPPINGS, subjectIds: [...CYBERSECURITY_SUBJECT_IDS] });
});

export default router;
