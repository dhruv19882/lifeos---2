# LifeOS 2.0 — Testing report

**Environment:** headless Chromium (Playwright), 390×844 phone viewport. The app was served through request interception at http and https test origins. Test date: 10 Nov 2026, a Tuesday, so the active workout is Back + Biceps.
**Result:** every flow below passed with **0 JavaScript errors** (page errors and console errors were captured throughout).

## Automated end-to-end flow

| Area | What was done | Result |
| --- | --- | --- |
| Boot | Splash, IndexedDB load, personal seed applied | Profile Dhruv, 22, 172.7 cm, 49→55→60 kg; 6 starter goals; storage = IndexedDB |
| Validation | Submit task with empty title; submit onboarding without name | Blocked, field highlighted, sheet stays open |
| Tasks | Timed high-priority task + daily recurring task; tick recurring | Timeline shows 9 items (8 routine + 1 task); recurring done stored per date |
| Calendar / routine | Open calendar and routine editor | 30 day cells (Nov); 8 routine blocks |
| Daily review | Mood + note | Saved with score snapshot |
| Food | Search "roti", pick 3 pcs, lunch | Preview 300 kcal / 10.5 g P; logged |
| Meal template | Oats power bowl | 4 items: oats 60 g 228 kcal, milk 300 ml 174, banana 105, PB 16 g 94 |
| Day nutrition | Sum | 901 kcal, 33 g P, 147 g C, 23 g F (matches the item sums) |
| Workout | Open Lat Pulldown, log 20 kg × 10, tick | Animated SVG figure present; rest timer started; finish → workout finished |
| Weight | Log 49.4 kg | Current weight 49.4; body screen renders |
| Income | ₹28,000 | Recorded |
| Purchase | ₹249.50 Swiggy, Food | Payment animation + receipt showing ₹249.5 |
| Refund | ₹49.50 Food | Month: expenses 249.5, refunds 49.5, **net spent 200**, budget left 14,800, balance **27,800** (= 28,000 − 249.5 + 49.5) ✔ |
| Recurring | Gym fee ₹800 → Pay | One payment recorded for the month; 4 transactions total |
| Savings goal | Emergency fund ₹30,000, +₹5,000 | Saved 5,000 |
| Monthly report | Open | Income 28,000, spent 1,000, saved 27,000, rate 96% ✔ |
| Study | 45 min MCQs, 31/40 | Accuracy 77.5% ✔; chapter P1-A.1 completed → unlock overlay; Part 1 = 7.5% (section A is 15% weight × ½ chapter) ✔ |
| Mock | 78/100 | Score 78% |
| Backlog | Tick 1 of 8 units | 12.5% ✔ |
| Career | Excel milestone 1/7; portfolio project done | Excel 14.3% ✔; roadmap stage 1 done, stage 2 current |
| Work | Approval, reimbursement ₹3,250 (done), journal, clock in/out, note | Generated summary lists completed items by area, ₹3,250, pending approval with name, note |
| Screen time | Instagram +30 +30 | 60 min = max limit → status "over", red toast |
| Goal milestone | Complete CMA milestone 1 | Unlock overlay; goal 25% |
| Scores | Final | Day score 74 (tasks 100, workout 100, nutrition 33, study 38, screen 75); XP 314 → Level 3; 4 badges |

## Persistence, offline, migration

| Test | Result |
| --- | --- |
| Reload after all flows | All counts identical (tasks 2, food 5, txns 4, sessions 1, work 2, goals 6, XP 314) |
| Service worker over https | Registered, controls the page, **25 files cached** |
| Offline | Network off and test server removed → reload shows "Good evening, Dhruv" with data from IndexedDB |
| LifeOS 1.0 → 2.0 migration | Profile, goals (short goals → milestones), todos → tasks, categories remapped (recharge → mobile, grocery → food budget), meals → food log, Push A history kept; old key removed and a backup kept |
| Public build onboarding | No seed → onboarding shown; empty name blocked; custom profile created |

## Calculations checked by hand

- BMR (Mifflin-St Jeor, male, 49 kg, 172.7 cm, 22 y) = 490 + 1079.4 − 110 + 5 = **1,464**; × 1.55 = **2,270**; + 400 surplus = **2,670 kcal**. Protein 2 g × 49 = **98 g**.
- Roti 3 × 100 kcal = 300; oats 60 g × 3.8 = 228; milk 300 ml × 0.58 = 174.
- XP: tasks 1×10 + workout 50 + chapter 40 + mock 30 + study 9 + skill milestone 30 + project 60 + goal milestone 75 + reimbursement 10 = **314** ✔. Level 3 starts at 300.

## Visual review

Screenshots were taken of the dashboard (empty and with data), goals, workout with demos, splash and icons. Fixes made after review: level chip wrapping, the hidden overlay blocking taps (`[hidden]` rule), the Fitness sub-tab key, and splash images (PNG 7 MB → JPEG 580 KB).

## Not verifiable in this sandbox

- Real-device install prompt, haptics and notifications (these need a physical Android or iPhone).
- iOS splash images (Safari only).
- Emoji glyphs (the headless browser has no emoji font; phones render them normally).
