import { TASKS, FAST, durationMs } from './config.js';
import { load, save } from './store.js';
import { dayKey } from './dates.js';
import { recordCompletion, completedIds } from './history.js';
import * as T from './timer.js';
import * as wake from './wakelock.js';
import * as chime from './chime.js';
import { renderPie } from './pie.js';

const $ = (id) => document.getElementById(id);
const els = {
  pie: $('pie'), home: $('home'), timer: $('timer'), dateLabel: $('dateLabel'), hint: $('hint'),
  doneMsg: $('doneMsg'), doneTitle: $('doneTitle'), doneSub: $('doneSub'),
  timerTask: $('timerTask'), ringWrap: $('ringWrap'), ring: $('ringProgress'),
  timeLeft: $('timeLeft'), endsAt: $('endsAt'), pauseBtn: $('pauseBtn'), cancelBtn: $('cancelBtn'),
  wakeNote: $('wakeNote'), testInfo: $('testInfo'),
  confirm: $('confirm'), confirmTitle: $('confirmTitle'), stopBtn: $('stopBtn'), keepBtn: $('keepBtn'),
};

const RING_C = 2 * Math.PI * 100;
els.ring.style.strokeDasharray = `${RING_C}`;

// Calm, sleep-appropriate messages for when everything is done.
const DONE_MESSAGES = [
  ['All done. Sweet dreams 🌙', 'Your future self says thank you.'],
  ['Routine complete ✨', 'Phone down, lights low. Goodnight.'],
  ['You did it 🌙', 'You showed up for yourself tonight.'],
  ['Lovely work 🌿', 'Time to rest. See you tomorrow night.'],
  ['Every slice, done 🌙', 'Let your mind go quiet now.'],
];

const state = load();
let raf = 0;
let lastText = '';
let justDone = null; // task id to animate on the next home render
let renderedDay = null;
let hintTimeout = 0;

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

function defaultHint(doneCount) {
  if (FAST) return `Fast test mode: 1 min = 2 s · ${doneCount} of ${TASKS.length} done`;
  if (doneCount === 0) return 'Tap a task to begin';
  return `${doneCount} of ${TASKS.length} done`;
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
  renderPie(els.pie, TASKS, { done, justDone, onPick: pickTask });

  clearTimeout(hintTimeout);
  els.hint.hidden = allDone;
  els.hint.textContent = defaultHint(doneCount);
  const wasHidden = els.doneMsg.hidden;
  els.doneMsg.hidden = !allDone;
  if (allDone) {
    const [title, sub] = pickMessage(key);
    els.doneTitle.textContent = title;
    els.doneSub.textContent = sub;
    // Restart the gentle fade only when it first appears.
    if (wasHidden) { els.doneMsg.style.animation = 'none'; void els.doneMsg.offsetWidth; els.doneMsg.style.animation = ''; }
  }
  justDone = null;
}

function flashHint(text) {
  clearTimeout(hintTimeout);
  els.hint.textContent = text;
  hintTimeout = setTimeout(() => {
    const done = completedIds(state.days, today());
    els.hint.textContent = defaultHint(TASKS.filter((t) => done.has(t.id)).length);
  }, 2500);
}

function renderTimer() {
  const t = state.activeTimer;
  if (!t) return;
  const now = Date.now();
  const paused = T.isPaused(t);
  els.ring.style.strokeDashoffset = `${RING_C * T.progress(t, now)}`;
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
  els.timerTask.textContent = taskById(t.taskId)?.name ?? '';
  lastText = '';
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
  justDone = t.dayKey === today() ? t.taskId : null;
  wake.release();
  chime.play();
  renderHome();
  showTimerView(false);
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

// ---------- boot ----------
renderHome();
if (state.activeTimer) {
  if (!check()) enterTimer(); // resume a timer that survived a reload / app kill
}
