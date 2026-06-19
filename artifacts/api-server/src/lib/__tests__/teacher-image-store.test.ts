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
import type { ManifestStore } from "../teacher-image-store.js";

let tmpDir: string;

before(async () => {
  tmpDir = await mkdtemp(path.join(tmpdir(), "teach-img-test-"));
  process.env.TEACHER_IMAGE_DIR = tmpDir;
  // Keep these unit tests hermetic: with no DATABASE_URL the DB-backed manifest
  // store no-ops (and never constructs a pg pool that would hang process exit).
  // The self-heal tests below inject their own in-memory store instead.
  delete process.env.DATABASE_URL;
});

/** A hermetic, in-memory ManifestStore for the self-heal tests. */
function makeMemStore(initial: Record<string, any> = {}) {
  const rows: Record<string, any> = { ...initial };
  const bumps: Record<string, number> = {};
  const store: ManifestStore = {
    async record(row) { rows[row.hash] = { ...row }; },
    async get(hash) { return rows[hash] ?? null; },
    async bump(hash) { bumps[hash] = (bumps[hash] ?? 0) + 1; },
  };
  return { store, rows, bumps };
}

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

describe("serveTeacherImage — self-heal (manifest-backed recreation)", () => {
  const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const validPng = Buffer.concat([PNG_SIG, Buffer.alloc(2048, 0x42)]);
  const jsonRes = (obj: unknown) =>
    new Response(JSON.stringify(obj), { status: 200, headers: { "content-type": "application/json" } });

  test("photo: a missing file is re-fetched from its stable source_url and served", async () => {
    const { serveTeacherImage, __setManifestStoreForTests } = await import("../teacher-image-store.js");
    const realFetch = globalThis.fetch;
    const hash = "a1b2c3d4e5f60718";
    let fetchCount = 0;
    globalThis.fetch = (async (input: any) => {
      if (String(input).includes("upload.wikimedia.org")) {
        fetchCount++;
        return new Response(validPng, { status: 200 });
      }
      return jsonRes({});
    }) as typeof fetch;
    const mem = makeMemStore({
      [hash]: { hash, ext: ".png", kind: "photo", query: "", sourceUrl: "https://upload.wikimedia.org/wikipedia/commons/heart.png", provider: "wiki" },
    });
    __setManifestStoreForTests(mem.store);
    try {
      const r = await serveTeacherImage(hash + ".png");
      assert.equal(r.ok, true, "heal recreates the missing file from source_url");
      if (r.ok) {
        assert.equal(r.contentType, "image/png");
        assert.ok(r.size > 0);
      }
      assert.equal(fetchCount, 1, "healed via exactly one source re-fetch");
      assert.equal(mem.bumps[hash], 1, "heal_count bumped exactly once");
    } finally {
      __setManifestStoreForTests(null);
      globalThis.fetch = realFetch;
      await rm(path.join(tmpDir, hash + ".png"), { force: true });
    }
  });

  test("SSRF: a poisoned source_url on a non-allowlisted host is NEVER fetched → 404", async () => {
    const { serveTeacherImage, __setManifestStoreForTests } = await import("../teacher-image-store.js");
    const realFetch = globalThis.fetch;
    const hash = "b1b2c3d4e5f60718";
    let evilFetched = false;
    globalThis.fetch = (async (input: any) => {
      if (String(input).includes("evil.example.com")) {
        evilFetched = true;
        return new Response(validPng, { status: 200 });
      }
      return jsonRes({});
    }) as typeof fetch;
    const mem = makeMemStore({
      [hash]: { hash, ext: ".png", kind: "photo", query: "", sourceUrl: "https://evil.example.com/x.png", provider: "wiki" },
    });
    __setManifestStoreForTests(mem.store);
    try {
      const r = await serveTeacherImage(hash + ".png");
      assert.equal(r.ok, false, "an unhealed image must not be served");
      if (!r.ok) assert.equal(r.status, 404);
      assert.equal(evilFetched, false, "the non-allowlisted source host must never be fetched");
    } finally {
      __setManifestStoreForTests(null);
      globalThis.fetch = realFetch;
    }
  });

  test("photo: a dead source_url falls back to re-running the search by stored query", async () => {
    const { serveTeacherImage, resolveWebPhoto, __setManifestStoreForTests } = await import("../teacher-image-store.js");
    const realFetch = globalThis.fetch;
    const query = "heal-fallback-ram-" + Date.now();

    // 1. Prime once (working openverse mock) to learn the canonical hash.
    globalThis.fetch = (async (input: any) => {
      const u = String(input);
      if (u.includes("/thumb")) return new Response(validPng, { status: 200 });
      if (u.includes("api.openverse.org")) {
        return jsonRes({ results: [{ thumbnail: "https://api.openverse.org/v1/images/abc/thumb/", title: "x" }] });
      }
      return jsonRes({});
    }) as typeof fetch;
    const primed = await resolveWebPhoto(query);
    assert.equal(primed.provider, "openverse");
    const filename = primed.url.split("/").pop()!;
    const hash = filename.slice(0, 16);
    await rm(path.join(tmpDir, filename), { force: true }); // simulate eviction

    // 2. Heal: source_url is dead (200 but non-image) → must fall back to query search.
    let sourceTried = false;
    globalThis.fetch = (async (input: any) => {
      const u = String(input);
      if (u.includes("upload.wikimedia.org")) { sourceTried = true; return new Response("not an image", { status: 200 }); }
      if (u.includes("/thumb")) return new Response(validPng, { status: 200 });
      if (u.includes("api.openverse.org")) {
        return jsonRes({ results: [{ thumbnail: "https://api.openverse.org/v1/images/abc/thumb/", title: "x" }] });
      }
      return jsonRes({});
    }) as typeof fetch;
    const mem = makeMemStore({
      [hash]: { hash, ext: ".png", kind: "photo", query, sourceUrl: "https://upload.wikimedia.org/wikipedia/commons/dead.png", provider: "wiki" },
    });
    __setManifestStoreForTests(mem.store);
    try {
      const r = await serveTeacherImage(filename);
      assert.equal(r.ok, true, "heal must fall back to the stored-query search");
      assert.equal(sourceTried, true, "the dead source_url was attempted first");
    } finally {
      __setManifestStoreForTests(null);
      globalThis.fetch = realFetch;
      await rm(path.join(tmpDir, filename), { force: true });
    }
  });

  test("image: a missing generated image is re-created on the FREE path (never paid fal)", async () => {
    delete process.env.FAL_KEY;
    const { serveTeacherImage, resolveTeacherImage, __setManifestStoreForTests } = await import("../teacher-image-store.js");
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => { throw new Error("upstream down"); }) as typeof fetch;
    const prompt = "image-heal-" + Date.now();
    try {
      const primed = await resolveTeacherImage(prompt);
      assert.equal(primed.provider, "svg");
      const filename = primed.url.split("/").pop()!;
      const hash = filename.slice(0, 16);
      await rm(path.join(tmpDir, filename), { force: true }); // simulate eviction

      const mem = makeMemStore({
        [hash]: { hash, ext: ".svg", kind: "image", query: prompt, sourceUrl: null, provider: "svg" },
      });
      __setManifestStoreForTests(mem.store);
      const r = await serveTeacherImage(filename);
      assert.equal(r.ok, true, "image heal always succeeds via the terminal SVG poster");
      if (r.ok) assert.equal(r.contentType, "image/svg+xml");
    } finally {
      __setManifestStoreForTests(null);
      globalThis.fetch = realFetch;
    }
  });

  test("herd: N concurrent requests for one missing hash collapse onto a single re-fetch", async () => {
    const { serveTeacherImage, __setManifestStoreForTests } = await import("../teacher-image-store.js");
    const realFetch = globalThis.fetch;
    const hash = "c1b2c3d4e5f60718";
    let fetchCount = 0;
    globalThis.fetch = (async (input: any) => {
      if (String(input).includes("upload.wikimedia.org")) {
        fetchCount++;
        await new Promise((res) => setTimeout(res, 50)); // hold so callers pile up
        return new Response(validPng, { status: 200 });
      }
      return jsonRes({});
    }) as typeof fetch;
    const mem = makeMemStore({
      [hash]: { hash, ext: ".png", kind: "photo", query: "", sourceUrl: "https://upload.wikimedia.org/wikipedia/commons/herd.png", provider: "wiki" },
    });
    __setManifestStoreForTests(mem.store);
    try {
      const results = await Promise.all(Array.from({ length: 8 }, () => serveTeacherImage(hash + ".png")));
      for (const r of results) assert.equal(r.ok, true, "every concurrent caller gets the healed image");
      assert.equal(fetchCount, 1, "the herd collapsed onto a single re-fetch");
    } finally {
      __setManifestStoreForTests(null);
      globalThis.fetch = realFetch;
      await rm(path.join(tmpDir, hash + ".png"), { force: true });
    }
  });

  test("no manifest: a valid hash with no manifest row 404s with NO outbound fetch", async () => {
    const { serveTeacherImage, __setManifestStoreForTests } = await import("../teacher-image-store.js");
    const realFetch = globalThis.fetch;
    let anyFetch = false;
    globalThis.fetch = (async () => { anyFetch = true; return new Response("x"); }) as typeof fetch;
    __setManifestStoreForTests(makeMemStore({}).store);
    try {
      const r = await serveTeacherImage("d1d2d3d4d5d6d7d8.png");
      assert.equal(r.ok, false);
      if (!r.ok) assert.equal(r.status, 404);
      assert.equal(anyFetch, false, "no manifest row → no heal → no outbound fetch");
    } finally {
      __setManifestStoreForTests(null);
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
