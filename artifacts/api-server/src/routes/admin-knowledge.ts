import { Router, type IRouter } from "express";
import { eq, and, asc, max, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  adminKnowledgeModulesTable,
  adminModuleLevelFilesTable,
} from "@workspace/db";

const router: IRouter = Router();

function getUserId(req: any): number | null {
  return (req.session as any)?.userId ?? null;
}

async function isAdmin(userId: number | null): Promise<boolean> {
  if (!userId) return false;
  const [u] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  return u?.role === "admin";
}

/** CSRF guard for admin mutation endpoints. Mirrors v4_admin_instructions.ts. */
function csrfGuard(req: any, res: any): boolean {
  if (!req.headers["x-nukhba-csrf"]) {
    res.status(403).json({ error: "CSRF protection: X-Nukhba-Csrf header required" });
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/knowledge/modules?subjectId=
// Returns all modules for a subject with level completion status.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/admin/knowledge/modules", async (req, res): Promise<any> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!(await isAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  const subjectId = typeof req.query.subjectId === "string" ? req.query.subjectId.trim() : "";
  if (!subjectId) return res.status(400).json({ error: "subjectId required" });

  const modules = await db
    .select()
    .from(adminKnowledgeModulesTable)
    .where(eq(adminKnowledgeModulesTable.subjectId, subjectId))
    .orderBy(asc(adminKnowledgeModulesTable.moduleOrder));

  const moduleIds = modules.map((m) => m.id);

  // Fetch all level files for these modules in one query
  const levelFiles =
    moduleIds.length > 0
      ? await db
          .select()
          .from(adminModuleLevelFilesTable)
          .where(
            sql`${adminModuleLevelFilesTable.moduleId} = ANY(ARRAY[${sql.join(moduleIds.map(id => sql`${id}`), sql`, `)}]::int[])`,
          )
      : [];

  // Group level files by moduleId
  const filesByModule: Record<number, typeof levelFiles> = {};
  for (const f of levelFiles) {
    if (!filesByModule[f.moduleId]) filesByModule[f.moduleId] = [];
    filesByModule[f.moduleId].push(f);
  }

  const result = modules.map((m) => {
    const files = filesByModule[m.id] ?? [];
    const levels = Array.from({ length: 5 }, (_, i) => {
      const level = i + 1;
      const file = files.find((f) => f.level === level);
      if (file) {
        return {
          level,
          uploaded: true,
          fileName: file.fileName,
          wordCount: file.content.trim().split(/\s+/).length,
          uploadedAt: file.uploadedAt,
        };
      }
      return { level, uploaded: false };
    });

    return {
      id: m.id,
      subjectId: m.subjectId,
      moduleName: m.moduleName,
      moduleNameAr: m.moduleNameAr,
      moduleOrder: m.moduleOrder,
      descriptionAr: m.descriptionAr,
      createdBy: m.createdBy,
      createdAt: m.createdAt,
      isComplete: files.length === 5,
      uploadedLevels: files.length,
      levels,
    };
  });

  return res.json({ data: result });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/knowledge/modules
// Creates a new module.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/admin/knowledge/modules", async (req, res): Promise<any> => {
  if (!csrfGuard(req, res)) return;
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!(await isAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  const { subjectId, moduleName, moduleNameAr, moduleOrder, descriptionAr } = req.body ?? {};
  if (!subjectId || typeof subjectId !== "string") return res.status(400).json({ error: "subjectId required" });
  if (!moduleNameAr || typeof moduleNameAr !== "string" || !moduleNameAr.trim()) {
    return res.status(400).json({ error: "moduleNameAr required" });
  }

  // Get max order for this subject if not provided
  let order = typeof moduleOrder === "number" ? moduleOrder : 0;
  if (typeof moduleOrder !== "number") {
    const [maxRow] = await db
      .select({ maxOrder: max(adminKnowledgeModulesTable.moduleOrder) })
      .from(adminKnowledgeModulesTable)
      .where(eq(adminKnowledgeModulesTable.subjectId, subjectId));
    order = (maxRow?.maxOrder ?? -1) + 1;
  }

  const adminUser = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  const adminEmail = adminUser[0]?.email ?? "admin";

  try {
    const [created] = await db
      .insert(adminKnowledgeModulesTable)
      .values({
        subjectId: subjectId.trim(),
        moduleName: (moduleName ?? moduleNameAr ?? "").trim(),
        moduleNameAr: moduleNameAr.trim(),
        moduleOrder: order,
        descriptionAr: descriptionAr ?? null,
        createdBy: adminEmail,
      })
      .returning();
    return res.status(201).json({ data: created });
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "اسم الوحدة موجود مسبقاً لهذا التخصص" });
    }
    return res.status(500).json({ error: "Failed to create module" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/knowledge/modules/:id
// Updates module metadata.
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/admin/knowledge/modules/:id", async (req, res): Promise<any> => {
  if (!csrfGuard(req, res)) return;
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!(await isAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  const moduleId = parseInt(req.params.id, 10);
  if (isNaN(moduleId)) return res.status(400).json({ error: "Invalid module id" });

  const { moduleName, moduleNameAr, moduleOrder, descriptionAr } = req.body ?? {};
  const updates: Record<string, any> = { updatedAt: new Date() };
  if (moduleName !== undefined) updates.moduleName = moduleName;
  if (moduleNameAr !== undefined) updates.moduleNameAr = moduleNameAr;
  if (typeof moduleOrder === "number") updates.moduleOrder = moduleOrder;
  if (descriptionAr !== undefined) updates.descriptionAr = descriptionAr;

  const [updated] = await db
    .update(adminKnowledgeModulesTable)
    .set(updates)
    .where(eq(adminKnowledgeModulesTable.id, moduleId))
    .returning();

  if (!updated) return res.status(404).json({ error: "Module not found" });
  return res.json({ data: updated });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/knowledge/modules/:id
// Deletes module + all level files (cascade).
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/admin/knowledge/modules/:id", async (req, res): Promise<any> => {
  if (!csrfGuard(req, res)) return;
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!(await isAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  const moduleId = parseInt(req.params.id, 10);
  if (isNaN(moduleId)) return res.status(400).json({ error: "Invalid module id" });

  await db
    .delete(adminKnowledgeModulesTable)
    .where(eq(adminKnowledgeModulesTable.id, moduleId));

  return res.json({ data: { deleted: true } });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/knowledge/modules/:id/levels
// Upserts a level file (content as JSON body — frontend reads .txt as text).
// ─────────────────────────────────────────────────────────────────────────────
router.post("/admin/knowledge/modules/:id/levels", async (req, res): Promise<any> => {
  if (!csrfGuard(req, res)) return;
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!(await isAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  const moduleId = parseInt(req.params.id, 10);
  if (isNaN(moduleId)) return res.status(400).json({ error: "Invalid module id" });

  const { level, fileName, content } = req.body ?? {};
  if (typeof level !== "number" || level < 1 || level > 5) {
    return res.status(400).json({ error: "level must be 1–5" });
  }
  if (typeof content !== "string" || content.trim().length < 200) {
    return res.status(400).json({ error: "content must be at least 200 characters" });
  }
  if (content.length > 50_000) {
    return res.status(400).json({ error: "content must not exceed 50,000 characters" });
  }
  if (typeof fileName !== "string" || !fileName.trim()) {
    return res.status(400).json({ error: "fileName required" });
  }

  // Verify module exists
  const [mod] = await db
    .select({ id: adminKnowledgeModulesTable.id })
    .from(adminKnowledgeModulesTable)
    .where(eq(adminKnowledgeModulesTable.id, moduleId));
  if (!mod) return res.status(404).json({ error: "Module not found" });

  const adminUser = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  const adminEmail = adminUser[0]?.email ?? "admin";

  const [upserted] = await db
    .insert(adminModuleLevelFilesTable)
    .values({
      moduleId,
      level,
      fileName: fileName.trim(),
      content: content.trim(),
      uploadedBy: adminEmail,
    })
    .onConflictDoUpdate({
      target: [adminModuleLevelFilesTable.moduleId, adminModuleLevelFilesTable.level],
      set: {
        fileName: fileName.trim(),
        content: content.trim(),
        uploadedBy: adminEmail,
        uploadedAt: new Date(),
      },
    })
    .returning();

  const wordCount = upserted.content.trim().split(/\s+/).length;
  return res.status(201).json({
    data: {
      id: upserted.id,
      moduleId: upserted.moduleId,
      level: upserted.level,
      fileName: upserted.fileName,
      wordCount,
      uploadedAt: upserted.uploadedAt,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/knowledge/modules/:id/levels/:level
// Removes a specific level file.
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/admin/knowledge/modules/:id/levels/:level", async (req, res): Promise<any> => {
  if (!csrfGuard(req, res)) return;
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!(await isAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  const moduleId = parseInt(req.params.id, 10);
  const level = parseInt(req.params.level, 10);
  if (isNaN(moduleId) || isNaN(level) || level < 1 || level > 5) {
    return res.status(400).json({ error: "Invalid module id or level" });
  }

  await db
    .delete(adminModuleLevelFilesTable)
    .where(
      and(
        eq(adminModuleLevelFilesTable.moduleId, moduleId),
        eq(adminModuleLevelFilesTable.level, level),
      ),
    );

  return res.json({ data: { deleted: true } });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/knowledge/modules/:id/levels/:level/preview
// Returns the full text content of a level file.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/admin/knowledge/modules/:id/levels/:level/preview", async (req, res): Promise<any> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!(await isAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  const moduleId = parseInt(req.params.id, 10);
  const level = parseInt(req.params.level, 10);
  if (isNaN(moduleId) || isNaN(level)) return res.status(400).json({ error: "Invalid params" });

  const [file] = await db
    .select()
    .from(adminModuleLevelFilesTable)
    .where(
      and(
        eq(adminModuleLevelFilesTable.moduleId, moduleId),
        eq(adminModuleLevelFilesTable.level, level),
      ),
    );

  if (!file) return res.status(404).json({ error: "Level file not found" });

  return res.json({
    data: {
      content: file.content,
      wordCount: file.content.trim().split(/\s+/).length,
      fileName: file.fileName,
      uploadedAt: file.uploadedAt,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/knowledge/modules/reorder
// Batch update module_order given an ordered array of module IDs.
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/admin/knowledge/modules/reorder", async (req, res): Promise<any> => {
  if (!csrfGuard(req, res)) return;
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!(await isAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  const { order } = req.body ?? {};
  if (!Array.isArray(order) || order.length === 0) {
    return res.status(400).json({ error: "order array required" });
  }

  for (let i = 0; i < order.length; i++) {
    const id = parseInt(order[i], 10);
    if (isNaN(id)) continue;
    await db
      .update(adminKnowledgeModulesTable)
      .set({ moduleOrder: i, updatedAt: new Date() })
      .where(eq(adminKnowledgeModulesTable.id, id));
  }

  return res.json({ data: { updated: order.length } });
});

export default router;
