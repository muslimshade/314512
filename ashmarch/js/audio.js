let ctx;

function context() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) ctx = new AudioCtx();
  return ctx;
}

export function sfx(kind, enabled) {
  if (!enabled) return;
  const audio = context();
  if (!audio) return;
  if (audio.state === "suspended") audio.resume();
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.connect(gain);
  gain.connect(audio.destination);
  const now = audio.currentTime;
  osc.type = kind === "bad" ? "sine" : "triangle";
  const start = kind === "bad" ? 196 : kind === "hit" ? 523 : 440;
  const end = kind === "bad" ? 120 : kind === "hit" ? 180 : 880;
  osc.frequency.setValueAtTime(start, now);
  osc.frequency.exponentialRampToValueAtTime(end, now + 0.14);
  gain.gain.setValueAtTime(0.035, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc.start(now);
  osc.stop(now + 0.2);
}
