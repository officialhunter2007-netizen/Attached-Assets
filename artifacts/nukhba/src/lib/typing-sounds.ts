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

    const clickSrc = c.createBufferSource();
    clickSrc.buffer = makeNoiseBuffer(c, 0.006);

    const clickHpf = c.createBiquadFilter();
    clickHpf.type = "highpass";
    clickHpf.frequency.value = 5500;
    clickHpf.Q.value = 0.5;

    const clickGain = c.createGain();
    clickGain.gain.setValueAtTime(0.70, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.006);

    clickSrc.connect(clickHpf);
    clickHpf.connect(clickGain);
    clickGain.connect(c.destination);
    clickSrc.start(now);
    clickSrc.stop(now + 0.006);

    const bodyOsc = c.createOscillator();
    bodyOsc.type = "sine";
    bodyOsc.frequency.setValueAtTime(210, now + 0.002);
    bodyOsc.frequency.exponentialRampToValueAtTime(45, now + 0.030);

    const bodyGain = c.createGain();
    bodyGain.gain.setValueAtTime(0.0, now);
    bodyGain.gain.linearRampToValueAtTime(0.28, now + 0.003);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.032);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(c.destination);
    bodyOsc.start(now);
    bodyOsc.stop(now + 0.035);

    const tailSrc = c.createBufferSource();
    tailSrc.buffer = makeNoiseBuffer(c, 0.014);

    const tailLpf = c.createBiquadFilter();
    tailLpf.type = "lowpass";
    tailLpf.frequency.value = 1200;
    tailLpf.Q.value = 1.0;

    const tailGain = c.createGain();
    tailGain.gain.setValueAtTime(0.0, now);
    tailGain.gain.linearRampToValueAtTime(0.18, now + 0.003);
    tailGain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

    tailSrc.connect(tailLpf);
    tailLpf.connect(tailGain);
    tailGain.connect(c.destination);
    tailSrc.start(now);
    tailSrc.stop(now + 0.020);
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
