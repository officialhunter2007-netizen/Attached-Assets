// ─────────────────────────────────────────────────────────────────────────────
// v4 Certificates — lazy generation + public verification
//
//   GET  /v4/certificates               — list; auto-issues missing certs
//   GET  /v4/certificates/verify/:code  — public verification
//
// Schema notes (2026-07-14):
//   • Exam data  → v4_exam_attempts  (NOT v4_exam_passes)
//   • Specialty  → v4_exam_attempts.version_id
//                → v4_instruction_file_versions.id  (→ .specialty_id)
//                → v4_specialties.id
//   • v4_exam_attempts.score is 0-100 weighted-percentage (accurate)
//   • v4_units.key_concepts is a jsonb string-array of topic tags
//   • specialty_complete score = avg of ALL level exam scores for that version
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { logger } from "../lib/logger";

const router = Router();

function getUserId(req: any): number | null {
  return (req.session as any)?.userId ?? null;
}
function requireUser(req: any, res: any, next: any) {
  if (!getUserId(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
  next();
}

// ── helpers ───────────────────────────────────────────────────────────────────

/** Fetch up to `limit` distinct key-concept strings for a scope reference. */
async function fetchKeyTopics(
  scope: string,
  scopeRefId: number,
  versionId: number,
  limit = 7,
): Promise<string[]> {
  try {
    let q: string;
    if (scope === "unit") {
      q = `
        SELECT DISTINCT kc
        FROM v4_units u, jsonb_array_elements_text(u.key_concepts) kc
        WHERE u.id = ${scopeRefId}
        LIMIT ${limit}
      `;
    } else if (scope === "stage") {
      q = `
        SELECT DISTINCT kc
        FROM v4_units u, jsonb_array_elements_text(u.key_concepts) kc
        WHERE u.stage_id = ${scopeRefId}
        LIMIT ${limit}
      `;
    } else {
      // level — gather key concepts from all units that belong to this level's stages
      q = `
        SELECT DISTINCT kc
        FROM v4_units u
        JOIN v4_stages st ON st.id = u.stage_id
        , jsonb_array_elements_text(u.key_concepts) kc
        WHERE st.level_id = ${scopeRefId}
        LIMIT ${limit}
      `;
    }
    const rows = ((await db.execute(sql.raw(q))) as any).rows as { kc: string }[];
    return rows.map((r) => r.kc).filter(Boolean);
  } catch {
    return [];
  }
}

/** Fetch key topics for specialty_complete: one goal per level. */
async function fetchSpecialtyTopics(versionId: number, limit = 6): Promise<string[]> {
  try {
    const rows = ((await db.execute(sql.raw(`
      SELECT DISTINCT kc
      FROM v4_units u
      JOIN v4_stages st ON st.id = u.stage_id
      JOIN v4_levels lv ON lv.id = st.level_id
      , jsonb_array_elements_text(u.key_concepts) kc
      WHERE u.version_id = ${versionId}
      LIMIT ${limit}
    `))) as any).rows as { kc: string }[];
    return rows.map((r) => r.kc).filter(Boolean);
  } catch {
    return [];
  }
}

// ── GET /v4/certificates ──────────────────────────────────────────────────────
router.get("/v4/certificates", requireUser, async (req: any, res: any): Promise<any> => {
  const userId = getUserId(req)!;
  try {
    // 1. User display name
    const [user] = await db.select({ displayName: usersTable.displayName })
      .from(usersTable).where(eq(usersTable.id, userId));
    const studentName = user?.displayName ?? "الطالب";

    // 2. Best (latest) passing level-exam per unique (scope_ref_id, version_id)
    //    Only level-scope exams earn individual certificates.
    const passedResult = await db.execute(sql`
      SELECT DISTINCT ON (ea.scope_ref_id, ea.version_id)
        ea.id            AS exam_pass_id,
        ea.scope,
        ea.scope_ref_id,
        ea.exam_code,
        ea.score         AS score_pct,
        ea.attempted_at  AS created_at,
        ea.version_id,
        s.slug           AS specialty_slug,
        s.name           AS specialty_name,
        lv.name          AS scope_name
      FROM v4_exam_attempts ea
      JOIN v4_instruction_file_versions iv ON iv.id = ea.version_id
      JOIN v4_specialties s ON s.id = iv.specialty_id
      JOIN v4_levels lv ON lv.id = ea.scope_ref_id AND lv.version_id = ea.version_id
      WHERE ea.user_id = ${userId}
        AND ea.passed  = true
        AND ea.scope   = 'level'
      ORDER BY ea.scope_ref_id, ea.version_id, ea.attempted_at DESC
    `);
    const passedExams = (passedResult as any).rows as any[];

    // 3. Upsert one certificate per passed level exam
    const certRows: any[] = [];

    for (const row of passedExams) {
      // Re-use existing cert if already issued for this level pass
      const existResult = await db.execute(sql`
        SELECT c.* FROM v4_certificates c
        WHERE c.user_id = ${userId}
          AND c.type    = 'level_exam'
          AND c.exam_pass_id IN (
            SELECT id FROM v4_exam_attempts
            WHERE user_id    = ${userId}
              AND scope      = 'level'
              AND scope_ref_id = ${row.scope_ref_id}
              AND version_id = ${row.version_id}
              AND passed     = true
          )
        LIMIT 1
      `);
      if ((existResult as any).rows.length > 0) {
        certRows.push((existResult as any).rows[0]);
        continue;
      }

      // Build cert metadata
      const code = randomUUID().replace(/-/g, "").substring(0, 16).toUpperCase();
      const scopeLabel = row.scope_name
        ? `المستوى · ${row.scope_name}`
        : "اختبار المستوى";

      // Fetch level goal (one-sentence Arabic summary of what was learned)
      let scopeGoal = "";
      try {
        const goalResult = (await db.execute(sql`
          SELECT goal FROM v4_levels WHERE id = ${row.scope_ref_id} LIMIT 1
        `)) as any;
        scopeGoal = goalResult.rows?.[0]?.goal ?? "";
      } catch {}

      // Fetch key topics for this level
      const keyTopics = await fetchKeyTopics("level", row.scope_ref_id, row.version_id);
      const keyTopicsJson = JSON.stringify(keyTopics);

      try {
        const newResult = await db.execute(sql`
          INSERT INTO v4_certificates
            (user_id, exam_pass_id, type, specialty_slug, specialty_name,
             scope_label, exam_code, score_pct, scope_goal, key_topics, verification_code, issued_at)
          VALUES
            (${userId}, ${row.exam_pass_id}, 'level_exam', ${row.specialty_slug},
             ${row.specialty_name}, ${scopeLabel}, ${row.exam_code},
             ${row.score_pct}, ${scopeGoal}, ${keyTopicsJson}::jsonb, ${code}, ${row.created_at})
          ON CONFLICT (exam_pass_id) DO UPDATE
            SET updated_at = NOW()
          RETURNING *
        `);
        certRows.push(...(newResult as any).rows);
      } catch (e: any) {
        logger.warn({ err: e?.message }, "[v4/certificates] upsert level cert failed");
      }
    }

    // 4. Specialty-complete certificates
    //    Group passed exams by (version_id, specialty_slug).
    const versions = new Map<string, {
      versionId: number; specialtySlug: string; specialtyName: string;
    }>();
    for (const row of passedExams) {
      const key = `${row.version_id}:${row.specialty_slug}`;
      if (!versions.has(key)) {
        versions.set(key, {
          versionId: row.version_id,
          specialtySlug: row.specialty_slug,
          specialtyName: row.specialty_name,
        });
      }
    }

    for (const [, g] of versions) {
      // Count total levels in this version
      const totalResult = (await db.execute(sql`
        SELECT COUNT(*)::int AS cnt FROM v4_levels WHERE version_id = ${g.versionId}
      `)) as any;
      const total = Number(totalResult.rows?.[0]?.cnt ?? 0);

      // Count DISTINCT level-scope passes for this user+version
      const passedResult2 = (await db.execute(sql`
        SELECT COUNT(DISTINCT scope_ref_id)::int AS cnt
        FROM v4_exam_attempts
        WHERE user_id   = ${userId}
          AND version_id = ${g.versionId}
          AND scope     = 'level'
          AND passed    = true
      `)) as any;
      const passedLevels = Number(passedResult2.rows?.[0]?.cnt ?? 0);

      // Only issue specialty_complete when ALL levels are passed
      if (total < 1 || passedLevels < total) continue;

      // Check if specialty_complete cert already exists
      const existResult = await db.execute(sql`
        SELECT * FROM v4_certificates
        WHERE user_id = ${userId} AND type = 'specialty_complete'
          AND specialty_slug = ${g.specialtySlug}
        LIMIT 1
      `);
      if ((existResult as any).rows.length > 0) {
        certRows.push((existResult as any).rows[0]);
        continue;
      }

      // Compute real avg score from level exam passes
      const avgResult = (await db.execute(sql`
        SELECT ROUND(AVG(score))::int AS avg_score
        FROM (
          SELECT DISTINCT ON (scope_ref_id) score
          FROM v4_exam_attempts
          WHERE user_id   = ${userId}
            AND version_id = ${g.versionId}
            AND scope     = 'level'
            AND passed    = true
          ORDER BY scope_ref_id, attempted_at DESC
        ) sub
      `)) as any;
      const avgScore = Number(avgResult.rows?.[0]?.avg_score ?? 100);

      const code = randomUUID().replace(/-/g, "").substring(0, 16).toUpperCase();
      const keyTopics = await fetchSpecialtyTopics(g.versionId);
      const keyTopicsJson = JSON.stringify(keyTopics);

      try {
        const newResult = await db.execute(sql`
          INSERT INTO v4_certificates
            (user_id, exam_pass_id, type, specialty_slug, specialty_name,
             scope_label, exam_code, score_pct, scope_goal, key_topics, verification_code, issued_at)
          VALUES
            (${userId}, NULL, 'specialty_complete', ${g.specialtySlug},
             ${g.specialtyName}, 'إتمام التخصص كاملاً', NULL,
             ${avgScore}, '', ${keyTopicsJson}::jsonb, ${code}, NOW())
          ON CONFLICT ON CONSTRAINT uq_v4_certificates_specialty_complete DO NOTHING
          RETURNING *
        `);
        if ((newResult as any).rows.length > 0) {
          certRows.push(...(newResult as any).rows);
        } else {
          // race — re-fetch
          const re2 = await db.execute(sql`
            SELECT * FROM v4_certificates
            WHERE user_id = ${userId} AND type = 'specialty_complete'
              AND specialty_slug = ${g.specialtySlug}
            LIMIT 1
          `);
          certRows.push(...(re2 as any).rows);
        }
      } catch (e: any) {
        logger.warn({ err: e?.message }, "[v4/certificates] upsert specialty_complete failed");
      }
    }

    // 5. Manually-issued completion certificates (e.g., admin-granted)
    const manualCerts = await db.execute(sql`
      SELECT * FROM v4_certificates
      WHERE user_id = ${userId}
        AND type = 'completion'
      ORDER BY issued_at DESC
    `);
    certRows.push(...(manualCerts as any).rows);

    // 6. Deduplicate + sort (specialty_complete first, then newest first)
    const seen = new Set<number>();
    const unique = certRows.filter((c: any) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
    unique.sort((a: any, b: any) => {
      if (a.type === "specialty_complete" && b.type !== "specialty_complete") return -1;
      if (b.type === "specialty_complete" && a.type !== "specialty_complete") return  1;
      return new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime();
    });

    // 6. Normalize key_topics: DB may return string or array
    for (const c of unique) {
      if (!c.key_topics) { c.key_topics = []; continue; }
      if (typeof c.key_topics === "string") {
        try { c.key_topics = JSON.parse(c.key_topics); } catch { c.key_topics = []; }
      }
      if (!Array.isArray(c.key_topics)) c.key_topics = [];
    }

    res.json({ studentName, certificates: unique });
  } catch (e: any) {
    logger.error({ err: e?.message }, "[v4/certificates] GET failed");
    res.status(500).json({ error: String(e?.message ?? e) });
  }
});

// ── GET /v4/certificates/verify/:code — public ────────────────────────────────
router.get("/v4/certificates/verify/:code", async (req: any, res: any): Promise<any> => {
  const { code } = req.params;
  if (!code || !/^[A-Z0-9]{12,20}$/.test(code)) {
    return res.status(400).json({ valid: false, error: "رمز التحقق غير صحيح" });
  }
  try {
    const result = await db.execute(sql`
      SELECT c.*, u.display_name AS student_name
      FROM v4_certificates c
      JOIN users u ON u.id = c.user_id
      WHERE c.verification_code = ${code}
      LIMIT 1
    `);
    if ((result as any).rows.length === 0) {
      return res.json({ valid: false });
    }
    const cert = (result as any).rows[0];
    return res.json({
      valid: true,
      certificate: {
        id:               cert.id,
        type:             cert.type,
        specialtyName:    cert.specialty_name,
        scopeLabel:       cert.scope_label,
        scorePct:         cert.score_pct,
        issuedAt:         cert.issued_at,
        verificationCode: cert.verification_code,
        studentName:      cert.student_name,
      },
    });
  } catch (e: any) {
    logger.error({ err: e?.message }, "[v4/certificates/verify] failed");
    res.status(500).json({ valid: false, error: String(e?.message ?? e) });
  }
});

export default router;
