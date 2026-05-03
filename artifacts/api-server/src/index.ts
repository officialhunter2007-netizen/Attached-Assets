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

async function start() {
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
