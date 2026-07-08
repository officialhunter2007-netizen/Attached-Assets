let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function makeDecayedNoise(
  c: AudioContext,
  durationSec: number,
  decayFraction: number,
): AudioBuffer {
  const len = Math.ceil(c.sampleRate * durationSec);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d   = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * decayFraction));
  }
  return buf;
}

export function playKeyClick() {
  try {
    const c   = getCtx();
    const now = c.currentTime;

    const tickSrc = c.createBufferSource();
    tickSrc.buffer = makeDecayedNoise(c, 0.005, 0.10);

    const hpf = c.createBiquadFilter();
    hpf.type = "highpass";
    hpf.frequency.value = 3800;
    hpf.Q.value = 0.6;

    const tickGain = c.createGain();
    tickGain.gain.value = 0.85;

    tickSrc.connect(hpf);
    hpf.connect(tickGain);
    tickGain.connect(c.destination);
    tickSrc.start(now);

    const thudSrc = c.createBufferSource();
    thudSrc.buffer = makeDecayedNoise(c, 0.018, 0.22);

    const lpf = c.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = 1400;
    lpf.Q.value = 0.8;

    const thudGain = c.createGain();
    thudGain.gain.value = 0.32;

    thudSrc.connect(lpf);
    lpf.connect(thudGain);
    thudGain.connect(c.destination);
    thudSrc.start(now + 0.0008);
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
      const osc = c.createOscillator();
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
