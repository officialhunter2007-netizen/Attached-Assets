/**
 * Static-file route for cached teacher illustrations.
 *
 * Mounted under /api/teacher-images/<hash>.<ext>. NO authentication —
 * the URL is a 16-hex (64-bit) content hash and the bytes are intended
 * for inline rendering inside teacher messages, which any authenticated
 * student already has the right to read. The hash is short by design
 * (compact URLs in chat history) and is NOT relied on as an auth token.
 *
 * Aggressive caching: the 16-hex content hash means the URL is immutable
 * (different prompt = different hash), so we set `immutable, max-age=31536000`.
 *
 * The response body is true-streamed via `createReadStream` to keep
 * memory bounded under concurrent loads (a 30-student class opening the
 * same chapter image at once would otherwise hold N copies of every
 * image in the heap).
 */
import { Router, type IRouter } from "express";
import { createReadStream } from "node:fs";
import { pipeline } from "node:stream/promises";
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
  res.setHeader("Content-Length", String(result.size));
  // HEAD requests get headers only, no body.
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  const stream = createReadStream(result.path);
  // pipeline() handles cleanup + abort propagation when the client
  // disconnects mid-transfer (so the fd doesn't leak).
  try {
    await pipeline(stream, res);
  } catch {
    // Client disconnect or write-after-end — already best-effort handled
    // by pipeline()'s teardown; nothing to do.
  }
});

export default router;
