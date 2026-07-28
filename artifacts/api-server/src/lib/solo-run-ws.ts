import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { Server } from "http";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { verifySession } from "./session";

const INTERACTIVE_LANGS = new Set(["python", "javascript", "typescript", "bash", "c", "cpp", "java"]);

// ── Resource limits ──────────────────────────────────────────────────────────
// Applied to every spawned process via bash ulimit before exec.
//   -t 30    → 30 CPU seconds (kills infinite loops)
//   -f 10240 → max 10 MB file write (prevents disk fill)
// Intentionally no -v (virtual memory) or -u (max-procs):
//   -v breaks Python/Node startup (shared libs need large virtual space)
//   -u is per-user shared with ALL processes, breaks gcc forks under load
// Wall-clock protection comes from WS_EXEC_TIMEOUT_MS (30s timeout below).
const ULIMIT_PREFIX = "ulimit -t 30 -f 10240 2>/dev/null";

// ── Concurrent execution cap ──────────────────────────────────────────────────
let activeWsExecutions = 0;
const MAX_WS_CONCURRENT = 80;   // hard ceiling across all students

// ── Per-process wall-clock timeout ───────────────────────────────────────────
const WS_EXEC_TIMEOUT_MS = 30_000;  // 30 seconds
const SHARED_JAVA_DIR = "/home/runner/workspace/.javalib";

/**
 * Auto-detect C/C++ #include statements → extra linker flags for system libs
 * already present in the Nix store.
 */
function detectCLinkerFlags(code: string): string[] {
  const flags = new Set<string>();
  const includes = [...code.matchAll(/#\s*include\s*[<"]([^>"]+)[>"]/g)]
    .map(m => m[1].toLowerCase().split("/")[0]);
  for (const top of includes) {
    if (top === "zlib.h")                          flags.add("-lz");
    if (top === "png.h")                           flags.add("-lpng");
    if (top === "bzlib.h")                         flags.add("-lbz2");
    if (top === "gmp.h")                           flags.add("-lgmp");
    if (top === "gmpxx.h")                         { flags.add("-lgmp"); flags.add("-lgmpxx"); }
    if (top === "sqlite3.h")                       flags.add("-lsqlite3");
    if (top === "curl")                            flags.add("-lcurl");
    if (top === "openssl")                         { flags.add("-lssl"); flags.add("-lcrypto"); }
    if (top === "ncurses.h" || top === "curses.h") flags.add("-lncurses");
    if (top === "readline")                        flags.add("-lreadline");
    if (top === "ft2build.h" || top === "freetype2") flags.add("-lfreetype");
    if (top === "uuid" || top === "uuid.h")        flags.add("-luuid");
  }
  return Array.from(flags);
}

/**
 * Parse `// @maven group:artifact:version` comments and ensure the JARs
 * are present in SHARED_JAVA_DIR (download from Maven Central if not cached).
 */
async function ensureMavenJarsWs(
  code: string,
  onProgress: (msg: string) => void,
): Promise<void> {
  const coords = [...code.matchAll(/\/\/\s*@maven\s+([^\s]+)/g)].map(m => m[1]);
  if (!coords.length) return;
  try { fs.mkdirSync(SHARED_JAVA_DIR, { recursive: true }); } catch {}
  for (const coord of coords) {
    const parts = coord.split(":");
    if (parts.length < 3) continue;
    const [group, artifact, version] = parts;
    const jarName = `${artifact}-${version}.jar`;
    const jarPath = path.join(SHARED_JAVA_DIR, jarName);
    if (fs.existsSync(jarPath)) continue;
    onProgress(`📦 تنزيل ${jarName} من Maven Central...\n`);
    const groupPath = group.replace(/\./g, "/");
    const url = `https://repo1.maven.org/maven2/${groupPath}/${artifact}/${version}/${jarName}`;
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(30_000) } as any);
      if (!resp.ok) { onProgress(`❌ فشل تنزيل ${jarName} (${resp.status})\n`); continue; }
      const buf = Buffer.from(await resp.arrayBuffer());
      fs.writeFileSync(jarPath, buf);
      onProgress(`✅ تم تنزيل ${jarName}\n`);
    } catch (e: any) {
      onProgress(`❌ خطأ في تنزيل ${jarName}: ${e.message}\n`);
    }
  }
}
const VALID_PKG_NAME = /^[a-zA-Z0-9]([a-zA-Z0-9\-_.]*[a-zA-Z0-9])?(\[[\w,]+\])?$/;
const SHARED_PYLIB_DIR = process.env.NUKHBA_PYLIB_DIR
  ?? (() => {
    const v = process.execPath.match(/python(\d+\.\d+)/)?.[1]
      ?? (() => { try { const r = require("child_process").execSync("python3 -c \"import sys;print(f'{sys.version_info.major}.{sys.version_info.minor}')\"").toString().trim(); return r; } catch { return "3.11"; } })();
    return `/home/runner/workspace/.pythonlibs/lib/python${v}/site-packages`;
  })();
const SHARED_JS_PREFIX = process.env.NUKHBA_JSLIB_DIR ?? "/home/runner/workspace/.nodelibs";
const SHARED_JS_MODULES = `${SHARED_JS_PREFIX}/node_modules`;
const VALID_NPM_PKG_NAME = /^(@[a-zA-Z0-9\-_.]+\/)?[a-zA-Z0-9][a-zA-Z0-9\-_.]*(@[\w.\-]+)?$/;
const NODE_BUILTINS = new Set([
  "fs","path","os","http","https","crypto","stream","events","buffer","url","util",
  "net","tls","dns","cluster","child_process","worker_threads","assert","readline",
  "repl","vm","zlib","querystring","string_decoder","domain","process","console",
  "timers","module","perf_hooks","v8","inspector","async_hooks","trace_events",
  "dgram","http2","punycode","constants","sys",
]);
const PYTHON_BUILTINS = new Set([
  "random","os","sys","math","time","datetime","json","re","collections","itertools",
  "functools","pathlib","io","string","abc","copy","pickle","hashlib","hmac","secrets",
  "uuid","struct","array","queue","heapq","bisect","enum","dataclasses","typing",
  "traceback","logging","warnings","unittest","csv","configparser","argparse",
  "subprocess","threading","multiprocessing","socket","ssl","email","html","xml",
  "urllib","http","ftplib","smtplib","zipfile","tarfile","gzip","bz2","lzma",
  "sqlite3","decimal","fractions","statistics","cmath","operator","weakref",
  "contextlib","atexit","gc","inspect","dis","ast","tokenize","keyword","builtins",
  "platform","shutil","tempfile","glob","fnmatch","textwrap","pprint","reprlib",
  "base64","binascii","codecs","unicodedata","locale","gettext","argparse","signal",
  "errno","ctypes","mmap","select","selectors","asyncio","concurrent","types",
  "numbers","cProfile","profile","timeit","pdb","faulthandler","site","sysconfig",
  "importlib","pkgutil","modulefinder","compileall","py_compile","venv","zipimport",
]);

function getPkgDir(userId: number): string {
  return path.join(os.tmpdir(), `nukhba-pkgs-${userId}`);
}

type ProcessEntry = {
  proc: ReturnType<typeof spawn>;
  tmpDir: string;
};

const activeProcesses = new Map<string, ProcessEntry>();

function killProcess(key: string) {
  const entry = activeProcesses.get(key);
  if (!entry) return;
  activeProcesses.delete(key);
  try { entry.proc.kill("SIGKILL"); } catch {}
  setImmediate(() => {
    try { fs.rmSync(entry.tmpDir, { recursive: true, force: true }); } catch {}
  });
}

function isAllowedOrigin(request: IncomingMessage): boolean {
  const origin = request.headers.origin ?? "";
  const host = request.headers.host ?? "";
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    if (originHost === host) return true;
    if (originHost.endsWith(".replit.dev") || originHost.endsWith(".repl.co")) return true;
    if (originHost === "localhost" || originHost.startsWith("localhost:")) return true;
    if (originHost === "127.0.0.1" || originHost.startsWith("127.0.0.1:")) return true;
  } catch {}
  return false;
}

export function initSoloRunWss(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request: IncomingMessage, socket: any, head: Buffer) => {
    const url = new URL(request.url ?? "", `http://${request.headers.host}`);
    if (url.pathname !== "/ws/solo-run") return;

    if (!isAllowedOrigin(request)) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }

    const cookieHeader = request.headers.cookie ?? "";
    const sessionMatch = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/);
    const sessionToken = sessionMatch?.[1];
    const session = sessionToken ? verifySession(decodeURIComponent(sessionToken)) : null;

    if (!session?.userId) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      const userId = session.userId as number;
      const processKey = `solo:${userId}`;

      function send(msg: object) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(msg));
        }
      }

      ws.on("message", async (raw) => {
        let msg: any;
        try { msg = JSON.parse(raw.toString()); } catch { return; }

        if (msg.type === "run") {
          const entryFile = (msg.entryFile ?? "").trim();
          const language = (msg.language ?? "").trim();
          const files: { path: string; content: string }[] = Array.isArray(msg.files) ? msg.files : [];

          if (!entryFile || !INTERACTIVE_LANGS.has(language) || !files.length) {
            send({ type: "output", data: "❌ بيانات التشغيل غير صحيحة\n" });
            send({ type: "exit", exitCode: 1 });
            return;
          }

          killProcess(processKey);

          const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nukhba-solo-"));
          for (const f of files) {
            const dest = path.join(tmpDir, f.path);
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.writeFileSync(dest, f.content ?? "");
          }

          // For Java: download @maven JARs before spawning
          if (language === "java") {
            const javaEntry = files.find(f => f.path === entryFile)?.content ?? "";
            await ensureMavenJarsWs(javaEntry, (m) => send({ type: "output", data: m }));
          }

          let cmd: string, args: string[];
          const entryAbs = path.join(tmpDir, entryFile);
          const safeDir = JSON.stringify(tmpDir);

          // Build extra linker flags from #include analysis for C/C++
          const entryContent = files.find(f => f.path === entryFile)?.content ?? "";
          const extraCFlags = (language === "c" || language === "cpp")
            ? detectCLinkerFlags(entryContent).join(" ")
            : "";

          const javaCP = `${tmpDir}:${SHARED_JAVA_DIR}/*`;
          const safeCP = JSON.stringify(javaCP);

          // ── Concurrent cap ──────────────────────────────────────────────
          if (activeWsExecutions >= MAX_WS_CONCURRENT) {
            send({ type: "output", data: "⏳ الخوادم مشغولة الآن — حاول مرة أخرى بعد لحظة\n" });
            send({ type: "exit", exitCode: 1 });
            try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
            return;
          }
          activeWsExecutions++;

          switch (language) {
            // For interpreted langs: wrap in bash with ulimits
            case "python":
              cmd = "bash"; args = ["-c",
                `${ULIMIT_PREFIX}; exec python3 -u ${JSON.stringify(entryAbs)}`]; break;
            case "javascript":
            case "typescript":
              cmd = "bash"; args = ["-c",
                `${ULIMIT_PREFIX}; exec node ${JSON.stringify(entryAbs)}`]; break;
            case "bash":
              cmd = "bash"; args = ["-c",
                `${ULIMIT_PREFIX}; exec bash ${JSON.stringify(entryAbs)}`]; break;
            case "c": {
              const extraStr = extraCFlags ? ` ${extraCFlags}` : "";
              cmd = "bash"; args = ["-c",
                `${ULIMIT_PREFIX}; cd ${safeDir} && gcc *.c -o _prog -std=gnu11 -D_DEFAULT_SOURCE -lm -pthread${extraStr} 2>&1 && ./_prog`];
              break;
            }
            case "cpp": {
              const extraStr = extraCFlags ? ` ${extraCFlags}` : "";
              cmd = "bash"; args = ["-c",
                `${ULIMIT_PREFIX}; cd ${safeDir} && g++ $(ls *.cpp *.cc *.cxx 2>/dev/null | tr '\\n' ' ') -o _prog -std=gnu++17 -D_DEFAULT_SOURCE -lm -pthread${extraStr} 2>&1 && ./_prog`];
              break;
            }
            case "java": {
              const classMatch = entryContent.match(/public\s+class\s+(\w+)/);
              const mainClass = classMatch?.[1] ?? path.basename(entryFile, ".java");
              cmd = "bash"; args = ["-c",
                `${ULIMIT_PREFIX}; cd ${safeDir} && javac -cp ${safeCP} *.java 2>&1 && java -cp ${safeCP} ${mainClass}`];
              break;
            }
            default:
              activeWsExecutions--;
              try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
              return;
          }

          // Language-specific env vars so installed packages are visible
          const spawnEnv: NodeJS.ProcessEnv =
            language === "javascript" || language === "typescript"
              ? { ...process.env, NODE_PATH: SHARED_JS_MODULES }
              : language === "python"
                ? { ...process.env, PYTHONPATH: SHARED_PYLIB_DIR }
                : process.env;
          const proc = spawn(cmd, args, { cwd: tmpDir, stdio: ["pipe", "pipe", "pipe"], env: spawnEnv });

          activeProcesses.set(processKey, { proc, tmpDir });

          // ── Wall-clock timeout ───────────────────────────────────────────
          const execTimer = setTimeout(() => {
            if (activeProcesses.get(processKey)?.proc === proc) {
              killProcess(processKey);
              send({ type: "output", data: `\n⏱ انتهت مدة التنفيذ (${WS_EXEC_TIMEOUT_MS / 1000} ثانية)\n` });
              send({ type: "exit", exitCode: 124 });
            }
          }, WS_EXEC_TIMEOUT_MS);

          proc.stdout.on("data", (chunk: Buffer) => send({ type: "output", data: chunk.toString() }));
          proc.stderr.on("data", (chunk: Buffer) => send({ type: "output", data: chunk.toString() }));

          proc.on("close", (code, signal) => {
            clearTimeout(execTimer);
            activeWsExecutions = Math.max(0, activeWsExecutions - 1);
            if (activeProcesses.get(processKey)?.proc !== proc) return;
            activeProcesses.delete(processKey);
            setImmediate(() => {
              try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
            });
            send({ type: "exit", exitCode: code, signal: signal ?? null });
          });

          proc.on("error", (err) => {
            clearTimeout(execTimer);
            activeWsExecutions = Math.max(0, activeWsExecutions - 1);
            send({ type: "output", data: `\n❌ فشل التشغيل: ${err.message}\n` });
            killProcess(processKey);
            send({ type: "exit", exitCode: 1 });
          });

          return;
        }

        if (msg.type === "stdin") {
          const entry = activeProcesses.get(processKey);
          if (!entry) return;
          const data = String(msg.data ?? "").slice(0, 4096);
          try { entry.proc.stdin!.write(data); } catch {}
          return;
        }

        if (msg.type === "kill") {
          killProcess(processKey);
          send({ type: "exit", exitCode: null, signal: "SIGKILL" });
          return;
        }

        if (msg.type === "install") {
          const installLang = String(msg.language ?? "python");
          const rawPkgs = String(msg.packages ?? "").trim();
          const pkgList = rawPkgs.split(/[\s,]+/).filter(Boolean).slice(0, 8);
          if (!pkgList.length) {
            send({ type: "output", data: "❌ لم تُحدَّد مكتبة\n" });
            send({ type: "install_done", success: false });
            return;
          }

          if (installLang === "python") {
            for (const p of pkgList) {
              if (!VALID_PKG_NAME.test(p) || p.length > 80) {
                send({ type: "output", data: `❌ اسم المكتبة غير صحيح: ${p}\n` });
                send({ type: "install_done", success: false });
                return;
              }
              const base = p.split(/[\[=<>!]/)[0].toLowerCase();
              if (PYTHON_BUILTINS.has(base)) {
                send({ type: "output", data: `ℹ️ "${p}" مكتبة مدمجة في Python — لا تحتاج تنزيل، استخدمها مباشرةً: import ${base}\n` });
                send({ type: "install_done", success: true, packages: [] });
                return;
              }
            }
            try { fs.mkdirSync(SHARED_PYLIB_DIR, { recursive: true }); } catch {}
            send({ type: "output", data: `📦 جاري تنزيل: ${pkgList.join(", ")}...\n` });
            const pipEnv: NodeJS.ProcessEnv = { ...process.env, PIP_CONFIG_FILE: "/dev/null" };
            const pip = spawn("python3", [
              "-m", "pip", "install", ...pkgList,
              "--target", SHARED_PYLIB_DIR,
              "--upgrade", "--no-user", "--no-input", "--disable-pip-version-check",
            ], { stdio: ["ignore", "pipe", "pipe"], env: pipEnv });
            pip.stdout.on("data", (chunk: Buffer) => send({ type: "output", data: chunk.toString() }));
            pip.stderr.on("data", (chunk: Buffer) => send({ type: "output", data: chunk.toString() }));
            pip.on("close", (code) => {
              if (code === 0) {
                send({ type: "output", data: `✅ تم التنزيل: ${pkgList.join(", ")} بنجاح!\n` });
                send({ type: "install_done", success: true, packages: pkgList });
              } else {
                send({ type: "output", data: `❌ فشل التنزيل (كود: ${code})\n` });
                send({ type: "install_done", success: false });
              }
            });
            pip.on("error", (err) => {
              send({ type: "output", data: `❌ خطأ في تنزيل المكتبة: ${err.message}\n` });
              send({ type: "install_done", success: false });
            });
            return;
          }

          if (installLang === "javascript") {
            for (const p of pkgList) {
              if (!VALID_NPM_PKG_NAME.test(p) || p.length > 100) {
                send({ type: "output", data: `❌ اسم الحزمة غير صحيح: ${p}\n` });
                send({ type: "install_done", success: false });
                return;
              }
              const base = p.split(/[@]/)[0].replace(/^@[^/]+\//, "").toLowerCase();
              if (NODE_BUILTINS.has(base)) {
                send({ type: "output", data: `ℹ️ "${p}" وحدة مدمجة في Node.js — لا تحتاج تنزيل، استخدمها مباشرةً: require('${base}')\n` });
                send({ type: "install_done", success: true, packages: [] });
                return;
              }
            }
            try { fs.mkdirSync(SHARED_JS_PREFIX, { recursive: true }); } catch {}
            send({ type: "output", data: `📦 جاري تنزيل: ${pkgList.join(", ")}...\n` });
            const npm = spawn("npm", [
              "install", ...pkgList,
              "--prefix", SHARED_JS_PREFIX,
              "--no-save", "--no-audit", "--no-fund", "--prefer-offline",
            ], { stdio: ["ignore", "pipe", "pipe"] });
            npm.stdout.on("data", (chunk: Buffer) => send({ type: "output", data: chunk.toString() }));
            npm.stderr.on("data", (chunk: Buffer) => send({ type: "output", data: chunk.toString() }));
            npm.on("close", (code) => {
              if (code === 0) {
                send({ type: "output", data: `✅ تم التنزيل: ${pkgList.join(", ")} بنجاح!\n` });
                send({ type: "install_done", success: true, packages: pkgList });
              } else {
                send({ type: "output", data: `❌ فشل التنزيل (كود: ${code})\n` });
                send({ type: "install_done", success: false });
              }
            });
            npm.on("error", (err) => {
              send({ type: "output", data: `❌ خطأ في تنزيل الحزمة: ${err.message}\n` });
              send({ type: "install_done", success: false });
            });
            return;
          }

          // TypeScript → npm (same packages as JavaScript)
          if (installLang === "typescript") {
            for (const p of pkgList) {
              if (!VALID_NPM_PKG_NAME.test(p) || p.length > 100) {
                send({ type: "output", data: `❌ اسم الحزمة غير صحيح: ${p}\n` });
                send({ type: "install_done", success: false });
                return;
              }
            }
            try { fs.mkdirSync(SHARED_JS_PREFIX, { recursive: true }); } catch {}
            send({ type: "output", data: `📦 جاري تنزيل: ${pkgList.join(", ")} (npm)...\n` });
            const npm = spawn("npm", [
              "install", ...pkgList,
              "--prefix", SHARED_JS_PREFIX,
              "--no-save", "--no-audit", "--no-fund", "--prefer-offline",
            ], { stdio: ["ignore", "pipe", "pipe"] });
            npm.stdout.on("data", (chunk: Buffer) => send({ type: "output", data: chunk.toString() }));
            npm.stderr.on("data", (chunk: Buffer) => send({ type: "output", data: chunk.toString() }));
            npm.on("close", (code) => {
              if (code === 0) {
                send({ type: "output", data: `✅ تم التنزيل: ${pkgList.join(", ")} بنجاح!\n` });
                send({ type: "install_done", success: true, packages: pkgList });
              } else {
                send({ type: "output", data: `❌ فشل التنزيل (كود: ${code})\n` });
                send({ type: "install_done", success: false });
              }
            });
            npm.on("error", (err) => {
              send({ type: "output", data: `❌ خطأ: ${err.message}\n` });
              send({ type: "install_done", success: false });
            });
            return;
          }

          // Java → download JARs from Maven Central via `group:artifact:version` format
          if (installLang === "java") {
            try { fs.mkdirSync(SHARED_JAVA_DIR, { recursive: true }); } catch {}
            for (const coord of pkgList) {
              const parts = coord.split(":");
              if (parts.length < 3) {
                send({ type: "output", data: `❌ الصيغة غير صحيحة "${coord}". استخدم: group:artifact:version\n   مثال: com.google.code.gson:gson:2.10.1\n` });
                send({ type: "install_done", success: false });
                return;
              }
              const [group, artifact, version] = parts;
              const jarName = `${artifact}-${version}.jar`;
              const jarPath = path.join(SHARED_JAVA_DIR, jarName);
              if (fs.existsSync(jarPath)) {
                send({ type: "output", data: `ℹ️ ${jarName} موجود بالفعل في المخزن المؤقت\n` });
                continue;
              }
              const groupPath = group.replace(/\./g, "/");
              const url = `https://repo1.maven.org/maven2/${groupPath}/${artifact}/${version}/${jarName}`;
              send({ type: "output", data: `📦 جاري تنزيل ${jarName} من Maven Central...\n` });
              try {
                const resp = await fetch(url, { signal: AbortSignal.timeout(30_000) } as any);
                if (!resp.ok) {
                  send({ type: "output", data: `❌ لم يُعثر على ${coord} في Maven Central (${resp.status})\n` });
                  send({ type: "install_done", success: false });
                  return;
                }
                const buf = Buffer.from(await resp.arrayBuffer());
                fs.writeFileSync(jarPath, buf);
                send({ type: "output", data: `✅ تم تنزيل ${jarName}\n` });
              } catch (e: any) {
                send({ type: "output", data: `❌ خطأ في تنزيل ${coord}: ${e.message}\n` });
                send({ type: "install_done", success: false });
                return;
              }
            }
            send({ type: "install_done", success: true, packages: pkgList });
            return;
          }

          // C / C++ → list available system libraries (no download needed)
          if (installLang === "c" || installLang === "cpp") {
            send({ type: "output", data: [
              "📚 مكتبات C/C++ المتاحة مباشرةً (لا تحتاج تنزيل):\n",
              "  • zlib    → #include <zlib.h>        // ضغط البيانات\n",
              "  • libpng  → #include <png.h>          // صور PNG\n",
              "  • libbz2  → #include <bzlib.h>        // ضغط Bzip2\n",
              "  • libgmp  → #include <gmp.h>          // أعداد دقيقة كبيرة\n",
              "  • libgmp++→ #include <gmpxx.h>        // نفس gmp لكن C++\n",
              "ℹ️  فقط أضف #include المناسب وسيُرتبط تلقائياً عند التشغيل.\n",
              "⚠️  مكتبات مثل libcurl وopenssl وsqlite3 غير متوفرة في هذه البيئة.\n",
            ].join("") });
            send({ type: "install_done", success: true, packages: [] });
            return;
          }

          send({ type: "output", data: `ℹ️ تنزيل المكتبات غير مدعوم لهذه اللغة\n` });
          send({ type: "install_done", success: false });
          return;
        }
      });

      ws.on("close", () => {
        killProcess(processKey);
      });
    });
  });
}
