import { TASKS, FAST, durationMs } from './config.js';
import { load, save, requestPersistence } from './store.js';
import { dayKey } from './dates.js';
import { recordCompletion, completedIds } from './history.js';
import { computeStreaks } from './streak.js';
import * as T from './timer.js';
import * as wake from './wakelock.js';
import * as chime from './chime.js';
import { renderPie } from './pie.js';
import { makeSky, joinFireflies, finale } from './effects.js';
import { iconSvg } from './icons.js';

const $ = (id) => document.getElementById(id);
const els = {
  pie: $('pie'), home: $('home'), timer: $('timer'), dateLabel: $('dateLabel'), hint: $('hint'), streak: $('streak'),
  doneMsg: $('doneMsg'), doneTitle: $('doneTitle'), doneSub: $('doneSub'),
  timerTask: $('timerTask'), timerIcon: $('timerIcon'), ringWrap: $('ringWrap'), ring: $('ringProgress'),
  flamePos: $('flamePos'), sky: $('sky'), fx: $('fx'),
  timeLeft: $('timeLeft'), endsAt: $('endsAt'), pauseBtn: $('pauseBtn'), cancelBtn: $('cancelBtn'),
  wakeNote: $('wakeNote'), testInfo: $('testInfo'),
  confirm: $('confirm'), confirmTitle: $('confirmTitle'), stopBtn: $('stopBtn'), keepBtn: $('keepBtn'),
};

const RING_C = 2 * Math.PI * 100;
els.ring.style.strokeDasharray = `${RING_C}`;

// Calm, sleep-appropriate messages for when everything is done.
const DONE_MESSAGES = [
  ['Full moon tonight', 'Every slice done. Sweet dreams.'],
  ['The moon is glowing', 'Blow out the candle. Sleep well.'],
  ['All aglow', 'You showed up for yourself tonight.'],
  ['A whole moon, all yours', 'Phone down, lights low. Goodnight.'],
  ['Cosy and complete', 'Let your mind go quiet now.'],
];

const state = load();
let raf = 0;
let lastText = '';
let justDone = null; // task id to animate on the next home render
let renderedDay = null;
let hintTimeout = 0;
let lastPie = null; // what renderPie reported, for the celebration effects
let lastDash = -1;

const taskById = (id) => TASKS.find((t) => t.id === id);
const today = () => dayKey(Date.now());
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

function persist() { save(state); }

// ---------- views ----------
function showTimerView(on) {
  document.body.classList.toggle('timing', on);
  els.timer.inert = !on;
  els.home.inert = on;
}

function pickMessage(key) {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return DONE_MESSAGES[h % DONE_MESSAGES.length];
}

/** The moon's phase for how many tasks are done (works for any task count). */
function moonPhase(doneCount, total) {
  if (doneCount === 0) return 'New moon';
  const r = doneCount / total;
  if (r < 0.5) return 'Crescent moon';
  if (r === 0.5) return 'Half moon';
  if (r < 1) return 'Gibbous moon';
  return 'Full moon';
}

function setHint(doneCount) {
  const total = TASKS.length;
  const phase = document.createElement('span');
  phase.className = 'phase';
  phase.textContent = moonPhase(doneCount, total);
  const rest = doneCount === 0 ? ' · tap a task to begin' : ` · ${doneCount} of ${total}`;
  els.hint.replaceChildren(phase, rest, FAST ? ' · fast test mode' : '');
}

function renderHome() {
  const key = today();
  renderedDay = key;
  const done = completedIds(state.days, key);
  const doneCount = TASKS.filter((t) => done.has(t.id)).length;
  const allDone = doneCount === TASKS.length;

  els.dateLabel.textContent = new Date(Date.now()).toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  lastPie = renderPie(els.pie, TASKS, { done, justDone, onPick: pickTask });
  const isFinale = allDone && justDone != null;
  els.pie.classList.toggle('finale', isFinale);
  renderStreak(computeStreaks(state.days, key));

  clearTimeout(hintTimeout);
  els.hint.hidden = allDone;
  setHint(doneCount);
  const wasHidden = els.doneMsg.hidden;
  els.doneMsg.hidden = !allDone;
  els.doneMsg.classList.toggle('late', isFinale); // wait for the glow-up first
  if (allDone) {
    const [title, sub] = pickMessage(key);
    els.doneTitle.textContent = title;
    els.doneSub.textContent = sub;
    // Restart the gentle fade only when it first appears.
    if (wasHidden) { els.doneMsg.style.animation = 'none'; void els.doneMsg.offsetWidth; els.doneMsg.style.animation = ''; }
  }
  justDone = null;
}

function renderStreak({ current, best }) {
  const nights = (n) => `${n} night${n === 1 ? '' : 's'}`;
  const span = (cls, text) => {
    const s = document.createElement('span');
    s.className = cls;
    s.textContent = text;
    return s;
  };
  els.streak.replaceChildren();
  if (current > 0) {
    els.streak.append('Streak ', span('num', nights(current)));
    if (best > current) els.streak.append(span('best', ` · best ${best}`));
  } else if (best > 0) {
    els.streak.append(span('best', `Best streak ${nights(best)}. Start a new one tonight.`));
  }
}

function flashHint(text) {
  clearTimeout(hintTimeout);
  els.hint.textContent = text;
  hintTimeout = setTimeout(() => {
    const done = completedIds(state.days, today());
    setHint(TASKS.filter((t) => done.has(t.id)).length);
  }, 2500);
}

function renderTimer() {
  const t = state.activeTimer;
  if (!t) return;
  const now = Date.now();
  const paused = T.isPaused(t);
  const p = T.progress(t, now);
  const dash = RING_C * p;
  if (Math.abs(dash - lastDash) > 0.3) { // skip sub-pixel repaints (battery)
    lastDash = dash;
    els.ring.style.strokeDashoffset = `${dash}`;
    // The flame sits at the tip of the remaining ring.
    els.flamePos.setAttribute('transform', `rotate(${((1 - p) * 360).toFixed(2)} 110 110)`);
  }
  const text = T.formatRemaining(T.remainingMs(t, now));
  if (text !== lastText) {
    els.timeLeft.textContent = text;
    lastText = text;
  }
  els.endsAt.textContent = paused
    ? 'Paused'
    : `Ends ${new Date(t.endsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  els.pauseBtn.textContent = paused ? 'Resume' : 'Pause';
  els.ringWrap.classList.toggle('paused', paused);
}

// ---------- timer lifecycle ----------
function pickTask(task) {
  if (completedIds(state.days, today()).has(task.id)) {
    flashHint(`${task.name} is done for tonight ✓`);
    return;
  }
  startTask(task);
}

function startTask(task) {
  if (state.activeTimer) return;
  chime.unlock(); // must happen inside the tap for iOS
  state.activeTimer = T.startTimer(task.id, Date.now(), durationMs(task));
  persist();
  enterTimer();
}

function enterTimer() {
  const t = state.activeTimer;
  const task = taskById(t.taskId);
  els.timerTask.textContent = task?.name ?? '';
  els.timerIcon.replaceChildren(iconSvg(task?.icon));
  lastText = '';
  lastDash = -1;
  renderTimer();
  showTimerView(true);
  wake.acquire();
  loop();
}

function loop() {
  cancelAnimationFrame(raf);
  const step = () => {
    if (!state.activeTimer) return;
    if (check()) return;
    renderTimer();
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
}

/** Completes the timer if its end time has passed. Returns true if it completed. */
function check() {
  const t = state.activeTimer;
  if (!t || !T.isDone(t, Date.now())) return false;
  finish(t);
  return true;
}

function finish(t) {
  cancelAnimationFrame(raf);
  els.confirm.hidden = true; // in case it finished while "Stop?" was open
  state.activeTimer = null;
  // Recorded for the day the timer *started* (a routine crossing midnight counts for that evening).
  state.days = recordCompletion(state.days, t, Date.now(), TASKS.map((x) => x.id));
  persist();
  requestPersistence();
  const forToday = t.dayKey === today(); // false if it started before midnight
  justDone = forToday ? t.taskId : null;
  wake.release();
  renderHome(); // consumes justDone
  showTimerView(false);
  const pie = lastPie;
  if (!forToday) { chime.play(); return; }
  if (pie.allDone) chime.finale(); else chime.play();
  // Let the timer view fade away before the fireflies rise.
  setTimeout(() => {
    joinFireflies(els.pie, els.fx, pie);
    if (pie.allDone) finale(els.pie, els.fx);
  }, 450);
}

function cancelTimer() {
  cancelAnimationFrame(raf);
  state.activeTimer = null;
  persist();
  wake.release();
  showTimerView(false);
}

function togglePause() {
  const t = state.activeTimer;
  if (!t) return;
  const now = Date.now();
  state.activeTimer = T.isPaused(t) ? T.resume(t, now) : T.pause(t, now);
  persist();
  renderTimer();
}

// ---------- confirm sheet ----------
function askCancel() {
  const t = state.activeTimer;
  if (!t) return;
  els.confirmTitle.textContent = `Stop ${taskById(t.taskId)?.name ?? 'this task'}?`;
  els.confirm.hidden = false;
  els.keepBtn.focus();
}
els.cancelBtn.addEventListener('click', askCancel);
els.keepBtn.addEventListener('click', () => { els.confirm.hidden = true; });
els.stopBtn.addEventListener('click', () => { els.confirm.hidden = true; cancelTimer(); });
els.pauseBtn.addEventListener('click', togglePause);

// ---------- wake lock status ----------
wake.onStatus((status, detail) => {
  const mode = isStandalone() ? 'home-screen app' : 'browser tab';
  els.testInfo.textContent = `test info · wake lock: ${status}${detail ? ` (${detail})` : ''} · ${mode}`;
  const note = els.wakeNote;
  if (status === 'on') {
    note.textContent = 'Screen will stay on';
    note.classList.remove('warn');
  } else if (status === 'unsupported' || status === 'failed') {
    note.textContent = 'Your screen may dim. Set Auto-Lock to Never (Settings › Display & Brightness) during your routine. The timer will still finish correctly.';
    note.classList.add('warn');
  } else {
    note.textContent = '';
    note.classList.remove('warn');
  }
});

// ---------- coming back to the page / passing midnight ----------
function onReturn() {
  if (document.visibilityState !== 'visible') return;
  if (state.activeTimer && check()) return; // finish() re-renders home
  if (renderedDay !== today()) renderHome();
  if (state.activeTimer) loop();
}
document.addEventListener('visibilitychange', onReturn);
window.addEventListener('pageshow', onReturn);
window.addEventListener('focus', onReturn);
setInterval(() => { if (renderedDay !== today()) renderHome(); }, 30_000);

// ---------- offline support ----------
// Skipped on localhost (so edits show immediately) unless ?sw is in the URL.
const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
if ('serviceWorker' in navigator && (!isLocal || new URLSearchParams(location.search).has('sw'))) {
  navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('Service worker failed', e));
}

// ---------- boot ----------
makeSky(els.sky);
renderHome();
if (state.activeTimer) {
  if (!check()) enterTimer(); // resume a timer that survived a reload / app kill
}
