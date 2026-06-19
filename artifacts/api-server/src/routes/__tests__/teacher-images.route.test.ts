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
const VALID_PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(2048, 0x42),
]);

before(async () => {
  tmpDir = await mkdtemp(path.join(tmpdir(), "teach-img-route-"));
  process.env.TEACHER_IMAGE_DIR = tmpDir;
  // Hermetic: no DATABASE_URL → the DB-backed manifest store no-ops (no pg pool).
  // The self-heal test below injects an in-memory store.
  delete process.env.DATABASE_URL;
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

  test("returns 404 with Cache-Control: no-store for a missing, un-healable file", async () => {
    const res = await fetch(`${baseUrl}/api/teacher-images/${"f".repeat(16)}.png`);
    assert.equal(res.status, 404);
    // A miss must NEVER be cached — the file may be self-healed on a later hit.
    assert.equal(res.headers.get("cache-control"), "no-store");
    await res.arrayBuffer();
  });

  test("self-heals a missing file from its manifest source_url, then serves it immutably", async () => {
    const store = await import("../../lib/teacher-image-store.js");
    const realFetch = globalThis.fetch;
    const healHash = "abad1dea0000beef";
    // Intercept ONLY the Wikimedia source re-fetch; everything else (incl. the
    // test's own request to the local server) passes through to the real fetch.
    globalThis.fetch = (async (input: any, init?: any) => {
      if (String(input).includes("upload.wikimedia.org")) {
        return new Response(VALID_PNG, { status: 200 });
      }
      return realFetch(input, init);
    }) as typeof fetch;
    store.__setManifestStoreForTests({
      async record() {},
      async get(hash) {
        return hash === healHash
          ? { hash: healHash, ext: ".png", kind: "photo", query: "", sourceUrl: "https://upload.wikimedia.org/wikipedia/commons/x.png", provider: "wiki" }
          : null;
      },
      async bump() {},
    });
    try {
      const res = await fetch(`${baseUrl}/api/teacher-images/${healHash}.png`);
      assert.equal(res.status, 200, "missing file was self-healed and served");
      assert.equal(res.headers.get("content-type"), "image/png");
      assert.equal(res.headers.get("cache-control"), "public, max-age=31536000, immutable");
      const body = Buffer.from(await res.arrayBuffer());
      assert.deepEqual(body, VALID_PNG);
    } finally {
      store.__setManifestStoreForTests(null);
      globalThis.fetch = realFetch;
      await rm(path.join(tmpDir, `${healHash}.png`), { force: true });
    }
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
