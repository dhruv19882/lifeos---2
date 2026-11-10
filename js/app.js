'use strict';
/* App shell: boot (splash + IndexedDB load), router, navigation, FAB action menu, onboarding, reminders. */
(function () {
  const { icon, esc } = App;
  Object.assign(App.ui, { planTab: 'today', fitnessTab: 'workout', moneyTab: 'overview', studyTab: 'cma', careerTab: 'skills', workTab: 'today', gymDay: null, todoFilter: 'open' });

  const ROUTES = ['home', 'plan', 'fitness', 'money', 'more', 'study', 'career', 'work', 'social', 'goals', 'settings', 'xp'];
  const MAIN_TAB = { study: 'more', career: 'more', work: 'more', social: 'more', goals: 'more', settings: 'more', xp: 'more' };
  let current = null;

  const route = () => {
    const h = (location.hash || '#home').slice(1);
    return ROUTES.includes(h) ? h : 'home';
  };

  App.render = (opts = {}) => {
    const view = document.getElementById('view');
    const r = route();
    const changed = r !== current;
    const quiet = !changed || opts.quiet;
    const flip = quiet ? App.flipCapture() : null;
    const y = window.scrollY;
    let html;
    if (!App.state.profile) {
      html = onboarding();
      document.body.classList.add('onboarding');
    } else {
      document.body.classList.remove('onboarding');
      try {
        html = App.views[r].render();
      } catch (e) {
        console.error(e);
        html = `<div class="card error-card">${icon('alert')}<div><b>Something went wrong on this screen.</b><p class="muted small">${esc(e.message)}</p><button class="btn btn-soft sm mt8" data-act="go" data-r="home">Go home</button></div></div>`;
      }
    }
    const dir = changed && current ? (ROUTES.indexOf(r) > ROUTES.indexOf(current) ? 'fwd' : 'back') : '';
    view.innerHTML = `<div class="page ${changed && !opts.quiet ? 'enter ' + dir : ''} ${quiet ? 'no-reveal' : ''}">${html}<div class="tabbar-space"></div></div>`;
    const page = view.firstElementChild;
    if (changed && !opts.keepScroll) window.scrollTo(0, 0);
    else window.scrollTo(0, y);
    App.animateIn(page);
    App.flipPlay(flip);
    App.views[r] && App.views[r].after && App.state.profile && App.views[r].after(page);
    current = r;
    updateNav(r);
  };

  function updateNav(r) {
    const tabKey = MAIN_TAB[r] || r;
    const tabs = [...document.querySelectorAll('#tabbar .tab')];
    tabs.forEach((t) => t.classList.toggle('on', t.dataset.r === tabKey));
    const on = tabs.find((t) => t.dataset.r === tabKey);
    const ind = document.getElementById('tabIndicator');
    if (on && ind) { ind.style.width = on.offsetWidth + 'px'; ind.style.transform = `translateX(${on.offsetLeft}px)`; }
    document.querySelectorAll('#sidebar .side-link').forEach((t) => t.classList.toggle('on', t.dataset.r === r));
    document.body.dataset.route = r;
  }

  /** Persist + re-render the current view (quiet = smooth value transitions instead of entrance animations). */
  App.commit = (opts = { quiet: true }) => {
    App.save();
    App.render(opts);
    App.checkAchievements();
  };

  App.go = (r, tab) => {
    if (tab) App.ui[r + 'Tab'] = tab;
    if (route() === r && location.hash) App.render({ quiet: true });
    else location.hash = r;
  };
  App.actions.go = (el) => { App.buzz(); App.closeSheet(); closeFab(); App.go(el.dataset.r, el.dataset.tab); };
  App.actions.tab = (el) => { App.ui[el.dataset.k] = el.dataset.v; App.buzz(4); App.render({ quiet: true }); };

  /* ---------- event delegation ---------- */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const fn = App.actions[el.dataset.act];
    if (!fn) return;
    if (el.tagName !== 'LABEL' && el.type !== 'checkbox' && el.type !== 'file') e.preventDefault();
    try { fn(el, e); } catch (err) { console.error(err); App.toast('Action failed: ' + err.message, 'bad'); }
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-change]');
    if (el && App.changes[el.dataset.change]) App.changes[el.dataset.change](el, e);
  });
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.btn, .tab, .tile, .icon-btn, .seg-btn, .qbtn, .fab, .side-link');
    if (!b || App.reducedMotion()) return;
    const rect = b.getBoundingClientRect();
    const s = document.createElement('span');
    s.className = 'ripple';
    const d = Math.max(rect.width, rect.height);
    s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - rect.left - d / 2}px;top:${e.clientY - rect.top - d / 2}px`;
    b.appendChild(s);
    setTimeout(() => s.remove(), 600);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!document.getElementById('unlock').hidden) return App.actions.closeUnlock();
    if (document.body.classList.contains('fab-open')) return closeFab();
    App.closeSheet();
  });
  window.addEventListener('hashchange', () => { App.closeSheet(); closeFab(); App.render(); });
  window.addEventListener('resize', () => updateNav(route()));

  /* ---------- FAB action menu ---------- */
  const FAB_ACTIONS = [
    ['purchase', 'Add expense', 'rupee', 'g-red'],
    ['addIncome', 'Add income', 'up', 'g-green'],
    ['logFood', 'Log food', 'food', 'g-warm'],
    ['quickWeight', 'Log weight', 'scale', 'g-sky'],
    ['addWater', 'Log water', 'drop', 'g-blue'],
    ['fabWorkout', 'Complete workout', 'dumbbell', 'g-green'],
    ['addTask', 'Add task', 'list', 'g-sky'],
    ['addSession', 'Add study session', 'book', 'g-violet'],
    ['addWorkNote', 'Add work note', 'brief', 'g-red'],
  ];
  function openFab() {
    const m = document.getElementById('fabMenu');
    m.innerHTML = `<div class="fab-backdrop" data-act="fab"></div><div class="fab-list">${FAB_ACTIONS.map(([act, label, ic, g], i) =>
      `<button class="fab-item" data-act="fabDo" data-a="${act}" style="--i:${FAB_ACTIONS.length - 1 - i}"><span>${label}</span><i class="tile-ic sm ${g}">${icon(ic)}</i></button>`).join('')}</div>`;
    m.hidden = false;
    requestAnimationFrame(() => document.body.classList.add('fab-open'));
    App.buzz(8);
  }
  function closeFab() {
    if (!document.body.classList.contains('fab-open')) return;
    document.body.classList.remove('fab-open');
    setTimeout(() => { if (!document.body.classList.contains('fab-open')) document.getElementById('fabMenu').hidden = true; }, 280);
  }
  App.actions.fab = () => (document.body.classList.contains('fab-open') ? closeFab() : openFab());
  App.actions.fabDo = (el) => {
    closeFab();
    const a = el.dataset.a;
    setTimeout(() => App.actions[a] && App.actions[a](el), 140);
  };
  App.actions.addIncome = () => App.actions.addTxn({ dataset: { type: 'income' } });
  App.actions.fabWorkout = () => { App.ui.gymDay = null; App.go('fitness', 'workout'); };

  /* ---------- onboarding ---------- */
  const cmToFtIn = (cm) => { const t = Math.round(cm / 2.54); return [Math.floor(t / 12), t % 12]; };
  App.cmToFtIn = cmToFtIn;
  function onboarding() {
    return `<section class="onb">
      <div class="onb-hero reveal">
        <div class="logo-badge">${App.logo()}</div>
        <h1>Life<span class="grad-text">OS</span></h1>
        <p>One app for your day, body, money, study, work and career.</p>
      </div>
      <form id="onbForm" class="card reveal" style="--i:1" novalidate>
        <h3>Let's set you up</h3>
        <p class="muted">Takes 30 seconds. Everything stays on this device. Sab kuch sirf aapke phone mein.</p>
        ${App.field('Your name', App.input('name', { placeholder: 'Your first name', required: true }))}
        <div class="grid3">
          ${App.field('Age', App.input('age', { type: 'number', value: 22, min: 13, max: 80, inputmode: 'numeric' }))}
          ${App.field('Height (ft)', App.input('ft', { type: 'number', value: 5, min: 4, max: 7, inputmode: 'numeric' }))}
          ${App.field('Height (in)', App.input('inch', { type: 'number', value: 8, min: 0, max: 11, inputmode: 'numeric' }))}
        </div>
        <div class="grid2">
          ${App.field('Weight now (kg)', App.input('weight', { type: 'number', value: 49, min: 30, max: 200, step: 0.1, inputmode: 'decimal' }))}
          ${App.field('Target weight (kg)', App.input('targetWeight', { type: 'number', value: 55, min: 30, max: 200, step: 0.5, inputmode: 'decimal' }))}
        </div>
        ${App.field('Gender', App.chips('gender', [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }], 'male'))}
        <label class="toggle-row"><input type="checkbox" name="starter" checked><span>Add starter goals (weight, US CMA, Finance Analyst, savings, screen time)</span></label>
        <button class="btn btn-primary btn-block btn-lg" type="submit">${icon('zap')}Start LifeOS</button>
      </form>
    </section>`;
  }

  /** Builds the profile from a seed object (seed.local.js or onboarding) and initialises reference data. */
  App.applyProfile = (seed, { starter = true } = {}) => {
    const st = App.state;
    st.profile = {
      name: seed.name || 'Champ', gender: seed.gender || 'male', age: +seed.age || 22, heightCm: +seed.heightCm || 172.7,
      startWeight: +seed.weight || 50, targetWeight: +seed.targetWeight || 55, finalWeight: +seed.finalWeight || 60,
      activity: +seed.activity || 1.55, mode: seed.mode || 'bulk', calorieAdjust: 0,
      location: seed.location || '', education: seed.education || '', qualification: seed.qualification || '',
      career: seed.career || '', employer: seed.employer || '', role: seed.role || '',
    };
    st.created = App.dkey();
    if (!st.body.weights.length) st.body.weights.push({ date: App.dkey(), kg: st.profile.startWeight });
    if (seed.routine) st.routine = seed.routine;
    if (seed.settings) Object.assign(st.settings, seed.settings);
    App.initReference();
    if (starter && !st.goals.length) App.starterGoals();
    App.primeAchievements();
  };

  App.initReference = () => {
    const st = App.state;
    if (!st.study.backlog) st.study.backlog = Object.fromEntries(Object.entries(App.BACKLOG).map(([k, v]) => [k, v.units.map((u, i) => ({ id: `${k}${i + 1}`, title: u, done: false }))]));
    App.SKILLS.forEach((s) => (st.career.skills[s.id] = st.career.skills[s.id] || { milestones: {}, courses: [], practice: [], notes: '' }));
  };

  App.starterGoals = () => {
    const u = App.uid, t = App.dkey;
    const m = (title) => ({ id: u(), title, due: '', done: false, doneAt: null });
    const g = (title, cat, priority, ms, why = '', actions = []) => ({ id: u(), title, cat, priority, deadline: '', why, done: false, doneAt: null, created: t(), progress: 0, milestones: ms.map(m), actions: actions.map((a) => ({ id: u(), text: a, log: {} })) });
    const p = App.state.profile;
    App.state.goals.push(
      g(`Reach ${p.targetWeight} kg`, 'health', 'high', [`Reach ${Math.ceil(p.startWeight) + 1} kg`, `Reach ${Math.round((p.startWeight + p.targetWeight) / 2)} kg`, `Reach ${p.targetWeight} kg`], 'Strong body, more energy.', ['Hit protein target', 'Finish workout or rest-day walk']),
      g('Complete US CMA', 'study', 'high', ['Finish Part 1 syllabus', 'Pass Part 1', 'Finish Part 2 syllabus', 'Pass Part 2'], '', ['Study 2 hours', 'Do 30 Hock MCQs']),
      g('Become a Finance Analyst', 'career', 'high', ['Advanced Excel to 100%', 'SQL basics complete', 'First Power BI dashboard', '3 portfolio projects', 'Apply to 10 FP&A / analyst roles']),
      g('Build financial automation projects', 'career', 'med', ['Automate one work report', 'Build a reconciliation macro', 'Python bank-statement parser']),
      g('Improve savings', 'money', 'med', ['Track every expense for 30 days', 'Save 20% of income for 1 month', 'Save 20% for 3 months in a row']),
      g('Reduce unnecessary screen time', 'personal', 'med', ['3 days under all high limits', '7-day under-limit streak', '30 days with Instagram under 30 min'], '', ['Phone away during study'])
    );
  };

  document.addEventListener('submit', (e) => {
    if (e.target.id !== 'onbForm') return;
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target).entries());
    if (!String(d.name || '').trim()) { App.toast('Please enter your name', 'bad'); e.target.querySelector('[name=name]').focus(); return; }
    const heightCm = Math.round(((+d.ft || 5) * 12 + (+d.inch || 0)) * 2.54 * 10) / 10;
    App.applyProfile({ name: d.name.trim().slice(0, 30), age: App.clamp(+d.age || 22, 13, 80), heightCm, weight: App.clamp(+d.weight || 50, 30, 200), targetWeight: App.clamp(+d.targetWeight || 55, 30, 200), gender: d.gender }, { starter: !!d.starter });
    App.save();
    App.confetti();
    App.toast(`Welcome, ${App.firstName()}! Chalo shuru karein.`);
    location.hash = 'home';
    App.render();
  });

  /* ---------- reminders (work while the app is open or recently backgrounded) ---------- */
  const notified = new Set();
  function checkReminders() {
    const st = App.state;
    if (!st.profile || !st.settings.reminders) return;
    const today = App.dkey(), hm = new Date().toTimeString().slice(0, 5);
    const due = [];
    App.tasksOn(today).forEach((t) => t.time === hm && !App.taskDone(t, today) && due.push([`t${t.id}${today}`, 'Task: ' + t.title]));
    st.routine.forEach((b) => b.start === hm && due.push([`r${b.id}${today}`, `${b.title} starts now`]));
    due.forEach(([k, msg]) => {
      if (notified.has(k)) return;
      notified.add(k);
      App.toast(msg, 'warn');
      if ('Notification' in window && Notification.permission === 'granted' && navigator.serviceWorker) {
        navigator.serviceWorker.ready.then((r) => r.showNotification('LifeOS', { body: msg, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: k })).catch(() => {});
      }
    });
  }

  /* ---------- live clock + timeline "now" ---------- */
  function tick() {
    const d = new Date();
    document.querySelectorAll('[data-clock]').forEach((el) => (el.textContent = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })));
    if (d.getSeconds() === 0) {
      document.querySelectorAll('[data-nowline]').forEach((el) => App.positionNow && App.positionNow(el));
      checkReminders();
    }
  }

  /* ---------- logo ---------- */
  App.logo = () => `<svg viewBox="0 0 64 64" class="logo-svg" aria-hidden="true"><defs><linearGradient id="lg-l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ef4444"/><stop offset="1" stop-color="#38bdf8"/></linearGradient></defs>
    <circle cx="32" cy="32" r="22" class="logo-track"/><circle cx="32" cy="32" r="22" class="logo-arc" stroke="url(#lg-l)" pathLength="100"/>
    <path d="M35 17 24 34h8l-3 13 11-17h-8l3-13Z" class="logo-bolt"/></svg>`;

  /* ---------- boot ---------- */
  async function boot() {
    const splash = document.getElementById('splash');
    const t0 = performance.now();
    document.getElementById('view').innerHTML = App.skeleton();
    App.state = await App.load();
    if (!App.state.profile && App.pendingSeed) {
      App.applyProfile(App.pendingSeed, { starter: true });
      App.save();
    }
    if (App.state.profile) { App.initReference(); if (App.migratedFromV1) { App.primeAchievements(); App.save(); } }
    document.querySelectorAll('[data-icon]').forEach((el) => (el.outerHTML = icon(el.dataset.icon)));
    document.documentElement.classList.toggle('reduce-motion', App.state.settings.motion === 'reduced');
    const minSplash = App.reducedMotion() || App.state.settings.splash === false ? 0 : 1100;
    const wait = Math.max(0, minSplash - (performance.now() - t0));
    setTimeout(() => {
      App.render();
      splash.classList.add('out');
      setTimeout(() => splash.remove(), 600);
      if (App.migratedFromV1) App.toast('Upgraded to LifeOS 2.0. Your data was moved safely.');
    }, wait);
    setInterval(tick, 1000);
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  boot().catch((e) => {
    console.error(e);
    document.getElementById('view').innerHTML = `<div class="card error-card">${icon('alert')}<div><b>LifeOS could not start.</b><p class="muted small">${esc(e.message)}</p></div></div>`;
    const s = document.getElementById('splash'); s && s.remove();
  });
})();
