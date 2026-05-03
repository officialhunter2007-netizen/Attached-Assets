// Microsoft Edge TTS — pure TypeScript/WebSocket implementation.
// Uses the same free neural speech endpoint that powers Microsoft Edge
// "Read Aloud". No API key, no Python, no subprocess.
//
// Best Arabic voices:
//   ar-YE-MaryamNeural  — Yemeni female  ← default
//   ar-YE-SalehNeural   — Yemeni male
//   ar-SA-ZariyahNeural — Saudi female
//   ar-SA-HamedNeural   — Saudi male
//   ar-EG-SalmaNeural   — Egyptian female
//
// Override default via env var: EDGE_TTS_VOICE=ar-YE-SalehNeural

import WebSocket from "ws";
import { randomUUID, createHash } from "crypto";

const TRUSTED_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const WSS_BASE =
  "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1";
const OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";
const DEFAULT_VOICE = "ar-YE-MaryamNeural";
const CHROME_VERSION = "130.0.0.0";
const GEC_VERSION = `1-${CHROME_VERSION}`;

export function getEdgeTtsVoice(): string {
  return (process.env.EDGE_TTS_VOICE || "").trim() || DEFAULT_VOICE;
}

// Compute the sec-ms-gec authentication token required by current Edge TTS.
// Algorithm: round Windows FILETIME down to 5-min boundary, then SHA-256.
function secMsGec(): string {
  // Windows FILETIME: 100-nanosecond intervals since 1601-01-01
  const WIN_EPOCH_OFFSET_MS = 11644473600000n; // ms between 1601 and 1970
  const nowMs = BigInt(Date.now());
  const ticks = (nowMs + WIN_EPOCH_OFFSET_MS) * 10000n; // → 100-ns units
  const rounded = ticks - (ticks % 3_000_000_000n);     // floor to 5-min window
  const payload = `${rounded}${TRUSTED_TOKEN}`;
  return createHash("sha256").update(payload, "utf8").digest("hex").toUpperCase();
}

function uid(): string {
  return randomUUID().replace(/-/g, "").toUpperCase();
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSsml(text: string, voice: string): string {
  const lang = voice.slice(0, 5);
  return (
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}">` +
    `<voice name="${voice}">` +
    `<prosody rate="-5%" pitch="0%">${escapeXml(text)}</prosody>` +
    `</voice></speak>`
  );
}

function msg(headers: Record<string, string>, body: string): string {
  return (
    Object.entries(headers)
      .map(([k, v]) => `${k}:${v}`)
      .join("\r\n") +
    "\r\n\r\n" +
    body
  );
}

export async function edgeTts(
  text: string,
  voice?: string,
  timeoutMs = 25_000,
): Promise<Buffer> {
  const v = (voice || "").trim() || getEdgeTtsVoice();
  const connId = uid();
  const url =
    `${WSS_BASE}?TrustedClientToken=${TRUSTED_TOKEN}` +
    `&ConnectionId=${connId}&Retry=0`;

  return new Promise<Buffer>((resolve, reject) => {
    const ws = new WebSocket(url, {
      headers: {
        "Pragma": "no-cache",
        "Cache-Control": "no-cache",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.9",
        "Origin": "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
        "User-Agent":
          `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ` +
          `(KHTML, like Gecko) Chrome/${CHROME_VERSION} Safari/537.36 Edg/${CHROME_VERSION}`,
        "sec-ms-gec": secMsGec(),
        "sec-ms-gec-version": GEC_VERSION,
      },
    });

    const chunks: Buffer[] = [];
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { ws.terminate(); } catch {}
      reject(new Error("edge-tts: request timed out"));
    }, timeoutMs);

    const settle = (err?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { ws.terminate(); } catch {}
      if (err) {
        reject(err);
      } else if (chunks.length === 0) {
        reject(new Error("edge-tts: no audio received"));
      } else {
        resolve(Buffer.concat(chunks));
      }
    };

    ws.on("open", () => {
      const ts = new Date().toISOString();
      const reqId = uid();

      // 1 — Speech config
      ws.send(
        msg(
          {
            "X-Timestamp": ts,
            "Content-Type": "application/json; charset=utf-8",
            "Path": "speech.config",
          },
          JSON.stringify({
            context: {
              synthesis: {
                audio: {
                  metadataoptions: {
                    sentenceBoundaryEnabled: "false",
                    wordBoundaryEnabled: "false",
                  },
                  outputFormat: OUTPUT_FORMAT,
                },
              },
            },
          }),
        ),
      );

      // 2 — SSML request
      ws.send(
        msg(
          {
            "X-RequestId": reqId,
            "Content-Type": "application/ssml+xml",
            "X-Timestamp": ts,
            "Path": "ssml",
          },
          buildSsml(text, v),
        ),
      );
    });

    ws.on("message", (data: WebSocket.RawData, isBinary: boolean) => {
      if (isBinary) {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
        // Format: [2-byte header-len][header][audio-bytes]
        if (buf.length < 2) return;
        const headerLen = buf.readUInt16BE(0);
        const audio = buf.slice(2 + headerLen);
        if (audio.length > 0) chunks.push(audio);
      } else {
        const text = data.toString();
        if (text.includes("Path:turn.end")) settle();
      }
    });

    ws.on("error", (err: Error) =>
      settle(new Error(`edge-tts WS error: ${err.message}`)),
    );

    ws.on("close", (code: number) => {
      if (!settled) {
        if (chunks.length > 0) {
          settle();
        } else {
          settle(new Error(`edge-tts WS closed: ${code}`));
        }
      }
    });
  });
}
