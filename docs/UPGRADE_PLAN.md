# LifeOS 2.0 — Audit & Implementation Plan

## 1. Audit of LifeOS 1.0

| Area | State in 1.0 | Verdict |
| --- | --- | --- |
| Architecture | Vanilla JS, no build step. `App` namespace, hash router, event delegation (`data-act`), views return HTML strings. | Keep. It is fast on Android and needs no npm. |
| Storage | One JSON blob in `localStorage` (`lifeos.v1`). No versioning or migration. | Upgrade to IndexedDB, add versioned migration from v1, keep localStorage as fallback. |
| Home | Calories, water, steps, social alerts, workout tile, month money, tasks, goals. | Rebuild as the 2.0 dashboard. |
| Goals | Long and short goals, to-dos. | Split: tasks move to **Plan**. Goals gain milestones, priority, daily actions and XP. |
| Social | Low/high limits, 7-day chart, streak. | Keep. Add monthly analytics and most-used app. |
| Money | Income/expense, budgets, 80%/100% warnings. | Keep. Add purchase flow, receipts, refunds, recurring items, money goals, report, CSV. |
| Gym | PPL split, set logging, rest timer, diet plan with meal checkboxes. | Keep logging and progression. Use the new split, a real food database with portions, weight analytics and exercise illustrations. |

### Bugs and gaps found
1. Rings and counters re-animate from 0 or jump on every tap, so there are no smooth value transitions.
2. No IndexedDB, so receipt photos can't be stored.
3. The diet plan is the only nutrition input: no portions, no food database, no meal types.
4. Weight trend compares two single entries, so it is noisy. It needs averages.
5. Profile fields are read directly in several places, with no central accessor.
6. No Work, Study (CMA) or Career modules, no routine, calendar or timeline, and no XP.
7. The service worker cache is never versioned per release.

## 2. Constraints
- npm registry access is blocked in this environment, so **Framer Motion can't be installed**. The motion system uses the Web Animations API, CSS `linear()` spring curves (with fallbacks), FLIP layout transitions and animated SVG.
- Personal identity data (name, employer, location, body stats) lives in `js/seed.local.js`, which is **git-ignored**. It is never committed to the public repo.

## 3. Module plan
1. **Core**: IndexedDB store, v1→v2 migration, central `App.profile()`, value-memory for smooth transitions, FLIP helper.
2. **Scores**: transparent rules for day productivity, *My Life Progress* (6 categories), streaks, XP, levels and badges (all derived from records, never from clicks).
3. **Shell**: splash, bottom nav (mobile) and sidebar (desktop), global FAB action menu, reminders.
4. **Dashboard**: greeting, live clock, score, rings, life progress, deadlines, streaks.
5. **Plan**: routine timeline, tasks (recurring, time blocks), calendar, daily review.
6. **Fitness**: new split, animated exercise figures, set logging, food database with portions, weight analytics and projection.
7. **Study**: CMA Part 1/2 sections, sessions, MCQs, mocks, weak topics, countdowns, B.Com backlog.
8. **Career**: 9-skill roadmap, milestones, courses, practice, portfolio, timeline.
9. **Work**: work items, approvals, reimbursements, timesheet, journal and generated daily summary.
10. **Money**: purchase flow with receipt, refunds, recurring items, money goals, report, CSV.
11. **Social**: monthly analytics, most-used app.
12. **Goals**: milestones, daily actions, unlock animation, XP.
13. **Settings**: profile, schedule, targets, backup/import, CSV, safe clear.
14. **Test** every route, form and calculation in a headless phone browser. Test offline mode and persistence.
