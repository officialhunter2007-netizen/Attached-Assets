import * as net from "net";
import app from "./app";
import { logger } from "./lib/logger";
import { runStartupMigrations } from "./lib/auto-migrate";
import { startScheduledJobs } from "./lib/scheduled-jobs";

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

start().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
