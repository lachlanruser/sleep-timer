// Renders the task circle as a candlelit moon: one slice per task, any number of tasks.
// Unfinished slices are the moon's shadow side; finished slices glow with warm
// moonlight, and neighbouring finished slices merge into one shape (the divider
// between them melts away), so the moon waxes towards full.
import { iconGroup } from './icons.js';

const NS = 'http://www.w3.org/2000/svg';
export const R = 100;
export const VIEW = 104; // viewBox is -VIEW..VIEW

// Craters as [x, y, radius] in units of R.
const CRATERS = [
  [-0.36, -0.44, 0.12], [0.42, -0.3, 0.075], [-0.46, 0.38, 0.095], [0.3, 0.46, 0.13],
  [0.05, -0.1, 0.05], [0.62, 0.14, 0.055], [-0.12, 0.74, 0.06], [-0.7, -0.08, 0.05],
];

// Angle in degrees, 0 = top, clockwise. Angles above 360 wrap naturally.
export function point(deg, r) {
  const a = (deg * Math.PI) / 180;
  return [r * Math.sin(a), -r * Math.cos(a)];
}

export function slicePath(startDeg, endDeg, r = R) {
  if (endDeg - startDeg >= 360) {
    return `M 0 ${-r} A ${r} ${r} 0 1 1 0 ${r} A ${r} ${r} 0 1 1 0 ${-r} Z`;
  }
  const [x1, y1] = point(startDeg, r);
  const [x2, y2] = point(endDeg, r);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  const f = (n) => n.toFixed(3);
  return `M 0 0 L ${f(x1)} ${f(y1)} A ${r} ${r} 0 ${large} 1 ${f(x2)} ${f(y2)} Z`;
}

/**
 * Groups completed slice indexes into circular runs of neighbours.
 * Returns [{ start, length }]; one run of length n when everything is done.
 */
export function completedRuns(done) {
  const n = done.length;
  if (n === 0) return [];
  if (done.every(Boolean)) return [{ start: 0, length: n }];
  const runs = [];
  for (let i = 0; i < n; i++) {
    if (done[i] && !done[(i - 1 + n) % n]) {
      let length = 0;
      while (done[(i + length) % n]) length++;
      runs.push({ start: i, length });
    }
  }
  return runs;
}

/** Angles (degrees) of the dividers that melt when slice `j` joins its done neighbours. */
export function joiningSeams(done, j) {
  const n = done.length;
  if (n < 2 || j < 0) return [];
  const step = 360 / n;
  const seams = [];
  if (done[(j - 1 + n) % n]) seams.push(j * step);
  if (done[(j + 1) % n]) seams.push(((j + 1) % n) * step);
  return [...new Set(seams)];
}

function el(name, attrs = {}, text) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text != null) node.textContent = text;
  return node;
}

let uid = 0;

/**
 * @param {SVGSVGElement} svg
 * @param {Array} tasks
 * @param {{ done: Set<string>, justDone?: string|null, onPick: (task) => void }} opts
 * @returns {{ seams: number[], justAngle: number|null, allDone: boolean }} for celebration effects
 */
export function renderPie(svg, tasks, { done, justDone = null, onPick }) {
  svg.replaceChildren();
  const id = `moon${++uid}`;
  const n = tasks.length;
  const step = 360 / n;
  const isDone = tasks.map((t) => done.has(t.id));
  const allDone = n > 0 && isDone.every(Boolean);
  const j = tasks.findIndex((t) => t.id === justDone);
  svg.classList.toggle('all-done', allDone);

  // --- defs: moonlight + shadow gradients (lit from the upper left, like a lamp), lit-area clip
  const defs = el('defs');
  const lit = el('radialGradient', { id: `${id}-lit`, gradientUnits: 'userSpaceOnUse', cx: -30, cy: -38, r: 150 });
  [['0', '#fff0c9'], ['0.45', '#f3c77f'], ['1', '#d38f45']].forEach(([o, c]) => lit.append(el('stop', { offset: o, 'stop-color': c })));
  const dark = el('radialGradient', { id: `${id}-dark`, gradientUnits: 'userSpaceOnUse', cx: -30, cy: -38, r: 150 });
  [['0', '#4d382c'], ['1', '#2b1d16']].forEach(([o, c]) => dark.append(el('stop', { offset: o, 'stop-color': c })));
  // Earlier lit area renders solid; the just-finished slice fades in on top of it,
  // so already-lit neighbours never flicker when a new slice joins them.
  const before = isDone.map((d, i) => d && i !== j);
  const solidRuns = completedRuns(before);
  const clip = el('clipPath', { id: `${id}-clip` });
  solidRuns.forEach((run) => clip.append(el('path', { d: slicePath(run.start * step, (run.start + run.length) * step) })));
  const newClip = el('clipPath', { id: `${id}-new` });
  if (j >= 0) newClip.append(el('path', { d: slicePath(j * step, (j + 1) * step) }));
  const moonClip = el('clipPath', { id: `${id}-moon` });
  moonClip.append(el('circle', { r: R }));
  defs.append(lit, dark, clip, newClip, moonClip);
  svg.append(defs);

  // --- soft warm halo behind the moon (stronger when full)
  svg.append(el('circle', { class: 'moon-halo', r: R + 4 }));

  // --- shadow side: one tappable slice per task
  tasks.forEach((task, i) => {
    const finished = isDone[i];
    const g = el('g', {
      class: `slice${finished ? ' done' : ''}`,
      'data-id': task.id,
      role: 'button',
      tabindex: '0',
      'aria-label': finished ? `${task.name}, done for tonight` : `${task.name}, ${task.minutes} minutes`,
      ...(finished ? { 'aria-disabled': 'true' } : {}),
    });
    g.append(el('path', { class: 'slice-shape', d: slicePath(i * step, (i + 1) * step), fill: `url(#${id}-dark)` }));
    svg.append(g);
  });

  const shadowCraters = el('g', { class: 'craters craters-dark', 'clip-path': `url(#${id}-moon)` });
  CRATERS.forEach(([x, y, r]) => shadowCraters.append(el('circle', { cx: x * R, cy: y * R, r: r * R })));
  svg.append(shadowCraters);

  // --- lit side: merged runs of finished slices
  const litLayer = el('g', { class: 'lit-layer' });
  const craterGroup = (clipId, cls) => {
    const g = el('g', { class: `craters craters-lit${cls}`, 'clip-path': `url(#${clipId})` });
    CRATERS.forEach(([x, y, r]) => g.append(el('circle', { cx: x * R, cy: y * R, r: r * R })));
    return g;
  };
  solidRuns.forEach((run) => {
    litLayer.append(el('path', {
      class: 'done-run',
      d: slicePath(run.start * step, (run.start + run.length) * step),
      fill: `url(#${id}-lit)`,
    }));
  });
  if (solidRuns.length) litLayer.append(craterGroup(`${id}-clip`, ''));
  if (j >= 0 && isDone[j]) {
    const fresh = el('g', { class: 'just-done' });
    fresh.append(el('path', { class: 'done-run', d: slicePath(j * step, (j + 1) * step), fill: `url(#${id}-lit)` }));
    fresh.append(craterGroup(`${id}-new`, ''));
    litLayer.append(fresh);
  }
  svg.append(litLayer);

  svg.append(el('circle', { class: 'moon-rim', r: R }));

  // --- dividers: only where at least one side is unfinished; seams that just joined melt away
  const seams = joiningSeams(isDone, j);
  if (n > 1) {
    for (let i = 0; i < n; i++) {
      const angle = i * step;
      const joined = isDone[i] && isDone[(i - 1 + n) % n];
      const melting = seams.some((s) => Math.abs(s - angle) < 0.01);
      if (joined && !melting) continue;
      const [x, y] = point(angle, R + 1);
      svg.append(el('line', {
        class: `divider${melting ? ' melting' : ''}`, x1: 0, y1: 0, x2: x.toFixed(3), y2: y.toFixed(3),
      }));
    }
  }

  // --- a single soft shimmer ring when something completes
  if (j >= 0) svg.append(el('circle', { class: `shimmer${allDone ? ' big' : ''}`, r: R }));

  // --- labels: icon, name, minutes
  const labels = el('g', { class: 'labels' });
  tasks.forEach((task, i) => {
    const [lx, ly] = point(i * step + step / 2, n === 1 ? 0 : R * 0.56);
    const cls = isDone[i] ? ' done' : '';
    labels.append(iconGroup(task.icon, lx, ly - 15, 17, `slice-icon${cls}`));
    labels.append(el('text', { class: `slice-name${cls}`, x: lx.toFixed(2), y: (ly + 9).toFixed(2) }, task.name));
    labels.append(el('text', { class: `slice-mins${cls}`, x: lx.toFixed(2), y: (ly + 20).toFixed(2) },
      isDone[i] ? 'done' : `${task.minutes} min`));
  });
  svg.append(labels);

  svg.querySelectorAll('.slice').forEach((g, i) => {
    const pick = () => onPick(tasks[i]);
    g.addEventListener('click', pick);
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); }
    });
  });

  return { seams, justAngle: j >= 0 ? j * step + step / 2 : null, allDone };
}
