/**
 * HTTP integration tests for /api/teacher-images/:filename.
 *
 * Boots a tiny Express app mounting the real router against a temp
 * cache dir, drops a fixture file, and asserts the response headers,
 * body bytes, 404 behaviour for missing files, and 400 for malformed
 * filenames.
 *
 * Run with:
 *   pnpm --filter @workspace/api-server exec tsx \
 *     src/routes/__tests__/teacher-images.route.test.ts
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import http from "node:http";
import express from "express";

let tmpDir: string;
let server: http.Server;
let baseUrl: string;
const HASH = "0123456789abcdef"; // valid 16-hex
const FIXTURE_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

before(async () => {
  tmpDir = await mkdtemp(path.join(tmpdir(), "teach-img-route-"));
  process.env.TEACHER_IMAGE_DIR = tmpDir;
  await writeFile(path.join(tmpDir, `${HASH}.png`), FIXTURE_BYTES);

  const router = (await import("../teacher-images.js")).default;
  const app = express();
  app.use("/api", router);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("no address");
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await rm(tmpDir, { recursive: true, force: true });
});

describe("GET /api/teacher-images/:filename", () => {
  test("serves cached file with immutable cache headers + correct content-type", async () => {
    const res = await fetch(`${baseUrl}/api/teacher-images/${HASH}.png`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "image/png");
    assert.equal(res.headers.get("cache-control"), "public, max-age=31536000, immutable");
    assert.equal(res.headers.get("content-length"), String(FIXTURE_BYTES.length));
    const body = Buffer.from(await res.arrayBuffer());
    assert.deepEqual(body, FIXTURE_BYTES);
  });

  test("returns 404 for a well-formed filename that doesn't exist on disk", async () => {
    const res = await fetch(`${baseUrl}/api/teacher-images/${"f".repeat(16)}.png`);
    assert.equal(res.status, 404);
    await res.arrayBuffer();
  });

  test("returns 400 for malformed filenames (path traversal, bad ext, wrong hash length)", async () => {
    for (const name of ["..%2Fetc%2Fpasswd", `${HASH}.gif`, `${"a".repeat(8)}.png`]) {
      const res = await fetch(`${baseUrl}/api/teacher-images/${name}`);
      assert.equal(res.status, 400, `expected 400 for ${name}, got ${res.status}`);
      await res.arrayBuffer();
    }
  });

  test("HEAD returns headers only, no body", async () => {
    const res = await fetch(`${baseUrl}/api/teacher-images/${HASH}.png`, { method: "HEAD" });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-length"), String(FIXTURE_BYTES.length));
    const body = Buffer.from(await res.arrayBuffer());
    assert.equal(body.length, 0);
  });
});
