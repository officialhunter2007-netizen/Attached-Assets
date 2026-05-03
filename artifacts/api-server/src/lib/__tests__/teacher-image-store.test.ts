/**
 * Integration tests for the teacher-image cache + serve helper.
 *
 * Run with:  pnpm --filter @workspace/api-server exec tsx src/lib/__tests__/teacher-image-store.test.ts
 *
 * Covers the security-sensitive surface of the /api/teacher-images route:
 *   1. strict filename allowlist (path traversal + bad extensions are rejected)
 *   2. content-type mapping for the allowed extensions
 *   3. happy-path serve returns a real disk path + size for streaming
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

let tmpDir: string;

before(async () => {
  tmpDir = await mkdtemp(path.join(tmpdir(), "teach-img-test-"));
  process.env.TEACHER_IMAGE_DIR = tmpDir;
});

after(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("serveTeacherImage — filename allowlist", () => {
  test("rejects path traversal", async () => {
    const { serveTeacherImage } = await import("../teacher-image-store.js");
    const r = await serveTeacherImage("../../etc/passwd");
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 400);
  });

  test("rejects forward slash", async () => {
    const { serveTeacherImage } = await import("../teacher-image-store.js");
    const r = await serveTeacherImage("a".repeat(64) + "/.png");
    assert.equal(r.ok, false);
  });

  test("rejects non-hex prefix", async () => {
    const { serveTeacherImage } = await import("../teacher-image-store.js");
    const r = await serveTeacherImage("z".repeat(64) + ".png");
    assert.equal(r.ok, false);
  });

  test("rejects wrong-length hash", async () => {
    const { serveTeacherImage } = await import("../teacher-image-store.js");
    const r = await serveTeacherImage("a".repeat(63) + ".png");
    assert.equal(r.ok, false);
  });

  test("rejects disallowed extension (gif)", async () => {
    const { serveTeacherImage } = await import("../teacher-image-store.js");
    const r = await serveTeacherImage("a".repeat(64) + ".gif");
    assert.equal(r.ok, false);
  });

  test("rejects disallowed extension (html)", async () => {
    const { serveTeacherImage } = await import("../teacher-image-store.js");
    const r = await serveTeacherImage("a".repeat(64) + ".html");
    assert.equal(r.ok, false);
  });

  test("returns 404 for valid name with no file", async () => {
    const { serveTeacherImage } = await import("../teacher-image-store.js");
    const r = await serveTeacherImage("a".repeat(64) + ".png");
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 404);
  });
});

describe("serveTeacherImage — content-type mapping", () => {
  test("png / jpg / jpeg / webp / svg map correctly", async () => {
    const { serveTeacherImage } = await import("../teacher-image-store.js");
    const cases: Array<[string, string]> = [
      [".png", "image/png"],
      [".jpg", "image/jpeg"],
      [".jpeg", "image/jpeg"],
      [".webp", "image/webp"],
      [".svg", "image/svg+xml"],
    ];
    for (const [ext, ct] of cases) {
      const hash = "b".repeat(64);
      const filename = hash + ext;
      const filePath = path.join(tmpDir, filename);
      await writeFile(filePath, Buffer.from("test-bytes"));
      const r = await serveTeacherImage(filename);
      assert.equal(r.ok, true, `${ext} should serve`);
      if (r.ok) {
        assert.equal(r.contentType, ct, `${ext} → ${ct}`);
        assert.equal(r.path, filePath);
        const s = await stat(filePath);
        assert.equal(r.size, s.size);
      }
      await rm(filePath, { force: true });
    }
  });
});
