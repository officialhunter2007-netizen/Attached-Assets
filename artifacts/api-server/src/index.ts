import * as net from "net";
import * as http from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { runStartupMigrations } from "./lib/auto-migrate";
import { startScheduledJobs } from "./lib/scheduled-jobs";
import { reapOrphanedProcessingBooklets } from "./lib/v4-booklet";
import { initCodingRoomWss } from "./lib/coding-room-ws";
import { initSoloRunWss } from "./lib/solo-run-ws";

// Promise.try polyfill — native in Node 22+, absent in Node 20.
// unpdf@1.6.0 calls Promise.try() internally when parsing PDFs.
// Without this, any PDF booklet upload triggers an unhandled TypeError
// that crashes the entire API process.
if (typeof (Promise as any).try !== "function") {
  (Promise as any).try = function <T>(
    fn: (...args: unknown[]) => T | PromiseLike<T>,
    ...args: unknown[]
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      try {
        resolve(fn(...args) as T | PromiseLike<T>);
      } catch (e) {
        reject(e);
      }
    });
  };
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

/**
 * Check whether the target port is already bound by another process.
 * Used to detect when the platform's artifact workflow has already
 * started the api-server, so a second instance can step aside without
 * an EADDRINUSE crash.
 */
function isPortInUse(p: number): Promise<boolean> {
  return new Promise((resolve) => {
    const client = net.connect(p, "127.0.0.1", () => {
      client.destroy();
      resolve(true);
    });
    client.on("error", () => resolve(false));
    client.setTimeout(500, () => {
      client.destroy();
      resolve(false);
    });
  });
}

async function start() {
  // The Replit platform auto-starts an "artifacts/api-server: API Server"
  // workflow alongside "Start application". Both try to bind the same port.
  // Whichever starts second should exit cleanly so no EADDRINUSE crash
  // occurs and no workflow ends up in a Failed state.
  const alreadyRunning = await isPortInUse(port);
  if (alreadyRunning) {
    logger.warn(
      { port },
      "api-server: port already bound by another instance — exiting gracefully (no-op duplicate).",
    );
    process.exit(0);
  }

  // Auto-add any required columns missing from the live DB.
  // Wrapped in try/catch internally so the server still starts on failure.
  await runStartupMigrations();

  const server = http.createServer(app);
  initCodingRoomWss(server);
  initSoloRunWss(server);

  server.listen(port, (err?: Error) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");

    void reapOrphanedProcessingBooklets();
    startScheduledJobs();
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      logger.warn(
        { port },
        "api-server: port already bound (listen race) — exiting as no-op duplicate.",
      );
      process.exit(0);
    }
    logger.error({ err: err.message }, "http server error");
  });
}

// Global safety net — Express 4 does NOT auto-catch async route errors,
// so an unhandled rejection from any route kills the whole process.
// This handler keeps the server alive and logs the error. The individual
// request that caused it will time-out on the client side, but every other
// route continues to work. Root-cause fixes (REQUIRED_COLUMNS, polyfills,
// try/catch in routes) are still the right long-term solution; this is
// the last line of defense while those are being added incrementally.
process.on("unhandledRejection", (reason: unknown) => {
  logger.error(
    { reason: reason instanceof Error ? reason.message : String(reason) },
    "unhandledRejection caught — server staying alive",
  );
});

process.on("uncaughtException", (err: Error) => {
  // EADDRINUSE is the EXPECTED outcome when this is the duplicate api-server
  // instance racing the platform's other api-server workflow for port 8080.
  // The losing instance must exit cleanly (0) — NOT linger as a non-listening
  // zombie — so the winner serves uncontested. Only non-port errors get the
  // stay-alive treatment.
  if ((err as NodeJS.ErrnoException).code === "EADDRINUSE") {
    logger.warn(
      { port },
      "api-server: port already bound (listen race) — exiting as no-op duplicate.",
    );
    process.exit(0);
  }
  logger.error(
    { err: err.message, stack: err.stack },
    "uncaughtException caught — server staying alive",
  );
});

start().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
