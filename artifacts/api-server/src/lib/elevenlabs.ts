// ElevenLabs TTS client — uses the REST API directly (no SDK needed).
// Activated when ELEVENLABS_API_KEY is present in the environment.
//
// Recommended Arabic voice IDs on eleven_multilingual_v2:
//   XrExE9yKIg1WjnnlVkGX  — Matilda  (clear, warm female — best for Arabic)
//   pNInz6obpgDQGcFmaJgB  — Adam     (professional male)
//   EXAVITQu4vr4xnSDxMaL  — Bella    (warm female)
//
// To override the default, set ELEVENLABS_VOICE_ID in the server environment.

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";
const ELEVENLABS_MODEL = "eleven_multilingual_v2";

// Matilda — clear, warm, and handles Arabic/English mixing well.
const DEFAULT_VOICE_ID = "XrExE9yKIg1WjnnlVkGX";

export function isElevenLabsConfigured(): boolean {
  return Boolean(
    process.env.ELEVENLABS_API_KEY ||
    process.env.XI_API_KEY,
  );
}

function getApiKey(): string | null {
  return process.env.ELEVENLABS_API_KEY || process.env.XI_API_KEY || null;
}

function getVoiceId(): string {
  return (process.env.ELEVENLABS_VOICE_ID || "").trim() || DEFAULT_VOICE_ID;
}

export interface ElevenLabsTtsResult {
  audioBuffer: Buffer;
  voiceId: string;
}

export async function elevenLabsTts(
  text: string,
  timeoutMs = 20_000,
): Promise<ElevenLabsTtsResult> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not configured");

  const voiceId = getVoiceId();
  const url = `${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: ELEVENLABS_MODEL,
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.80,
          style: 0.25,
          use_speaker_boost: true,
        },
      }),
    });
  } finally {
    clearTimeout(timer);
  }

  if (!resp.ok) {
    let detail = "";
    try { detail = await resp.text(); } catch {}
    throw new Error(`ElevenLabs ${resp.status}: ${detail.slice(0, 200)}`);
  }

  const arrayBuf = await resp.arrayBuffer();
  return { audioBuffer: Buffer.from(arrayBuf), voiceId };
}
