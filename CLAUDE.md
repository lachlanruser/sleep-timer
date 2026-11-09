# Sleep Timer (working name)

A phone-first web app: a bedtime routine timer that gets me to consistently finish a fixed set of tasks before sleep. It's designed to keep me off my phone, so the screen must stay on during a timer. I use it on my iPhone, installed from GitHub Pages.

## Home screen

- Mostly portrait, designed for a phone first. Warm brown background, calm and dark, nothing bright, since it's used at night.
- A large circle in the middle of the screen, split like a pie into one slice per task. The number of slices comes from a task list in the data, so adding a task later just adds a slice.
- V1 has four tasks, so four quarters: Meditate (5 min), Read (10 min), Journal (5 min), Stretch (10 min).
- Each slice has a subtle but clear name label. Tasks can be done in any order.

## Timer view

- Tapping a slice makes the circle fill the screen as a countdown timer, similar to the iPhone's Timer app: a large circular ring with the time remaining.
- When it finishes, it returns to the split circle with that quarter highlighted, and a gentle end chime plays.
- Completed quarters stay highlighted and visually join together as more are finished, until all four are done.
- When all four are complete, show a short, cute, encouraging "good job" message. Calm and sleep-appropriate: no loud sounds or bright flashing.

## Streak

- A streak counts the number of days in a row that all four tasks were completed. Show the current streak and the best streak.
- A task only counts if its full timer runs to completion. Cancelling early means it doesn't count.
- Store which tasks were completed on each day. Only the streak is shown in V1, but the data is kept so history can be shown later.

## Screen must stay awake

- Use the Screen Wake Lock API during a timer: request it when the timer starts, re-request it when the page becomes visible again, and release it when the timer ends or is cancelled.
- Verify how well this works in iOS Safari and when installed to the home screen (reported as unreliable). Include a fallback if the API isn't available or fails, and report honestly what works and what doesn't. Test on the real iPhone, not just a desktop browser.
- Timers are based on a stored end time, not on counting ticks. If the page is throttled or the screen locks anyway, the timer must still show the right time and complete correctly on return.

## Tech and hosting

- Plain web app, no server, no live API calls. Installable as a PWA (manifest, service worker, icons) so it can be added to the iPhone home screen and opens full screen.
- Data stored in the browser's local storage on the phone. Browsers can clear site data, so provide a simple export/import backup.
- Hosted free on GitHub Pages (public repo — GitHub Free only supports Pages for public repositories). Nothing sensitive goes in the repo; user data lives only on the phone.

## Not in V1

- V2: personalised music per task to help concentration. Design the data so each task can have its own sound/track later, but don't build any music now.
- Also not in V1: accounts, syncing across devices, notifications.

## Process

- Interview about unclear points, then plan (tech approach, file structure, build order) in plan mode. No building until the plan is approved.
- Build one slice at a time and commit to git after each:
  1. Split circle, tap a slice to run the timer, return to the circle. Includes the wake lock.
  2. Completed quarters highlighted and joined together, plus the all-done message.
  3. Streak and local storage.
  4. PWA setup.
- Deploy to GitHub Pages after slice 1 so the wake lock can be tested on the real phone early.

## Quality

- Tests for the date and streak logic, including missed days, the day rollover and time zones.
- Test in a browser after each slice.
- When V1 works, review own work for gaps and suggest improvements before adding anything new.

## Decisions

Agreed in the interview on 2026-11-09:

- **Day boundary:** midnight, in the phone's local time zone. A task counts for the day its timer **started** (so 11:55 pm → 12:05 am counts for the evening it began).
- **Missed days:** strict. Any day without all four tasks complete resets the current streak to 0. Best streak is kept.
- **Pause/cancel:** the timer has pause/resume and cancel (with a confirm). Leaving the app keeps a running timer going from its stored end time. Partial time never counts.
- **Redo:** no. A completed slice is locked until the next day.
- **Backup:** export/import deferred to V2 (accepted risk: iOS may clear site data).
- **Typography:** soft rounded sans (e.g. Nunito/Quicksand), bundled locally, no live font calls. Large thin numerals for the countdown.
- **Wake lock fallback:** no third-party video fallback (NoSleep.js declined). Native Screen Wake Lock only. If unavailable or it fails, the timer view shows a gentle note (e.g. set Auto-Lock to Never), and the end-time timer still completes correctly on return.
- **Tooling:** no Node/Python on the dev machine, so: no build step, vanilla ES modules, in-browser tests at `tests/index.html`, dev server `tools/serve.ps1` (launch config `sleep-timer`, port 5190). `?fast` URL flag makes each minute last 2 seconds for testing.
- **Look:** "cocoa + candlelight": deep cocoa background, muted taupe slices, completed slices in soft amber/honey glow. Slow (~600 ms) eased transitions, gentle breathing pulse on the ring. Respect `prefers-reduced-motion`.
