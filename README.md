# LifeOS 2.0

A personal life operating system: routine, fitness coach, Indian nutrition, US CMA study, career roadmap, work management and INR money tracking in one app. It's an installable PWA. It works offline, needs no login, and keeps all data on your device.

## Modules

| Tab | What it does |
| --- | --- |
| **Home** | Greeting and live clock, the routine block you're in now, alerts, today's score, *My Life Progress* rings (tap a ring to open that section), food, water, weight, workout, CMA, work, money, screen time, XP, streaks, upcoming deadlines. |
| **Plan** | Animated day timeline, tasks (time blocks, daily/weekday/weekly repeats, priorities, goal links), calendar, missed tasks, daily review, editable routine (gym, study, 2–11 PM work shift…). |
| **Fitness** | 5-day split (Mon Chest+Triceps, Tue Back+Biceps, Wed Legs+Abs, Fri Chest+Back+Shoulders, Sat Legs+Arms; Thu/Sun rest). Animated demo, form steps and common mistakes for every exercise, set logging, automatic rest timer, overload advice. Nutrition: 37-food Indian database with portion sizes, macros per meal, budget meal templates. Body: weight trend with 7-day average, weekly and monthly change, target projection, trend-based calorie advice, water, steps. |
| **Money** | Purchase flow (category picker, merchant, payment mode, receipt photo, payment animation, digital receipt), income, refunds, budgets with 80%/100% warnings, daily limit, recurring bills, savings goals, monthly report, CSV. |
| **More → Study** | CMA Part 1 & 2 sections and chapters (IMA outline), study timer and sessions, Hock MCQ accuracy, weak topics, mock scores vs the 72% pass line, exam countdowns, notes, B.Com backlog (Business Mathematics, Business Economics). |
| **More → Work** | Manager tasks, approvals, reimbursements, deadlines, clock-in timesheet, journal, generated daily work summary, work notes, professional learning. |
| **More → Career** | 9 skills with milestones, courses, practice tasks and notes; portfolio; 7-stage career roadmap that completes from your data. |
| **More → Goals / Screen time / XP** | Goals with milestone unlock animations and daily actions; per-app low/max limits with weekly and 30-day analytics; XP, levels, badges, weekly performance. |
| **Settings** | Profile (all editable), targets, reminders, reduced motion, JSON backup/restore (includes receipt photos), CSV exports, protected storage, erase with typed confirmation. |

The **+** button opens: expense, income, food, weight, water, workout, task, study session, work note.

## Transparent scoring

Every score shows its rules in the app ("How is this score calculated?").
- **Today score** is a weighted average of tasks (30), workout (20), nutrition (20), study (15) and screen time (15). Parts that don't apply today are left out, not counted as zero.
- **My Life Progress** has 6 rings (fitness, career, education, money discipline, productivity, personal growth). Each is calculated from recorded data. A ring shows "—" until there is enough data.
- **XP** is recalculated from your records each time, so un-ticking something removes its XP. Taps and page views never earn points.

## Privacy

- Data is stored in **IndexedDB** on the device, with a localStorage fallback. The schema is versioned, and LifeOS 1.0 data migrates automatically (the old copy is kept as a backup).
- There are no accounts, analytics, trackers or external requests.
- The public build contains **no personal details**. `js/profile.personal.js` is git-ignored. It only goes into the private ZIP.
- Screen time is entered manually. A web app can't read Android/iOS usage.
- Food values are estimates (IFCT/USDA, rounded).

## Install on a phone

1. Host the folder over HTTPS, e.g. GitHub Pages (repo → Settings → Pages → Deploy from branch `main`, `/root`).
2. Open the link in **Chrome (Android)**, then ⋮ → **Install app**. On **iPhone (Safari)**: Share → **Add to Home Screen**.
3. In LifeOS: Settings → **Protect data from browser cleanup**.

To run it locally: `python3 -m http.server 8000` in this folder, then open http://localhost:8000.

## Updating

When you change any file, bump `CACHE` in `sw.js` (e.g. `lifeos-v2.0.1`) and `App.VERSION` in `js/views/more.js` so installed phones download the update.

## Structure

```
index.html  manifest.webmanifest  sw.js
css/styles.css               design system + motion
js/profile.js                public seed (empty) · profile.personal.js = private seed (git-ignored)
js/core.js                   state, IndexedDB, migration, helpers, icons
js/data.js                   targets, food DB, exercises, split, CMA outline, skills, categories
js/figures.js                animated exercise figures (SVG)
js/ui.js                     rings, charts, smooth transitions, FLIP, sheets, unlock overlay, timer
js/scores.js                 day score, life progress, streaks, XP, badges, weight analytics
js/app.js                    boot/splash, router, FAB, onboarding, reminders
js/views/*.js                home, plan, fitness, money, study, career, work, social, goals, more
tools/build-zip.sh           builds public + personal ZIPs
docs/                        upgrade plan, testing report
```
