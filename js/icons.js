// Soft hand-drawn line icons (24×24, stroked). Each task names one in config.js.
const NS = 'http://www.w3.org/2000/svg';

export const ICONS = {
  lotus: [
    'M12 5.5c2.2 2.6 2.2 6.4 0 9c-2.2-2.6-2.2-6.4 0-9z',
    'M12 14.5c-3.4 0-6.2-2-7.2-5.2c3.2.2 5.8 2 7.2 5.2z',
    'M12 14.5c3.4 0 6.2-2 7.2-5.2c-3.2.2-5.8 2-7.2 5.2z',
    'M5 17.5c3 1.6 11 1.6 14 0',
  ],
  book: [
    'M3.5 6.2c2.9-1.1 5.8-.9 8.5 1v11.6c-2.7-1.9-5.6-2.1-8.5-1z',
    'M20.5 6.2c-2.9-1.1-5.8-.9-8.5 1v11.6c2.7-1.9 5.6-2.1 8.5-1z',
  ],
  pencil: [
    'M5 19l1-4.2L15.6 5.2a1.6 1.6 0 0 1 2.3 0l.9.9a1.6 1.6 0 0 1 0 2.3L9.2 18z',
    'M14.2 6.6l3.2 3.2',
    'M12 20h7',
  ],
  stretch: [
    'M13.8 4.6a1.8 1.8 0 1 1-3.6 0a1.8 1.8 0 1 1 3.6 0z',
    'M12 8v5.5',
    'M12 9.2l-5-3.4',
    'M12 9.2l5-3.4',
    'M12 13.5l-4 6.5',
    'M12 13.5l4 6.5',
  ],
};

function paths(name) {
  return (ICONS[name] || ICONS.lotus).map((d) => {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    return p;
  });
}

/** A <g> holding the icon, centred at (cx, cy) with the given size, for use inside another SVG. */
export function iconGroup(name, cx, cy, size, cls = 'icon') {
  const g = document.createElementNS(NS, 'g');
  const s = size / 24;
  g.setAttribute('class', cls);
  g.setAttribute('transform', `translate(${(cx - size / 2).toFixed(2)} ${(cy - size / 2).toFixed(2)}) scale(${s.toFixed(4)})`);
  g.append(...paths(name));
  return g;
}

/** A standalone inline <svg> icon. */
export function iconSvg(name, cls = 'icon') {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', cls);
  svg.setAttribute('aria-hidden', 'true');
  svg.append(...paths(name));
  return svg;
}
