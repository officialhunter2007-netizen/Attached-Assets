let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function makeNoiseBuffer(c: AudioContext, durationSec: number): AudioBuffer {
  const length = Math.ceil(c.sampleRate * durationSec);
  const buf = c.createBuffer(1, length, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buf;
}

export function playKeyClick() {
  try {
    const c = getCtx();
    const now = c.currentTime;

    const noise = c.createBufferSource();
    noise.buffer = makeNoiseBuffer(c, 0.025);

    const hpf = c.createBiquadFilter();
    hpf.type = "highpass";
    hpf.frequency.value = 2800;
    hpf.Q.value = 0.8;

    const bpf = c.createBiquadFilter();
    bpf.type = "bandpass";
    bpf.frequency.value = 5500;
    bpf.Q.value = 1.2;

    const clickGain = c.createGain();
    clickGain.gain.setValueAtTime(0.38, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.022);

    noise.connect(hpf);
    hpf.connect(bpf);
    bpf.connect(clickGain);
    clickGain.connect(c.destination);
    noise.start(now);
    noise.stop(now + 0.025);

    const thump = c.createOscillator();
    thump.type = "sine";
    thump.frequency.setValueAtTime(190, now);
    thump.frequency.exponentialRampToValueAtTime(38, now + 0.045);

    const thumpGain = c.createGain();
    thumpGain.gain.setValueAtTime(0.22, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.048);

    thump.connect(thumpGain);
    thumpGain.connect(c.destination);
    thump.start(now);
    thump.stop(now + 0.05);
  } catch {}
}

export function playKeyError() {
  try {
    const c = getCtx();
    const now = c.currentTime;

    const noise = c.createBufferSource();
    noise.buffer = makeNoiseBuffer(c, 0.07);

    const lpf = c.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = 900;
    lpf.Q.value = 2.5;

    const errGain = c.createGain();
    errGain.gain.setValueAtTime(0.30, now);
    errGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    noise.connect(lpf);
    lpf.connect(errGain);
    errGain.connect(c.destination);
    noise.start(now);
    noise.stop(now + 0.07);

    const thud = c.createOscillator();
    thud.type = "sine";
    thud.frequency.setValueAtTime(95, now);
    thud.frequency.exponentialRampToValueAtTime(30, now + 0.09);

    const thudGain = c.createGain();
    thudGain.gain.setValueAtTime(0.28, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.10);

    thud.connect(thudGain);
    thudGain.connect(c.destination);
    thud.start(now);
    thud.stop(now + 0.11);
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
