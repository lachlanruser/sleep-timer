// Renders the task circle as SVG: one slice per task, any number of tasks.
// Completed slices glow, and neighbouring completed slices merge into one shape
// (no divider between them), so the glow grows into a full circle.
const NS = 'http://www.w3.org/2000/svg';
export const R = 100;

// Angle in degrees, 0 = top, clockwise. Angles above 360 wrap naturally.
function point(deg, r) {
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

function el(name, attrs = {}, text) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text != null) node.textContent = text;
  return node;
}

/**
 * @param {SVGSVGElement} svg
 * @param {Array} tasks
 * @param {{ done: Set<string>, justDone?: string|null, onPick: (task) => void }} opts
 */
export function renderPie(svg, tasks, { done, justDone = null, onPick }) {
  svg.replaceChildren();
  const n = tasks.length;
  const step = 360 / n;
  const isDone = tasks.map((t) => done.has(t.id));
  const allDone = isDone.every(Boolean);
  svg.classList.toggle('all-done', allDone);

  // Glow layer: one merged shape per run of completed neighbours.
  const glow = el('g', { class: 'glow-layer' });
  for (const run of completedRuns(isDone)) {
    const containsJust = justDone != null &&
      Array.from({ length: run.length }, (_, k) => tasks[(run.start + k) % n].id).includes(justDone);
    glow.append(el('path', {
      class: `done-run${containsJust ? ' just-done' : ''}`,
      d: slicePath(run.start * step, (run.start + run.length) * step),
    }));
  }

  tasks.forEach((task, i) => {
    const start = i * step;
    const end = start + step;
    const finished = isDone[i];
    const g = el('g', {
      class: `slice${finished ? ' done' : ''}${task.id === justDone ? ' just-done' : ''}`,
      'data-id': task.id,
      role: 'button',
      tabindex: '0',
      'aria-label': finished ? `${task.name}, done for tonight` : `${task.name}, ${task.minutes} minutes`,
      ...(finished ? { 'aria-disabled': 'true' } : {}),
    });
    g.append(el('path', { class: 'slice-shape', d: slicePath(start, end) }));
    svg.append(g);
  });

  svg.append(glow);

  // Dividers only where at least one neighbour is not done, so done slices join.
  if (n > 1) {
    for (let i = 0; i < n; i++) {
      if (isDone[i] && isDone[(i - 1 + n) % n]) continue;
      const [x, y] = point(i * step, R + 1);
      svg.append(el('line', { class: 'divider', x1: 0, y1: 0, x2: x.toFixed(3), y2: y.toFixed(3) }));
    }
  }

  // Labels on top of everything; taps on them fall through to the slice group.
  const labels = el('g', { class: 'labels' });
  tasks.forEach((task, i) => {
    const [lx, ly] = point(i * step + step / 2, n === 1 ? 0 : R * 0.58);
    const cls = isDone[i] ? ' done' : '';
    labels.append(el('text', { class: `slice-name${cls}`, x: lx.toFixed(2), y: (ly - 2).toFixed(2) }, task.name));
    labels.append(el('text', { class: `slice-mins${cls}`, x: lx.toFixed(2), y: (ly + 11).toFixed(2) },
      isDone[i] ? 'done ✓' : `${task.minutes} min`));
  });
  svg.append(labels);

  svg.querySelectorAll('.slice').forEach((g, i) => {
    const pick = () => onPick(tasks[i]);
    g.addEventListener('click', pick);
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); }
    });
  });
}
