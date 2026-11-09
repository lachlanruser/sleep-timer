// Gentle ambient and celebration effects: twinkling stars, fireflies drifting up
// where quarters join, and a slow drift of lights when the moon is full.
// Everything is skipped when the user prefers reduced motion.
import { R, VIEW, point } from './pie.js';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Small seeded random generator so the star field is the same every visit.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export function makeSky(container, count = 26) {
  const rand = rng(20261109);
  container.replaceChildren();
  for (let i = 0; i < count; i++) {
    const star = document.createElement('span');
    star.className = 'star';
    const size = 1 + rand() * 1.8;
    star.style.cssText = `left:${(rand() * 100).toFixed(2)}%;top:${(rand() * 100).toFixed(2)}%;`
      + `--s:${size.toFixed(2)}px;--tw:${(3 + rand() * 5).toFixed(2)}s;--td:${(-rand() * 8).toFixed(2)}s`;
    container.append(star);
  }
}

/** Maps a point in the moon's SVG coordinates to pixel coordinates inside `layer`. */
function toLayer(svg, layer, vx, vy) {
  const s = svg.getBoundingClientRect();
  const l = layer.getBoundingClientRect();
  const scale = s.width / (2 * VIEW);
  return [s.left - l.left + (vx + VIEW) * scale, s.top - l.top + (vy + VIEW) * scale, scale];
}

function spawn(layer, x, y, { dx, dy, dur, delay, kind = 'firefly' }) {
  const p = document.createElement('span');
  p.className = kind;
  p.style.cssText = `left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;--dx:${dx.toFixed(1)}px;--dy:${dy.toFixed(1)}px;`
    + `--wob:${((Math.random() - 0.5) * 24).toFixed(1)}px;--dur:${dur.toFixed(2)}s;--delay:${delay.toFixed(2)}s`;
  p.addEventListener('animationend', () => p.remove());
  layer.append(p);
}

/** Fireflies rise out of each melting seam (or the slice itself if it joined nothing). */
export function joinFireflies(svg, layer, { seams, justAngle }) {
  if (reducedMotion() || justAngle == null) return;
  const sources = [];
  if (seams.length) {
    for (const a of seams) for (const f of [0.3, 0.55, 0.82]) sources.push(point(a, R * (f + (Math.random() - 0.5) * 0.08)));
  } else {
    for (const f of [0.35, 0.6, 0.8]) sources.push(point(justAngle + (Math.random() - 0.5) * 20, R * f));
  }
  sources.forEach(([vx, vy], i) => {
    const [x, y] = toLayer(svg, layer, vx, vy);
    spawn(layer, x, y, {
      dx: (Math.random() - 0.5) * 50,
      dy: -50 - Math.random() * 70,
      dur: 2.4 + Math.random() * 1.4,
      delay: 0.55 + i * 0.12 + Math.random() * 0.2,
    });
  });
}

/** The full-moon finale: a slow, quiet drift of fireflies and motes for ~6 seconds. */
export function finale(svg, layer) {
  if (reducedMotion()) return;
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * 360;
    const [vx, vy] = point(a, R * (0.2 + Math.random() * 0.95));
    const [x, y] = toLayer(svg, layer, vx, vy);
    spawn(layer, x, y, {
      kind: i % 3 === 0 ? 'mote' : 'firefly',
      dx: (Math.random() - 0.5) * 90,
      dy: -140 - Math.random() * 200,
      dur: 4.5 + Math.random() * 3,
      delay: 0.6 + Math.random() * 3.6,
    });
  }
}
