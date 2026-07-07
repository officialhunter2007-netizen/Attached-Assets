let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export function playKeyClick() {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, c.currentTime + 0.04);
    gain.gain.setValueAtTime(0.08, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.05);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.06);
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
