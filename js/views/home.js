'use strict';
/* Dashboard: today at a glance + My Life Progress. */
(function () {
  const { icon, esc, inr, fmtMin, dkey, daysBetween, prettyDate } = App;

  function greeting() {
    const h = new Date().getHours();
    if (h < 5) return 'Late night';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Good night';
  }

  /** Upcoming items in the next 14 days across modules. */
  App.upcoming = (days = 14) => {
    const st = App.state, today = dkey(), end = App.dkey(App.addDays(new Date(), days));
    const out = [];
    st.tasks.filter((t) => (!t.recur || t.recur === 'none') && !t.done && t.date && t.date <= end).forEach((t) => out.push({ date: t.date, title: t.title, kind: 'Task', ic: 'list', r: 'plan' }));
    st.work.items.filter((w) => w.status !== 'done' && w.due && w.due <= end).forEach((w) => out.push({ date: w.due, title: w.title, kind: App.WORK_KINDS[w.kind].label, ic: 'brief', r: 'work' }));
    st.goals.filter((g) => !g.done).forEach((g) => {
      if (g.deadline && g.deadline <= end) out.push({ date: g.deadline, title: g.title, kind: 'Goal', ic: 'target', r: 'goals' });
      (g.milestones || []).filter((m) => !m.done && m.due && m.due <= end).forEach((m) => out.push({ date: m.due, title: m.title, kind: 'Milestone', ic: 'flag', r: 'goals' }));
    });
    Object.entries(st.study.exams).forEach(([k, d]) => d && d >= today && d <= App.dkey(App.addDays(new Date(), 60)) && out.push({ date: d, title: `${k === 'p1' ? 'CMA Part 1' : k === 'p2' ? 'CMA Part 2' : App.BACKLOG[k].name} exam`, kind: 'Exam', ic: 'graduation', r: 'study' }));
    const mk = App.mkey();
    st.money.recurring.filter((r) => r.active !== false && !(r.paid || {})[mk]).forEach((r) => {
      const d = `${mk}-${String(Math.min(28, r.day)).padStart(2, '0')}`;
      if (d <= end) out.push({ date: d, title: `${r.name} · ${inr(r.amount)}`, kind: 'Bill', ic: 'repeat', r: 'money' });
    });
    return out.sort((a, b) => a.date.localeCompare(b.date));
  };

  function render() {
    const st = App.state, p = App.profile(), t = App.targets(), today = dkey(), d = new Date();
    const ds = App.dayScore(today);
    const lp = App.lifeProgress();
    const food = App.foodOn(today);
    const water = st.body.water[today] || 0;
    const ws = App.weightStats();
    const cur = App.currentWeight();
    const dayK = App.WEEK[d.getDay()], day = App.DAYS[dayK], wo = App.workoutOn(today);
    const studyMin = App.studyMinOn(today), studyT = st.settings.studyTarget;
    const cma = App.cmaProgress();
    const nextExam = Object.entries(st.study.exams).filter(([, v]) => v && v >= today).sort((a, b) => a[1].localeCompare(b[1]))[0];
    const work = st.work.items.filter((w) => w.status !== 'done');
    const approvals = work.filter((w) => w.kind === 'approval').length;
    const mm = App.monthMoney();
    const spentToday = App.sum(mm.tx.filter((x) => x.date === today && x.type === 'expense'), (x) => x.amount) - App.sum(mm.tx.filter((x) => x.date === today && x.type === 'refund'), (x) => x.amount);
    const soc = App.socialToday();
    const socAlerts = soc.filter((a) => a.status !== 'ok');
    const streaks = App.streaks();
    const up = App.upcoming(14).slice(0, 5);
    const xp = App.xp();
    const nowBlock = App.currentBlock();
    const budgetPct = mm.budget ? mm.spent / mm.budget : 0;

    const alerts = [
      ...socAlerts.map((a) => ({ cls: a.status === 'over' ? 'over' : 'warn', ic: a.status === 'over' ? 'alert' : 'bell', r: 'social',
        t: `${esc(a.name)}: ${fmtMin(a.mins)}`, s: a.status === 'over' ? `Crossed your max limit of ${fmtMin(a.high)}` : `Passed low limit (${fmtMin(a.low)}). ${fmtMin(a.high - a.mins)} left` })),
      ...(budgetPct >= 0.8 ? [{ cls: budgetPct >= 1 ? 'over' : 'warn', ic: 'wallet', r: 'money', t: budgetPct >= 1 ? 'Monthly budget crossed' : `${Math.round(budgetPct * 100)}% of budget used`, s: `${inr(mm.spent)} of ${inr(mm.budget)}` }] : []),
    ];

    return `
      ${App.header(`${greeting()}, <span class="grad-text">${esc(App.firstName())}</span>`, `${App.DOW_FULL[d.getDay()]}, ${d.getDate()} ${App.MON[d.getMonth()]} · <span data-clock>${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</span>`,
        `<button class="lvl-chip" data-act="go" data-r="xp" aria-label="Level ${xp.level}">${icon('star')}Lv ${xp.level}</button><button class="icon-btn lg" data-act="go" data-r="settings" aria-label="Settings">${icon('user')}</button>`)}

      ${nowBlock ? `<button class="now-strip reveal" style="--i:1" data-act="go" data-r="plan" data-tab="today"><span class="pulse-dot"></span><span><small class="muted">Now</small> <b>${esc(nowBlock.title)}</b></span><small class="muted">${App.fmtTime(nowBlock.start)}–${App.fmtTime(nowBlock.end)}</small>${icon('right')}</button>` : ''}

      ${alerts.length ? `<section class="alert-stack reveal" style="--i:1">${alerts.map((a) => `<button class="alert alert-${a.cls}" data-act="go" data-r="${a.r}">
          <span class="alert-ic">${icon(a.ic)}</span><span class="alert-txt"><b>${a.t}</b><small>${a.s}</small></span>${icon('right')}</button>`).join('')}</section>` : ''}

      <div class="dash-grid">
      <section class="card hero today-card reveal" style="--i:2">
        <div class="hero-main">
          ${App.ring(ds.score / 100, { size: 132, stroke: 12, grad: ds.score >= 70 ? 'g-green' : ds.score >= 40 ? 'g-sky' : 'g-red', key: 'dayscore', label: App.count(ds.score, { key: 'dayscore' }), sub: 'Today score' })}
          <div class="hero-side">
            <div class="mini-stat"><span class="dot" style="--c:#38bdf8"></span><div><b>${ds.taskPct == null ? '—' : App.count(ds.taskPct, { suffix: '%', key: 'taskpct' })}</b><small>Tasks · ${ds.tDone}/${ds.tTotal}</small></div></div>
            <div class="mini-stat"><span class="dot" style="--c:#a78bfa"></span><div><b>${fmtMin(studyMin)}</b><small>Study / ${fmtMin(studyT)}</small></div></div>
            <div class="mini-stat"><span class="dot" style="--c:#22c55e"></span><div><b>${wo.finished ? 'Done' : dayK === 'rest' ? 'Rest' : `${wo.doneSets}/${wo.total}`}</b><small>${dayK === 'rest' ? 'Recovery day' : 'Workout sets'}</small></div></div>
          </div>
        </div>
        <button class="link mt12" data-act="scoreInfo">${icon('info')}How is this score calculated?</button>
      </section>

      <section class="card life-card reveal" style="--i:3">
        <div class="card-head"><h3>${icon('spark')}My Life Progress</h3><button class="link" data-act="lifeInfo">Rules ${icon('info')}</button></div>
        <div class="life-wrap">
          ${App.multiRing(App.LIFE.map((c) => ({ value: lp.cats[c.key].value, grad: c.grad })), { size: 200, stroke: 11, gap: 4, act: 'lifeRing', key: 'life',
            center: `<b class="life-num">${App.count(Math.round(lp.overall * 100), { key: 'life' })}</b><small>overall</small>` })}
          <div class="life-legend">${App.LIFE.map((c) => { const v = lp.cats[c.key].value; return `
            <button class="life-row" data-act="go" data-r="${c.route}"><i style="--c:${c.color}"></i><span class="grow ta-l">${c.label}</span><b>${v == null ? '—' : Math.round(v * 100) + '%'}</b></button>`; }).join('')}</div>
        </div>
      </section>
      </div>

      <section class="grid2">
        <button class="card tile reveal" style="--i:4" data-act="go" data-r="fitness" data-tab="food">
          <div class="tile-top"><span class="tile-ic g-warm">${icon('food')}</span><small class="muted">${t ? Math.round((food.kcal / t.kcal) * 100) : 0}%</small></div>
          <b class="tile-title">${App.count(food.kcal, { key: 'kcal' })} <small>kcal</small></b>
          <small class="muted">of ${App.num(t.kcal)} · ${food.p}/${t.protein} g protein</small>
          ${App.bar(food.kcal / t.kcal, 'warm', 'thin', 'kcalbar')}${App.bar(food.p / t.protein, 'sky', 'thin', 'pbar')}
        </button>
        <button class="card tile reveal" style="--i:5" data-act="addWater">
          <div class="tile-top"><span class="tile-ic g-blue">${icon('drop')}</span><span class="badge">+250 ml</span></div>
          <b class="tile-title">${App.count(water * 0.25, { dec: 2, key: 'water' })} <small>L</small></b>
          <small class="muted">of ${(st.settings.waterGoal * 0.25).toFixed(1)} L · tap to add</small>
          ${App.bar(water / st.settings.waterGoal, 'blue', 'thin', 'waterbar')}
        </button>
        <button class="card tile reveal" style="--i:6" data-act="go" data-r="fitness" data-tab="body">
          <div class="tile-top"><span class="tile-ic g-sky">${icon('scale')}</span>${ws && ws.perWeek != null ? `<span class="badge ${ws.perWeek >= 0 ? 'ok' : 'warn'}">${ws.perWeek >= 0 ? '+' : ''}${ws.perWeek.toFixed(2)}/wk</span>` : ''}</div>
          <b class="tile-title">${App.count(cur, { dec: 1, key: 'weight' })} <small>kg</small></b>
          <small class="muted">Target ${p.targetWeight} kg · ${Math.max(0, p.targetWeight - cur).toFixed(1)} to go</small>
          ${App.bar(App.clamp((cur - p.startWeight) / ((p.targetWeight - p.startWeight) || 1), 0, 1), 'green', 'thin', 'wbar')}
        </button>
        <button class="card tile reveal" style="--i:7" data-act="go" data-r="fitness" data-tab="workout">
          <div class="tile-top"><span class="tile-ic ${day.color}">${icon(dayK === 'rest' ? 'moon' : 'dumbbell')}</span>${wo.finished ? `<span class="badge ok">${icon('check')}Done</span>` : `<span class="badge">Today</span>`}</div>
          <b class="tile-title">${esc(day.name)}</b>
          <small class="muted">${dayK === 'rest' ? 'Walk, stretch, eat well' : `${day.list.length} exercises · ~${Math.round(App.sum(day.list, (e) => e.sets * (e.rest + 40)) / 60)} min`}</small>
        </button>
        <button class="card tile reveal" style="--i:8" data-act="go" data-r="study">
          <div class="tile-top"><span class="tile-ic g-violet">${icon('graduation')}</span>${nextExam ? `<span class="badge">${daysBetween(today, nextExam[1])}d to exam</span>` : '<span class="badge">US CMA</span>'}</div>
          <b class="tile-title">${App.count(Math.round(cma * 100), { suffix: '%', key: 'cma' })}</b>
          <small class="muted">CMA syllabus · ${fmtMin(studyMin)} today</small>
          ${App.bar(cma, 'violet', 'thin', 'cmabar')}
        </button>
        <button class="card tile reveal" style="--i:9" data-act="go" data-r="work">
          <div class="tile-top"><span class="tile-ic g-red">${icon('brief')}</span>${approvals ? `<span class="badge warn">${approvals} approval${approvals > 1 ? 's' : ''}</span>` : ''}</div>
          <b class="tile-title">${work.length} <small>pending</small></b>
          <small class="muted">${work.filter((w) => w.due && w.due <= today).length} due today or overdue</small>
        </button>
      </section>

      <section class="card reveal" style="--i:10">
        <div class="card-head"><h3>${icon('wallet')}${App.MON[d.getMonth()]} money</h3><button class="link" data-act="go" data-r="money">Details ${icon('right')}</button></div>
        <div class="stat-row three">
          ${App.stat('Income', `<span class="pos">${App.count(mm.income, { prefix: '₹', key: 'inc' })}</span>`)}
          ${App.stat('Expenses', App.count(mm.spent, { prefix: '₹', key: 'exp' }))}
          ${App.stat(mm.left >= 0 ? 'Budget left' : 'Over budget', `<span class="${mm.left < 0 ? 'neg' : ''}">${App.count(Math.abs(mm.left), { prefix: '₹', key: 'left' })}</span>`)}
        </div>
        ${App.bar(budgetPct, budgetPct >= 1 ? 'red' : budgetPct >= 0.8 ? 'warm' : 'green', `mt12 ${budgetPct >= 1 ? 'bar-bad' : budgetPct >= 0.8 ? 'bar-warn' : ''}`, 'budget')}
        <div class="row between small mt8"><span class="muted">Today ${inr(spentToday)} of ${inr(st.settings.dailySpendLimit)} limit</span><span class="${spentToday > st.settings.dailySpendLimit ? 'neg' : 'muted'}">${spentToday > st.settings.dailySpendLimit ? 'Over daily limit' : `Safe ${inr(Math.max(0, mm.perDay))}/day`}</span></div>
      </section>

      <section class="grid2">
        <button class="card tile reveal" style="--i:11" data-act="go" data-r="social">
          <div class="tile-top"><span class="tile-ic g-pink">${icon('phone')}</span><span class="badge ${socAlerts.some((a) => a.status === 'over') ? 'bad' : socAlerts.length ? 'warn' : 'ok'}">${socAlerts.length ? socAlerts.length + ' alert' + (socAlerts.length > 1 ? 's' : '') : 'On track'}</span></div>
          <b class="tile-title">${fmtMin(App.sum(soc, (a) => a.mins))}</b><small class="muted">Screen time today</small>
        </button>
        <button class="card tile reveal" style="--i:12" data-act="go" data-r="goals">
          <div class="tile-top"><span class="tile-ic g-accent">${icon('target')}</span><span class="badge">${st.goals.filter((g) => !g.done).length} active</span></div>
          <b class="tile-title">${App.count(xp.total, { key: 'xp' })} <small>XP</small></b><small class="muted">Level ${xp.level} · ${xp.need - xp.into} XP to next</small>
          ${App.bar(xp.pct, 'accent', 'thin', 'xpbar')}
        </button>
      </section>

      <section class="card reveal" style="--i:13">
        <div class="card-head"><h3>${icon('flame')}Streaks</h3><button class="link" data-act="streakInfo">${icon('info')}</button></div>
        <div class="streaks">${streaks.map((s) => `<div class="streak ${s.n ? 'on' : ''}"><span>${icon(s.icon)}</span><b>${s.n}</b><small>${s.label}</small></div>`).join('')}</div>
      </section>

      <section class="card reveal" style="--i:14">
        <div class="card-head"><h3>${icon('cal')}Upcoming deadlines</h3><button class="link" data-act="go" data-r="plan" data-tab="calendar">Calendar ${icon('right')}</button></div>
        ${up.length ? up.map((u) => { const n = daysBetween(today, u.date); return `<button class="up-row" data-act="go" data-r="${u.r}"><span class="tile-ic sm g-sky">${icon(u.ic)}</span>
          <span class="grow ta-l"><b>${esc(u.title)}</b><small class="muted block">${u.kind} · ${prettyDate(u.date)}</small></span>
          <span class="pill ${n < 0 ? 'bad' : n <= 2 ? 'warn' : ''}">${n < 0 ? `${-n}d late` : n === 0 ? 'Today' : `${n}d`}</span></button>`; }).join('') : '<p class="muted small">Nothing due in the next 2 weeks.</p>'}
      </section>

      <section class="card coach-tip reveal" style="--i:15">
        <span class="tile-ic g-accent">${icon('spark')}</span>
        <div><b>Coach tip</b><p>${esc(App.COACH_TIPS[d.getDate() % App.COACH_TIPS.length])}</p></div>
      </section>`;
  }

  /* ---------- explanation sheets ---------- */
  App.actions.scoreInfo = () => {
    const ds = App.dayScore();
    App.sheet({
      title: "Today's score",
      body: `<p class="muted small">Weighted average of the parts that apply today. Parts that don't apply (rest day, screen time not logged) are left out, not counted as zero.</p>
        <div class="score-rows">${ds.parts.map((p) => `<div class="score-row ${p.on ? '' : 'off'}">
          <div class="row between"><b>${p.label} <small class="muted">· weight ${p.weight}</small></b><b>${p.on ? Math.round(p.value * 100) + '%' : 'n/a'}</b></div>
          ${App.bar(p.on ? p.value : 0, p.value >= 0.7 ? 'green' : 'sky', 'thin')}
          <small class="muted">${esc(p.detail)}. ${esc(p.rule)}</small></div>`).join('')}</div>
        <div class="total-row"><span>Score</span><b>${ds.score}</b></div>`,
    });
  };
  App.actions.lifeInfo = () => {
    const lp = App.lifeProgress();
    App.sheet({
      title: 'My Life Progress rules',
      body: `<p class="muted small">Each ring is calculated from what you record. "—" means there isn't enough data yet. Overall = average of rings with data.</p>
        ${App.LIFE.map((c) => { const v = lp.cats[c.key]; return `<button class="score-row tap" data-act="go" data-r="${c.route}">
          <div class="row between"><b><i class="legend-dot" style="--c:${c.color}"></i>${c.label}</b><b>${v.value == null ? '—' : Math.round(v.value * 100) + '%'}</b></div>
          <small class="block">${esc(v.detail)}</small><small class="muted block">${esc(c.rule)}</small></button>`; }).join('')}`,
    });
  };
  App.actions.streakInfo = () => App.sheet({ title: 'Streak rules', body: App.streaks().map((s) => `<div class="score-row"><div class="row between"><b>${s.label}</b><b>${s.n} ${s.unit}</b></div><small class="muted">${s.rule} Today does not break a streak until the day is over.</small></div>`).join('') });

  /** Tap on a concentric ring: work out which ring from the distance to the centre. */
  App.actions.lifeRing = (el, e) => {
    const r = el.getBoundingClientRect();
    const size = +el.dataset.size, stroke = +el.dataset.stroke, gap = +el.dataset.gap;
    const dist = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) * (size / r.width);
    const idx = Math.floor((size / 2 - dist) / (stroke + gap));
    const cat = App.LIFE[idx];
    if (cat && dist <= size / 2) { App.buzz(); App.go(cat.route); }
  };

  /* ---------- quick logs used by FAB and tiles ---------- */
  App.actions.addWater = () => {
    const t = dkey(), w = App.state.body;
    w.water[t] = (w.water[t] || 0) + 1;
    App.buzz();
    if (w.water[t] === App.state.settings.waterGoal) { App.confetti(); App.toast('Water goal reached! +10 XP', 'xp'); }
    else App.toast(`+250 ml · ${(w.water[t] * 0.25).toFixed(2)} L today`);
    App.commit();
  };
  App.actions.quickWeight = () => {
    const last = App.currentWeight();
    App.sheet({
      title: 'Log body weight',
      body: `${App.field('Weight (kg)', App.input('kg', { type: 'number', value: last, min: 30, max: 200, step: 0.1, required: true, inputmode: 'decimal' }), 'Morning, after the toilet, before eating. Trends use averages, so daily ups and downs are fine.')}
        ${App.field('Date', App.input('date', { type: 'date', value: dkey(), max: dkey() }))}`,
      onSubmit: (d) => {
        const kg = Math.round(+d.kg * 10) / 10;
        if (!(kg >= 30 && kg <= 200)) return App.toast('Enter a weight between 30 and 200 kg', 'bad'), false;
        App.logWeight(kg, d.date || dkey());
        App.toast(`Logged ${kg} kg`);
        App.commit();
      },
    });
  };
  App.logWeight = (kg, date = dkey()) => {
    const w = App.state.body.weights;
    const ex = w.find((x) => x.date === date);
    if (ex) ex.kg = kg; else w.push({ date, kg });
    w.sort((a, b) => a.date.localeCompare(b.date));
  };

  App.views.home = { render };
})();
