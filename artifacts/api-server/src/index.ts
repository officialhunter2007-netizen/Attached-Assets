import * as net from "net";
import app from "./app";
import { logger } from "./lib/logger";
import { runStartupMigrations } from "./lib/auto-migrate";
import { startScheduledJobs } from "./lib/scheduled-jobs";

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

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
    // Hourly rollover sweep — guarantees daily forfeit fires within ~1h of
    // Yemen midnight even if the server was asleep at the moment of
    // midnight. Idempotent on already-rolled-over rows. See scheduled-jobs.
    startScheduledJobs();
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
  logger.error(
    { err: err.message, stack: err.stack },
    "uncaughtException caught — server staying alive",
  );
});

start().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
