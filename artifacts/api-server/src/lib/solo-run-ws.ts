import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { Server } from "http";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { verifySession } from "./session";

const INTERACTIVE_LANGS = new Set(["python", "javascript", "bash", "c", "cpp"]);
const VALID_PKG_NAME = /^[a-zA-Z0-9]([a-zA-Z0-9\-_.]*[a-zA-Z0-9])?(\[[\w,]+\])?$/;
const SHARED_PYLIB_DIR = process.env.NUKHBA_PYLIB_DIR
  ?? (() => {
    const v = process.execPath.match(/python(\d+\.\d+)/)?.[1]
      ?? (() => { try { const r = require("child_process").execSync("python3 -c \"import sys;print(f'{sys.version_info.major}.{sys.version_info.minor}')\"").toString().trim(); return r; } catch { return "3.11"; } })();
    return `/home/runner/workspace/.pythonlibs/lib/python${v}/site-packages`;
  })();
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

      ws.on("message", (raw) => {
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

          let cmd: string, args: string[];
          const entryAbs = path.join(tmpDir, entryFile);
          const safeDir = JSON.stringify(tmpDir);
          switch (language) {
            case "python":
              cmd = "python3"; args = ["-u", entryAbs]; break;
            case "javascript":
              cmd = "node"; args = [entryAbs]; break;
            case "bash":
              cmd = "bash"; args = [entryAbs]; break;
            case "c":
              cmd = "bash"; args = ["-c", `cd ${safeDir} && gcc *.c -o _prog -lm -std=c11 2>&1 && ./_prog`]; break;
            case "cpp":
              cmd = "bash"; args = ["-c", `cd ${safeDir} && g++ $(ls *.cpp *.cc *.cxx 2>/dev/null | tr '\\n' ' ') -o _prog -lm -std=c++17 2>&1 && ./_prog`]; break;
            default:
              try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
              return;
          }

          const proc = spawn(cmd, args, { cwd: tmpDir, stdio: ["pipe", "pipe", "pipe"] });

          activeProcesses.set(processKey, { proc, tmpDir });

          proc.stdout.on("data", (chunk: Buffer) => send({ type: "output", data: chunk.toString() }));
          proc.stderr.on("data", (chunk: Buffer) => send({ type: "output", data: chunk.toString() }));

          proc.on("close", (code, signal) => {
            if (activeProcesses.get(processKey)?.proc !== proc) return;
            activeProcesses.delete(processKey);
            setImmediate(() => {
              try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
            });
            send({ type: "exit", exitCode: code, signal: signal ?? null });
          });

          proc.on("error", (err) => {
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
          const rawPkgs = String(msg.packages ?? "").trim();
          const pkgList = rawPkgs.split(/[\s,]+/).filter(Boolean).slice(0, 8);
          if (!pkgList.length) {
            send({ type: "output", data: "❌ لم تُحدَّد مكتبة\n" });
            send({ type: "install_done", success: false });
            return;
          }
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
            "--upgrade",
            "--no-user",
            "--no-input",
            "--disable-pip-version-check",
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
      });

      ws.on("close", () => {
        killProcess(processKey);
      });
    });
  });
}
