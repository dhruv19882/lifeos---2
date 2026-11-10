'use strict';
/* Transparent scoring: day productivity, My Life Progress, streaks, XP, levels, badges.
   Everything is derived from recorded data; nothing is stored as "points". */
(function () {
  const { dkey, parseD, addDays, clamp, sum, lastNDays } = App;
  const S = () => App.state;

  /* ---------- tasks ---------- */
  function occursOn(t, date) {
    if (!t.recur || t.recur === 'none') return t.date === date;
    if (t.date && date < t.date) return false;
    if (t.until && date > t.until) return false;
    const dow = parseD(date).getDay();
    if (t.recur === 'daily') return true;
    if (t.recur === 'weekdays') return dow >= 1 && dow <= 5;
    if (t.recur === 'weekly') return dow === parseD(t.date || date).getDay();
    return false;
  }
  const isDone = (t, date) => (!t.recur || t.recur === 'none' ? !!t.done : !!(t.doneDates || {})[date]);
  const tasksOn = (date) => S().tasks.filter((t) => occursOn(t, date));
  const workDueOn = (date) => S().work.items.filter((w) => w.due === date);
  App.occursOn = occursOn;
  App.taskDone = isDone;
  App.tasksOn = tasksOn;

  /* ---------- per-day data ---------- */
  const foodOn = (date) => {
    const l = S().food.log.filter((x) => x.date === date);
    return { kcal: Math.round(sum(l, (x) => x.kcal)), p: Math.round(sum(l, (x) => x.p)), c: Math.round(sum(l, (x) => x.c)), f: Math.round(sum(l, (x) => x.f)), n: l.length };
  };
  const studyMinOn = (date) => sum(S().study.sessions.filter((x) => x.date === date), (x) => x.minutes);
  const workoutOn = (date) => {
    const logs = Object.entries(S().gym.logs).filter(([k]) => k.startsWith(date + '|'));
    const finished = logs.some(([, l]) => l.finished);
    const dayK = App.WEEK[parseD(date).getDay()];
    const total = sum(App.DAYS[dayK].list, (e) => e.sets);
    const doneSets = logs.filter(([k]) => k.endsWith('|' + dayK)).reduce((a, [, l]) => a + Object.values(l.sets || {}).flat().filter((s) => s && s.done).length, 0);
    return { finished, dayK, total, doneSets };
  };
  const screenOn = (date) => {
    const log = S().social.logs[date];
    if (!log || !Object.keys(log).length) return null;
    const apps = S().social.apps;
    if (!apps.length) return null;
    const vals = apps.map((a) => { const m = log[a.id] || 0; return m >= a.high ? 0 : m >= a.low ? 0.5 : 1; });
    return { value: sum(vals) / vals.length, allUnderHigh: apps.every((a) => (log[a.id] || 0) < a.high) };
  };
  App.foodOn = foodOn;
  App.studyMinOn = studyMinOn;
  App.workoutOn = workoutOn;
  App.screenOn = screenOn;

  /* ---------- day productivity score ---------- */
  const DAY_RULES = [
    { key: 'tasks', label: 'Tasks', weight: 30, rule: 'Tasks and work items due that day that you completed.' },
    { key: 'workout', label: 'Workout', weight: 20, rule: 'Training day: finished workout = 100%, otherwise sets done ÷ planned sets. Rest days are excluded.' },
    { key: 'nutrition', label: 'Nutrition', weight: 20, rule: '50% calories eaten ÷ target + 50% protein ÷ target (each capped at 100%).' },
    { key: 'study', label: 'Study', weight: 15, rule: 'Study minutes logged ÷ your daily study target.' },
    { key: 'screen', label: 'Screen time', weight: 15, rule: 'Per app: under low limit 100%, between limits 50%, over high limit 0%. Only counted when you logged screen time.' },
  ];
  App.DAY_RULES = DAY_RULES;

  function dayScore(date = dkey()) {
    const t = App.targets();
    const parts = [];
    const tasks = tasksOn(date), work = workDueOn(date);
    const tTotal = tasks.length + work.length;
    const tDone = tasks.filter((x) => isDone(x, date)).length + work.filter((w) => w.status === 'done').length;
    parts.push({ ...DAY_RULES[0], on: tTotal > 0, value: tTotal ? tDone / tTotal : 0, detail: tTotal ? `${tDone}/${tTotal} done` : 'Nothing scheduled' });
    const w = workoutOn(date);
    const training = w.dayK !== 'rest';
    parts.push({ ...DAY_RULES[1], on: training, value: w.finished ? 1 : w.total ? w.doneSets / w.total : 0, detail: training ? (w.finished ? 'Finished' : `${w.doneSets}/${w.total} sets`) : 'Rest day' });
    const f = foodOn(date);
    const nv = t ? 0.5 * Math.min(1, f.kcal / t.kcal) + 0.5 * Math.min(1, f.p / t.protein) : 0;
    parts.push({ ...DAY_RULES[2], on: !!t, value: nv, detail: t ? `${App.num(f.kcal)} kcal · ${f.p} g protein` : '' });
    const sm = studyMinOn(date);
    const target = S().settings.studyTarget || 120;
    parts.push({ ...DAY_RULES[3], on: true, value: Math.min(1, sm / target), detail: `${App.fmtMin(sm)} of ${App.fmtMin(target)}` });
    const sc = screenOn(date);
    parts.push({ ...DAY_RULES[4], on: !!sc, value: sc ? sc.value : 0, detail: sc ? `${Math.round(sc.value * 100)}% within limits` : 'Not logged' });
    const on = parts.filter((p) => p.on);
    const score = on.length ? Math.round((sum(on, (p) => p.weight * p.value) / sum(on, (p) => p.weight)) * 100) : 0;
    return { score, parts, taskPct: tTotal ? Math.round((tDone / tTotal) * 100) : null, tDone, tTotal };
  }
  App.dayScore = dayScore;

  /* ---------- progress helpers ---------- */
  function chapterState(id) { return (S().study.status[id] || {}).state || 'none'; }
  function sectionProgress(sec) {
    const v = sec.ch.map((c) => ({ done: 1, learning: 0.3 }[chapterState(c.id)] || 0));
    return sum(v) / v.length;
  }
  function partProgress(pk) {
    if (S().study.passed[pk]) return 1;
    const secs = App.CMA[pk].sections;
    return sum(secs, (s) => s.weight * sectionProgress(s)) / sum(secs, (s) => s.weight);
  }
  const cmaProgress = () => (partProgress('p1') + partProgress('p2')) / 2;
  function backlogProgress(k) {
    if (S().study.passed[k]) return 1;
    const units = (S().study.backlog || {})[k] || [];
    return units.length ? units.filter((u) => u.done).length / units.length : 0;
  }
  function skillProgress(id) {
    if (id === 'cma') return cmaProgress();
    const sk = App.SKILLS.find((s) => s.id === id);
    const st = S().career.skills[id] || {};
    const msDone = sk.msList.filter((m) => (st.milestones || {})[m.id]).length;
    return sk.msList.length ? msDone / sk.msList.length : 0;
  }
  function goalProgress(g) {
    if (g.done) return 1;
    if (g.milestones && g.milestones.length) return g.milestones.filter((m) => m.done).length / g.milestones.length;
    return (g.progress || 0) / 100;
  }
  Object.assign(App, { chapterState, sectionProgress, partProgress, cmaProgress, backlogProgress, skillProgress, goalProgress });

  /* ---------- weight analytics ---------- */
  function weightStats() {
    const w = S().body.weights;
    if (!w.length) return null;
    const avgBetween = (from, to) => {
      const xs = w.filter((x) => x.date >= from && x.date <= to);
      return xs.length ? sum(xs, (x) => x.kg) / xs.length : null;
    };
    const today = dkey();
    const last = w[w.length - 1];
    const wk = avgBetween(dkey(addDays(new Date(), -6)), today);
    const prevWk = avgBetween(dkey(addDays(new Date(), -13)), dkey(addDays(new Date(), -7)));
    const mo = avgBetween(dkey(addDays(new Date(), -29)), today);
    const prevMo = avgBetween(dkey(addDays(new Date(), -59)), dkey(addDays(new Date(), -30)));
    // trend: least-squares slope over the last 28 days (kg/day), needs >= 4 entries over >= 10 days
    const recent = w.filter((x) => App.daysBetween(x.date, today) <= 27);
    let slope = null;
    if (recent.length >= 4 && App.daysBetween(recent[0].date, recent[recent.length - 1].date) >= 10) {
      const xs = recent.map((x) => App.daysBetween(recent[0].date, x.date)), ys = recent.map((x) => x.kg);
      const mx = sum(xs) / xs.length, my = sum(ys) / ys.length;
      slope = sum(xs.map((x, i) => (x - mx) * (ys[i] - my))) / (sum(xs.map((x) => (x - mx) ** 2)) || 1);
    }
    const smooth = sum(w.slice(-3), (x) => x.kg) / Math.min(3, w.length);
    return { last, wk, prevWk, mo, prevMo, weekChange: wk != null && prevWk != null ? wk - prevWk : null, monthChange: mo != null && prevMo != null ? mo - prevMo : null, slope, perWeek: slope != null ? slope * 7 : null, smooth };
  }
  App.weightStats = weightStats;

  function calorieAdvice() {
    const ws = weightStats();
    const p = App.profile();
    if (!ws || ws.perWeek == null) return { cls: 'info', msg: 'Log your weight 3–4 mornings a week for 2 weeks. Advice uses the 28-day trend, not single days.' };
    const r = ws.perWeek;
    const f = (x) => (x >= 0 ? '+' : '') + x.toFixed(2);
    if (p.mode === 'bulk') {
      if (r < 0.15) return { cls: 'warn', delta: 200, msg: `Trend ${f(r)} kg/week, slower than the 0.25–0.5 target. Add ~200 kcal/day (e.g. a milk-banana-peanut shake).` };
      if (r > 0.6) return { cls: 'warn', delta: -150, msg: `Trend ${f(r)} kg/week, a bit fast (extra fat). Cut ~150 kcal/day.` };
      return { cls: 'ok', delta: 0, msg: `Trend ${f(r)} kg/week. Right on pace, keep calories the same.` };
    }
    if (p.mode === 'cut') {
      if (r > -0.2) return { cls: 'warn', delta: -150, msg: `Trend ${f(r)} kg/week. Reduce ~150 kcal/day.` };
      return { cls: 'ok', delta: 0, msg: `Trend ${f(r)} kg/week. Good fat-loss pace.` };
    }
    return { cls: Math.abs(r) < 0.15 ? 'ok' : 'warn', delta: 0, msg: `Trend ${f(r)} kg/week.` };
  }
  App.calorieAdvice = calorieAdvice;

  /* ---------- My Life Progress ---------- */
  const LIFE = [
    { key: 'fitness', label: 'Fitness', color: '#22c55e', grad: 'g-green', route: 'fitness', rule: '50% weight progress from your start weight to your current target + 50% workouts completed ÷ training days in the last 28 days.' },
    { key: 'career', label: 'Career', color: '#38bdf8', grad: 'g-sky', route: 'career', rule: 'Average progress of your 9 career skills (milestones completed; US CMA uses study progress).' },
    { key: 'education', label: 'Education', color: '#a78bfa', grad: 'g-violet', route: 'study', rule: '80% US CMA (chapters completed, weighted by exam %) + 20% B.Com backlog units.' },
    { key: 'finance', label: 'Money discipline', color: '#facc15', grad: 'g-warm', route: 'money', rule: 'This month: 60% staying within budget pace + 40% savings rate (20% of income saved = full marks).' },
    { key: 'productivity', label: 'Productivity', color: '#ef4444', grad: 'g-red', route: 'plan', rule: 'Average of your daily productivity scores over the last 7 days.' },
    { key: 'personal', label: 'Personal growth', color: '#f472b6', grad: 'g-pink', route: 'goals', rule: '60% average goal progress + 40% share of logged days in the last week where every app stayed under its high limit.' },
  ];
  App.LIFE = LIFE;

  function lifeProgress() {
    const st = S(), p = App.profile(), today = dkey();
    const out = {};
    // fitness
    const ws = weightStats();
    let wp = null;
    if (p && ws && p.targetWeight !== p.startWeight) wp = clamp((ws.smooth - p.startWeight) / (p.targetWeight - p.startWeight), 0, 1);
    const days28 = lastNDays(28).filter((d) => d >= st.created && d <= today);
    const trainDays = days28.filter((d) => App.isTrainingDay(d) && (d < today || workoutOn(d).finished));
    const doneDays = trainDays.filter((d) => workoutOn(d).finished);
    const cons = trainDays.length ? doneDays.length / trainDays.length : null;
    const fParts = [wp, cons].filter((x) => x != null);
    out.fitness = { value: fParts.length ? sum(fParts) / fParts.length : null, detail: `${wp != null ? Math.round(wp * 100) + '% to ' + p.targetWeight + ' kg' : 'Log weight'} · ${doneDays.length}/${trainDays.length} workouts` };
    // career
    out.career = { value: sum(App.SKILLS, (s) => skillProgress(s.id)) / App.SKILLS.length, detail: `${App.SKILLS.filter((s) => skillProgress(s.id) >= 1).length}/${App.SKILLS.length} skills complete` };
    // education
    const bl = (backlogProgress('bm') + backlogProgress('be')) / 2;
    out.education = { value: 0.8 * cmaProgress() + 0.2 * bl, detail: `CMA ${Math.round(cmaProgress() * 100)}% · backlog ${Math.round(bl * 100)}%` };
    // finance
    const mm = App.monthMoney();
    if (!mm.tx.length) out.finance = { value: null, detail: 'Add this month’s income & spends' };
    else {
      const d = new Date();
      const elapsed = d.getDate() / new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const pace = mm.budget * elapsed;
      const bh = mm.budget > 0 ? (mm.spent <= pace ? 1 : Math.max(0, 1 - (mm.spent - pace) / mm.budget)) : null;
      const sr = mm.income > 0 ? clamp((mm.income - mm.spent) / mm.income / 0.2, 0, 1) : null;
      const v = bh != null && sr != null ? 0.6 * bh + 0.4 * sr : bh != null ? bh : sr;
      out.finance = { value: v, detail: `${App.inr(mm.spent)} spent of ${App.inr(mm.budget)}${mm.income ? ` · saved ${Math.round(((mm.income - mm.spent) / mm.income) * 100)}%` : ''}` };
    }
    // productivity
    const days7 = lastNDays(7).filter((d) => d >= st.created);
    const ds = days7.map((d) => dayScore(d).score);
    out.productivity = { value: ds.length ? sum(ds) / ds.length / 100 : null, detail: `7-day average of ${ds.length} day${ds.length === 1 ? '' : 's'}` };
    // personal
    const gs = st.goals.map(goalProgress);
    const scr = lastNDays(7).map(screenOn).filter(Boolean);
    const gpart = gs.length ? sum(gs) / gs.length : null;
    const wpart = scr.length ? scr.filter((x) => x.allUnderHigh).length / scr.length : null;
    const pv = gpart != null && wpart != null ? 0.6 * gpart + 0.4 * wpart : gpart != null ? gpart : wpart;
    out.personal = { value: pv, detail: `${gs.length} goals${wpart != null ? ` · ${Math.round(wpart * 100)}% days under limits` : ''}` };
    const vals = Object.values(out).map((x) => x.value).filter((x) => x != null);
    return { cats: out, overall: vals.length ? sum(vals) / vals.length : 0 };
  }
  App.lifeProgress = lifeProgress;

  /* ---------- streaks ---------- */
  function streak(test, { skip = () => false } = {}) {
    const st = S();
    let n = 0;
    for (let i = 0; i < 400; i++) {
      const d = dkey(addDays(new Date(), -i));
      if (d < st.created) break;
      if (skip(d)) continue;
      const ok = test(d);
      if (ok) n++;
      else if (i === 0) continue; // today still in progress
      else break;
    }
    return n;
  }
  App.streaks = () => {
    const t = App.targets();
    return [
      { key: 'workout', label: 'Workout', icon: 'dumbbell', n: streak((d) => workoutOn(d).finished, { skip: (d) => !App.isTrainingDay(d) }), unit: 'sessions', rule: 'Consecutive training days completed (rest days skipped).' },
      { key: 'study', label: 'Study', icon: 'book', n: streak((d) => studyMinOn(d) > 0), unit: 'days', rule: 'Consecutive days with at least one study session.' },
      { key: 'protein', label: 'Protein', icon: 'flame', n: t ? streak((d) => foodOn(d).p >= t.protein) : 0, unit: 'days', rule: 'Consecutive days you hit your protein target.' },
      { key: 'screen', label: 'Screen', icon: 'shield', n: streak((d) => { const s = screenOn(d); return !!(s && s.allUnderHigh); }), unit: 'days', rule: 'Consecutive logged days where every app stayed under its high limit.' },
    ];
  };

  /* ---------- XP ---------- */
  App.XP_RULES = [
    ['Task or work item completed', 10], ['Workout finished', 50], ['Protein target hit (per day)', 20], ['Water goal hit (per day)', 10],
    ['Study: per 5 minutes (max 60/day)', 1], ['CMA chapter completed', 40], ['Chapter revision (max 3 each)', 15], ['Mock test logged', 30],
    ['Skill milestone', 30], ['Portfolio project completed', 60], ['Goal milestone', 75], ['Goal achieved', 200],
    ['Day with all apps under high limit', 15], ['Month finished within budget', 100],
  ];
  function xpBreakdown() {
    const st = S(), t = App.targets();
    const rows = [];
    const add = (label, n, each) => n && rows.push({ label, n, xp: n * each });
    const tdone = sum(st.tasks, (x) => (!x.recur || x.recur === 'none' ? (x.done ? 1 : 0) : Object.keys(x.doneDates || {}).length));
    add('Tasks completed', tdone + st.work.items.filter((w) => w.status === 'done').length, 10);
    add('Workouts finished', Object.values(st.gym.logs).filter((l) => l.finished).length, 50);
    const foodDays = [...new Set(st.food.log.map((x) => x.date))];
    if (t) add('Protein target days', foodDays.filter((d) => foodOn(d).p >= t.protein).length, 20);
    add('Water goal days', Object.values(st.body.water).filter((g) => g >= st.settings.waterGoal).length, 10);
    const studyDays = {};
    st.study.sessions.forEach((s) => (studyDays[s.date] = (studyDays[s.date] || 0) + s.minutes));
    const sxp = sum(Object.values(studyDays), (m) => Math.min(60, Math.floor(m / 5)));
    if (sxp) rows.push({ label: 'Study time', n: Math.round(sum(Object.values(studyDays)) / 60), unit: 'h', xp: sxp });
    const chs = Object.values(st.study.status);
    add('CMA chapters completed', chs.filter((c) => c.state === 'done').length, 40);
    add('Chapter revisions', sum(chs, (c) => Math.min(3, c.revisions || 0)), 15);
    add('Mock tests', st.study.mocks.length, 30);
    add('Skill milestones', sum(Object.values(st.career.skills), (s) => Object.keys(s.milestones || {}).length), 30);
    add('Portfolio projects done', st.career.portfolio.filter((p) => p.status === 'done').length, 60);
    add('Goal milestones', sum(st.goals, (g) => (g.milestones || []).filter((m) => m.done).length), 75);
    add('Goals achieved', st.goals.filter((g) => g.done).length, 200);
    add('Screen-time days under limits', Object.keys(st.social.logs).filter((d) => { const s = screenOn(d); return s && s.allUnderHigh; }).length, 15);
    const months = [...new Set(st.money.txns.map((x) => x.date.slice(0, 7)))].filter((m) => m < App.mkey());
    add('Months within budget', months.filter((m) => { const mm = App.monthMoney(m); return mm.budget > 0 && mm.spent <= mm.budget; }).length, 100);
    const total = sum(rows, (r) => r.xp);
    return { rows, total };
  }
  const levelFor = (xp) => Math.floor((1 + Math.sqrt(1 + (8 * xp) / 100)) / 2);
  const xpForLevel = (L) => (100 * L * (L - 1)) / 2;
  App.xp = () => {
    const b = xpBreakdown();
    const level = levelFor(b.total);
    const cur = xpForLevel(level), next = xpForLevel(level + 1);
    return { ...b, level, into: b.total - cur, need: next - cur, pct: (b.total - cur) / (next - cur) };
  };

  /* ---------- badges ---------- */
  App.BADGES = [
    { id: 'first-workout', name: 'First Rep', e: '🏋️', desc: 'Finish your first workout', test: (st) => Object.values(st.gym.logs).some((l) => l.finished) },
    { id: 'workouts-10', name: 'Iron Habit', e: '🔩', desc: 'Finish 10 workouts', test: (st) => Object.values(st.gym.logs).filter((l) => l.finished).length >= 10 },
    { id: 'w50', name: 'Half Century', e: '⚖️', desc: 'Reach 50 kg', test: () => App.currentWeight() >= 50 },
    { id: 'w55', name: 'Target 55', e: '🎯', desc: 'Reach 55 kg', test: () => App.currentWeight() >= 55 },
    { id: 'w60', name: 'Sixty Club', e: '💪', desc: 'Reach 60 kg', test: () => App.currentWeight() >= 60 },
    { id: 'mcq-100', name: '100 MCQs', e: '📝', desc: 'Attempt 100 practice questions', test: (st) => sum(st.study.sessions, (s) => s.attempted) >= 100 },
    { id: 'mcq-1000', name: 'MCQ Machine', e: '🤖', desc: 'Attempt 1,000 questions', test: (st) => sum(st.study.sessions, (s) => s.attempted) >= 1000 },
    { id: 'chapter-1', name: 'Chapter Closed', e: '📗', desc: 'Complete a CMA chapter', test: (st) => Object.values(st.study.status).some((c) => c.state === 'done') },
    { id: 'study-7', name: 'Week of Focus', e: '🔥', desc: '7-day study streak', test: () => App.streaks()[1].n >= 7 },
    { id: 'screen-7', name: 'Digital Discipline', e: '🧘', desc: '7-day under-limit streak', test: () => App.streaks()[3].n >= 7 },
    { id: 'portfolio-1', name: 'Builder', e: '🛠️', desc: 'Complete a portfolio project', test: (st) => st.career.portfolio.some((p) => p.status === 'done') },
    { id: 'milestone-1', name: 'Unlocked', e: '🔓', desc: 'Complete a goal milestone', test: (st) => st.goals.some((g) => (g.milestones || []).some((m) => m.done)) },
    { id: 'tasks-30', name: 'Closer', e: '✅', desc: 'Complete 30 tasks', test: (st) => sum(st.tasks, (x) => (!x.recur || x.recur === 'none' ? (x.done ? 1 : 0) : Object.keys(x.doneDates || {}).length)) + st.work.items.filter((w) => w.status === 'done').length >= 30 },
    { id: 'budget-month', name: 'Budget Boss', e: '💰', desc: 'Finish a month within budget', test: () => xpBreakdown().rows.some((r) => r.label === 'Months within budget') },
  ];
  App.earnedBadges = () => App.BADGES.filter((b) => { try { return b.test(S()); } catch (_) { return false; } });

  /** Called after each commit: celebrate newly earned badges / levels (only once each). */
  App.checkAchievements = () => {
    const st = S();
    if (!st.profile) return;
    const seen = st.seen || (st.seen = { badges: {}, level: 1 });
    const fresh = App.earnedBadges().filter((b) => !seen.badges[b.id]);
    const lv = App.xp().level;
    let changed = false;
    fresh.forEach((b) => { seen.badges[b.id] = dkey(); changed = true; });
    const levelUp = lv > (seen.level || 1);
    if (lv !== seen.level) { seen.level = lv; changed = true; }
    if (changed) App.save();
    if (fresh.length) App.unlockOverlay({ kind: 'badge', title: fresh[0].name, sub: fresh[0].desc, emoji: fresh[0].e });
    else if (levelUp) App.unlockOverlay({ kind: 'level', title: `Level ${lv}`, sub: 'Earned from recorded progress', emoji: '⭐' });
  };

  /** Seed `seen` silently so old progress does not trigger a flood of celebrations. */
  App.primeAchievements = () => {
    const st = S();
    st.seen = st.seen || { badges: {}, level: 1 };
    App.earnedBadges().forEach((b) => (st.seen.badges[b.id] = st.seen.badges[b.id] || dkey()));
    st.seen.level = Math.max(st.seen.level || 1, App.xp().level);
  };
})();
