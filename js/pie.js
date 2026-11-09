// Renders the task circle as SVG: one slice per task, any number of tasks.
const NS = 'http://www.w3.org/2000/svg';
export const R = 100;

// Angle in degrees, 0 = top, clockwise.
function point(deg, r) {
  const a = (deg * Math.PI) / 180;
  return [r * Math.sin(a), -r * Math.cos(a)];
}

export function slicePath(startDeg, endDeg, r = R) {
  if (endDeg - startDeg >= 360) {
    // Full circle (single task): two half arcs.
    return `M 0 ${-r} A ${r} ${r} 0 1 1 0 ${r} A ${r} ${r} 0 1 1 0 ${-r} Z`;
  }
  const [x1, y1] = point(startDeg, r);
  const [x2, y2] = point(endDeg, r);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  const f = (n) => n.toFixed(3);
  return `M 0 0 L ${f(x1)} ${f(y1)} A ${r} ${r} 0 ${large} 1 ${f(x2)} ${f(y2)} Z`;
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
 * @param {(task) => void} onPick
 */
export function renderPie(svg, tasks, onPick) {
  svg.replaceChildren();
  const n = tasks.length;
  const step = 360 / n;
  tasks.forEach((task, i) => {
    const start = i * step;
    const end = start + step;
    const g = el('g', {
      class: 'slice',
      'data-id': task.id,
      role: 'button',
      tabindex: '0',
      'aria-label': `${task.name}, ${task.minutes} minutes`,
    });
    g.append(el('path', { class: 'slice-shape', d: slicePath(start, end) }));
    const [lx, ly] = point(start + step / 2, n === 1 ? 0 : R * 0.58);
    g.append(el('text', { class: 'slice-name', x: lx.toFixed(2), y: (ly - 2).toFixed(2) }, task.name));
    g.append(el('text', { class: 'slice-mins', x: lx.toFixed(2), y: (ly + 11).toFixed(2) }, `${task.minutes} min`));
    g.addEventListener('click', () => onPick(task));
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(task); }
    });
    svg.append(g);
  });
  // Thin cocoa dividers drawn on top so slices read as separate pieces.
  if (n > 1) {
    tasks.forEach((_, i) => {
      const [x, y] = point(i * step, R + 1);
      svg.append(el('line', { class: 'divider', x1: 0, y1: 0, x2: x.toFixed(3), y2: y.toFixed(3) }));
    });
  }
}
