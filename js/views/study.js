'use strict';
/* Study: US CMA Part 1/2 chapter tracker, study sessions + timer, Hock MCQ analytics, mocks, weak topics,
   exam countdowns, notes, and B.Com backlog subjects. */
(function () {
  const { icon, esc, dkey, prettyDate, uid, sum, daysBetween, lastNDays, parseD, DOW } = App;
  App.ui.cmaPart = 'p1';
  App.ui.openSec = {};

  const SUBJECTS = { p1: 'CMA Part 1', p2: 'CMA Part 2', bm: 'Business Mathematics', be: 'Business Economics' };
  const TYPES = { study: '📖 Study', mcq: '📝 MCQs', revision: '🔁 Revision', mock: '🧪 Mock' };
  const STATE = { none: { label: 'Not started', cls: '' }, learning: { label: 'Learning', cls: 'warn' }, done: { label: 'Completed', cls: 'ok' } };
  const allSections = () => App.CMA.p1.sections.concat(App.CMA.p2.sections);
  const secOf = (id) => allSections().find((s) => s.id === id);

  function stats(filter = () => true) {
    const ss = App.state.study.sessions.filter(filter);
    const att = sum(ss, (s) => s.attempted), cor = sum(ss, (s) => s.correct);
    return { minutes: sum(ss, (s) => s.minutes), attempted: att, correct: cor, wrong: att - cor, acc: att ? cor / att : null, n: ss.length };
  }
  const secStats = (id) => stats((s) => s.section === id);
  App.studyStats = stats;

  function weakTopics() {
    return allSections().map((s) => ({ s, st: secStats(s.id), flagged: !!(App.state.study.status[s.id] || {}).weak }))
      .filter((x) => x.flagged || (x.st.attempted >= 20 && x.st.acc < 0.65))
      .sort((a, b) => (a.st.acc ?? 1) - (b.st.acc ?? 1));
  }

  function countdown(k) {
    const d = App.state.study.exams[k];
    if (!d) return `<button class="cd-card empty" data-act="setExam" data-k="${k}"><small>${SUBJECTS[k]}</small><b>Set exam date</b></button>`;
    const n = daysBetween(dkey(), d);
    return `<button class="cd-card ${n < 0 ? 'past' : n <= 30 ? 'soon' : ''}" data-act="setExam" data-k="${k}"><small>${SUBJECTS[k]}</small><b>${n < 0 ? 'Done' : App.count(n, { key: 'cd' + k })}</b><span>${n < 0 ? prettyDate(d) : n === 1 ? 'day left' : 'days left'}</span></button>`;
  }

  function timerCard() {
    const t = App.state.study.timer;
    if (!t) return `<button class="btn btn-soft btn-block" data-act="startStudyTimer">${icon('play')}Start study timer</button>`;
    const mins = Math.floor((Date.now() - t.start) / 60000);
    return `<div class="study-timer"><span class="pulse-dot"></span><div class="grow"><b>Studying ${SUBJECTS[t.subject]}</b><small class="muted block">Started ${new Date(t.start).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · ${App.fmtMin(mins)}</small></div><button class="btn btn-primary sm" data-act="stopStudyTimer">${icon('pause')}Stop & log</button></div>`;
  }

  function render() {
    const tab = App.ui.studyTab;
    const body = { cma: renderCma, practice: renderPractice, mocks: renderMocks, backlog: renderBacklog }[tab] || renderCma;
    return `
      ${App.header('Study', 'US CMA · B.Com', `<button class="fab-sm" data-act="addSession" aria-label="Add study session">${icon('plus')}</button>`)}
      <div class="reveal" style="--i:0">${App.seg('tab', [{ value: 'cma', label: 'CMA' }, { value: 'practice', label: 'Analytics' }, { value: 'mocks', label: 'Mocks' }, { value: 'backlog', label: 'B.Com' }], tab).replace(/data-act="tab"/g, 'data-act="tab" data-k="studyTab"')}</div>
      <div class="stack mt12">${body()}</div>`;
  }

  function renderCma() {
    const pk = App.ui.cmaPart, part = App.CMA[pk], st = App.state.study;
    const prog = App.partProgress(pk);
    const done = part.sections.reduce((a, s) => a + s.ch.filter((c) => App.chapterState(c.id) === 'done').length, 0);
    const total = part.sections.reduce((a, s) => a + s.ch.length, 0);
    const today = App.studyMinOn(dkey());
    return `
      <div class="cd-row reveal" style="--i:1">${countdown('p1')}${countdown('p2')}</div>
      <section class="card reveal" style="--i:2">${timerCard()}
        <div class="row between small mt8"><span class="muted">Today ${App.fmtMin(today)} / ${App.fmtMin(App.state.settings.studyTarget)}</span><span class="muted">Streak ${App.streaks()[1].n} days</span></div>
        ${App.bar(today / App.state.settings.studyTarget, 'violet', 'thin', 'studytoday')}</section>
      <div class="reveal" style="--i:3">${App.seg('cmaPart', [{ value: 'p1', label: 'Part 1' }, { value: 'p2', label: 'Part 2' }], pk)}</div>
      <section class="card hero reveal" style="--i:4">
        <div class="hero-main">${App.ring(prog, { size: 110, stroke: 11, grad: 'g-violet', key: 'part' + pk, label: App.count(Math.round(prog * 100), { suffix: '%', key: 'part' + pk }), sub: st.passed[pk] ? 'Passed 🎉' : 'weighted' })}
          <div class="hero-side"><b>${part.title}</b><small class="muted">${done}/${total} chapters completed</small>
            <label class="toggle-row small"><input type="checkbox" data-change="passPart" data-k="${pk}" ${st.passed[pk] ? 'checked' : ''}><span>I passed ${part.name}</span></label></div></div>
      </section>
      ${part.sections.map((s, i) => {
        const sp = App.sectionProgress(s), ss = secStats(s.id), open = App.ui.openSec[s.id], meta = st.status[s.id] || {};
        return `<article class="card sec-card ${open ? 'open' : ''} reveal" style="--i:${i + 5}">
          <button class="ex-head" data-act="toggleSec" data-id="${s.id}">
            ${App.ring(sp, { size: 44, stroke: 5, grad: sp >= 1 ? 'g-green' : 'g-violet', key: 'sec' + s.id, label: `<b class="small">${s.code}</b>` })}
            <span class="grow ta-l"><b>${esc(s.name)}</b><small class="muted block">${s.weight}% of exam · ${Math.round(sp * 100)}%${ss.attempted ? ` · ${Math.round(ss.acc * 100)}% accuracy` : ''}${meta.weak ? ' · ⚠️ weak' : ''}</small></span>
            <span class="chev">${icon('down')}</span></button>
          <div class="ex-body"><div class="ex-inner">
            ${s.ch.map((c) => { const cs = st.status[c.id] || {}; const stt = cs.state || 'none'; return `<div class="ch-row ${stt}" data-flip="ch${c.id}">
              <button class="ch-state" data-act="cycleChapter" data-id="${c.id}" aria-label="Change status">${stt === 'done' ? icon('check') : stt === 'learning' ? '◐' : ''}</button>
              <div class="grow"><b>${esc(c.name)}</b><small class="muted block">${STATE[stt].label}${cs.revisions ? ` · revised ${cs.revisions}×` : ''}${cs.doneAt ? ` · ${prettyDate(cs.doneAt)}` : ''}</small></div>
              ${stt === 'done' ? `<button class="btn btn-ghost sm" data-act="reviseChapter" data-id="${c.id}">${icon('repeat')}Revise</button>` : ''}</div>`; }).join('')}
            <div class="stat-row three mt8">${App.stat('Study', App.fmtMin(ss.minutes))}${App.stat('MCQs', `${ss.correct}/${ss.attempted}`)}${App.stat('Accuracy', ss.acc == null ? '—' : Math.round(ss.acc * 100) + '%')}</div>
            <div class="row gap mt8"><button class="btn btn-soft sm grow" data-act="addSession" data-section="${s.id}">${icon('plus')}Log session</button><button class="btn btn-ghost sm" data-act="secNotes" data-id="${s.id}">${icon('note')}Notes${meta.notes ? ' •' : ''}</button><button class="btn btn-ghost sm ${meta.weak ? 'danger' : ''}" data-act="toggleWeak" data-id="${s.id}">${icon('alert')}${meta.weak ? 'Weak' : 'Mark weak'}</button></div>
          </div></div></article>`;
      }).join('')}
      <p class="section-note">${icon('info')}<span>Tap a chapter's circle to cycle: not started → learning → completed. Sections follow the IMA content outline used by Hock.</span></p>`;
  }

  function renderPractice() {
    const all = stats();
    const st = App.state.study;
    const chs = Object.entries(st.status).filter(([k]) => k.includes('.'));
    const doneCh = chs.filter(([, v]) => v.state === 'done').length;
    const revised = chs.filter(([, v]) => v.revisions).length;
    const totalCh = allSections().reduce((a, s) => a + s.ch.length, 0);
    const week = lastNDays(14).map((d) => ({ label: DOW[parseD(d).getDay()][0], value: Math.round(App.studyMinOn(d)), cls: 'grad-violet', on: d === dkey(), title: `${d}: ${App.fmtMin(App.studyMinOn(d))}` }));
    const acc7 = stats((s) => daysBetween(s.date, dkey()) < 7);
    const weak = weakTopics();
    const recent = st.sessions.slice().sort((a, b) => b.date.localeCompare(a.date) || (b.ts || 0) - (a.ts || 0)).slice(0, 12);
    return `
      <section class="card hero reveal" style="--i:1">
        <div class="hero-main">${App.ring(all.acc || 0, { size: 116, stroke: 11, grad: (all.acc || 0) >= 0.75 ? 'g-green' : (all.acc || 0) >= 0.6 ? 'g-warm' : 'g-red', key: 'acc', label: all.acc == null ? '—' : App.count(Math.round(all.acc * 100), { suffix: '%', key: 'acc' }), sub: 'MCQ accuracy' })}
          <div class="hero-side"><div class="mini-stat"><span class="dot" style="--c:#a78bfa"></span><div><b>${(all.minutes / 60).toFixed(1)} h</b><small>Total study</small></div></div>
            <div class="mini-stat"><span class="dot" style="--c:#38bdf8"></span><div><b>${App.num(all.attempted)}</b><small>Questions attempted</small></div></div>
            <div class="mini-stat"><span class="dot" style="--c:#22c55e"></span><div><b>${App.num(all.correct)} <small class="muted">/ ${App.num(all.wrong)} wrong</small></b><small>Correct answers</small></div></div></div></div>
      </section>
      <section class="card reveal" style="--i:2"><div class="stat-row four">${App.stat('Chapters', `${doneCh}/${totalCh}`)}${App.stat('Revised', revised)}${App.stat('Sessions', all.n)}${App.stat('7-day acc.', acc7.acc == null ? '—' : Math.round(acc7.acc * 100) + '%')}</div></section>
      <section class="card reveal" style="--i:3"><div class="card-head"><h3>${icon('chart')}Study minutes · 14 days</h3><span class="muted small">target ${App.fmtMin(App.state.settings.studyTarget)}</span></div>
        ${App.barChart(week, { height: 120, lines: [{ v: App.state.settings.studyTarget, cls: 'ok', label: 'Target' }], fmt: (v) => (v >= 60 ? (v / 60).toFixed(1) + 'h' : v + 'm') })}</section>
      <section class="card reveal" style="--i:4"><div class="card-head"><h3>${icon('alert')}Weak topics</h3><small class="muted">&lt;65% with 20+ MCQs, or flagged</small></div>
        ${weak.length ? weak.map((w) => `<div class="weak-row"><b>${w.s.id.slice(0, 2).toUpperCase()}-${w.s.code} ${esc(w.s.name)}</b><span class="pill ${w.st.acc != null && w.st.acc < 0.5 ? 'bad' : 'warn'}">${w.st.acc == null ? 'flagged' : Math.round(w.st.acc * 100) + '% · ' + w.st.attempted + ' Q'}</span></div>`).join('') : '<p class="muted small">No weak topics yet. Log MCQ sessions with correct answers to find them.</p>'}</section>
      <section class="card reveal" style="--i:5"><div class="card-head"><h3>${icon('list')}Recent sessions</h3><button class="link" data-act="addSession">${icon('plus')}Log</button></div>
        ${recent.length ? recent.map((s) => { const sec = secOf(s.section); return `<button class="txn" data-act="editSession" data-id="${s.id}" data-flip="s${s.id}"><span class="cat-e" style="--c:#a78bfa">${TYPES[s.type].split(' ')[0]}</span>
          <span class="grow ta-l"><b>${SUBJECTS[s.subject]}${sec ? ` · ${sec.code}. ${esc(sec.name)}` : ''}</b><small class="muted block">${prettyDate(s.date)} · ${App.fmtMin(s.minutes)}${s.attempted ? ` · ${s.correct}/${s.attempted} correct (${Math.round((s.correct / s.attempted) * 100)}%)` : ''}</small></span></button>`; }).join('') : App.empty('book', 'No sessions yet', 'Start the timer or log a session after studying.')}</section>`;
  }

  function renderMocks() {
    const m = App.state.study.mocks.slice().sort((a, b) => a.date.localeCompare(b.date));
    const by = (pk) => m.filter((x) => x.part === pk);
    return `
      <p class="section-note reveal" style="--i:1">${icon('info')}<span>The CMA exam is scaled to 500; the pass mark is 360 (72%). Treat mock % as a rough guide, aim for 75%+.</span></p>
      ${['p1', 'p2'].map((pk, i) => { const xs = by(pk); const best = xs.length ? Math.max(...xs.map((x) => x.score)) : null; return `<section class="card reveal" style="--i:${i + 2}">
        <div class="card-head"><h3>${icon('trophy')}${SUBJECTS[pk]} mocks</h3>${best != null ? `<span class="badge ${best >= 72 ? 'ok' : 'warn'}">Best ${best}%</span>` : ''}</div>
        ${xs.length >= 2 ? App.lineChart(xs.map((x) => ({ v: x.score, label: x.date })), { height: 130, target: 72, targetLabel: 'Pass', fmt: (v) => Math.round(v) + '%' }) : ''}
        ${xs.length ? xs.slice().reverse().map((x) => `<button class="txn" data-act="editMock" data-id="${x.id}" data-flip="m${x.id}"><span class="cat-e" style="--c:${x.score >= 72 ? '#22c55e' : '#f59e0b'}">${x.score >= 72 ? '✅' : '🧪'}</span><span class="grow ta-l"><b>${x.score}%${x.correct ? ` · ${x.correct}/${x.total}` : ''}</b><small class="muted block">${prettyDate(x.date)}${x.note ? ' · ' + esc(x.note) : ''}</small></span></button>`).join('') : '<p class="muted small">No mocks yet.</p>'}
        <button class="btn btn-soft btn-block mt12" data-act="editMock" data-part="${pk}">${icon('plus')}Add mock score</button></section>`; }).join('')}`;
  }

  function renderBacklog() {
    const st = App.state.study;
    return `<p class="section-note reveal" style="--i:1">${icon('info')}<span>Clear these two papers alongside CMA. Set your exam dates when they're announced.</span></p>
      <div class="cd-row reveal" style="--i:2">${countdown('bm')}${countdown('be')}</div>
      ${Object.entries(App.BACKLOG).map(([k, b], i) => {
        const units = (st.backlog || {})[k] || [];
        const p = App.backlogProgress(k);
        const mins = stats((s) => s.subject === k).minutes;
        return `<section class="card reveal" style="--i:${i + 3}">
          <div class="card-head"><h3>${k === 'bm' ? '➗' : '📉'} ${b.name}</h3><span class="badge ${st.passed[k] ? 'ok' : ''}">${st.passed[k] ? 'Cleared' : Math.round(p * 100) + '%'}</span></div>
          ${App.bar(p, 'violet', '', 'bl' + k)}
          <div class="unit-list mt12">${units.map((u) => `<label class="unit ${u.done ? 'done' : ''}" data-flip="u${u.id}"><input type="checkbox" data-change="toggleUnit" data-k="${k}" data-id="${u.id}" ${u.done ? 'checked' : ''}><span class="check sm ${u.done ? 'on' : ''}">${icon('check')}</span><span>${esc(u.title)}</span></label>`).join('')}</div>
          <div class="row between small mt8"><span class="muted">${App.fmtMin(mins)} studied</span><button class="link" data-act="editUnits" data-k="${k}">${icon('edit')}Edit units</button></div>
          <div class="row gap mt12"><button class="btn btn-soft sm grow" data-act="addSession" data-subject="${k}">${icon('plus')}Log session</button>
            <label class="toggle-row small"><input type="checkbox" data-change="passPart" data-k="${k}" ${st.passed[k] ? 'checked' : ''}><span>Cleared</span></label></div></section>`;
      }).join('')}`;
  }

  /* ---------- actions ---------- */
  App.actions.cmaPart = (el) => { App.ui.cmaPart = el.dataset.v; App.render({ quiet: true }); };
  App.actions.toggleSec = (el) => { App.ui.openSec[el.dataset.id] = !App.ui.openSec[el.dataset.id]; el.closest('.sec-card').classList.toggle('open'); };
  App.actions.cycleChapter = (el) => {
    const id = el.dataset.id;
    const st = App.state.study.status;
    const cur = (st[id] = st[id] || { state: 'none', revisions: 0 });
    const next = { none: 'learning', learning: 'done', done: 'none' }[cur.state || 'none'];
    if (next === 'none' && !confirm('Reset this chapter to "not started"?')) return;
    cur.state = next;
    cur.doneAt = next === 'done' ? dkey() : null;
    if (next !== 'done') cur.revisions = 0;
    App.buzz(next === 'done' ? [20, 40, 20] : 6);
    App.commit();
    if (next === 'done') {
      const [secId] = id.split('.');
      const sec = secOf(secId);
      const ch = sec.ch.find((c) => c.id === id);
      const secDone = sec.ch.every((c) => App.chapterState(c.id) === 'done');
      App.unlockOverlay({ kind: 'chapter', title: ch.name, sub: secDone ? `Section ${sec.code} complete!` : `${sec.code}. ${sec.name}`, emoji: secDone ? '🏅' : '📗', xp: 40 });
    }
  };
  App.actions.reviseChapter = (el) => {
    const c = App.state.study.status[el.dataset.id];
    c.revisions = (c.revisions || 0) + 1;
    c.revisedAt = dkey();
    App.toast(`Revision ${c.revisions} logged${c.revisions <= 3 ? ' · +15 XP' : ''}`, 'xp');
    App.commit();
  };
  App.actions.toggleWeak = (el) => { const s = (App.state.study.status[el.dataset.id] = App.state.study.status[el.dataset.id] || {}); s.weak = !s.weak; App.commit(); };
  App.actions.secNotes = (el) => {
    const s = (App.state.study.status[el.dataset.id] = App.state.study.status[el.dataset.id] || {});
    const sec = secOf(el.dataset.id);
    App.sheet({ title: `Notes · ${sec.code}. ${sec.name}`, body: App.field('Notes', App.textarea('notes', s.notes || '', 'Formulas, mistakes, Hock tips…', 8)), onSubmit: (d) => { s.notes = (d.notes || '').slice(0, 5000); App.commit(); } });
  };
  App.changes.passPart = (el) => {
    App.state.study.passed[el.dataset.k] = el.checked;
    if (el.checked) App.unlockOverlay({ kind: 'milestone', title: `${SUBJECTS[el.dataset.k]} cleared!`, sub: 'Huge achievement. Proud moment!', emoji: '🎓' });
    App.commit();
  };
  App.changes.toggleUnit = (el) => {
    const u = App.state.study.backlog[el.dataset.k].find((x) => x.id === el.dataset.id);
    u.done = el.checked;
    App.buzz(u.done ? 15 : 5);
    App.commit();
  };
  App.actions.editUnits = (el) => {
    const k = el.dataset.k;
    const units = App.state.study.backlog[k];
    App.sheet({
      title: `${App.BACKLOG[k].name} units`,
      body: App.field('One unit per line', App.textarea('units', units.map((u) => u.title).join('\n'), '', 10), 'Match your university syllabus. Completed units keep their status if the name stays the same.'),
      onSubmit: (d) => {
        const lines = (d.units || '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 40);
        App.state.study.backlog[k] = lines.map((title, i) => { const old = units.find((u) => u.title === title); return { id: old ? old.id : `${k}${uid()}`, title, done: old ? old.done : false }; });
        App.commit();
      },
    });
  };
  App.actions.setExam = (el) => {
    const k = el.dataset.k;
    App.sheet({
      title: `${SUBJECTS[k]} exam date`,
      body: App.field('Exam date', App.input('date', { type: 'date', value: App.state.study.exams[k] || '' }), 'Leave empty to clear.'),
      onSubmit: (d) => { App.state.study.exams[k] = d.date || ''; App.commit(); },
    });
  };

  function sessionSheet(s, preset = {}) {
    const isNew = !s;
    s = s || { date: dkey(), subject: 'p1', section: '', type: 'mcq', minutes: 60, attempted: '', correct: '', note: '', ...preset };
    if (s.section && !preset.subject && isNew) s.subject = s.section.slice(0, 2);
    const secOpts = (pk) => (App.CMA[pk] ? App.CMA[pk].sections.map((x) => ({ value: x.id, label: `${x.code}. ${x.name}` })) : []);
    App.sheet({
      title: isNew ? 'Log study session' : 'Edit session',
      cls: 'sheet-tall',
      body: `
        ${App.field('Subject', App.chips('subject', Object.entries(SUBJECTS).map(([value, label]) => ({ value, label })), s.subject))}
        <div id="secWrap" ${App.CMA[s.subject] ? '' : 'hidden'}>${App.field('Section', `<select class="inp" name="section" id="secSel">${['p1', 'p2'].map((pk) => `<optgroup label="${SUBJECTS[pk]}">${secOpts(pk).map((o) => `<option value="${o.value}" ${o.value === s.section ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</optgroup>`).join('')}</select>`)}</div>
        ${App.field('Type', App.chips('type', Object.entries(TYPES).map(([value, label]) => ({ value, label })), s.type))}
        <div class="grid2">${App.field('Date', App.input('date', { type: 'date', value: s.date, max: dkey(), required: true }))}${App.field('Minutes', App.input('minutes', { type: 'number', value: s.minutes, min: 1, max: 720, required: true, inputmode: 'numeric' }))}</div>
        <div class="grid2">${App.field('MCQs attempted', App.input('attempted', { type: 'number', value: s.attempted, min: 0, max: 1000, inputmode: 'numeric', placeholder: '0' }))}${App.field('Correct', App.input('correct', { type: 'number', value: s.correct, min: 0, max: 1000, inputmode: 'numeric', placeholder: '0' }))}</div>
        <p class="field-hint" id="accPrev"></p>
        ${App.field('Notes', App.input('note', { value: s.note, placeholder: 'e.g. Hock Ch. 3 variance MCQs' }))}`,
      danger: isNew ? null : { act: 'deleteSession', label: 'Delete', attrs: `data-id="${s.id}"` },
      onOpen: (sheet) => {
        const f = sheet;
        const sync = () => {
          const subj = f.querySelector('input[name=subject]:checked').value;
          document.getElementById('secWrap').hidden = !App.CMA[subj];
          if (App.CMA[subj]) { const sel = document.getElementById('secSel'); if (!sel.value.startsWith(subj)) sel.value = App.CMA[subj].sections[0].id; }
          const a = +f.attempted.value || 0, c = +f.correct.value || 0;
          document.getElementById('accPrev').textContent = a ? (c > a ? 'Correct cannot exceed attempted' : `Accuracy ${Math.round((c / a) * 100)}%`) : '';
        };
        f.addEventListener('change', sync);
        f.addEventListener('input', sync);
        sync();
      },
      onSubmit: (d) => {
        const minutes = Math.round(+d.minutes);
        const att = Math.max(0, Math.round(+d.attempted || 0)), cor = Math.max(0, Math.round(+d.correct || 0));
        if (!(minutes > 0)) { App.toast('Enter minutes studied', 'bad'); return false; }
        if (cor > att) { App.toast('Correct answers cannot exceed attempted', 'bad'); return false; }
        const obj = { date: d.date || dkey(), subject: SUBJECTS[d.subject] ? d.subject : 'p1', section: App.CMA[d.subject] ? d.section : '', type: TYPES[d.type] ? d.type : 'study', minutes: App.clamp(minutes, 1, 720), attempted: att, correct: cor, note: (d.note || '').slice(0, 200) };
        if (isNew) App.state.study.sessions.push({ id: uid(), ts: Date.now(), ...obj });
        else Object.assign(s, obj);
        App.toast(`${App.fmtMin(obj.minutes)} logged${att ? ` · ${Math.round((cor / att) * 100)}% accuracy` : ''}`, 'xp');
        App.commit();
      },
    });
  }
  App.actions.addSession = (el) => sessionSheet(null, el && el.dataset ? { ...(el.dataset.section ? { section: el.dataset.section, subject: el.dataset.section.slice(0, 2) } : {}), ...(el.dataset.subject ? { subject: el.dataset.subject } : {}) } : {});
  App.actions.editSession = (el) => sessionSheet(App.state.study.sessions.find((x) => x.id === el.dataset.id));
  App.actions.deleteSession = (el) => { if (!confirm('Delete this session?')) return; App.state.study.sessions = App.state.study.sessions.filter((x) => x.id !== el.dataset.id); App.closeSheet(); App.commit(); };

  App.actions.startStudyTimer = () => {
    App.sheet({
      title: 'Start study timer',
      body: App.field('Subject', App.chips('subject', Object.entries(SUBJECTS).map(([value, label]) => ({ value, label })), 'p1')) + '<p class="field-hint">The timer keeps running if you close the app. Stop it when you finish to log the session.</p>',
      submit: 'Start',
      onSubmit: (d) => { App.state.study.timer = { start: Date.now(), subject: d.subject || 'p1' }; App.toast('Timer started. Phone side mein rakho!'); App.commit(); },
    });
  };
  App.actions.stopStudyTimer = () => {
    const t = App.state.study.timer;
    const minutes = Math.max(1, Math.round((Date.now() - t.start) / 60000));
    App.state.study.timer = null;
    App.save();
    App.render({ quiet: true });
    sessionSheet(null, { subject: t.subject, minutes, type: 'study', section: App.CMA[t.subject] ? App.CMA[t.subject].sections[0].id : '' });
  };

  App.actions.editMock = (el) => {
    const m = el.dataset.id ? App.state.study.mocks.find((x) => x.id === el.dataset.id) : null;
    const v = m || { date: dkey(), part: el.dataset.part || 'p1', score: '', correct: '', total: '', note: '' };
    App.sheet({
      title: m ? 'Edit mock' : 'Add mock test',
      body: `${App.field('Part', App.chips('part', [{ value: 'p1', label: 'Part 1' }, { value: 'p2', label: 'Part 2' }], v.part))}
        <div class="grid2">${App.field('Correct', App.input('correct', { type: 'number', value: v.correct, min: 0, inputmode: 'numeric' }))}${App.field('Out of', App.input('total', { type: 'number', value: v.total, min: 1, inputmode: 'numeric' }))}</div>
        ${App.field('…or score %', App.input('score', { type: 'number', value: v.score, min: 0, max: 100, step: 0.1, inputmode: 'decimal' }), 'If you enter correct/out of, % is calculated.')}
        <div class="grid2">${App.field('Date', App.input('date', { type: 'date', value: v.date, max: dkey(), required: true }))}${App.field('Note', App.input('note', { value: v.note, placeholder: 'e.g. Hock exam 1' }))}</div>`,
      danger: m ? { act: 'deleteMock', label: 'Delete', attrs: `data-id="${m.id}"` } : null,
      onSubmit: (d) => {
        const c = +d.correct, t = +d.total;
        let score = +d.score;
        if (t > 0 && c >= 0) { if (c > t) { App.toast('Correct cannot exceed total', 'bad'); return false; } score = Math.round((c / t) * 1000) / 10; }
        if (!(score >= 0 && score <= 100) || (d.score === '' && !(t > 0))) { App.toast('Enter a score', 'bad'); return false; }
        const obj = { date: d.date, part: d.part === 'p2' ? 'p2' : 'p1', score, correct: t > 0 ? c : '', total: t > 0 ? t : '', note: (d.note || '').slice(0, 80) };
        if (m) Object.assign(m, obj); else App.state.study.mocks.push({ id: uid(), ...obj });
        App.toast(`Mock ${score}% saved${score >= 72 ? ' · above pass mark!' : ''}`, 'xp');
        App.commit();
      },
    });
  };
  App.actions.deleteMock = (el) => { App.state.study.mocks = App.state.study.mocks.filter((x) => x.id !== el.dataset.id); App.closeSheet(); App.commit(); };

  App.views.study = { render };
})();
