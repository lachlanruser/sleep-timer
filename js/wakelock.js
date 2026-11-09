// Screen Wake Lock: request on timer start, re-request when the page becomes
// visible again (the OS drops the lock whenever the page is hidden), release on
// finish/cancel. No third-party fallback: if this fails, the UI shows a note and
// the end-time timer still completes correctly when the user returns.

export const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

let sentinel = null;
let wanted = false;
let pending = null;
let status = supported ? 'off' : 'unsupported';
const listeners = new Set();

function setStatus(s, detail = '') {
  status = s;
  listeners.forEach((fn) => fn(s, detail));
}

async function request() {
  if (!supported) return setStatus('unsupported');
  if (sentinel || pending) return;
  pending = navigator.wakeLock.request('screen');
  try {
    const s = await pending;
    if (!wanted) { // released while the request was in flight
      s.release().catch(() => {});
      return;
    }
    sentinel = s;
    s.addEventListener('release', () => {
      if (sentinel === s) sentinel = null;
      if (wanted) setStatus('released'); // e.g. page hidden; re-requested on return
    });
    setStatus('on');
  } catch (e) {
    setStatus('failed', e && e.name ? e.name : String(e));
  } finally {
    pending = null;
  }
}

export function acquire() {
  wanted = true;
  return request();
}

export async function release() {
  wanted = false;
  const s = sentinel;
  sentinel = null;
  if (s) {
    try { await s.release(); } catch { /* already released */ }
  }
  setStatus(supported ? 'off' : 'unsupported');
}

export function onStatus(fn) {
  listeners.add(fn);
  fn(status, '');
  return () => listeners.delete(fn);
}

document.addEventListener('visibilitychange', () => {
  if (wanted && document.visibilityState === 'visible') request();
});
