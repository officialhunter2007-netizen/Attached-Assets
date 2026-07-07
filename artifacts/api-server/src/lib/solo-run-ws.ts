import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { Server } from "http";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { verifySession } from "./session";

const INTERACTIVE_LANGS = new Set(["python", "javascript", "bash", "c", "cpp"]);

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
      });

      ws.on("close", () => {
        killProcess(processKey);
      });
    });
  });
}
