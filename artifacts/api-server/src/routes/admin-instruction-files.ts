import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, desc, or } from "drizzle-orm";
import { db, instructionFilesTable, specialtiesTable, usersTable } from "@workspace/db";
import { parseInstructionFile } from "../lib/instruction-file-parser";

const router: IRouter = Router();

function getUserId(req: Request): number | null {
  return ((req as any).session as any)?.userId ?? null;
}

async function isAdmin(userId: number | null): Promise<boolean> {
  if (!userId) return false;
  const [u] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  return u?.role === "admin";
}

/** Resolve a subject identifier (int id, slug, or name) to a specialties row. */
async function resolveSpecialty(specifier: string | number): Promise<{ id: number; name: string; nameAr: string; slug: string } | null> {
  if (typeof specifier === "number" && !isNaN(specifier)) {
    const [s] = await db
      .select({ id: specialtiesTable.id, name: specialtiesTable.name, nameAr: specialtiesTable.nameAr, slug: specialtiesTable.slug })
      .from(specialtiesTable)
      .where(eq(specialtiesTable.id, specifier));
    return s ?? null;
  }
  const slug = String(specifier).trim().toLowerCase();
  const [s] = await db
    .select({ id: specialtiesTable.id, name: specialtiesTable.name, nameAr: specialtiesTable.nameAr, slug: specialtiesTable.slug })
    .from(specialtiesTable)
    .where(
      or(
        eq(specialtiesTable.slug, slug),
        eq(specialtiesTable.name, slug),
      ),
    );
  return s ?? null;
}

// ── POST /api/admin/instruction-files/parse ──────────────────────────────────
// Parses and validates instruction file content without saving.
router.post("/admin/instruction-files/parse", async (req: Request, res: Response): Promise<any> => {
  // CSRF defence: custom header required on all admin mutation endpoints.
  // Browsers cannot attach custom headers cross-origin without a CORS
  // preflight, so this header proves same-origin intent.
  if (!req.headers["x-nukhba-csrf"]) {
    return res.status(403).json({ error: "CSRF protection: X-Nukhba-Csrf header required" });
  }
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!(await isAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  const { content } = req.body ?? {};
  if (typeof content !== "string" || !content.trim()) {
    return res.status(400).json({ error: "محتوى ملف التعليمات مطلوب" });
  }

  if (content.length > 500_000) {
    return res.status(400).json({ error: "حجم الملف كبير جداً (الحد الأقصى: 500,000 حرف)" });
  }

  try {
    const result = parseInstructionFile(content);
    return res.json({
      data: {
        specialty: result.specialty,
        levels: result.levels,
        issues: result.issues,
        stats: result.stats,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      error: "فشل تحليل ملف التعليمات",
      details: err?.message ?? String(err),
    });
  }
});

// ── POST /api/admin/instruction-files ─────────────────────────────────────────
// Create a new instruction file (with validation preview).
router.post("/admin/instruction-files", async (req: Request, res: Response): Promise<any> => {
  if (!req.headers["x-nukhba-csrf"]) {
    return res.status(403).json({ error: "CSRF protection: X-Nukhba-Csrf header required" });
  }
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!(await isAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  let { subjectId, specialtyId, title, titleAr, content, version } = req.body ?? {};
  const specifier = specialtyId ?? subjectId;
  if (!specifier) {
    return res.status(400).json({ error: "specialtyId أو subjectId مطلوب" });
  }
  if (typeof content !== "string" || !content.trim()) {
    return res.status(400).json({ error: "محتوى ملف التعليمات مطلوب" });
  }

  // Resolve specialty
  const specialty = await resolveSpecialty(specifier);
  if (!specialty) {
    return res.status(404).json({ error: "التخصص غير موجود. تأكد من أن التخصص مضاف في قاعدة البيانات." });
  }

  // Validate the content
  const validation = parseInstructionFile(content);

  // Deactivate previous active instruction files for this specialty
  await db
    .update(instructionFilesTable)
    .set({ isActive: false })
    .where(
      and(
        eq(instructionFilesTable.specialtyId, specialty.id),
        eq(instructionFilesTable.isActive, true),
      ),
    );

  const [created] = await db
    .insert(instructionFilesTable)
    .values({
      specialtyId: specialty.id,
      title: title ?? `توجيهات ${specialty.name}`,
      titleAr: titleAr ?? specialty.nameAr ?? null,
      content: content.trim(),
      version: version ?? "1.0",
      isActive: true,
    })
    .returning();

  return res.status(201).json({
    data: {
      instructionFile: created,
      validation: {
        stats: validation.stats,
        issues: validation.issues,
        specialty: validation.specialty,
        levelCount: validation.levels.length,
      },
    },
  });
});

// ── GET /api/admin/instruction-files?subjectId= ─────────────────────────────
// List instruction files for a specialty.
router.get("/admin/instruction-files", async (req: Request, res: Response): Promise<any> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!(await isAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  const specifier = (req.query.subjectId as string) || (req.query.specialtyId as string);
  if (!specifier) return res.status(400).json({ error: "subjectId أو specialtyId مطلوب" });

  const specialty = await resolveSpecialty(specifier);
  if (!specialty) return res.status(404).json({ error: "التخصص غير موجود" });

  const files = await db
    .select()
    .from(instructionFilesTable)
    .where(eq(instructionFilesTable.specialtyId, specialty.id))
    .orderBy(desc(instructionFilesTable.createdAt));

  return res.json({ data: files });
});

// ── GET /api/admin/instruction-files/:id/preview ─────────────────────────────
// Get the full content + validation for an instruction file.
router.get("/admin/instruction-files/:id/preview", async (req: Request, res: Response): Promise<any> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!(await isAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [file] = await db
    .select()
    .from(instructionFilesTable)
    .where(eq(instructionFilesTable.id, id));

  if (!file) return res.status(404).json({ error: "ملف التعليمات غير موجود" });

  const validation = parseInstructionFile(file.content);

  return res.json({
    data: {
      file,
      validation: {
        stats: validation.stats,
        issues: validation.issues,
        specialty: validation.specialty,
        levelCount: validation.levels.length,
      },
    },
  });
});

// ── PATCH /api/admin/instruction-files/:id ───────────────────────────────────
// Update instruction file metadata or content.
router.patch("/admin/instruction-files/:id", async (req: Request, res: Response): Promise<any> => {
  if (!req.headers["x-nukhba-csrf"]) {
    return res.status(403).json({ error: "CSRF protection: X-Nukhba-Csrf header required" });
  }
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!(await isAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const { title, titleAr, content, version, isActive } = req.body ?? {};
  const updates: Record<string, any> = { updatedAt: new Date() };
  if (title !== undefined) updates.title = title;
  if (titleAr !== undefined) updates.titleAr = titleAr;
  if (content !== undefined) updates.content = content;
  if (version !== undefined) updates.version = version;
  if (isActive !== undefined) updates.isActive = isActive;

  const [updated] = await db
    .update(instructionFilesTable)
    .set(updates)
    .where(eq(instructionFilesTable.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "ملف التعليمات غير موجود" });

  let validation = null;
  if (content !== undefined) {
    validation = parseInstructionFile(content);
  }

  return res.json({ data: { instructionFile: updated, validation: validation ? { stats: validation.stats, issues: validation.issues } : null } });
});

// ── DELETE /api/admin/instruction-files/:id ──────────────────────────────────
router.delete("/admin/instruction-files/:id", async (req: Request, res: Response): Promise<any> => {
  if (!req.headers["x-nukhba-csrf"]) {
    return res.status(403).json({ error: "CSRF protection: X-Nukhba-Csrf header required" });
  }
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!(await isAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  await db
    .delete(instructionFilesTable)
    .where(eq(instructionFilesTable.id, id));

  return res.json({ data: { deleted: true } });
});

export default router;
