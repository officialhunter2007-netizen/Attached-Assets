/**
 * Static-file route for cached teacher illustrations.
 *
 * Mounted under /api/teacher-images/<hash>.<ext>. NO authentication —
 * the URL itself is unguessable (256-bit content hash) and the bytes are
 * intended for inline rendering inside teacher messages, which any
 * authenticated student already has the right to read.
 *
 * Aggressive caching: a 64-hex content hash means the URL is immutable
 * (different prompt = different hash), so we set `immutable, max-age=31536000`.
 */
import { Router, type IRouter } from "express";
import { serveTeacherImage } from "../lib/teacher-image-store";

const router: IRouter = Router();

router.get("/teacher-images/:filename", async (req, res) => {
  const result = await serveTeacherImage(req.params.filename);
  if (!result.ok) {
    res.status(result.status).json({ error: result.message });
    return;
  }
  res.setHeader("Content-Type", result.contentType);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("Content-Length", String(result.body.length));
  res.end(result.body);
});

export default router;
