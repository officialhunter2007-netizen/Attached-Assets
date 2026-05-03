// Edge TTS — Microsoft's free neural TTS via the edge-tts Python CLI.
// No API key required. Runs locally inside the Docker container.
//
// Best Arabic voices (Neural, free):
//   ar-YE-MaryamNeural  — Yemeni female  ← default
//   ar-YE-SalehNeural   — Yemeni male
//   ar-SA-ZariyahNeural — Saudi female
//   ar-SA-HamedNeural   — Saudi male
//   ar-EG-SalmaNeural   — Egyptian female
//
// Override default with env var: EDGE_TTS_VOICE=ar-YE-SalehNeural

import { spawn } from "child_process";
import { mkdtemp, writeFile, readFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const DEFAULT_VOICE = "ar-YE-MaryamNeural";

export function getEdgeTtsVoice(): string {
  return (process.env.EDGE_TTS_VOICE || "").trim() || DEFAULT_VOICE;
}

export async function edgeTts(
  text: string,
  voice?: string,
  timeoutMs = 20_000,
): Promise<Buffer> {
  const v = (voice || "").trim() || getEdgeTtsVoice();
  const dir = await mkdtemp(join(tmpdir(), "edge-tts-"));
  const inputFile = join(dir, "input.txt");
  const outputFile = join(dir, "output.mp3");

  try {
    await writeFile(inputFile, text, "utf8");

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => { proc.kill("SIGKILL"); reject(new Error("edge-tts timeout")); },
        timeoutMs,
      );
      const proc = spawn("edge-tts", [
        "--voice", v,
        "--file", inputFile,
        "--write-media", outputFile,
      ]);
      const stderrChunks: Buffer[] = [];
      proc.stderr?.on("data", (d: Buffer) => stderrChunks.push(d));
      proc.on("error", (err) => { clearTimeout(timer); reject(err); });
      proc.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve();
        } else {
          const detail = Buffer.concat(stderrChunks).toString().trim().slice(0, 300);
          reject(new Error(`edge-tts exited ${code}: ${detail}`));
        }
      });
    });

    return await readFile(outputFile);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
