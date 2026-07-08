let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function buildClickBuffer(c: AudioContext): AudioBuffer {
  const SR  = c.sampleRate;
  const len = Math.ceil(SR * 0.042);
  const buf = c.createBuffer(1, len, SR);
  const d   = buf.getChannelData(0);

  for (let i = 0; i < len; i++) {
    const t = i / SR;

    const click =
      Math.exp(-t / 0.00035) *
      Math.cos(2 * Math.PI * 4800 * t) *
      0.95;

    const snap =
      Math.exp(-t / 0.0022) *
      Math.sin(2 * Math.PI * 2600 * t) *
      0.40;

    const td = Math.max(0, t - 0.0008);
    const thud =
      Math.exp(-td / 0.0065) *
      Math.sin(2 * Math.PI * 420 * t) *
      0.30;

    const noise =
      (Math.random() * 2 - 1) *
      Math.exp(-t / 0.0025) *
      0.18;

    d[i] = click + snap + thud + noise;
  }

  let peak = 0;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(d[i]));
  if (peak > 0) {
    const norm = 0.82 / peak;
    for (let i = 0; i < len; i++) d[i] *= norm;
  }

  return buf;
}

let cachedClickBuf: AudioBuffer | null = null;

export function playKeyClick() {
  try {
    const c   = getCtx();
    const now = c.currentTime;

    if (!cachedClickBuf) cachedClickBuf = buildClickBuffer(c);

    const src = c.createBufferSource();
    src.buffer = cachedClickBuf;

    const gain = c.createGain();
    gain.gain.value = 0.72;

    src.connect(gain);
    gain.connect(c.destination);
    src.start(now);
  } catch {}
}

export function playKeyError() {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, c.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.14);
  } catch {}
}

export function playLessonComplete() {
  try {
    const c = getCtx();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const times = [0, 0.12, 0.24, 0.36];
    notes.forEach((freq, i) => {
      const osc  = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, c.currentTime + times[i]);
      gain.gain.setValueAtTime(0, c.currentTime + times[i]);
      gain.gain.linearRampToValueAtTime(0.15, c.currentTime + times[i] + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + times[i] + 0.35);
      osc.start(c.currentTime + times[i]);
      osc.stop(c.currentTime + times[i] + 0.4);
    });
  } catch {}
}

export function resumeAudio() {
  if (ctx && ctx.state === "suspended") ctx.resume();
}
