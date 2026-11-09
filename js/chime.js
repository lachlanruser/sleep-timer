// A soft, low-volume two-note bell synthesised with Web Audio (no audio files).
// iOS only allows audio after a user gesture, so unlock() is called from the tap
// that starts a timer. Note: the iPhone silent switch mutes Web Audio.

let ctx = null;

export function unlock() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume();
    // Play one silent sample: required by older iOS to unlock output.
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch { /* audio unavailable: stay silent */ }
}

function strike(t, freq, master) {
  // Fundamental plus two quiet bell-like partials, slow decay.
  [[1, 1, 3.6], [2.76, 0.28, 1.8], [5.4, 0.08, 1.0]].forEach(([mult, amp, decay]) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq * mult;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(amp, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + decay + 0.1);
  });
}

async function playNotes(notes, gap, volume) {
  if (!ctx) unlock();
  if (!ctx) return;
  try {
    if (ctx.state !== 'running') await ctx.resume();
  } catch { return; }
  const master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);
  const now = ctx.currentTime + 0.05;
  notes.forEach((f, i) => strike(now + i * gap, f, master));
}

/** End of a task: two soft notes (C5, E5). */
export const play = () => playNotes([523.25, 659.25], 0.9, 0.16);

/** All tasks done: three slow rising notes (C5, E5, G5), a little quieter. */
export const finale = () => playNotes([523.25, 659.25, 783.99], 0.85, 0.14);
