import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc, sql, asc } from "drizzle-orm";
import {
  db,
  aiUsageEventsTable,
  usersTable,
  userSubjectSubscriptionsTable,
} from "@workspace/db";
import { getCostCapStatus } from "../lib/cost-cap";
import { getStartOfTodayYemen } from "../lib/yemen-time";

const router: IRouter = Router();

function getUserId(req: any): number | null {
  return (req.session as any)?.userId ?? null;
}

async function isAdmin(userId: number | null): Promise<boolean> {
  if (!userId) return false;
  const [user] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  return user?.role === "admin";
}

// Parse a `from`/`to` window from query string. Both are ISO strings or unix
// millis. Defaults: last 30 days. Returns Date objects.
function parseWindow(req: any): { from: Date; to: Date } {
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const parse = (v: any, fallback: Date): Date => {
    if (!v) return fallback;
    const s = String(v);
    // Allow unix millis as a number-string.
    if (/^\d+$/.test(s)) {
      const n = Number(s);
      const d = new Date(n);
      return Number.isFinite(d.getTime()) ? d : fallback;
    }
    const d = new Date(s);
    return Number.isFinite(d.getTime()) ? d : fallback;
  };
  return {
    from: parse(req.query.from, defaultFrom),
    to: parse(req.query.to, now),
  };
}

// ── GET /api/admin/ai-usage/summary ─────────────────────────────────────────
// Totals + by-provider, by-model, by-route breakdowns for the given window.
router.get("/admin/ai-usage/summary", async (req, res): Promise<any> => {
  const adminId = getUserId(req);
  if (!(await isAdmin(adminId))) return res.status(403).json({ error: "Forbidden" });
  const { from, to } = parseWindow(req);

  const where = and(
    gte(aiUsageEventsTable.createdAt, from),
    lte(aiUsageEventsTable.createdAt, to),
  );

  try {
    const [totals] = await db
      .select({
        events: sql<number>`count(*)::int`,
        inputTokens: sql<number>`coalesce(sum(${aiUsageEventsTable.inputTokens}), 0)::bigint`,
        outputTokens: sql<number>`coalesce(sum(${aiUsageEventsTable.outputTokens}), 0)::bigint`,
        cachedInputTokens: sql<number>`coalesce(sum(${aiUsageEventsTable.cachedInputTokens}), 0)::bigint`,
        costUsd: sql<string>`coalesce(sum(${aiUsageEventsTable.costUsd}), 0)::text`,
        avgLatencyMs: sql<number>`coalesce(avg(${aiUsageEventsTable.latencyMs}), 0)::int`,
        errorCount: sql<number>`count(*) filter (where ${aiUsageEventsTable.status} = 'error')::int`,
        activeUsers: sql<number>`count(distinct ${aiUsageEventsTable.userId})::int`,
      })
      .from(aiUsageEventsTable)
      .where(where);

    const byProvider = await db
      .select({
        provider: aiUsageEventsTable.provider,
        events: sql<number>`count(*)::int`,
        inputTokens: sql<number>`coalesce(sum(${aiUsageEventsTable.inputTokens}), 0)::bigint`,
        outputTokens: sql<number>`coalesce(sum(${aiUsageEventsTable.outputTokens}), 0)::bigint`,
        costUsd: sql<string>`coalesce(sum(${aiUsageEventsTable.costUsd}), 0)::text`,
      })
      .from(aiUsageEventsTable)
      .where(where)
      .groupBy(aiUsageEventsTable.provider)
      .orderBy(desc(sql`sum(${aiUsageEventsTable.costUsd})`));

    const byModel = await db
      .select({
        model: aiUsageEventsTable.model,
        provider: aiUsageEventsTable.provider,
        events: sql<number>`count(*)::int`,
        inputTokens: sql<number>`coalesce(sum(${aiUsageEventsTable.inputTokens}), 0)::bigint`,
        outputTokens: sql<number>`coalesce(sum(${aiUsageEventsTable.outputTokens}), 0)::bigint`,
        cachedInputTokens: sql<number>`coalesce(sum(${aiUsageEventsTable.cachedInputTokens}), 0)::bigint`,
        costUsd: sql<string>`coalesce(sum(${aiUsageEventsTable.costUsd}), 0)::text`,
      })
      .from(aiUsageEventsTable)
      .where(where)
      .groupBy(aiUsageEventsTable.model, aiUsageEventsTable.provider)
      .orderBy(desc(sql`sum(${aiUsageEventsTable.costUsd})`));

    const byRoute = await db
      .select({
        route: aiUsageEventsTable.route,
        events: sql<number>`count(*)::int`,
        inputTokens: sql<number>`coalesce(sum(${aiUsageEventsTable.inputTokens}), 0)::bigint`,
        outputTokens: sql<number>`coalesce(sum(${aiUsageEventsTable.outputTokens}), 0)::bigint`,
        costUsd: sql<string>`coalesce(sum(${aiUsageEventsTable.costUsd}), 0)::text`,
      })
      .from(aiUsageEventsTable)
      .where(where)
      .groupBy(aiUsageEventsTable.route)
      .orderBy(desc(sql`sum(${aiUsageEventsTable.costUsd})`));

    res.json({
      window: { from: from.toISOString(), to: to.toISOString() },
      totals: {
        events: Number(totals?.events || 0),
        inputTokens: Number(totals?.inputTokens || 0),
        outputTokens: Number(totals?.outputTokens || 0),
        cachedInputTokens: Number(totals?.cachedInputTokens || 0),
        totalTokens:
          Number(totals?.inputTokens || 0) + Number(totals?.outputTokens || 0),
        costUsd: Number(totals?.costUsd || 0),
        avgLatencyMs: Number(totals?.avgLatencyMs || 0),
        errorCount: Number(totals?.errorCount || 0),
        activeUsers: Number(totals?.activeUsers || 0),
      },
      byProvider: byProvider.map((r) => ({
        provider: r.provider,
        events: Number(r.events),
        inputTokens: Number(r.inputTokens),
        outputTokens: Number(r.outputTokens),
        costUsd: Number(r.costUsd),
      })),
      byModel: byModel.map((r) => ({
        model: r.model,
        provider: r.provider,
        events: Number(r.events),
        inputTokens: Number(r.inputTokens),
        outputTokens: Number(r.outputTokens),
        cachedInputTokens: Number(r.cachedInputTokens),
        costUsd: Number(r.costUsd),
      })),
      byRoute: byRoute.map((r) => ({
        route: r.route,
        events: Number(r.events),
        inputTokens: Number(r.inputTokens),
        outputTokens: Number(r.outputTokens),
        costUsd: Number(r.costUsd),
      })),
    });
  } catch (e: any) {
    console.error("[ai-usage/summary] error:", e?.message || e);
    res.status(500).json({ error: "SUMMARY_FAILED" });
  }
});

// ── GET /api/admin/ai-usage/timeseries ──────────────────────────────────────
// Cost & tokens bucketed by day or hour over the window.
router.get("/admin/ai-usage/timeseries", async (req, res): Promise<any> => {
  const adminId = getUserId(req);
  if (!(await isAdmin(adminId))) return res.status(403).json({ error: "Forbidden" });
  const { from, to } = parseWindow(req);
  const granularity = String(req.query.granularity || "day") === "hour" ? "hour" : "day";
  const trunc = granularity === "hour" ? "hour" : "day";

  try {
    const rows = await db
      .select({
        bucket: sql<string>`date_trunc(${trunc}, ${aiUsageEventsTable.createdAt})::text`,
        events: sql<number>`count(*)::int`,
        inputTokens: sql<number>`coalesce(sum(${aiUsageEventsTable.inputTokens}), 0)::bigint`,
        outputTokens: sql<number>`coalesce(sum(${aiUsageEventsTable.outputTokens}), 0)::bigint`,
        costUsd: sql<string>`coalesce(sum(${aiUsageEventsTable.costUsd}), 0)::text`,
      })
      .from(aiUsageEventsTable)
      .where(and(
        gte(aiUsageEventsTable.createdAt, from),
        lte(aiUsageEventsTable.createdAt, to),
      ))
      .groupBy(sql`date_trunc(${trunc}, ${aiUsageEventsTable.createdAt})`)
      .orderBy(asc(sql`date_trunc(${trunc}, ${aiUsageEventsTable.createdAt})`));

    res.json({
      window: { from: from.toISOString(), to: to.toISOString() },
      granularity,
      points: rows.map((r) => ({
        bucket: r.bucket,
        events: Number(r.events),
        inputTokens: Number(r.inputTokens),
        outputTokens: Number(r.outputTokens),
        totalTokens: Number(r.inputTokens) + Number(r.outputTokens),
        costUsd: Number(r.costUsd),
      })),
    });
  } catch (e: any) {
    console.error("[ai-usage/timeseries] error:", e?.message || e);
    res.status(500).json({ error: "TIMESERIES_FAILED" });
  }
});

// ── GET /api/admin/ai-usage/users ───────────────────────────────────────────
// Per-user spend ranked. sortBy=cost|tokens|events.
router.get("/admin/ai-usage/users", async (req, res): Promise<any> => {
  const adminId = getUserId(req);
  if (!(await isAdmin(adminId))) return res.status(403).json({ error: "Forbidden" });
  const { from, to } = parseWindow(req);
  const limit = Math.min(200, Math.max(1, Number(req.query.limit || 25)));
  const sortKey = String(req.query.sortBy || "cost");

  let orderExpr = sql`sum(${aiUsageEventsTable.costUsd}) desc`;
  if (sortKey === "tokens") {
    orderExpr = sql`sum(${aiUsageEventsTable.inputTokens} + ${aiUsageEventsTable.outputTokens}) desc`;
  } else if (sortKey === "events") {
    orderExpr = sql`count(*) desc`;
  }

  try {
    const rows = await db
      .select({
        userId: aiUsageEventsTable.userId,
        email: usersTable.email,
        displayName: usersTable.displayName,
        role: usersTable.role,
        events: sql<number>`count(*)::int`,
        inputTokens: sql<number>`coalesce(sum(${aiUsageEventsTable.inputTokens}), 0)::bigint`,
        outputTokens: sql<number>`coalesce(sum(${aiUsageEventsTable.outputTokens}), 0)::bigint`,
        costUsd: sql<string>`coalesce(sum(${aiUsageEventsTable.costUsd}), 0)::text`,
        lastActive: sql<string>`max(${aiUsageEventsTable.createdAt})::text`,
      })
      .from(aiUsageEventsTable)
      .leftJoin(usersTable, eq(usersTable.id, aiUsageEventsTable.userId))
      .where(and(
        gte(aiUsageEventsTable.createdAt, from),
        lte(aiUsageEventsTable.createdAt, to),
      ))
      .groupBy(
        aiUsageEventsTable.userId,
        usersTable.email,
        usersTable.displayName,
        usersTable.role,
      )
      .orderBy(orderExpr)
      .limit(limit);

    res.json({
      window: { from: from.toISOString(), to: to.toISOString() },
      users: rows.map((r) => ({
        userId: r.userId,
        email: r.email,
        displayName: r.displayName,
        role: r.role,
        events: Number(r.events),
        inputTokens: Number(r.inputTokens),
        outputTokens: Number(r.outputTokens),
        totalTokens: Number(r.inputTokens) + Number(r.outputTokens),
        costUsd: Number(r.costUsd),
        lastActive: r.lastActive,
      })),
    });
  } catch (e: any) {
    console.error("[ai-usage/users] error:", e?.message || e);
    res.status(500).json({ error: "USERS_FAILED" });
  }
});

// ── GET /api/admin/ai-usage/user/:id ────────────────────────────────────────
// Single user drill-down: by-model, daily timeline, recent events.
router.get("/admin/ai-usage/user/:id", async (req, res): Promise<any> => {
  const adminId = getUserId(req);
  if (!(await isAdmin(adminId))) return res.status(403).json({ error: "Forbidden" });
  const targetId = Number(req.params.id);
  if (!Number.isFinite(targetId)) return res.status(400).json({ error: "bad id" });
  const { from, to } = parseWindow(req);

  try {
    const [profile] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        displayName: usersTable.displayName,
        role: usersTable.role,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(eq(usersTable.id, targetId));

    const where = and(
      eq(aiUsageEventsTable.userId, targetId),
      gte(aiUsageEventsTable.createdAt, from),
      lte(aiUsageEventsTable.createdAt, to),
    );

    const [totals] = await db
      .select({
        events: sql<number>`count(*)::int`,
        inputTokens: sql<number>`coalesce(sum(${aiUsageEventsTable.inputTokens}), 0)::bigint`,
        outputTokens: sql<number>`coalesce(sum(${aiUsageEventsTable.outputTokens}), 0)::bigint`,
        cachedInputTokens: sql<number>`coalesce(sum(${aiUsageEventsTable.cachedInputTokens}), 0)::bigint`,
        costUsd: sql<string>`coalesce(sum(${aiUsageEventsTable.costUsd}), 0)::text`,
        errorCount: sql<number>`count(*) filter (where ${aiUsageEventsTable.status} = 'error')::int`,
      })
      .from(aiUsageEventsTable)
      .where(where);

    const byModel = await db
      .select({
        model: aiUsageEventsTable.model,
        provider: aiUsageEventsTable.provider,
        events: sql<number>`count(*)::int`,
        inputTokens: sql<number>`coalesce(sum(${aiUsageEventsTable.inputTokens}), 0)::bigint`,
        outputTokens: sql<number>`coalesce(sum(${aiUsageEventsTable.outputTokens}), 0)::bigint`,
        costUsd: sql<string>`coalesce(sum(${aiUsageEventsTable.costUsd}), 0)::text`,
      })
      .from(aiUsageEventsTable)
      .where(where)
      .groupBy(aiUsageEventsTable.model, aiUsageEventsTable.provider)
      .orderBy(desc(sql`sum(${aiUsageEventsTable.costUsd})`));

    const byRoute = await db
      .select({
        route: aiUsageEventsTable.route,
        events: sql<number>`count(*)::int`,
        costUsd: sql<string>`coalesce(sum(${aiUsageEventsTable.costUsd}), 0)::text`,
      })
      .from(aiUsageEventsTable)
      .where(where)
      .groupBy(aiUsageEventsTable.route)
      .orderBy(desc(sql`sum(${aiUsageEventsTable.costUsd})`));

    const timeline = await db
      .select({
        bucket: sql<string>`date_trunc('day', ${aiUsageEventsTable.createdAt})::text`,
        events: sql<number>`count(*)::int`,
        costUsd: sql<string>`coalesce(sum(${aiUsageEventsTable.costUsd}), 0)::text`,
      })
      .from(aiUsageEventsTable)
      .where(where)
      .groupBy(sql`date_trunc('day', ${aiUsageEventsTable.createdAt})`)
      .orderBy(asc(sql`date_trunc('day', ${aiUsageEventsTable.createdAt})`));

    const recent = await db
      .select({
        id: aiUsageEventsTable.id,
        createdAt: aiUsageEventsTable.createdAt,
        route: aiUsageEventsTable.route,
        provider: aiUsageEventsTable.provider,
        model: aiUsageEventsTable.model,
        inputTokens: aiUsageEventsTable.inputTokens,
        outputTokens: aiUsageEventsTable.outputTokens,
        costUsd: aiUsageEventsTable.costUsd,
        latencyMs: aiUsageEventsTable.latencyMs,
        status: aiUsageEventsTable.status,
        subjectId: aiUsageEventsTable.subjectId,
      })
      .from(aiUsageEventsTable)
      .where(where)
      .orderBy(desc(aiUsageEventsTable.createdAt))
      .limit(50);

    res.json({
      window: { from: from.toISOString(), to: to.toISOString() },
      user: profile || { id: targetId, email: null, displayName: null, role: null },
      totals: {
        events: Number(totals?.events || 0),
        inputTokens: Number(totals?.inputTokens || 0),
        outputTokens: Number(totals?.outputTokens || 0),
        cachedInputTokens: Number(totals?.cachedInputTokens || 0),
        totalTokens:
          Number(totals?.inputTokens || 0) + Number(totals?.outputTokens || 0),
        costUsd: Number(totals?.costUsd || 0),
        errorCount: Number(totals?.errorCount || 0),
      },
      byModel: byModel.map((r) => ({
        model: r.model,
        provider: r.provider,
        events: Number(r.events),
        inputTokens: Number(r.inputTokens),
        outputTokens: Number(r.outputTokens),
        costUsd: Number(r.costUsd),
      })),
      byRoute: byRoute.map((r) => ({
        route: r.route,
        events: Number(r.events),
        costUsd: Number(r.costUsd),
      })),
      timeline: timeline.map((r) => ({
        bucket: r.bucket,
        events: Number(r.events),
        costUsd: Number(r.costUsd),
      })),
      recent: recent.map((r) => ({
        id: r.id,
        createdAt: r.createdAt,
        route: r.route,
        provider: r.provider,
        model: r.model,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        costUsd: Number(r.costUsd),
        latencyMs: r.latencyMs,
        status: r.status,
        subjectId: r.subjectId,
      })),
    });
  } catch (e: any) {
    console.error("[ai-usage/user] error:", e?.message || e);
    res.status(500).json({ error: "USER_DETAIL_FAILED" });
  }
});

// ── GET /api/admin/ai-usage/daily-budget-top ────────────────────────────────
// Top active subscriptions by today's daily-budget consumption ratio.
// Surfaces students who are pushing the new daily-rolling cap so the platform
// owner can verify the redistribution policy behaves as designed.
router.get("/admin/ai-usage/daily-budget-top", async (req, res): Promise<any> => {
  const adminId = getUserId(req);
  if (!(await isAdmin(adminId))) return res.status(403).json({ error: "Forbidden" });
  const limit = Math.min(20, Math.max(1, Number(req.query.limit || 5)));

  try {
    const startOfToday = getStartOfTodayYemen();

    // Step 1: pull EVERY active subscription that spent anything today (no
    // pre-ranking by absolute spend — we will rank by ratio in step 2). This
    // keeps the result authoritative even when a small-cap subscription has
    // a high ratio with a tiny absolute cost.
    const candidates = await db
      .select({
        subscriptionId: userSubjectSubscriptionsTable.id,
        userId: userSubjectSubscriptionsTable.userId,
        subjectId: userSubjectSubscriptionsTable.subjectId,
        subjectName: userSubjectSubscriptionsTable.subjectName,
        plan: userSubjectSubscriptionsTable.plan,
        region: userSubjectSubscriptionsTable.region,
        createdAt: userSubjectSubscriptionsTable.createdAt,
        expiresAt: userSubjectSubscriptionsTable.expiresAt,
        paidPriceYer: userSubjectSubscriptionsTable.paidPriceYer,
        userEmail: usersTable.email,
        userName: usersTable.displayName,
      })
      .from(userSubjectSubscriptionsTable)
      .innerJoin(
        // INNER join on usage TODAY: the join itself filters out subscriptions
        // that haven't spent anything today (they can't possibly be in the
        // ratio top-N, since their dailyRatio is 0).
        aiUsageEventsTable,
        and(
          eq(aiUsageEventsTable.userId, userSubjectSubscriptionsTable.userId),
          eq(aiUsageEventsTable.subjectId, userSubjectSubscriptionsTable.subjectId),
          gte(aiUsageEventsTable.createdAt, startOfToday),
        ),
      )
      .leftJoin(usersTable, eq(usersTable.id, userSubjectSubscriptionsTable.userId))
      .where(sql`${userSubjectSubscriptionsTable.expiresAt} > now()`)
      .groupBy(
        userSubjectSubscriptionsTable.id,
        usersTable.email,
        usersTable.displayName,
      );

    // Step 2: compute the authoritative daily-budget status for every
    // candidate (small N — only subs with today's activity). Reuses the live
    // `getCostCapStatus` so the admin view never drifts from what the router
    // actually sees. Alongside the snapshot we also fetch a per-subscription
    // 7-day trend so the admin can verify the redistribution policy is
    // actually smoothing spend across days (not concentrating it on day 1).
    const sevenDaysAgo = new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000);
    const enriched = await Promise.all(
      candidates.map(async (r) => {
        // Lower-bound the 7-day trend window by the subscription's createdAt
        // so a fresh re-subscription on the same subject doesn't show pre-
        // current-subscription spend in its sparkline (telemetry accuracy).
        const trendWindowStart = r.createdAt && r.createdAt > sevenDaysAgo
          ? r.createdAt
          : sevenDaysAgo;
        const [status, trendResult] = await Promise.all([
          getCostCapStatus(r.userId, {
            id: r.subscriptionId,
            subjectId: r.subjectId,
            createdAt: r.createdAt,
            expiresAt: r.expiresAt,
            paidPriceYer: r.paidPriceYer,
            region: r.region,
            plan: r.plan,
          }),
          // Bucket spend by Yemen-local day for the last 7 days. We add a
          // 3-hour offset to UTC so the day boundary aligns with Asia/Aden
          // (UTC+3, no DST). Returns rows like {day: '2026-04-25', total: '0.0123'}.
          db.execute<{ day: string; total: string }>(sql`
            SELECT
              to_char((${aiUsageEventsTable.createdAt} + interval '3 hours')::date, 'YYYY-MM-DD') AS day,
              coalesce(sum(${aiUsageEventsTable.costUsd}), 0)::text AS total
            FROM ${aiUsageEventsTable}
            WHERE ${aiUsageEventsTable.userId} = ${r.userId}
              AND ${aiUsageEventsTable.subjectId} = ${r.subjectId}
              AND ${aiUsageEventsTable.createdAt} >= ${trendWindowStart.toISOString()}
            GROUP BY day
            ORDER BY day ASC
          `),
        ]);

        // Densify the 7-day window: the SQL only emits days with activity,
        // so we project into a fixed-length array indexed by day-offset
        // from `sevenDaysAgo` so the client can render a simple sparkline
        // without re-bucketing.
        const trendByDay = new Map<string, number>();
        for (const tr of trendResult.rows) {
          trendByDay.set(tr.day, Number(tr.total) || 0);
        }
        const last7DaysUsd: { day: string; spentUsd: number }[] = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(sevenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
          // Format the same way the SQL projects (Yemen-local YYYY-MM-DD).
          const yemenDate = new Date(d.getTime() + 3 * 60 * 60 * 1000)
            .toISOString().slice(0, 10);
          last7DaysUsd.push({ day: yemenDate, spentUsd: trendByDay.get(yemenDate) || 0 });
        }

        const dailyRatio = status.dailyCapUsd > 0 ? status.todaySpentUsd / status.dailyCapUsd : 0;
        return {
          subscriptionId: r.subscriptionId,
          userId: r.userId,
          userEmail: r.userEmail,
          userName: r.userName,
          subjectId: r.subjectId,
          subjectName: r.subjectName,
          plan: r.plan,
          region: r.region,
          todaySpentUsd: status.todaySpentUsd,
          dailyCapUsd: status.dailyCapUsd,
          dailyRatio,
          totalSpentUsd: status.spentUsd,
          capUsd: status.capUsd,
          totalRatio: status.ratio,
          daysRemaining: status.daysRemaining,
          dailyMode: status.dailyMode,
          forceCheapModel: status.forceCheapModel,
          last7DaysUsd,
        };
      }),
    );

    enriched.sort((a, b) => b.dailyRatio - a.dailyRatio);
    res.json({
      asOf: new Date().toISOString(),
      startOfTodayYemen: startOfToday.toISOString(),
      rows: enriched.slice(0, limit),
    });
  } catch (e: any) {
    console.error("[ai-usage/daily-budget-top] error:", e?.message || e);
    res.status(500).json({ error: "DAILY_BUDGET_FAILED" });
  }
});

export default router;
