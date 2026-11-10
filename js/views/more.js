'use strict';
/* More menu, XP & badges, Settings (profile, schedule & targets, reminders, motion, data management). */
(function () {
  const { icon, esc, dkey, lastNDays, sum } = App;
  App.VERSION = '2.0.0';
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; });

  /* ---------- More ---------- */
  function renderMore() {
    const st = App.state;
    const tiles = [
      ['study', 'graduation', 'g-violet', 'Study · CMA', `${Math.round(App.cmaProgress() * 100)}% syllabus`],
      ['work', 'brief', 'g-red', 'Work', `${st.work.items.filter((w) => w.status !== 'done').length} pending`],
      ['career', 'up', 'g-sky', 'Career', `${Math.round((App.SKILLS.reduce((a, s) => a + App.skillProgress(s.id), 0) / App.SKILLS.length) * 100)}% skills`],
      ['goals', 'target', 'g-accent', 'Goals', `${st.goals.filter((g) => !g.done).length} active`],
      ['social', 'phone', 'g-pink', 'Screen time', `${App.fmtMin(sum(App.socialToday(), (a) => a.mins))} today`],
      ['xp', 'trophy', 'g-warm', 'XP & badges', `Level ${App.xp().level}`],
      ['settings', 'settings', 'g-blue', 'Settings', 'Profile, data, backup'],
    ];
    return `${App.header('More', 'All modules')}
      <div class="more-grid">${tiles.map(([r, ic, g, t, s], i) => `<button class="card tile more-tile reveal" style="--i:${i + 1}" data-act="go" data-r="${r}"><span class="tile-ic ${g}">${icon(ic)}</span><b>${t}</b><small class="muted">${s}</small></button>`).join('')}</div>`;
  }

  /* ---------- XP ---------- */
  function renderXp() {
    const xp = App.xp(), earned = App.earnedBadges().map((b) => b.id);
    const thisW = lastNDays(7).filter((d) => d >= App.state.created).map((d) => App.dayScore(d).score);
    const prevW = lastNDays(7, App.addDays(new Date(), -7)).filter((d) => d >= App.state.created).map((d) => App.dayScore(d).score);
    const avg = (a) => (a.length ? Math.round(sum(a) / a.length) : null);
    const days = lastNDays(7).map((d) => ({ label: App.DOW[App.parseD(d).getDay()][0], value: d >= App.state.created ? App.dayScore(d).score : 0, cls: 'grad-sky', on: d === dkey() }));
    return `${App.header('XP & badges', 'Rewards for recorded progress')}
      <section class="card hero reveal" style="--i:1"><div class="hero-main">
        ${App.ring(xp.pct, { size: 120, stroke: 12, grad: 'g-accent', key: 'lvl', label: `<b class="life-num">${xp.level}</b>`, sub: 'level' })}
        <div class="hero-side"><b class="big">${App.count(xp.total, { key: 'xptotal' })} XP</b><small class="muted">${xp.need - xp.into} XP to level ${xp.level + 1}</small><small class="muted">Levels: L2 at 100 XP, L3 at 300, L4 at 600…</small></div></div></section>
      <section class="card reveal" style="--i:2"><div class="card-head"><h3>${icon('chart')}Weekly performance</h3><span class="badge">${avg(thisW) ?? '—'} avg${avg(prevW) != null && avg(thisW) != null ? ` · ${avg(thisW) - avg(prevW) >= 0 ? '▲' : '▼'}${Math.abs(avg(thisW) - avg(prevW))}` : ''}</span></div>
        ${App.barChart(days, { height: 110, max: 100, fmt: (v) => v })}<small class="muted">Daily productivity score, last 7 days vs the week before.</small></section>
      <section class="card reveal" style="--i:3"><div class="card-head"><h3>${icon('award')}Badges</h3><span class="muted small">${earned.length}/${App.BADGES.length}</span></div>
        <div class="badges">${App.BADGES.map((b) => `<div class="bdg ${earned.includes(b.id) ? 'on' : ''}"><span>${earned.includes(b.id) ? b.e : '🔒'}</span><b>${b.name}</b><small>${b.desc}</small></div>`).join('')}</div></section>
      <section class="card reveal" style="--i:4"><div class="card-head"><h3>${icon('star')}Where your XP came from</h3></div>
        ${xp.rows.length ? xp.rows.map((r) => `<div class="shop-row"><span>${r.label}<small class="muted block">${r.n}${r.unit ? ' ' + r.unit : '×'}</small></span><b>${App.num(r.xp)} XP</b></div>`).join('') : '<p class="muted small">Complete tasks, workouts, study sessions and milestones to earn XP.</p>'}</section>
      <section class="card reveal" style="--i:5"><div class="card-head"><h3>${icon('info')}XP rules</h3></div>
        <p class="muted small">XP is recalculated from your records every time, so un-ticking something removes its XP. Taps and page views never earn points.</p>
        ${App.XP_RULES.map(([l, x]) => `<div class="row between small rule-row"><span>${l}</span><b>${x} XP</b></div>`).join('')}</section>`;
  }

  /* ---------- Settings ---------- */
  function renderSettings() {
    const p = App.profile(), s = App.state.settings;
    const [ft, inch] = App.cmToFtIn(p.heightCm);
    return `${App.header('Settings', `LifeOS ${App.VERSION}`)}
      <section class="card reveal" style="--i:1"><div class="card-head"><h3>${icon('user')}Profile</h3><button class="link" data-act="editProfile">${icon('edit')}Edit</button></div>
        <div class="profile-row"><span class="avatar">${esc((p.name || '?')[0])}</span><div><b>${esc(p.name)}</b><small class="muted block">${p.age} yrs · ${ft}'${inch}" · ${esc(p.location || 'Location not set')}</small></div></div>
        <div class="kv mt12"><span>Education</span><b>${esc(p.education || '—')}</b><span>Qualification</span><b>${esc(p.qualification || '—')}</b><span>Career direction</span><b>${esc(p.career || '—')}</b><span>Work</span><b>${esc([p.role, p.employer].filter(Boolean).join(' · ') || '—')}</b>
          <span>Weight plan</span><b>${p.startWeight} → ${p.targetWeight} → ${p.finalWeight} kg</b><span>Goal mode</span><b>${App.GOAL_MODES[p.mode].label}</b></div></section>
      <section class="card reveal" style="--i:2"><div class="card-head"><h3>${icon('target')}Daily targets & limits</h3><button class="link" data-act="editTargets">${icon('edit')}Edit</button></div>
        <div class="kv"><span>Study target</span><b>${App.fmtMin(s.studyTarget)}/day</b><span>Water goal</span><b>${(s.waterGoal * 0.25).toFixed(1)} L (${s.waterGoal} glasses)</b><span>Step goal</span><b>${App.num(s.stepGoal)}</b>
          <span>Monthly budget</span><b>${App.inr(App.state.money.monthly)}</b><span>Daily spend limit</span><b>${App.inr(s.dailySpendLimit)}</b></div>
        <button class="btn btn-ghost btn-block mt12" data-act="go" data-r="plan" data-tab="routine">${icon('clock')}Edit daily schedule & work hours</button></section>
      <section class="card reveal" style="--i:3"><div class="card-head"><h3>${icon('settings')}Experience</h3></div>
        <label class="toggle-row"><input type="checkbox" data-change="setReminders" ${s.reminders ? 'checked' : ''}><span>Task & routine reminders<small class="muted block">Shown while LifeOS is open or recently used. Phones may delay background alerts; real alarms need a native app.</small></span></label>
        <label class="toggle-row"><input type="checkbox" data-change="setMotion" ${s.motion === 'reduced' ? 'checked' : ''}><span>Reduce motion<small class="muted block">Turns off animations and haptics. Your system setting is also respected.</small></span></label>
        <label class="toggle-row"><input type="checkbox" data-change="setSplash" ${s.splash !== false ? 'checked' : ''}><span>Show splash screen on launch</span></label>
        ${installEvt ? `<button class="btn btn-primary btn-block mt12" data-act="installApp">${icon('download')}Install LifeOS on this device</button>` : `<p class="muted small mt8">${window.matchMedia('(display-mode: standalone)').matches ? '✅ Running as an installed app.' : 'To install: Chrome ⋮ → Install app, or Safari Share → Add to Home Screen.'}</p>`}</section>
      <section class="card reveal" style="--i:4"><div class="card-head"><h3>${icon('shield')}Your data</h3></div>
        <p class="muted small">Stored only on this device (${App.storage === 'idb' ? 'IndexedDB' : 'localStorage fallback'}). No login, no analytics, nothing is uploaded.</p>
        <p class="small mt8" id="storeInfo">Checking storage…</p>
        <div class="row gap mt12"><button class="btn btn-soft grow" data-act="exportAll">${icon('download')}Backup (JSON)</button><label class="btn btn-ghost grow">${icon('upload')}Restore<input type="file" accept="application/json,.json" data-change="importAll" hidden></label></div>
        <button class="btn btn-ghost btn-block mt8" data-act="persistStorage">${icon('shield')}Protect data from browser cleanup</button>
        <h4 class="group-title">Export reports (CSV)</h4>
        <div class="csv-grid">${[['transactions', 'Transactions'], ['food', 'Food log'], ['weights', 'Weight'], ['study', 'Study sessions'], ['timesheet', 'Timesheet'], ['tasks', 'Tasks'], ['screen', 'Screen time'], ['workouts', 'Workouts']].map(([k, l]) => `<button class="pchip" data-act="exportCsv" data-k="${k}">${icon('download')}${l}</button>`).join('')}</div>
        <div class="divider"></div>
        <button class="btn btn-ghost danger btn-block" data-act="resetAll">${icon('trash')}Erase all data</button></section>
      <p class="muted small ta-c">Made for ${esc(App.firstName())} · LifeOS ${App.VERSION} · local-first PWA</p>`;
  }

  /* ---------- actions ---------- */
  App.actions.editProfile = () => {
    const p = App.profile();
    const [ft, inch] = App.cmToFtIn(p.heightCm);
    App.sheet({
      title: 'Edit profile',
      cls: 'sheet-tall',
      body: `${App.field('Name', App.input('name', { value: p.name, required: true }))}
        <div class="grid3">${App.field('Age', App.input('age', { type: 'number', value: p.age, min: 13, max: 80, inputmode: 'numeric' }))}${App.field('Height ft', App.input('ft', { type: 'number', value: ft, min: 4, max: 7, inputmode: 'numeric' }))}${App.field('in', App.input('inch', { type: 'number', value: inch, min: 0, max: 11, inputmode: 'numeric' }))}</div>
        ${App.field('Gender', App.chips('gender', [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }], p.gender))}
        ${App.field('Location', App.input('location', { value: p.location, placeholder: 'City, State, Country' }))}
        <div class="grid2">${App.field('Education', App.input('education', { value: p.education, placeholder: 'e.g. B.Com General' }))}${App.field('Qualification', App.input('qualification', { value: p.qualification, placeholder: 'e.g. US CMA Candidate' }))}</div>
        ${App.field('Career direction', App.input('career', { value: p.career, placeholder: 'e.g. Finance Analyst / FP&A' }))}
        <div class="grid2">${App.field('Role', App.input('role', { value: p.role, placeholder: 'e.g. Accounts & Finance' }))}${App.field('Employer', App.input('employer', { value: p.employer }))}</div>
        <h4 class="group-title">Fitness</h4>
        <div class="grid3">${App.field('Start kg', App.input('startWeight', { type: 'number', value: p.startWeight, step: 0.1, inputmode: 'decimal' }))}${App.field('Target kg', App.input('targetWeight', { type: 'number', value: p.targetWeight, step: 0.5, inputmode: 'decimal' }))}${App.field('Final kg', App.input('finalWeight', { type: 'number', value: p.finalWeight, step: 0.5, inputmode: 'decimal' }))}</div>
        ${App.field('Activity', App.chips('activity', App.ACTIVITY.map((a) => ({ value: a.id, label: `${a.label}<small>${a.note}</small>` })), p.activity))}
        ${App.field('Goal mode', App.chips('mode', Object.entries(App.GOAL_MODES).map(([k, v]) => ({ value: k, label: v.label })), p.mode))}
        ${App.field('Calorie adjustment (kcal)', App.input('calorieAdjust', { type: 'number', value: p.calorieAdjust || 0, step: 50, inputmode: 'numeric' }), 'From trend advice; 0 = formula only.')}
        <p class="field-hint">Current weight comes from your latest weight log. Log weight from Fitness → Body.</p>`,
      onSubmit: (d) => {
        const n = (v, a, b, def) => App.clamp(+v || def, a, b);
        Object.assign(p, {
          name: d.name.trim().slice(0, 30) || p.name, age: n(d.age, 13, 80, p.age), heightCm: Math.round((n(d.ft, 4, 7, 5) * 12 + App.clamp(+d.inch || 0, 0, 11)) * 2.54 * 10) / 10,
          gender: d.gender === 'female' ? 'female' : 'male', location: (d.location || '').slice(0, 60), education: (d.education || '').slice(0, 60), qualification: (d.qualification || '').slice(0, 60),
          career: (d.career || '').slice(0, 80), role: (d.role || '').slice(0, 60), employer: (d.employer || '').slice(0, 60),
          startWeight: n(d.startWeight, 30, 200, p.startWeight), targetWeight: n(d.targetWeight, 30, 200, p.targetWeight), finalWeight: n(d.finalWeight, 30, 200, p.finalWeight),
          activity: +d.activity || p.activity, mode: App.GOAL_MODES[d.mode] ? d.mode : p.mode, calorieAdjust: App.clamp(Math.round(+d.calorieAdjust || 0), -1000, 1000),
        });
        App.toast('Profile updated');
        App.commit();
      },
    });
  };
  App.actions.editTargets = () => {
    const s = App.state.settings;
    App.sheet({
      title: 'Targets & limits',
      body: `<div class="grid2">${App.field('Study target (min/day)', App.input('studyTarget', { type: 'number', value: s.studyTarget, min: 10, max: 720, inputmode: 'numeric' }))}${App.field('Water goal (250 ml glasses)', App.input('waterGoal', { type: 'number', value: s.waterGoal, min: 4, max: 24, inputmode: 'numeric' }))}</div>
        <div class="grid2">${App.field('Step goal', App.input('stepGoal', { type: 'number', value: s.stepGoal, min: 1000, max: 50000, inputmode: 'numeric' }))}${App.field('Daily spend limit (₹)', App.input('daily', { type: 'number', value: s.dailySpendLimit, min: 0, inputmode: 'numeric' }))}</div>
        ${App.field('Monthly budget (₹)', App.input('monthly', { type: 'number', value: App.state.money.monthly, min: 0, inputmode: 'numeric' }))}`,
      onSubmit: (d) => {
        s.studyTarget = App.clamp(+d.studyTarget || 120, 10, 720);
        s.waterGoal = App.clamp(Math.round(+d.waterGoal || 12), 4, 24);
        s.stepGoal = App.clamp(Math.round(+d.stepGoal || 8000), 1000, 50000);
        s.dailySpendLimit = Math.max(0, Math.round(+d.daily || 0));
        App.state.money.monthly = Math.max(0, Math.round(+d.monthly || 0));
        App.commit();
      },
    });
  };
  App.changes.setReminders = async (el) => {
    if (el.checked && 'Notification' in window && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch (_) {}
    }
    App.state.settings.reminders = el.checked;
    App.toast(el.checked ? ('Notification' in window && Notification.permission === 'granted' ? 'Reminders on' : 'Reminders on (in-app only; notifications not allowed)') : 'Reminders off');
    App.commit();
  };
  App.changes.setMotion = (el) => { App.state.settings.motion = el.checked ? 'reduced' : 'full'; document.documentElement.classList.toggle('reduce-motion', el.checked); App.commit(); };
  App.changes.setSplash = (el) => { App.state.settings.splash = el.checked; App.save(); };
  App.actions.installApp = async () => { if (!installEvt) return; installEvt.prompt(); const r = await installEvt.userChoice.catch(() => null); installEvt = null; if (r && r.outcome === 'accepted') App.toast('Installing LifeOS'); App.render({ quiet: true }); };
  App.actions.persistStorage = async () => {
    if (!(navigator.storage && navigator.storage.persist)) return App.toast('Not supported in this browser', 'warn');
    const ok = await navigator.storage.persist().catch(() => false);
    App.toast(ok ? 'Data protected from automatic cleanup' : 'Browser declined. Installing the app usually allows it', ok ? 'ok' : 'warn');
    showStorage();
  };
  async function showStorage() {
    const el = document.getElementById('storeInfo');
    if (!el) return;
    try {
      const est = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null;
      const pers = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : false;
      const kb = JSON.stringify(App.state).length / 1024;
      el.innerHTML = `Data size ≈ ${kb < 1024 ? kb.toFixed(0) + ' KB' : (kb / 1024).toFixed(1) + ' MB'}${est ? ` · browser storage used ${(est.usage / 1048576).toFixed(1)} MB` : ''} · ${pers ? '🛡️ protected' : 'not protected yet'}`;
    } catch (_) { el.textContent = ''; }
  }

  /* backup / restore (includes receipt photos) */
  const blobToDataUrl = (b) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });
  App.actions.exportAll = async () => {
    await App.flush();
    let receipts = {};
    try { for (const [k, b] of await App.blobAll()) receipts[k] = await blobToDataUrl(b); } catch (_) {}
    const data = { app: 'LifeOS', exported: new Date().toISOString(), version: App.SCHEMA, state: App.state, receipts };
    App.download(`lifeos-backup-${dkey()}.json`, JSON.stringify(data), 'application/json');
    App.toast('Backup downloaded. Keep it somewhere safe');
  };
  App.changes.importAll = (el) => {
    const f = el.files && el.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = async () => {
      try {
        const d = JSON.parse(r.result);
        let st;
        if (d && d.app === 'LifeOS' && d.state) st = d.state;
        else if (d && 'todos' in d && 'money' in d) st = App.migrateV1(d); // LifeOS 1.0 backup
        else throw new Error('Not a LifeOS backup');
        st = App.normalize(st);
        if (!st.profile) throw new Error('Backup has no profile');
        if (!confirm(`Replace all current data with this backup${d.exported ? ` from ${new Date(d.exported).toLocaleDateString('en-IN')}` : ''}?`)) return;
        App.state = st;
        App.initReference();
        App.primeAchievements();
        await App.flush();
        for (const [k, url] of Object.entries(d.receipts || {})) { const b = await (await fetch(url)).blob(); await App.blobPut(k, b); }
        App.toast('Backup restored');
        App.render();
      } catch (e) {
        App.toast(`Import failed: ${e.message}`, 'bad');
      }
      el.value = '';
    };
    r.readAsText(f);
  };
  App.actions.exportCsv = (el) => {
    const st = App.state, k = el.dataset.k;
    const T = {
      transactions: () => [['Date', 'Type', 'Amount (INR)', 'Category', 'Merchant', 'Mode', 'Notes']].concat(st.money.txns.map((t) => [t.date, t.type, t.amount, App.moneyCat(t.cat).label, t.merchant, t.mode, t.note])),
      food: () => [['Date', 'Meal', 'Food', 'Quantity', 'kcal', 'Protein g', 'Carbs g', 'Fat g']].concat(st.food.log.map((x) => [x.date, x.meal, x.name, x.qty || x.amount, x.kcal, x.p, x.c, x.f])),
      weights: () => [['Date', 'Weight kg']].concat(st.body.weights.map((w) => [w.date, w.kg])),
      study: () => [['Date', 'Subject', 'Section', 'Type', 'Minutes', 'Attempted', 'Correct', 'Notes']].concat(st.study.sessions.map((s) => [s.date, s.subject, s.section, s.type, s.minutes, s.attempted, s.correct, s.note])),
      timesheet: () => [['Date', 'Start', 'End', 'Area', 'Description']].concat(st.work.time.map((e) => [e.date, e.start, e.end, e.cat, e.desc])),
      tasks: () => [['Title', 'Date', 'Time', 'Repeat', 'Priority', 'Area', 'Done', 'Done on']].concat(st.tasks.map((t) => [t.title, t.date, t.time, t.recur, t.priority, t.cat, t.recur && t.recur !== 'none' ? Object.keys(t.doneDates || {}).length + ' times' : t.done ? 'yes' : 'no', t.doneAt || ''])),
      screen: () => [['Date'].concat(st.social.apps.map((a) => a.name + ' (min)'))].concat(Object.keys(st.social.logs).sort().map((d) => [d].concat(st.social.apps.map((a) => st.social.logs[d][a.id] || 0)))),
      workouts: () => [['Date', 'Day', 'Exercise', 'Set', 'kg', 'Reps', 'Done']].concat(Object.entries(st.gym.logs).flatMap(([key, l]) => Object.entries(l.sets || {}).flatMap(([ex, sets]) => sets.map((s, i) => [key.split('|')[0], App.dayName(key.split('|')[1]), (App.EX[ex] || { name: ex }).name, i + 1, s && s.w, s && s.r, s && s.done ? 'yes' : 'no'])))),
    };
    App.download(`lifeos-${k}-${dkey()}.csv`, App.csv(T[k]()), 'text/csv');
    App.toast('CSV downloaded');
  };
  App.actions.resetAll = async () => {
    const typed = prompt('This erases ALL LifeOS data on this device (goals, money, workouts, study, receipts). Type DELETE to confirm.');
    if (typed !== 'DELETE') { if (typed !== null) App.toast('Not erased. You must type DELETE', 'warn'); return; }
    await App.wipe();
    location.hash = '';
    location.reload();
  };

  App.views.more = { render: renderMore };
  App.views.xp = { render: renderXp };
  App.views.settings = { render: renderSettings, after: showStorage };
})();
