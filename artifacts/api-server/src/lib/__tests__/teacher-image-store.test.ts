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
    const r = await serveTeacherImage("a".repeat(16) + "/.png");
    assert.equal(r.ok, false);
  });

  test("rejects non-hex prefix", async () => {
    const { serveTeacherImage } = await import("../teacher-image-store.js");
    const r = await serveTeacherImage("z".repeat(16) + ".png");
    assert.equal(r.ok, false);
  });

  test("rejects wrong-length hash", async () => {
    const { serveTeacherImage } = await import("../teacher-image-store.js");
    const r = await serveTeacherImage("a".repeat(15) + ".png");
    assert.equal(r.ok, false);
  });

  test("rejects disallowed extension (gif)", async () => {
    const { serveTeacherImage } = await import("../teacher-image-store.js");
    const r = await serveTeacherImage("a".repeat(16) + ".gif");
    assert.equal(r.ok, false);
  });

  test("rejects disallowed extension (html)", async () => {
    const { serveTeacherImage } = await import("../teacher-image-store.js");
    const r = await serveTeacherImage("a".repeat(16) + ".html");
    assert.equal(r.ok, false);
  });

  test("returns 404 for valid name with no file", async () => {
    const { serveTeacherImage } = await import("../teacher-image-store.js");
    const r = await serveTeacherImage("a".repeat(16) + ".png");
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 404);
  });
});

describe("resolveTeacherImage — fallback-to-SVG + cache replay", () => {
  test("falls through to SVG poster when both providers fail, persists to disk, second call hits cache", async () => {
    delete process.env.FAL_KEY;
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new Error("simulated upstream failure");
    }) as typeof fetch;

    try {
      const { resolveTeacherImage } = await import("../teacher-image-store.js");

      const prompt = "test-prompt-" + Date.now();
      const r1 = await resolveTeacherImage(prompt);
      assert.equal(r1.provider, "svg", "first call should fall through to svg");
      assert.match(r1.url, /^\/api\/teacher-images\/[a-f0-9]{16}\.svg$/);

      const filename = r1.url.split("/").pop()!;
      const persisted = path.join(tmpDir, filename);
      const s = await stat(persisted);
      assert.ok(s.size > 0, "svg poster persisted to disk with nonzero size");

      const r2 = await resolveTeacherImage(prompt);
      assert.equal(r2.provider, "cache", "second call should hit the disk cache");
      assert.equal(r2.url, r1.url, "cache hit returns the same URL");
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

describe("resolveWebPhoto — real-photo miss contract + provider chain", () => {
  const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const validPng = Buffer.concat([PNG_SIG, Buffer.alloc(2048, 0x42)]); // > MIN_BYTES

  const jsonRes = (obj: unknown) =>
    new Response(JSON.stringify(obj), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

  test("empty query returns a MISS (provider 'none', empty url) — never an AI image", async () => {
    const { resolveWebPhoto } = await import("../teacher-image-store.js");
    const r = await resolveWebPhoto("   ");
    assert.equal(r.provider, "none");
    assert.equal(r.url, "");
  });

  test("all providers empty → MISS (no SVG, no generated fallback)", async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (input: any) => {
      const url = String(input);
      // Every search returns an empty payload; no candidate thumbnails.
      if (url.includes("api.openverse.org")) return jsonRes({ results: [] });
      return jsonRes({}); // wikipedia + commons
    }) as typeof fetch;
    try {
      const { resolveWebPhoto } = await import("../teacher-image-store.js");
      const r = await resolveWebPhoto("nonexistent gadget " + Date.now());
      assert.equal(r.provider, "none", "a total miss must report provider 'none'");
      assert.equal(r.url, "", "a miss must NOT substitute any generated image url");
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  test("Openverse tertiary: wiki+commons empty, openverse thumb yields bytes → provider 'openverse'", async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (input: any) => {
      const url = String(input);
      if (url.includes("/thumb")) return new Response(validPng, { status: 200 });
      if (url.includes("api.openverse.org")) {
        return jsonRes({
          results: [
            {
              thumbnail: "https://api.openverse.org/v1/images/abc/thumb/",
              title: "DDR4 RAM module photo",
            },
          ],
        });
      }
      return jsonRes({}); // wikipedia + commons empty
    }) as typeof fetch;
    try {
      const { resolveWebPhoto } = await import("../teacher-image-store.js");
      const r = await resolveWebPhoto("openverse-ram-" + Date.now());
      assert.equal(r.provider, "openverse");
      assert.match(r.url, /^\/api\/teacher-images\/[a-f0-9]{16}\.png$/);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  test("SSRF: an Openverse thumbnail on a NON-allowlisted host is rejected → MISS", async () => {
    const realFetch = globalThis.fetch;
    let evilFetched = false;
    globalThis.fetch = (async (input: any) => {
      const url = String(input);
      if (url.includes("evil.example.com")) {
        evilFetched = true;
        return new Response(validPng, { status: 200 });
      }
      if (url.includes("api.openverse.org")) {
        return jsonRes({
          results: [{ thumbnail: "https://evil.example.com/x.png", title: "ram" }],
        });
      }
      return jsonRes({});
    }) as typeof fetch;
    try {
      const { resolveWebPhoto } = await import("../teacher-image-store.js");
      const r = await resolveWebPhoto("ssrf-probe-" + Date.now());
      assert.equal(r.provider, "none", "off-allowlist thumbnail must not be used");
      assert.equal(evilFetched, false, "the non-allowlisted host must never be fetched");
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  test("streaming byte-cap: a body exceeding 8MB is aborted → MISS", async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (input: any) => {
      const url = String(input);
      if (url.includes("/thumb")) {
        const oneMB = new Uint8Array(1024 * 1024);
        oneMB.set([0x89, 0x50, 0x4e, 0x47], 0); // PNG sig in first chunk
        let sent = 0;
        const stream = new ReadableStream<Uint8Array>({
          pull(controller) {
            if (sent >= 9) {
              controller.close();
              return;
            }
            sent++;
            controller.enqueue(oneMB.slice());
          },
        });
        return new Response(stream, { status: 200 });
      }
      if (url.includes("api.openverse.org")) {
        return jsonRes({
          results: [{ thumbnail: "https://api.openverse.org/v1/images/big/thumb/", title: "x" }],
        });
      }
      return jsonRes({});
    }) as typeof fetch;
    try {
      const { resolveWebPhoto } = await import("../teacher-image-store.js");
      const r = await resolveWebPhoto("oversized-" + Date.now());
      assert.equal(r.provider, "none", "an over-cap download must be discarded → miss");
      assert.equal(r.url, "");
    } finally {
      globalThis.fetch = realFetch;
    }
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
      const hash = "b".repeat(16);
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
