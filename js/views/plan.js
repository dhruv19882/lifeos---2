'use strict';
/* Plan: daily routine timeline, tasks (recurring, time-blocked), calendar, daily review, routine editor. */
(function () {
  const { icon, esc, dkey, prettyDate, toMin, fmtTime, nowMin, uid, parseD, addDays, MON, DOW } = App;
  App.ui.calMonth = App.mkey();
  App.ui.calDay = dkey();

  const TYPES = {
    self: { label: 'Personal', c: '#94a3b8', ic: 'sun' }, gym: { label: 'Gym', c: '#22c55e', ic: 'dumbbell' }, food: { label: 'Meal', c: '#f59e0b', ic: 'food' },
    study: { label: 'Study', c: '#a78bfa', ic: 'book' }, skill: { label: 'Skills', c: '#38bdf8', ic: 'up' }, work: { label: 'Work', c: '#ef4444', ic: 'brief' },
    sleep: { label: 'Sleep', c: '#6366f1', ic: 'moon' }, task: { label: 'Task', c: '#7dd3fc', ic: 'list' },
  };
  const PRI = { high: { label: 'High', cls: 'bad' }, med: { label: 'Medium', cls: 'warn' }, low: { label: 'Low', cls: 'ok' } };
  const RECUR = { none: 'Once', daily: 'Every day', weekdays: 'Weekdays', weekly: 'Weekly' };
  const CATS = { personal: '🌱 Personal', work: '💼 Work', study: '📚 Study', health: '💪 Health' };

  const blockMin = (b) => { const s = toMin(b.start); let e = toMin(b.end); if (e <= s) e += 1440; return [s, e]; };
  App.currentBlock = () => {
    const n = nowMin();
    return App.state.routine.find((b) => { const [s, e] = blockMin(b); return (n >= s && n < e) || (n + 1440 >= s && n + 1440 < e); });
  };

  /** Combined agenda for a date: routine blocks + timed tasks, sorted by start. */
  function agenda(date) {
    const items = App.state.routine.map((b) => ({ ...b, kind: 'block' }));
    App.tasksOn(date).filter((t) => t.time).forEach((t) => {
      const s = toMin(t.time), e = s + (+t.dur || 30);
      items.push({ id: t.id, start: t.time, end: `${String(Math.floor(e / 60) % 24).padStart(2, '0')}:${String(e % 60).padStart(2, '0')}`, title: t.title, type: 'task', kind: 'task', task: t });
    });
    return items.sort((a, b) => toMin(a.start) - toMin(b.start));
  }

  App.positionNow = (el) => { el.style.left = (nowMin() / 1440) * 100 + '%'; };

  function dayBar(date) {
    const segs = App.state.routine.map((b) => {
      const [s, e] = blockMin(b);
      const parts = e > 1440 ? [[s, 1440], [0, e - 1440]] : [[s, e]];
      return parts.map(([a, z]) => `<span class="db-seg" title="${esc(b.title)}" style="left:${(a / 1440) * 100}%;width:${((z - a) / 1440) * 100}%;--c:${(TYPES[b.type] || TYPES.self).c}"></span>`).join('');
    }).join('');
    return `<div class="daybar">${segs}${date === dkey() ? `<span class="db-now" data-nowline style="left:${(nowMin() / 1440) * 100}%"></span>` : ''}</div>
      <div class="daybar-labels"><span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>12 AM</span></div>`;
  }

  App.taskItem = (t, date = dkey()) => {
    const done = App.taskDone(t, date);
    const overdue = !done && (!t.recur || t.recur === 'none') && t.date && t.date < dkey();
    const goal = t.goalId && App.state.goals.find((g) => g.id === t.goalId);
    return `<li class="todo ${done ? 'done' : ''}" data-flip="t${t.id}">
      <button class="check ${done ? 'on' : ''}" data-act="toggleTask" data-id="${t.id}" data-date="${date}" aria-label="${done ? 'Mark not done' : 'Mark done'}">${icon('check')}</button>
      <button class="todo-body" data-act="editTask" data-id="${t.id}">
        <span class="todo-title">${esc(t.title)}</span>
        <span class="todo-meta">
          ${t.time ? `<span>${icon('clock')}${fmtTime(t.time)}</span>` : ''}
          ${t.date && (!t.recur || t.recur === 'none') ? `<span class="${overdue ? 'neg' : ''}">${icon('cal')}${prettyDate(t.date)}</span>` : ''}
          ${t.recur && t.recur !== 'none' ? `<span>${icon('repeat')}${RECUR[t.recur]}</span>` : ''}
          <span class="pill ${PRI[t.priority || 'med'].cls}">${PRI[t.priority || 'med'].label}</span>
          ${t.cat && t.cat !== 'personal' ? `<span class="pill">${CATS[t.cat] || ''}</span>` : ''}
          ${goal ? `<span class="pill">🎯 ${esc(goal.title)}</span>` : ''}
        </span>
      </button></li>`;
  };

  function renderToday() {
    const date = dkey();
    const items = agenda(date);
    const n = nowMin();
    const tasks = App.tasksOn(date);
    const untimed = tasks.filter((t) => !t.time);
    const ds = App.dayScore(date);
    const rev = App.state.reviews[date];
    return `
      <section class="card reveal" style="--i:1">
        <div class="card-head"><h3>${icon('clock')}Your day</h3><button class="link" data-act="tab" data-k="planTab" data-v="routine">Edit routine ${icon('edit')}</button></div>
        ${dayBar(date)}
      </section>
      <section class="timeline reveal" style="--i:2">${items.map((b, i) => {
        const [s, e] = blockMin(b);
        const state = (n >= s && n < e) || (n + 1440 >= s && n + 1440 < e) ? 'now' : e <= n ? 'past' : 'next';
        const ty = TYPES[b.type] || TYPES.self;
        const done = b.task && App.taskDone(b.task, date);
        const prog = state === 'now' ? ((n >= s ? n - s : n + 1440 - s) / (e - s)) * 100 : 0;
        return `<div class="tl-item ${state} ${b.kind} ${done ? 'done' : ''}" style="--c:${ty.c};--i:${i}">
          <div class="tl-time">${fmtTime(b.start)}</div>
          <div class="tl-dot">${icon(ty.ic)}</div>
          <div class="tl-body">
            <div class="row between"><b>${esc(b.title)}</b>${b.task ? `<button class="check sm ${done ? 'on' : ''}" data-act="toggleTask" data-id="${b.task.id}" data-date="${date}" aria-label="Done">${icon('check')}</button>` : state === 'now' ? '<span class="badge live">Now</span>' : ''}</div>
            <small class="muted">${fmtTime(b.start)} – ${fmtTime(b.end)} · ${App.fmtMin(e - s)}</small>
            ${state === 'now' ? `<div class="bar thin"><span class="bar-fill grad-sky" data-w="${prog}"></span></div>` : ''}
          </div></div>`;
      }).join('')}</section>
      <section class="card reveal" style="--i:3">
        <div class="card-head"><h3>${icon('list')}Today's tasks</h3><span class="muted small">${ds.tDone}/${ds.tTotal} done</span></div>
        ${untimed.length ? `<ul class="todo-list">${untimed.map((t) => App.taskItem(t, date)).join('')}</ul>` : `<p class="muted small">${tasks.length ? 'All of today’s tasks are on the timeline above.' : 'No tasks for today yet.'}</p>`}
        <div class="row gap mt12"><button class="btn btn-soft grow" data-act="addTask">${icon('plus')}Add task</button><button class="btn btn-ghost grow" data-act="dailyReview">${icon('star')}${rev ? 'Edit review' : 'Daily review'}</button></div>
      </section>`;
  }

  function renderTasks() {
    const st = App.state, today = dkey(), f = App.ui.todoFilter;
    const once = st.tasks.filter((t) => !t.recur || t.recur === 'none');
    const recurring = st.tasks.filter((t) => t.recur && t.recur !== 'none');
    const missed = once.filter((t) => !t.done && t.date && t.date < today);
    const pw = { high: 0, med: 1, low: 2 };
    const sortT = (a, b) => (a.date || '9999').localeCompare(b.date || '9999') || (a.time || '99').localeCompare(b.time || '99') || pw[a.priority || 'med'] - pw[b.priority || 'med'];
    let groups;
    if (f === 'done') groups = [['Completed', once.filter((t) => t.done).sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''))]];
    else if (f === 'missed') groups = [['Missed', missed.sort(sortT)]];
    else if (f === 'recurring') groups = [['Recurring', recurring]];
    else {
      const open = once.filter((t) => !t.done).sort(sortT);
      groups = [['Overdue', open.filter((t) => t.date && t.date < today)], ['Today', open.filter((t) => t.date === today)], ['Upcoming', open.filter((t) => t.date && t.date > today)], ['Someday', open.filter((t) => !t.date)]];
    }
    const any = groups.some(([, l]) => l.length);
    return `
      <div class="reveal" style="--i:1">${App.seg('todoFilter', [{ value: 'open', label: `Open · ${once.filter((t) => !t.done).length}` }, { value: 'recurring', label: `Recurring · ${recurring.length}` }, { value: 'missed', label: `Missed · ${missed.length}` }, { value: 'done', label: 'Done' }], f)}</div>
      ${any ? groups.filter(([, l]) => l.length).map(([name, l], gi) => `
        <section class="reveal" style="--i:${gi + 2}"><h4 class="group-title ${name === 'Overdue' || name === 'Missed' ? 'neg' : ''}">${name}<span>${l.length}</span></h4>
        <ul class="todo-list card">${l.map((t) => App.taskItem(t, f === 'recurring' ? today : t.date || today)).join('')}</ul></section>`).join('')
        : App.empty('list', f === 'done' ? 'Nothing completed yet' : f === 'missed' ? 'Nothing missed' : 'Your list is clear', 'Add tasks with a time to block them on your timeline.', `<button class="btn btn-primary" data-act="addTask">${icon('plus')}Add task</button>`)}
      ${f === 'missed' && missed.length ? `<button class="btn btn-soft btn-block" data-act="moveMissed">${icon('right')}Move all missed to today</button>` : ''}`;
  }

  function renderCalendar() {
    const st = App.state, m = App.ui.calMonth, sel = App.ui.calDay, today = dkey();
    const first = parseD(m + '-01');
    const startPad = (first.getDay() + 6) % 7; // Monday first
    const daysIn = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startPad; i++) cells.push('<span class="cal-cell empty"></span>');
    for (let d = 1; d <= daysIn; d++) {
      const k = `${m}-${String(d).padStart(2, '0')}`;
      const tasks = App.tasksOn(k);
      const work = st.work.items.filter((w) => w.due === k && w.status !== 'done').length;
      const wo = App.workoutOn(k).finished;
      const study = App.studyMinOn(k) > 0;
      const exam = Object.values(st.study.exams).includes(k);
      cells.push(`<button class="cal-cell ${k === today ? 'today' : ''} ${k === sel ? 'sel' : ''}" data-act="calPick" data-d="${k}">
        <span>${d}</span><i class="dots">${tasks.length ? '<b class="d-task"></b>' : ''}${work ? '<b class="d-work"></b>' : ''}${wo ? '<b class="d-gym"></b>' : ''}${study ? '<b class="d-study"></b>' : ''}${exam ? '<b class="d-exam"></b>' : ''}</i></button>`);
    }
    const tasks = App.tasksOn(sel);
    const work = st.work.items.filter((w) => w.due === sel);
    const wo = App.workoutOn(sel);
    const sm = App.studyMinOn(sel);
    const spent = App.sum(st.money.txns.filter((t) => t.date === sel && t.type === 'expense'), (t) => t.amount);
    const ds = App.dayScore(sel);
    return `
      <section class="card reveal" style="--i:1">
        <div class="month-nav"><button class="icon-btn" data-act="calNav" data-n="-1" aria-label="Previous month">${icon('left')}</button><b>${MON[first.getMonth()]} ${first.getFullYear()}</b><button class="icon-btn" data-act="calNav" data-n="1" aria-label="Next month">${icon('right')}</button></div>
        <div class="cal-grid">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x) => `<span class="cal-h">${x}</span>`).join('')}${cells.join('')}</div>
        <div class="legend mt8"><span><i class="d-task"></i>Tasks</span><span><i class="d-work"></i>Work due</span><span><i class="d-gym"></i>Workout</span><span><i class="d-study"></i>Study</span><span><i class="d-exam"></i>Exam</span></div>
      </section>
      <section class="card reveal" style="--i:2">
        <div class="card-head"><h3>${icon('cal')}${prettyDate(sel)}</h3>${sel <= today ? `<span class="badge">Score ${ds.score}</span>` : ''}</div>
        ${tasks.length ? `<ul class="todo-list">${tasks.map((t) => App.taskItem(t, sel)).join('')}</ul>` : '<p class="muted small">No tasks.</p>'}
        ${work.length ? `<h4 class="group-title">Work<span>${work.length}</span></h4>${work.map((w) => `<div class="mini-row">${App.WORK_KINDS[w.kind].emoji} ${esc(w.title)} <span class="pill">${App.WORK_STATUS[w.status]}</span></div>`).join('')}` : ''}
        <div class="stat-row three mt12">${App.stat('Workout', wo.finished ? '✅' : App.WEEK[parseD(sel).getDay()] === 'rest' ? 'Rest' : `${wo.doneSets}/${wo.total}`)}${App.stat('Study', App.fmtMin(sm))}${App.stat('Spent', App.inr(spent))}</div>
        <button class="btn btn-soft btn-block mt12" data-act="addTask" data-date="${sel}">${icon('plus')}Add task on this day</button>
      </section>`;
  }

  function renderRoutine() {
    const r = App.state.routine.slice().sort((a, b) => toMin(a.start) - toMin(b.start));
    return `
      <p class="section-note reveal" style="--i:1">${icon('info')}<span>Your daily template. Timings change? Edit any block. Work shift, gym and study blocks show on the dashboard and timeline.</span></p>
      <section class="card list-card reveal" style="--i:2">${r.map((b) => { const ty = TYPES[b.type] || TYPES.self; return `
        <button class="txn" data-act="editBlock" data-id="${b.id}" data-flip="b${b.id}"><span class="cat-e" style="--c:${ty.c}">${icon(ty.ic)}</span>
          <span class="grow ta-l"><b>${esc(b.title)}</b><small class="muted block">${fmtTime(b.start)} – ${fmtTime(b.end)} · ${ty.label}</small></span>${icon('edit')}</button>`; }).join('')}</section>
      <div class="row gap"><button class="btn btn-primary grow" data-act="editBlock">${icon('plus')}Add block</button><button class="btn btn-ghost" data-act="resetRoutine">${icon('refresh')}Reset</button></div>`;
  }

  function render() {
    const tab = App.ui.planTab;
    const body = { today: renderToday, tasks: renderTasks, calendar: renderCalendar, routine: renderRoutine }[tab] || renderToday;
    return `
      ${App.header('Plan', 'Routine · Tasks · Calendar', `<button class="fab-sm" data-act="addTask" aria-label="Add task">${icon('plus')}</button>`)}
      <div class="reveal" style="--i:0">${App.seg('tab', [{ value: 'today', label: 'Today' }, { value: 'tasks', label: 'Tasks' }, { value: 'calendar', label: 'Calendar' }, { value: 'routine', label: 'Routine' }].map((o) => o), tab).replace(/data-act="tab"/g, 'data-act="tab" data-k="planTab"')}</div>
      <div class="stack mt12">${body()}</div>`;
  }

  /* ---------- actions ---------- */
  App.actions.todoFilter = (el) => { App.ui.todoFilter = el.dataset.v; App.render({ quiet: true }); };
  App.actions.calPick = (el) => { App.ui.calDay = el.dataset.d; App.buzz(4); App.render({ quiet: true }); };
  App.actions.calNav = (el) => {
    const d = parseD(App.ui.calMonth + '-01');
    d.setMonth(d.getMonth() + +el.dataset.n);
    App.ui.calMonth = App.mkey(d);
    App.render({ quiet: true });
  };

  App.actions.toggleTask = (el) => {
    const t = App.state.tasks.find((x) => x.id === el.dataset.id);
    if (!t) return;
    const date = el.dataset.date || dkey();
    let nowDone;
    if (!t.recur || t.recur === 'none') { t.done = !t.done; t.doneAt = t.done ? dkey() : null; nowDone = t.done; }
    else { t.doneDates = t.doneDates || {}; if (t.doneDates[date]) delete t.doneDates[date]; else t.doneDates[date] = true; nowDone = !!t.doneDates[date]; }
    App.buzz(nowDone ? 20 : 6);
    if (nowDone) {
      el.classList.add('on', 'pop');
      const li = el.closest('.todo, .tl-item');
      li && li.classList.add('done');
      App.toast('+10 XP · task done', 'xp');
      const ds = App.dayScore(date);
      if (ds.tTotal && ds.tDone === ds.tTotal && date === dkey()) setTimeout(() => { App.confetti(); App.toast("All of today's tasks done!"); }, 300);
      setTimeout(() => App.commit(), 320);
    } else App.commit();
  };

  function taskSheet(t, preset = {}) {
    const isNew = !t;
    t = t || { title: '', date: dkey(), time: '', dur: 30, priority: 'med', cat: 'personal', goalId: '', recur: 'none', note: '', ...preset };
    const goals = App.state.goals.filter((g) => !g.done);
    App.sheet({
      title: isNew ? 'New task' : 'Edit task',
      submit: isNew ? 'Add task' : 'Save',
      body: `
        ${App.field('Task', App.input('title', { value: t.title, placeholder: 'What needs to be done?', required: true }))}
        <div class="grid2">${App.field('Date', App.input('date', { type: 'date', value: t.date || '' }), 'Empty = someday')}${App.field('Repeat', App.select('recur', Object.entries(RECUR).map(([value, label]) => ({ value, label })), t.recur || 'none'))}</div>
        <div class="grid2">${App.field('Time (optional)', App.input('time', { type: 'time', value: t.time || '' }), 'Adds it to your timeline')}${App.field('Duration (min)', App.input('dur', { type: 'number', value: t.dur || 30, min: 5, max: 600, inputmode: 'numeric' }))}</div>
        ${App.field('Priority', App.chips('priority', [{ value: 'high', label: '🔴 High' }, { value: 'med', label: '🟡 Medium' }, { value: 'low', label: '🟢 Low' }], t.priority || 'med'))}
        ${App.field('Area', App.chips('cat', Object.entries(CATS).map(([value, label]) => ({ value, label })), t.cat || 'personal'))}
        ${goals.length ? App.field('Link to goal', App.select('goalId', [{ value: '', label: 'None' }].concat(goals.map((g) => ({ value: g.id, label: g.title }))), t.goalId)) : ''}
        ${App.field('Notes', App.textarea('note', t.note || '', 'Optional', 2))}`,
      danger: isNew ? null : { act: 'deleteTask', label: 'Delete', attrs: `data-id="${t.id}"` },
      onSubmit: (d) => {
        const title = (d.title || '').trim();
        if (!title) return false;
        const obj = { title: title.slice(0, 140), date: d.date || '', time: d.time || '', dur: App.clamp(+d.dur || 30, 5, 600), priority: PRI[d.priority] ? d.priority : 'med',
          cat: CATS[d.cat] ? d.cat : 'personal', goalId: d.goalId || '', recur: RECUR[d.recur] ? d.recur : 'none', note: (d.note || '').slice(0, 500) };
        if (obj.recur !== 'none' && !obj.date) obj.date = dkey();
        if (isNew) App.state.tasks.push({ id: uid(), done: false, doneAt: null, doneDates: {}, created: dkey(), ...obj });
        else Object.assign(t, obj);
        App.toast(isNew ? 'Task added' : 'Task saved');
        App.commit();
      },
    });
  }
  App.actions.addTask = (el) => taskSheet(null, el && el.dataset && el.dataset.date ? { date: el.dataset.date } : el && el.dataset && el.dataset.goal ? { goalId: el.dataset.goal } : {});
  App.actions.editTask = (el) => taskSheet(App.state.tasks.find((x) => x.id === el.dataset.id));
  App.actions.deleteTask = (el) => {
    if (!confirm('Delete this task?')) return;
    App.state.tasks = App.state.tasks.filter((x) => x.id !== el.dataset.id);
    App.closeSheet();
    App.toast('Task deleted');
    App.commit();
  };
  App.actions.moveMissed = () => {
    const today = dkey();
    let n = 0;
    App.state.tasks.forEach((t) => { if ((!t.recur || t.recur === 'none') && !t.done && t.date && t.date < today) { t.date = today; n++; } });
    App.toast(`${n} task${n === 1 ? '' : 's'} moved to today`);
    App.commit();
  };

  App.actions.dailyReview = () => {
    const date = dkey();
    const ds = App.dayScore(date);
    const tasks = App.tasksOn(date);
    const done = tasks.filter((t) => App.taskDone(t, date)), missed = tasks.filter((t) => !App.taskDone(t, date));
    const r = App.state.reviews[date] || { mood: '', well: '', improve: '' };
    App.sheet({
      title: `Daily review · ${prettyDate(date)}`,
      submit: 'Save review',
      body: `
        <div class="review-score">${App.ring(ds.score / 100, { size: 86, stroke: 8, grad: 'g-sky', label: `<b>${ds.score}</b>` })}<div><b>Today's score</b><small class="muted block">${ds.parts.filter((p) => p.on).map((p) => `${p.label} ${Math.round(p.value * 100)}%`).join(' · ')}</small></div></div>
        <h4 class="group-title">Completed<span>${done.length}</span></h4>${done.map((t) => `<div class="mini-row ok">✓ ${esc(t.title)}</div>`).join('') || '<p class="muted small">None yet.</p>'}
        <h4 class="group-title neg">Missed<span>${missed.length}</span></h4>${missed.map((t) => `<div class="mini-row bad">• ${esc(t.title)}</div>`).join('') || '<p class="muted small">Nothing missed. Shabaash!</p>'}
        ${App.field('How was today?', App.chips('mood', [{ value: '5', label: '🤩 Great' }, { value: '4', label: '🙂 Good' }, { value: '3', label: '😐 Okay' }, { value: '2', label: '😓 Tough' }], r.mood))}
        ${App.field('What went well?', App.textarea('well', r.well, 'e.g. Hit protein, 40 MCQs', 2))}
        ${App.field('What to improve tomorrow?', App.textarea('improve', r.improve, 'e.g. Less Instagram after work', 2))}
        ${missed.some((t) => !t.recur || t.recur === 'none') ? '<label class="toggle-row"><input type="checkbox" name="carry" checked><span>Move missed one-time tasks to tomorrow</span></label>' : ''}`,
      onSubmit: (d) => {
        App.state.reviews[date] = { mood: d.mood || '', well: (d.well || '').slice(0, 500), improve: (d.improve || '').slice(0, 500), score: ds.score };
        if (d.carry) { const tm = dkey(addDays(new Date(), 1)); missed.forEach((t) => { if (!t.recur || t.recur === 'none') t.date = tm; }); }
        App.toast('Review saved. Kal aur behtar!');
        App.commit();
      },
    });
  };

  App.actions.editBlock = (el) => {
    const b = el.dataset.id ? App.state.routine.find((x) => x.id === el.dataset.id) : null;
    const isNew = !b;
    const v = b || { title: '', start: '09:00', end: '10:00', type: 'self' };
    App.sheet({
      title: isNew ? 'New routine block' : 'Edit block',
      body: `${App.field('Title', App.input('title', { value: v.title, required: true, placeholder: 'e.g. Commute' }))}
        <div class="grid2">${App.field('Start', App.input('start', { type: 'time', value: v.start, required: true }))}${App.field('End', App.input('end', { type: 'time', value: v.end, required: true }), 'Earlier than start = overnight')}</div>
        ${App.field('Type', App.chips('type', Object.entries(TYPES).filter(([k]) => k !== 'task').map(([value, t]) => ({ value, label: t.label })), v.type))}`,
      danger: isNew ? null : { act: 'deleteBlock', label: 'Delete', attrs: `data-id="${v.id}"` },
      onSubmit: (d) => {
        const obj = { title: d.title.trim().slice(0, 60), start: d.start, end: d.end, type: TYPES[d.type] ? d.type : 'self' };
        if (isNew) App.state.routine.push({ id: uid(), ...obj }); else Object.assign(b, obj);
        App.commit();
      },
    });
  };
  App.actions.deleteBlock = (el) => { App.state.routine = App.state.routine.filter((x) => x.id !== el.dataset.id); App.closeSheet(); App.commit(); };
  App.actions.resetRoutine = () => { if (confirm('Reset your routine to the default template?')) { App.state.routine = App.defaultRoutine(); App.commit(); } };

  App.views.plan = { render };
})();
