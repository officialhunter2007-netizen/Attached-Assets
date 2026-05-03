// ElevenLabs TTS — REST API integration.
// Free tier: 10,000 characters/month (no credit card required).
// Quality: best-in-class Arabic via eleven_multilingual_v2 model.
//
// Setup:
//   1. Create account at elevenlabs.io (free)
//   2. Copy your API key from Profile → API Keys
//   3. Set env var:  ELEVENLABS_API_KEY=sk-...
//
// Optional voice override:
//   ELEVENLABS_VOICE_ID=<voice_id>   (default: Sarah — warm, clear, multilingual)
//
// Browse voices:  https://elevenlabs.io/voice-library
// Arabic-optimised voices worth trying:
//   Sarah      : 21m00Tcm4TlvDq8ikWAM  (warm female, excellent Arabic)
//   Aria       : 9BWtsMINqrJLrRacOk9x  (expressive female)
//   Charlotte  : XB0fDUnXU5powFXDhCwa  (calm, clear female)
//   George     : JBFqnCBsd6RMkjVDRZzb  (deep male)

const ELEVENLABS_API = "https://api.elevenlabs.io";
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel / Sarah — best Arabic
const MODEL_ID = "eleven_multilingual_v2";

export function isElevenLabsConfigured(): boolean {
  return Boolean((process.env.ELEVENLABS_API_KEY || "").trim());
}

export function getElevenLabsVoiceId(): string {
  return (process.env.ELEVENLABS_VOICE_ID || "").trim() || DEFAULT_VOICE_ID;
}

export async function elevenLabsTts(
  text: string,
  voiceId?: string,
): Promise<Buffer> {
  const apiKey = (process.env.ELEVENLABS_API_KEY || "").trim();
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not set");

  const vid = (voiceId || "").trim() || getElevenLabsVoiceId();
  const url = `${ELEVENLABS_API}/v1/text-to-speech/${vid}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      "Accept": "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.75,
        style: 0.3,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ElevenLabs API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const arrayBuf = await res.arrayBuffer();
  const buf = Buffer.from(arrayBuf);
  if (buf.length === 0) throw new Error("ElevenLabs returned empty audio");
  return buf;
}
