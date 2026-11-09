// Minimal in-browser test harness (no Node on the dev machine).
const tests = [];
let currentSuite = '';

export function suite(name) { currentSuite = name; }
export function test(name, fn) { tests.push({ suite: currentSuite, name, fn }); }

export function eq(actual, expected, msg = '') {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg ? msg + ': ' : ''}expected ${e}, got ${a}`);
}
export function ok(value, msg = 'expected truthy') { if (!value) throw new Error(msg); }

export async function run(out) {
  let pass = 0;
  let fail = 0;
  let lastSuite = null;
  const lines = [];
  for (const t of tests) {
    if (t.suite !== lastSuite) { lines.push({ cls: 'suite', text: t.suite }); lastSuite = t.suite; }
    try {
      await t.fn();
      pass++;
      lines.push({ cls: 'pass', text: `✓ ${t.name}` });
    } catch (e) {
      fail++;
      lines.push({ cls: 'fail', text: `✗ ${t.name} — ${e.message}` });
    }
  }
  const summary = document.createElement('p');
  summary.id = 'summary';
  summary.className = fail ? 'fail' : 'pass';
  summary.textContent = `${fail ? 'FAIL' : 'PASS'}: ${pass} passed, ${fail} failed`;
  out.append(summary);
  for (const l of lines) {
    const p = document.createElement('p');
    p.className = l.cls;
    p.textContent = l.text;
    out.append(p);
  }
  document.title = summary.textContent;
}
