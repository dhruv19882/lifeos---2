'use strict';
/* Work: tasks from managers, approvals, reimbursements, deadlines, notes, timesheet with clock-in, daily journal,
   generated professional daily summary, professional learning log. */
(function () {
  const { icon, esc, dkey, prettyDate, uid, sum, toMin, fmtTime, inr, parseD, addDays, lastNDays, DOW } = App;
  App.ui.workKind = 'all';
  App.ui.workStatus = 'open';
  App.ui.journalDate = dkey();

  const W = () => App.state.work;
  const hoursOf = (e) => { let m = toMin(e.end) - toMin(e.start); if (m < 0) m += 1440; return m / 60; };
  const hoursOn = (date) => sum(W().time.filter((e) => e.date === date), hoursOf) + (W().clock && W().clock.date === date ? (Date.now() - W().clock.ts) / 3600000 : 0);
  App.workHoursOn = hoursOn;

  function itemRow(w) {
    const k = App.WORK_KINDS[w.kind], today = dkey();
    const late = w.status !== 'done' && w.due && w.due < today;
    return `<div class="work-row ${w.status}" data-flip="w${w.id}">
      <button class="check ${w.status === 'done' ? 'on' : ''}" data-act="workDone" data-id="${w.id}" aria-label="Mark done">${icon('check')}</button>
      <button class="grow ta-l" data-act="editWork" data-id="${w.id}"><b>${k.emoji} ${esc(w.title)}</b>
        <small class="muted block">${esc(w.cat)}${w.from ? ' · from ' + esc(w.from) : ''}${w.amount ? ' · ' + inr(w.amount, true) : ''}${w.due ? ` · <span class="${late ? 'neg' : ''}">due ${prettyDate(w.due)}</span>` : ''}</small></button>
      <button class="pill st-${w.status}" data-act="cycleWork" data-id="${w.id}">${App.WORK_STATUS[w.status]}</button></div>`;
  }

  function render() {
    const tab = App.ui.workTab;
    const body = { today: renderToday, items: renderItems, time: renderTime, journal: renderJournal }[tab] || renderToday;
    const p = App.profile();
    return `
      ${App.header('Work', `${esc(p.role || 'Accounts & Finance')}${p.employer ? ' · ' + esc(p.employer) : ''}`, `<button class="fab-sm" data-act="addWork" aria-label="Add work item">${icon('plus')}</button>`)}
      <div class="reveal" style="--i:0">${App.seg('tab', [{ value: 'today', label: 'Today' }, { value: 'items', label: 'Items' }, { value: 'time', label: 'Timesheet' }, { value: 'journal', label: 'Journal' }], tab).replace(/data-act="tab"/g, 'data-act="tab" data-k="workTab"')}</div>
      <div class="stack mt12">${body()}</div>`;
  }

  function clockCard() {
    const c = W().clock;
    const h = hoursOn(dkey());
    if (c) return `<div class="study-timer work"><span class="pulse-dot red"></span><div class="grow"><b>Clocked in · ${esc(c.cat)}</b><small class="muted block">since ${new Date(c.ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · today ${h.toFixed(1)} h</small></div><button class="btn btn-primary sm" data-act="clockOut">${icon('pause')}Clock out</button></div>`;
    return `<div class="row between"><div><b>${h.toFixed(1)} h</b><small class="muted block">logged today</small></div><button class="btn btn-soft sm" data-act="clockIn">${icon('play')}Clock in</button></div>`;
  }

  function renderToday() {
    const today = dkey(), items = W().items;
    const open = items.filter((w) => w.status !== 'done');
    const dueNow = open.filter((w) => w.due && w.due <= today).sort((a, b) => a.due.localeCompare(b.due));
    const approvals = open.filter((w) => w.kind === 'approval');
    const reimb = open.filter((w) => w.kind === 'reimb');
    const doneToday = items.filter((w) => w.doneAt === today);
    const journal = W().journal[today] || [];
    return `
      <section class="card reveal" style="--i:1">${clockCard()}</section>
      <section class="stat-row four reveal" style="--i:2">
        <button class="stat tap" data-act="workFilter" data-kind="all" data-status="open"><small>Pending</small><b>${open.length}</b></button>
        <button class="stat tap" data-act="workFilter" data-kind="approval" data-status="open"><small>Approvals</small><b class="${approvals.length ? 'warn-t' : ''}">${approvals.length}</b></button>
        <button class="stat tap" data-act="workFilter" data-kind="reimb" data-status="open"><small>Reimburse</small><b>${reimb.length}</b><small class="muted">${inr(sum(reimb, (w) => w.amount))}</small></button>
        <button class="stat tap" data-act="workFilter" data-kind="all" data-status="done"><small>Done today</small><b class="pos">${doneToday.length}</b></button>
      </section>
      <div class="quick-row five reveal" style="--i:3">${Object.entries(App.WORK_KINDS).map(([k, v]) => `<button class="qbtn" data-act="addWork" data-kind="${k}"><span class="qe">${v.emoji}</span><span>${v.label}</span></button>`).join('')}<button class="qbtn" data-act="addWorkNote"><span class="qe">🗒️</span><span>Note</span></button></div>
      <section class="card reveal" style="--i:4"><div class="card-head"><h3>${icon('alert')}Due today & overdue</h3><span class="muted small">${dueNow.length}</span></div>
        ${dueNow.length ? dueNow.map(itemRow).join('') : '<p class="muted small">Nothing urgent. Good position to work ahead.</p>'}</section>
      <section class="card reveal" style="--i:5"><div class="card-head"><h3>${icon('note')}Today's journal</h3><button class="link" data-act="addJournal">${icon('plus')}Add</button></div>
        ${journal.length ? `<ul class="journal">${journal.map((j) => `<li data-flip="j${j.id}"><span class="pill">${esc(j.cat)}</span>${esc(j.text)}<button class="icon-btn sm" data-act="delJournal" data-d="${today}" data-id="${j.id}" aria-label="Delete">${icon('x')}</button></li>`).join('')}</ul>` : '<p class="muted small">Write what you did as you go, e.g. "Reconciled HDFC statement for Oct, 3 differences cleared".</p>'}
        <button class="btn btn-primary btn-block mt12" data-act="workSummary" data-d="${today}">${icon('spark')}Generate daily summary</button></section>`;
  }

  function renderItems() {
    const k = App.ui.workKind, s = App.ui.workStatus;
    const list = W().items.filter((w) => (k === 'all' || w.kind === k) && (s === 'open' ? w.status !== 'done' : w.status === 'done'))
      .sort((a, b) => (s === 'done' ? (b.doneAt || '').localeCompare(a.doneAt || '') : (a.due || '9999').localeCompare(b.due || '9999')));
    return `
      <div class="chips scroll reveal" style="--i:1">${[['all', 'All']].concat(Object.entries(App.WORK_KINDS).map(([key, v]) => [key, v.emoji + ' ' + v.label])).map(([key, l]) => `<button class="pchip ${key === k ? 'on' : ''}" data-act="workFilter" data-kind="${key}" data-status="${s}">${l}</button>`).join('')}</div>
      <div class="reveal" style="--i:2">${App.seg('workStatus', [{ value: 'open', label: 'Open' }, { value: 'done', label: 'Completed' }], s)}</div>
      ${list.length ? `<section class="card list-card reveal" style="--i:3">${list.map(itemRow).join('')}</section>` : App.empty('brief', s === 'done' ? 'Nothing completed yet' : 'All clear', 'Add tasks from your manager, approvals you are waiting on, reimbursements and deadlines.', `<button class="btn btn-primary" data-act="addWork">${icon('plus')}Add item</button>`)}`;
  }

  function renderTime() {
    const days = lastNDays(7);
    const chart = days.map((d) => ({ label: DOW[parseD(d).getDay()][0], value: Math.round(hoursOn(d) * 10) / 10, cls: 'grad-red', on: d === dkey(), title: `${d}: ${hoursOn(d).toFixed(1)} h` }));
    const week = sum(days, hoursOn);
    const entries = W().time.slice().sort((a, b) => b.date.localeCompare(a.date) || toMin(b.start) - toMin(a.start)).slice(0, 30);
    const byCat = {};
    W().time.filter((e) => days.includes(e.date)).forEach((e) => (byCat[e.cat] = (byCat[e.cat] || 0) + hoursOf(e)));
    return `
      <section class="card reveal" style="--i:1">${clockCard()}</section>
      <section class="card reveal" style="--i:2"><div class="card-head"><h3>${icon('chart')}Last 7 days</h3><b>${week.toFixed(1)} h</b></div>
        ${App.barChart(chart, { height: 120, fmt: (v) => v + 'h' })}
        ${Object.keys(byCat).length ? `<div class="cat-list mt12">${Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, h]) => `<div class="row between small"><span>${esc(c)}</span><b>${h.toFixed(1)} h</b></div>`).join('')}</div>` : ''}</section>
      <section class="card reveal" style="--i:3"><div class="card-head"><h3>${icon('clock')}Entries</h3><button class="link" data-act="editTime">${icon('plus')}Add</button></div>
        ${entries.length ? entries.map((e) => `<button class="txn" data-act="editTime" data-id="${e.id}" data-flip="te${e.id}"><span class="cat-e" style="--c:#ef4444">⏱️</span><span class="grow ta-l"><b>${esc(e.desc || e.cat)}</b><small class="muted block">${prettyDate(e.date)} · ${fmtTime(e.start)}–${fmtTime(e.end)} · ${esc(e.cat)}</small></span><b>${hoursOf(e).toFixed(1)} h</b></button>`).join('') : '<p class="muted small">Clock in/out or add entries manually.</p>'}
        <button class="btn btn-ghost btn-block mt12" data-act="exportTimeCsv">${icon('download')}Export timesheet CSV</button></section>`;
  }

  function renderJournal() {
    const d = App.ui.journalDate;
    const j = W().journal[d] || [];
    const notes = W().notes.filter((n) => n.date === d);
    const learn = W().learning.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
    return `
      <div class="month-nav reveal" style="--i:1"><button class="icon-btn" data-act="jNav" data-n="-1" aria-label="Previous day">${icon('left')}</button><b>${prettyDate(d)}</b><button class="icon-btn" data-act="jNav" data-n="1" ${d >= dkey() ? 'disabled' : ''} aria-label="Next day">${icon('right')}</button></div>
      <section class="card reveal" style="--i:2"><div class="card-head"><h3>${icon('note')}What I did</h3><button class="link" data-act="addJournal" data-d="${d}">${icon('plus')}Add</button></div>
        ${j.length ? `<ul class="journal">${j.map((x) => `<li data-flip="j${x.id}"><span class="pill">${esc(x.cat)}</span>${esc(x.text)}<button class="icon-btn sm" data-act="delJournal" data-d="${d}" data-id="${x.id}" aria-label="Delete">${icon('x')}</button></li>`).join('')}</ul>` : '<p class="muted small">No entries for this day.</p>'}</section>
      <section class="card reveal" style="--i:3"><div class="card-head"><h3>${icon('brief')}Work notes</h3><button class="link" data-act="addWorkNote" data-d="${d}">${icon('plus')}Add</button></div>
        ${notes.length ? notes.map((n) => `<div class="note-row" data-flip="n${n.id}"><p>${esc(n.text)}</p><div class="row between"><small class="muted">${esc(n.cat)}</small><button class="icon-btn sm" data-act="delWorkNote" data-id="${n.id}" aria-label="Delete">${icon('x')}</button></div></div>`).join('') : '<p class="muted small">Vendor follow-ups, instructions from your manager, process notes.</p>'}</section>
      <button class="btn btn-primary btn-block reveal" style="--i:4" data-act="workSummary" data-d="${d}">${icon('spark')}Generate summary for ${prettyDate(d)}</button>
      <section class="card reveal" style="--i:5"><div class="card-head"><h3>${icon('graduation')}Professional learning</h3><button class="link" data-act="addLearning">${icon('plus')}Add</button></div>
        ${learn.length ? learn.map((l) => `<div class="mini-row">📘 <b>${esc(l.topic)}</b> <small class="muted">${prettyDate(l.date)} · ${App.fmtMin(l.minutes)}</small>${l.note ? `<small class="muted block">${esc(l.note)}</small>` : ''}</div>`).join('') : '<p class="muted small">e.g. "Learned 1099-NEC vs 1099-MISC rules", "QuickBooks bank rules".</p>'}</section>`;
  }

  /* ---------- summary generator ---------- */
  function buildSummary(date) {
    const p = App.profile(), w = W();
    const j = w.journal[date] || [];
    const done = w.items.filter((x) => x.doneAt === date);
    const open = w.items.filter((x) => x.status !== 'done');
    const time = w.time.filter((e) => e.date === date).sort((a, b) => toMin(a.start) - toMin(b.start));
    const hrs = hoursOn(date);
    const notes = w.notes.filter((n) => n.date === date);
    const d = parseD(date);
    const groups = {};
    j.forEach((x) => (groups[x.cat] = groups[x.cat] || []).push(x.text));
    done.forEach((x) => (groups[x.cat] = groups[x.cat] || []).push(`${x.title}${x.kind === 'reimb' && x.amount ? ` (${inr(x.amount, true)})` : ''}${x.kind === 'approval' ? ' (approval received)' : ''}`));
    const L = [];
    L.push(`Daily Work Summary: ${App.DOW_FULL[d.getDay()]}, ${d.getDate()} ${App.MON[d.getMonth()]} ${d.getFullYear()}`);
    L.push(`${p.name}${p.role ? ' · ' + p.role : ''}${p.employer ? ' · ' + p.employer : ''}`);
    L.push('');
    if (hrs > 0) L.push(`Hours logged: ${hrs.toFixed(1)} h${time.length ? ` (${fmtTime(time[0].start)} – ${fmtTime(time[time.length - 1].end)})` : ''}`);
    L.push('');
    L.push('Completed:');
    const cats = Object.keys(groups);
    if (cats.length) cats.forEach((c) => { L.push(`  ${c}`); groups[c].forEach((t) => L.push(`   • ${t}`)); });
    else L.push('   • (no entries recorded)');
    const doing = open.filter((x) => x.status === 'doing');
    const waiting = open.filter((x) => x.status === 'waiting' || x.kind === 'approval');
    if (doing.length) { L.push(''); L.push('In progress:'); doing.forEach((x) => L.push(`   • ${x.title}${x.due ? ` (due ${prettyDate(x.due)})` : ''}`)); }
    if (waiting.length) { L.push(''); L.push('Pending / awaiting approval:'); waiting.forEach((x) => L.push(`   • ${x.title}${x.from ? ` (${x.from})` : ''}`)); }
    const reimb = open.filter((x) => x.kind === 'reimb');
    if (reimb.length) L.push(`\nReimbursements pending: ${reimb.length} (${inr(sum(reimb, (x) => x.amount), true)})`);
    const upcoming = open.filter((x) => x.due && x.due > date && x.due <= dkey(addDays(parseD(date), 7))).sort((a, b) => a.due.localeCompare(b.due));
    if (upcoming.length) { L.push(''); L.push('Upcoming deadlines:'); upcoming.forEach((x) => L.push(`   • ${x.title} (${prettyDate(x.due)})`)); }
    if (notes.length) { L.push(''); L.push('Notes:'); notes.forEach((n) => L.push(`   • ${n.text}`)); }
    return L.join('\n').replace(/\n{3,}/g, '\n\n');
  }
  App.buildWorkSummary = buildSummary;
  App.actions.workSummary = (el) => {
    const d = el.dataset.d || dkey();
    const text = buildSummary(d);
    App.ui.lastSummary = text;
    App.sheet({
      title: 'Daily work summary',
      cls: 'sheet-tall',
      body: `<p class="muted small">Generated from your journal, completed items, timesheet and notes. Edit before sending.</p><textarea class="inp summary-box" id="sumBox" rows="16">${esc(text)}</textarea>`,
      foot: `<button type="button" class="btn btn-ghost grow" data-act="shareSummary">${icon('share')}Share</button><button type="button" class="btn btn-primary grow" data-act="copySummary">${icon('copy')}Copy</button>`,
    });
  };
  App.actions.copySummary = () => App.copyText(document.getElementById('sumBox').value);
  App.actions.shareSummary = () => { const t = document.getElementById('sumBox').value; if (navigator.share) navigator.share({ title: 'Daily work summary', text: t }).catch(() => {}); else App.copyText(t); };

  /* ---------- item actions ---------- */
  function workSheet(w, preset = {}) {
    const isNew = !w;
    w = w || { kind: 'task', title: '', from: '', due: '', status: 'todo', cat: 'Other', amount: '', note: '', ...preset };
    App.sheet({
      title: isNew ? `New ${App.WORK_KINDS[w.kind].label.toLowerCase()}` : 'Edit work item',
      cls: 'sheet-tall',
      body: `
        ${App.field('Type', App.chips('kind', Object.entries(App.WORK_KINDS).map(([value, v]) => ({ value, label: `${v.emoji} ${v.label}` })), w.kind))}
        ${App.field('Title', App.input('title', { value: w.title, required: true, placeholder: 'e.g. Verify 1099 for vendor XYZ' }))}
        ${App.field('Area', App.select('cat', App.WORK_CATS.map((c) => ({ value: c, label: c })), w.cat))}
        <div class="grid2">${App.field('Assigned by / with', App.input('from', { value: w.from, placeholder: 'Manager or vendor' }))}${App.field('Due date', App.input('due', { type: 'date', value: w.due }))}</div>
        <div class="grid2">${App.field('Status', App.select('status', Object.entries(App.WORK_STATUS).map(([value, label]) => ({ value, label })), w.status))}${App.field('Amount (₹, optional)', App.input('amount', { type: 'number', value: w.amount, min: 0, step: 'any', inputmode: 'decimal' }), 'For reimbursements')}</div>
        ${App.field('Notes', App.textarea('note', w.note, 'Details, reference numbers…', 2))}
        <p class="field-hint">Avoid storing confidential data like full bank account or tax ID numbers.</p>`,
      danger: isNew ? null : { act: 'delWork', label: 'Delete', attrs: `data-id="${w.id}"` },
      onSubmit: (d) => {
        const obj = { kind: App.WORK_KINDS[d.kind] ? d.kind : 'task', title: d.title.trim().slice(0, 120), cat: App.WORK_CATS.includes(d.cat) ? d.cat : 'Other', from: (d.from || '').slice(0, 60), due: d.due || '', status: App.WORK_STATUS[d.status] ? d.status : 'todo', amount: +d.amount > 0 ? Math.round(+d.amount * 100) / 100 : '', note: (d.note || '').slice(0, 600) };
        if (obj.status === 'done' && (isNew || w.status !== 'done')) obj.doneAt = dkey();
        if (obj.status !== 'done') obj.doneAt = null;
        if (isNew) W().items.push({ id: uid(), created: dkey(), ...obj }); else Object.assign(w, obj);
        App.toast(isNew ? 'Added to work' : 'Saved');
        App.commit();
      },
    });
  }
  App.actions.addWork = (el) => workSheet(null, el && el.dataset && el.dataset.kind ? { kind: el.dataset.kind } : {});
  App.actions.editWork = (el) => workSheet(W().items.find((x) => x.id === el.dataset.id));
  App.actions.delWork = (el) => { if (!confirm('Delete this item?')) return; W().items = W().items.filter((x) => x.id !== el.dataset.id); App.closeSheet(); App.commit(); };
  App.actions.workDone = (el) => {
    const w = W().items.find((x) => x.id === el.dataset.id);
    if (w.status === 'done') { w.status = 'todo'; w.doneAt = null; App.commit(); return; }
    w.status = 'done'; w.doneAt = dkey();
    el.classList.add('on', 'pop');
    App.buzz(20);
    App.toast('+10 XP · work item done', 'xp');
    setTimeout(() => App.commit(), 300);
  };
  App.actions.cycleWork = (el) => {
    const w = W().items.find((x) => x.id === el.dataset.id);
    const order = ['todo', 'doing', 'waiting', 'done'];
    w.status = order[(order.indexOf(w.status) + 1) % order.length];
    w.doneAt = w.status === 'done' ? dkey() : null;
    App.buzz(6);
    App.commit();
  };
  App.actions.workFilter = (el) => { App.ui.workKind = el.dataset.kind; App.ui.workStatus = el.dataset.status; App.ui.workTab = 'items'; App.render({ quiet: true }); };
  App.actions.workStatus = (el) => { App.ui.workStatus = el.dataset.v; App.render({ quiet: true }); };

  /* ---------- journal / notes / learning ---------- */
  App.actions.addJournal = (el) => {
    const d = (el && el.dataset && el.dataset.d) || dkey();
    App.sheet({
      title: 'Journal entry',
      body: `${App.field('What did you do?', App.textarea('text', '', 'e.g. Processed 12 expense reimbursements for project Alpha', 3))}${App.field('Area', App.select('cat', App.WORK_CATS.map((c) => ({ value: c, label: c })), 'Other'))}`,
      onSubmit: (f) => { const t = (f.text || '').trim(); if (!t) { App.toast('Write something first', 'bad'); return false; } (W().journal[d] = W().journal[d] || []).push({ id: uid(), text: t.slice(0, 400), cat: f.cat }); App.commit(); },
    });
  };
  App.actions.delJournal = (el) => { const d = el.dataset.d; W().journal[d] = (W().journal[d] || []).filter((x) => x.id !== el.dataset.id); App.commit(); };
  App.actions.addWorkNote = (el) => {
    const d = (el && el.dataset && el.dataset.d) || dkey();
    App.sheet({
      title: 'Work note',
      body: `${App.field('Note', App.textarea('text', '', 'Instructions, follow-ups, process notes…', 4))}${App.field('Area', App.select('cat', App.WORK_CATS.map((c) => ({ value: c, label: c })), 'Other'))}`,
      onSubmit: (f) => { const t = (f.text || '').trim(); if (!t) { App.toast('Write something first', 'bad'); return false; } W().notes.push({ id: uid(), date: d, text: t.slice(0, 1000), cat: f.cat }); App.toast('Note saved'); App.commit(); },
    });
  };
  App.actions.delWorkNote = (el) => { W().notes = W().notes.filter((x) => x.id !== el.dataset.id); App.commit(); };
  App.actions.addLearning = () => App.sheet({
    title: 'Professional learning',
    body: `${App.field('Topic', App.input('topic', { required: true, placeholder: 'e.g. W-8BEN for foreign vendors' }))}<div class="grid2">${App.field('Minutes', App.input('minutes', { type: 'number', value: 30, min: 1, inputmode: 'numeric' }))}${App.field('Date', App.input('date', { type: 'date', value: dkey(), max: dkey() }))}</div>${App.field('Key takeaway', App.input('note', { placeholder: 'One line' }))}`,
    onSubmit: (d) => { W().learning.push({ id: uid(), topic: d.topic.trim().slice(0, 80), minutes: Math.max(1, +d.minutes || 30), date: d.date || dkey(), note: (d.note || '').slice(0, 200) }); App.commit(); },
  });
  App.actions.jNav = (el) => { const d = addDays(parseD(App.ui.journalDate), +el.dataset.n); if (dkey(d) > dkey()) return; App.ui.journalDate = dkey(d); App.render({ quiet: true }); };

  /* ---------- timesheet ---------- */
  App.actions.clockIn = () => App.sheet({
    title: 'Clock in',
    submit: 'Start',
    body: App.field('Working on', App.select('cat', App.WORK_CATS.map((c) => ({ value: c, label: c })), 'Other')),
    onSubmit: (d) => { W().clock = { ts: Date.now(), date: dkey(), cat: d.cat }; App.toast('Clocked in'); App.commit(); },
  });
  App.actions.clockOut = () => {
    const c = W().clock;
    const s = new Date(c.ts), e = new Date();
    const hm = (x) => x.toTimeString().slice(0, 5);
    W().clock = null;
    W().time.push({ id: uid(), date: dkey(s), start: hm(s), end: hm(e), cat: c.cat, desc: '' });
    App.toast(`Logged ${((e - s) / 3600000).toFixed(1)} h`);
    App.commit();
  };
  App.actions.editTime = (el) => {
    const e = el.dataset.id ? W().time.find((x) => x.id === el.dataset.id) : null;
    const v = e || { date: dkey(), start: App.state.routine.find((b) => b.type === 'work')?.start || '14:00', end: App.state.routine.find((b) => b.type === 'work')?.end || '23:00', cat: 'Other', desc: '' };
    App.sheet({
      title: e ? 'Edit time entry' : 'Add time entry',
      body: `${App.field('Date', App.input('date', { type: 'date', value: v.date, max: dkey(), required: true }))}
        <div class="grid2">${App.field('Start', App.input('start', { type: 'time', value: v.start, required: true }))}${App.field('End', App.input('end', { type: 'time', value: v.end, required: true }), 'Past midnight is fine')}</div>
        ${App.field('Area', App.select('cat', App.WORK_CATS.map((c) => ({ value: c, label: c })), v.cat))}${App.field('Description', App.input('desc', { value: v.desc, placeholder: 'Optional' }))}`,
      danger: e ? { act: 'delTime', label: 'Delete', attrs: `data-id="${e.id}"` } : null,
      onSubmit: (d) => {
        const obj = { date: d.date, start: d.start, end: d.end, cat: d.cat, desc: (d.desc || '').slice(0, 120) };
        if (hoursOf(obj) > 16) { App.toast('That entry is over 16 hours. Check the times', 'bad'); return false; }
        if (e) Object.assign(e, obj); else W().time.push({ id: uid(), ...obj });
        App.commit();
      },
    });
  };
  App.actions.delTime = (el) => { W().time = W().time.filter((x) => x.id !== el.dataset.id); App.closeSheet(); App.commit(); };
  App.actions.exportTimeCsv = () => {
    const rows = [['Date', 'Start', 'End', 'Hours', 'Area', 'Description']].concat(W().time.slice().sort((a, b) => a.date.localeCompare(b.date)).map((e) => [e.date, e.start, e.end, hoursOf(e).toFixed(2), e.cat, e.desc]));
    App.download(`lifeos-timesheet-${dkey()}.csv`, App.csv(rows), 'text/csv');
  };

  App.views.work = { render };
})();
