import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import xss from "xss";
import { db, labReportsTable } from "@workspace/db";

const router: IRouter = Router();

const xssOptions = {
  whiteList: {
    div: ["class", "dir"],
    p: ["class", "dir"],
    span: ["class", "dir"],
    br: [],
    hr: [],
    h1: ["class", "dir"],
    h2: ["class", "dir"],
    h3: ["class", "dir"],
    h4: ["class", "dir"],
    h5: ["class", "dir"],
    h6: ["class", "dir"],
    ul: ["class", "dir"],
    ol: ["class", "dir"],
    li: ["class", "dir"],
    strong: ["class", "dir"],
    b: ["class", "dir"],
    em: ["class", "dir"],
    i: ["class", "dir"],
    u: ["class", "dir"],
    s: ["class", "dir"],
    code: ["class", "dir"],
    pre: ["class", "dir"],
    blockquote: ["class", "dir"],
    table: ["class", "dir"],
    thead: ["class", "dir"],
    tbody: ["class", "dir"],
    tr: ["class", "dir"],
    th: ["class", "dir"],
    td: ["class", "dir"],
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ["script"],
};

// Strict allowlist for AI-generated teacher feedback HTML. Matches the kinds
// of tags/attrs the teaching prompts produce (h3/h4, headings, lists, code,
// pre, em/strong, simple boxes via class names) and nothing else. We
// deliberately disallow scripts, event handlers, javascript: URLs, style
// attributes, iframes, and arbitrary attributes.
function sanitizeFeedbackHtml(html: string): string {
  return xss(html, xssOptions);
}

function getUserId(req: any): number | null {
  return req.session?.userId ?? null;
}

router.post("/lab-reports", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { subjectId, subjectName, envTitle, envBriefing, reportText, feedbackHtml } = req.body ?? {};

  if (!subjectId || !reportText) {
    res.status(400).json({ error: "subjectId and reportText required" });
    return;
  }

  const safeReport = String(reportText).slice(0, 20000);
  const rawFeedback = String(feedbackHtml ?? "").slice(0, 40000);
  const safeFeedback = sanitizeFeedbackHtml(rawFeedback);
  const safeTitle = String(envTitle ?? "").slice(0, 300);
  const safeBriefing = String(envBriefing ?? "").slice(0, 2000);
  const safeSubjectName = String(subjectName ?? "").slice(0, 200);

  const [saved] = await db.insert(labReportsTable).values({
    userId,
    subjectId: String(subjectId).slice(0, 200),
    subjectName: safeSubjectName,
    envTitle: safeTitle,
    envBriefing: safeBriefing,
    reportText: safeReport,
    feedbackHtml: safeFeedback,
  }).returning();

  res.json(saved);
});

router.get("/lab-reports", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const subjectId = typeof req.query.subjectId === "string" ? req.query.subjectId : null;

  const rows = await db
    .select()
    .from(labReportsTable)
    .where(
      subjectId
        ? and(eq(labReportsTable.userId, userId), eq(labReportsTable.subjectId, subjectId))
        : eq(labReportsTable.userId, userId)
    )
    .orderBy(desc(labReportsTable.createdAt));

  res.json(rows);
});

export default router;
