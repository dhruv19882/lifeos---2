'use strict';
/* Core: state, IndexedDB storage + migration, date/number helpers, icons. */
const App = (window.App = { views: {}, actions: {}, changes: {}, ui: {} });

(function () {
  const LS_V1 = 'lifeos.v1';
  const LS_V2 = 'lifeos.v2.fallback';
  const DB_NAME = 'lifeos';
  const DB_VER = 1;
  const SCHEMA = 2;

  /* ---------- dates ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const mkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const parseD = (s) => {
    const [y, m, d] = String(s).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };
  const addDays = (d, n) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  };
  const daysBetween = (a, b) => Math.round((parseD(b) - parseD(a)) / 86400000);
  const lastNDays = (n, end = new Date()) => Array.from({ length: n }, (_, i) => dkey(addDays(end, i - n + 1)));
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DOW_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const prettyDate = (s) => {
    if (!s) return '';
    const diff = daysBetween(dkey(), s);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    const d = parseD(s);
    return `${d.getDate()} ${MON[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''}`;
  };
  const toMin = (hhmm) => {
    const [h, m] = String(hhmm || '0:0').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const fmtTime = (hhmm) => {
    if (!hhmm) return '';
    const m = toMin(hhmm);
    const h = Math.floor(m / 60) % 24;
    return `${((h + 11) % 12) + 1}:${pad(m % 60)} ${h < 12 ? 'AM' : 'PM'}`;
  };
  const nowMin = () => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  };

  /* ---------- formatting ---------- */
  const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  const inr2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const inr = (n, exact) => (n < 0 ? '-₹' : '₹') + (exact ? inr2 : inrFmt).format(Math.abs(exact ? n || 0 : Math.round(n || 0)));
  const num = (n) => inrFmt.format(Math.round(n || 0));
  const fmtMin = (m) => {
    m = Math.round(m || 0);
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h${m % 60 ? ' ' + (m % 60) + 'm' : ''}`;
  };
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const round1 = (v) => Math.round(v * 10) / 10;
  const sum = (arr, f = (x) => x) => arr.reduce((a, x) => a + (+f(x) || 0), 0);

  /* ---------- default state (no personal data here; see seed.local.js) ---------- */
  const defaultRoutine = () => [
    { id: 'r1', start: '06:30', end: '06:50', title: 'Wake up & hydrate', type: 'self' },
    { id: 'r2', start: '07:00', end: '08:00', title: 'Gym', type: 'gym' },
    { id: 'r3', start: '08:15', end: '08:45', title: 'Breakfast & nutrition', type: 'food' },
    { id: 'r4', start: '09:00', end: '12:00', title: 'US CMA preparation', type: 'study' },
    { id: 'r5', start: '12:00', end: '13:00', title: 'Skill development', type: 'skill' },
    { id: 'r6', start: '13:00', end: '13:45', title: 'Lunch & personal tasks', type: 'food' },
    { id: 'r7', start: '14:00', end: '23:00', title: 'Work: Accounts & Finance', type: 'work' },
    { id: 'r8', start: '23:30', end: '06:30', title: 'Sleep', type: 'sleep' },
  ];

  const defaults = () => ({
    version: SCHEMA,
    created: dkey(),
    profile: null,
    settings: {
      studyTarget: 120, waterGoal: 12, stepGoal: 8000, dailySpendLimit: 500,
      openingBalance: 0, reminders: false, motion: 'full', splash: true,
    },
    routine: defaultRoutine(),
    goals: [],
    tasks: [],
    reviews: {},
    social: {
      apps: [
        { id: 'ig', name: 'Instagram', color: '#e1306c', low: 30, high: 60 },
        { id: 'yt', name: 'YouTube', color: '#ff3b3b', low: 45, high: 90 },
        { id: 'wa', name: 'WhatsApp', color: '#25d366', low: 30, high: 60 },
        { id: 'sc', name: 'Snapchat', color: '#f5e000', low: 20, high: 40 },
      ],
      logs: {},
    },
    money: { txns: [], budgets: {}, monthly: 15000, recurring: [], goals: [] },
    body: { weights: [], water: {}, steps: {} },
    food: { log: [], custom: [] },
    gym: { logs: {} },
    study: { exams: {}, status: {}, sessions: [], mocks: [], passed: {}, backlog: null },
    career: { skills: {}, portfolio: [] },
    work: { items: [], notes: [], time: [], journal: {}, learning: [], clock: null },
    seen: { badges: {}, level: 1 },
  });

  /* ---------- migration v1 -> v2 ---------- */
  const MONEY_MAP = { food: 'food', grocery: 'food', transport: 'travel', rent: 'family', bills: 'other', recharge: 'mobile', gym: 'gym', shopping: 'shopping', health: 'other', study: 'education', fun: 'entertainment', other: 'other' };

  function migrateV1(o) {
    const s = defaults();
    s.created = (o.body && o.body.weights && o.body.weights[0] && o.body.weights[0].date) || dkey();
    if (o.profile) {
      const p = o.profile;
      s.profile = {
        name: p.name, gender: p.gender || 'male', age: p.age, heightCm: p.height, activity: p.activity, mode: p.mode || 'bulk',
        startWeight: p.weight, targetWeight: Math.max(55, Math.ceil(p.weight) + 5), finalWeight: 60,
        location: '', education: '', qualification: '', career: '', employer: '',
      };
    }
    if (o.body) {
      s.body.weights = o.body.weights || [];
      s.body.water = o.body.water || {};
      s.body.steps = o.body.steps || {};
      if (o.body.waterGoal) s.settings.waterGoal = o.body.waterGoal;
      if (o.body.stepGoal) s.settings.stepGoal = o.body.stepGoal;
    }
    if (o.social) s.social = { apps: o.social.apps || s.social.apps, logs: o.social.logs || {} };
    if (o.money) {
      s.money.monthly = o.money.monthly ?? s.money.monthly;
      s.money.txns = (o.money.txns || []).map((t) => ({
        ...t, cat: t.type === 'expense' ? MONEY_MAP[t.cat] || 'other' : t.cat === 'pocket' ? 'pocket' : t.cat || 'salary', merchant: t.merchant || '',
      }));
      for (const [k, v] of Object.entries(o.money.budgets || {})) {
        const nk = MONEY_MAP[k] || 'other';
        s.money.budgets[nk] = (s.money.budgets[nk] || 0) + v;
      }
    }
    // goals: long goals keep; short goals with parent become milestones
    const goals = o.goals || [];
    const longs = goals.filter((g) => g.term === 'long');
    s.goals = longs.map((g) => ({
      id: g.id, title: g.title, cat: g.cat || 'personal', priority: 'med', deadline: g.deadline || '', why: g.why || '',
      done: !!g.done, doneAt: g.done ? dkey() : null, created: g.created || dkey(), progress: g.progress || 0, actions: [],
      milestones: goals.filter((k) => k.parentId === g.id).map((k) => ({ id: k.id, title: k.title, due: k.deadline || '', done: !!k.done, doneAt: k.done ? dkey() : null })),
    }));
    goals.filter((g) => g.term === 'short' && !longs.some((l) => l.id === g.parentId)).forEach((g) =>
      s.goals.push({ id: g.id, title: g.title, cat: g.cat || 'personal', priority: 'med', deadline: g.deadline || '', why: g.why || '', done: !!g.done, doneAt: null, created: g.created || dkey(), progress: g.progress || 0, actions: [], milestones: [] })
    );
    s.tasks = (o.todos || []).map((t) => ({
      id: t.id, title: t.title, date: t.due || '', time: '', dur: 30, priority: t.priority || 'med', cat: 'personal',
      goalId: t.goalId || '', recur: 'none', done: !!t.done, doneAt: t.doneAt || null, doneDates: {}, created: t.created || dkey(),
    }));
    s.gym = { logs: (o.gym && o.gym.logs) || {} };
    // food: v1 stored checked plan meals; convert to log entries with the v1 plan totals
    const V1_MEALS = { m1: ['Breakfast (oats bowl)', 534, 19.8, 74.8, 19.4, 'breakfast'], m2: ['Eggs + roasted chana', 344, 24.9, 18.8, 17.7, 'snacks'], m3: ['Lunch thali', 775, 27.8, 130, 16.4, 'lunch'], m4: ['Bananas + peanuts', 380, 10.1, 59, 15.3, 'snacks'], m5: ['Roti + soya curry', 542, 37.5, 85.5, 6.2, 'dinner'], m6: ['Toned milk 250 ml', 145, 7.8, 11.8, 7.5, 'dinner'] };
    for (const [date, f] of Object.entries(o.food || {})) {
      for (const [mid, on] of Object.entries(f.meals || {})) {
        const m = V1_MEALS[mid];
        if (on && m) s.food.log.push({ id: uid(), date, meal: m[5], foodId: 'v1-' + mid, name: m[0], amount: 1, unit: 'serving', kcal: m[1], p: m[2], c: m[3], f: m[4], ts: Date.now() });
      }
      (f.extra || []).forEach((x) => s.food.log.push({ id: x.id || uid(), date, meal: 'snacks', foodId: 'custom', name: x.name, amount: 1, unit: 'serving', kcal: x.kcal, p: x.p, c: 0, f: 0, ts: Date.now() }));
    }
    return s;
  }

  /** Fill missing keys after loading any version (forward-compatible). */
  function normalize(raw) {
    const base = defaults();
    if (!raw || typeof raw !== 'object') return base;
    for (const k of Object.keys(base)) {
      if (raw[k] === undefined || raw[k] === null) continue;
      const b = base[k];
      base[k] = b && typeof b === 'object' && !Array.isArray(b) && typeof raw[k] === 'object' && !Array.isArray(raw[k]) ? { ...b, ...raw[k] } : raw[k];
    }
    base.profile = raw.profile || null;
    base.version = SCHEMA;
    return base;
  }

  /* ---------- IndexedDB ---------- */
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if (!('indexedDB' in window)) return rej(new Error('no idb'));
      const r = indexedDB.open(DB_NAME, DB_VER);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
        if (!d.objectStoreNames.contains('blobs')) d.createObjectStore('blobs');
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  function idb(store, mode, fn) {
    return db().then(
      (d) =>
        new Promise((res, rej) => {
          const tx = d.transaction(store, mode);
          const req = fn(tx.objectStore(store));
          tx.oncomplete = () => res(req && req.result);
          tx.onerror = () => rej(tx.error);
          tx.onabort = () => rej(tx.error);
        })
    );
  }
  const kvGet = (k) => idb('kv', 'readonly', (s) => s.get(k));
  const kvSet = (k, v) => idb('kv', 'readwrite', (s) => s.put(v, k));
  App.blobPut = (k, v) => idb('blobs', 'readwrite', (s) => s.put(v, k));
  App.blobGet = (k) => idb('blobs', 'readonly', (s) => s.get(k));
  App.blobDel = (k) => idb('blobs', 'readwrite', (s) => s.delete(k));
  App.blobAll = () => idb('blobs', 'readonly', (s) => s.getAll()).then(async (vals) => {
    const keys = await idb('blobs', 'readonly', (s) => s.getAllKeys());
    return keys.map((k, i) => [k, vals[i]]);
  });

  App.storage = 'idb';
  async function load() {
    let raw = null;
    try {
      raw = await kvGet('state');
    } catch (e) {
      App.storage = 'local';
    }
    if (!raw) {
      try { raw = JSON.parse(localStorage.getItem(LS_V2) || 'null'); } catch (_) {}
    }
    if (!raw) {
      // migrate from LifeOS 1.0
      try {
        const v1 = JSON.parse(localStorage.getItem(LS_V1) || 'null');
        if (v1 && typeof v1 === 'object') {
          raw = migrateV1(v1);
          App.migratedFromV1 = true;
        }
      } catch (_) {}
    }
    const st = normalize(raw);
    if (!st.profile && window.LIFEOS_SEED) App.pendingSeed = window.LIFEOS_SEED;
    return st;
  }

  let saveTimer;
  let saving = Promise.resolve();
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 150);
  }
  function flush() {
    clearTimeout(saveTimer);
    const snapshot = JSON.parse(JSON.stringify(App.state));
    saving = saving.then(async () => {
      if (App.storage === 'idb') {
        try {
          await kvSet('state', snapshot);
          if (App.migratedFromV1) { localStorage.setItem(LS_V1 + '.backup', localStorage.getItem(LS_V1) || ''); localStorage.removeItem(LS_V1); App.migratedFromV1 = false; }
          return;
        } catch (e) {
          App.storage = 'local';
        }
      }
      try {
        localStorage.setItem(LS_V2, JSON.stringify(snapshot));
      } catch (e) {
        App.toast && App.toast('Could not save: storage is full', 'bad');
      }
    });
    return saving;
  }
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());

  async function wipe() {
    try {
      await idb('kv', 'readwrite', (s) => s.clear());
      await idb('blobs', 'readwrite', (s) => s.clear());
    } catch (_) {}
    [LS_V1, LS_V2, LS_V1 + '.backup'].forEach((k) => localStorage.removeItem(k));
  }

  /* ---------- profile (single source of truth) ---------- */
  App.profile = () => App.state.profile;
  App.currentWeight = () => {
    const w = App.state.body.weights;
    return w.length ? w[w.length - 1].kg : (App.state.profile && App.state.profile.startWeight) || 0;
  };
  App.firstName = () => ((App.state.profile && App.state.profile.name) || 'Champ').split(' ')[0];

  /* ---------- icons ---------- */
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    phone: '<rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M11 18h2"/>',
    wallet: '<path d="M19 7V5.5A1.5 1.5 0 0 0 17.5 4H5a2 2 0 0 0 0 4h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V6"/><circle cx="16" cy="14" r="1.2"/>',
    dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    right: '<path d="m9 6 6 6-6 6"/>', left: '<path d="m15 6-6 6 6 6"/>', down: '<path d="m6 9 6 6 6-6"/>', up2: '<path d="m6 15 6-6 6 6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/>',
    flame: '<path d="M12 22c4 0 7-2.7 7-6.8 0-3.3-2.3-5.6-4-7.7-.5 2-1.6 3.2-3 3.5.4-3.3-1-6.3-3.5-8-.2 3.2-1.8 5-3.3 7A8.3 8.3 0 0 0 5 15.2C5 19.3 8 22 12 22Z"/>',
    drop: '<path d="M12 2.7S5.5 9.6 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 9.6 12 2.7 12 2.7Z"/>',
    steps: '<path d="M7 16.5c-1.7 0-3-1.6-3-4.5S5 6 7 6s3 2.7 3 5.5-1.3 5-3 5Z"/><path d="M4.5 19.5h5"/><path d="M17 13.5c1.7 0 3-1.6 3-4.5s-1-6-3-6-3 2.7-3 5.5 1.3 5 3 5Z"/><path d="M14.5 16.5h5"/>',
    alert: '<path d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3"/>',
    edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    up: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>', downT: '<path d="m3 7 6 6 4-4 8 8"/><path d="M15 17h6v-6"/>',
    timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.5M9.5 2.5h5"/>',
    food: '<path d="M7 2.5v8.5M4.5 2.5v5a2.5 2.5 0 0 0 5 0v-5M7 11v10.5"/><path d="M17.5 21.5V2.5c-2.5 1.5-3.5 4.5-3.5 8 0 2 1 3 3.5 3"/>',
    scale: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8.5 9a5 5 0 0 1 7 0l-2.2 2.7a1.6 1.6 0 0 0-2.6 0Z"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    download: '<path d="M12 4v11M7 10.5l5 5 5-5M4.5 20h15"/>', upload: '<path d="M12 16V5M7 9.5l5-5 5 5M4.5 20h15"/>',
    bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z"/><path d="M10 21h4"/>',
    zap: '<path d="M13 2.5 4.5 13.5H12l-1 8 8.5-11H12l1-8Z"/>', moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>',
    rupee: '<path d="M6.5 4h11M6.5 8.5h11M9.5 4c3.3 0 5 1.9 5 4.5S12.8 13 9.5 13h-3l8 7.5"/>',
    trophy: '<path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0V4Z"/><path d="M7.5 6H4.5a3 3 0 0 0 3 4.5M16.5 6h3a3 3 0 0 1-3 4.5M12 13.5V17M8.5 20.5h7M9.5 17h5v3.5h-5Z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
    shield: '<path d="M12 21s7.5-3.5 7.5-9.5V5.5L12 3 4.5 5.5v6C4.5 17.5 12 21 12 21Z"/><path d="m9 12 2 2 4-4"/>',
    bolt: '<circle cx="12" cy="12" r="9"/><path d="m13 6.5-4 6h3.5l-1 5 4-6H12l1-5Z"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/>',
    brief: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12.5h18"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
    receipt: '<path d="M5 3h14v18l-2.3-1.5L14.3 21 12 19.5 9.7 21l-2.4-1.5L5 21V3Z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13.5" r="3.5"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
    share: '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
    unlock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 7.7-1.5"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
    award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14 -1.5 7 5-2.5 5 2.5-1.5-7"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
    pause: '<path d="M8 5v14M16 5v14"/>', play: '<path d="M7 4.5v15l12-7.5-12-7.5Z"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
    note: '<path d="M5 3h10l4 4v14H5V3Z"/><path d="M15 3v4h4M8.5 12h7M8.5 16h5"/>',
    refund: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    repeat: '<path d="m17 2.5 3 3-3 3"/><path d="M4 11V9.5a4 4 0 0 1 4-4h12M7 21.5l-3-3 3-3"/><path d="M20 13v1.5a4 4 0 0 1-4 4H4"/>',
    piggy: '<path d="M19 9.5c1 .5 1.5 1.5 1.5 2.5h-1.2a7 7 0 0 1-2.3 4V19h-2.5v-1.5h-5V19H7v-3A6.5 6.5 0 0 1 11.5 5H14l3-1.5v3.2A6.6 6.6 0 0 1 19 9.5Z"/><circle cx="15.5" cy="10" r=".8"/>',
    graduation: '<path d="m2.5 9 9.5-5 9.5 5-9.5 5-9.5-5Z"/><path d="M6.5 11v5c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3v-5M21.5 9v6"/>',
    link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
    folder: '<path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4.5l2 2.5H19a1.5 1.5 0 0 1 1.5 1.5v9.5A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5v-12Z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.5L3.5 9M4 13a8 8 0 0 0 14.6 4.5l1.9-2.5"/><path d="M3.5 4v5h5M20.5 20v-5h-5"/>',
    coffee: '<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3M12 3v3"/>',
  };
  const icon = (name, cls = '') =>
    `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;

  const buzz = (ms = 10) => {
    try {
      if (App.state && App.state.settings && App.state.settings.motion === 'reduced') return;
      navigator.vibrate && navigator.vibrate(ms);
    } catch (_) {}
  };
  const reducedMotion = () =>
    matchMedia('(prefers-reduced-motion: reduce)').matches || (App.state && App.state.settings && App.state.settings.motion === 'reduced');

  Object.assign(App, {
    load, save, flush, wipe, defaults, normalize, migrateV1, SCHEMA, defaultRoutine,
    dkey, mkey, parseD, addDays, daysBetween, lastNDays, prettyDate, toMin, fmtTime, nowMin, DOW, DOW_FULL, MON,
    inr, num, fmtMin, esc, uid, clamp, round1, sum, icon, buzz, reducedMotion,
  });
})();
