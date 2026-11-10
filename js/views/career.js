'use strict';
/* Career: 9-skill roadmap (milestones, courses, practice, notes), portfolio, animated career progression timeline. */
(function () {
  const { icon, esc, dkey, uid, prettyDate } = App;
  App.ui.openSkill = {};
  App.ui.pfFilter = 'All';

  const sk = (id) => App.state.career.skills[id] || (App.state.career.skills[id] = { milestones: {}, courses: [], practice: [], notes: '' });
  const pct = (v) => Math.round(v * 100) + '%';

  /** Career stages with transparent, data-driven completion criteria. */
  function stages() {
    const P = App.skillProgress, st = App.state, p = App.profile();
    const doneProjects = st.career.portfolio.filter((x) => x.status === 'done').length;
    const avg = (...ids) => ids.reduce((a, id) => a + P(id), 0) / ids.length;
    const list = [
      { title: p.role ? `${p.role}${p.employer ? ' · ' + p.employer : ''}` : 'Accounts & Finance professional', sub: 'AP/AR, reconciliations, QuickBooks, payroll, 1099s', value: 1, rule: 'Your current role.' },
      { title: 'Excel & automation power user', sub: 'Advanced Excel + Financial Automation', value: Math.min(1, avg('excel', 'automation') / 0.7), rule: 'Average of Advanced Excel and Financial Automation reaches 70%.' },
      { title: 'US CMA Part 1 cleared', sub: 'Financial Planning, Performance & Analytics', value: st.study.passed.p1 ? 1 : App.partProgress('p1') * 0.9, rule: 'Marked as passed in Study.' },
      { title: 'Data skills: SQL + Power BI', sub: 'Query, model and visualise finance data', value: Math.min(1, avg('sql', 'powerbi') / 0.7), rule: 'Average of SQL and Power BI reaches 70%.' },
      { title: 'Finance Analyst ready', sub: 'Excel, SQL, Power BI, Financial Analysis + 3 projects', value: Math.min(1, (Math.min(1, avg('excel', 'sql', 'powerbi', 'finanalysis') / 0.7) + Math.min(1, doneProjects / 3)) / 2), rule: 'Those four skills average 70% and 3 portfolio projects are done.' },
      { title: 'US CMA certified', sub: 'Part 2: Strategic Financial Management', value: st.study.passed.p1 && st.study.passed.p2 ? 1 : App.cmaProgress() * 0.9, rule: 'Both parts marked as passed.' },
      { title: 'FP&A Analyst', sub: 'Budgeting, forecasting, modeling, business partnering', value: Math.min(1, (Math.min(1, avg('fpa', 'finmodel') / 0.7) + (st.study.passed.p1 && st.study.passed.p2 ? 1 : 0)) / 2), rule: 'FP&A + Financial Modeling average 70% and CMA certified.' },
    ];
    let cur = list.findIndex((s) => s.value < 1);
    if (cur < 0) cur = list.length;
    list.forEach((s, i) => (s.state = i < cur ? 'done' : i === cur ? 'current' : 'next'));
    return { list, cur };
  }
  App.careerStages = stages;

  function render() {
    const tab = App.ui.careerTab;
    const body = { skills: renderSkills, portfolio: renderPortfolio, roadmap: renderRoadmap }[tab] || renderSkills;
    return `
      ${App.header('Career', 'Finance Analyst · FP&A roadmap', `<button class="fab-sm" data-act="editProject" aria-label="Add portfolio project">${icon('plus')}</button>`)}
      <div class="reveal" style="--i:0">${App.seg('tab', [{ value: 'skills', label: 'Skills' }, { value: 'roadmap', label: 'Roadmap' }, { value: 'portfolio', label: `Portfolio · ${App.state.career.portfolio.length}` }], tab).replace(/data-act="tab"/g, 'data-act="tab" data-k="careerTab"')}</div>
      <div class="stack mt12">${body()}</div>`;
  }

  function renderSkills() {
    const avg = App.SKILLS.reduce((a, s) => a + App.skillProgress(s.id), 0) / App.SKILLS.length;
    return `
      <section class="card hero reveal" style="--i:1"><div class="hero-main">
        ${App.ring(avg, { size: 104, stroke: 10, grad: 'g-sky', key: 'career', label: App.count(Math.round(avg * 100), { suffix: '%', key: 'career' }), sub: 'skills' })}
        <div class="hero-side"><b>${esc(App.profile().career || 'Finance Analyst / FP&A')}</b><small class="muted">${App.SKILLS.filter((s) => App.skillProgress(s.id) >= 1).length} of 9 skills mastered · ${App.state.career.portfolio.filter((p) => p.status === 'done').length} projects done</small></div></div></section>
      ${App.SKILLS.map((s, i) => {
        const v = App.skillProgress(s.id), st = sk(s.id), open = App.ui.openSkill[s.id];
        if (s.derived) return `<button class="card skill-card reveal" style="--i:${i + 2}" data-act="go" data-r="study"><div class="ex-head"><span class="skill-e" style="--c:${s.color}">${s.emoji}</span><span class="grow ta-l"><b>${s.name}</b><small class="muted block">Tracked in Study · ${pct(v)}</small></span>${icon('right')}</div>${App.bar(v, 'red', 'thin', 'sk' + s.id)}</button>`;
        const msDone = s.msList.filter((m) => st.milestones[m.id]).length;
        const projects = App.state.career.portfolio.filter((p) => p.skill === s.id);
        return `<article class="card skill-card ${open ? 'open' : ''} reveal" style="--i:${i + 2}">
          <button class="ex-head" data-act="toggleSkill" data-id="${s.id}"><span class="skill-e" style="--c:${s.color}">${s.emoji}</span>
            <span class="grow ta-l"><b>${s.name}</b><small class="muted block">${msDone}/${s.msList.length} milestones · ${st.courses.length} course${st.courses.length === 1 ? '' : 's'} · ${projects.length} project${projects.length === 1 ? '' : 's'}</small></span><b class="sk-pct">${pct(v)}</b><span class="chev">${icon('down')}</span></button>
          ${App.bar(v, v >= 1 ? 'green' : 'sky', 'thin', 'sk' + s.id)}
          <div class="ex-body"><div class="ex-inner">
            <h4 class="group-title">Learning milestones</h4>
            ${s.msList.map((m) => { const d = st.milestones[m.id]; return `<div class="ms-row ${d ? 'done' : ''}" data-flip="ms${m.id}"><button class="check ${d ? 'on' : ''}" data-act="skillMs" data-s="${s.id}" data-id="${m.id}" aria-label="Toggle milestone">${icon('check')}</button><span class="grow">${esc(m.title)}</span>${d ? `<small class="muted">${prettyDate(d)}</small>` : `<span class="lock-ic">${icon('lock')}</span>`}</div>`; }).join('')}
            <h4 class="group-title">Courses<button class="link" data-act="editCourse" data-s="${s.id}">${icon('plus')}Add</button></h4>
            ${st.courses.length ? st.courses.map((c) => `<button class="course" data-act="editCourse" data-s="${s.id}" data-id="${c.id}"><div class="row between"><b>${esc(c.name)}</b><small>${c.progress}%</small></div><small class="muted">${esc(c.platform || '')}</small>${App.bar(c.progress / 100, 'sky', 'thin')}</button>`).join('') : '<p class="muted small">e.g. "Excel for Finance" on YouTube / Coursera.</p>'}
            <h4 class="group-title">Practice tasks<button class="link" data-act="addPractice" data-s="${s.id}">${icon('plus')}Add</button></h4>
            ${st.practice.length ? st.practice.map((p) => `<div class="ms-row ${p.done ? 'done' : ''}" data-flip="pr${p.id}"><button class="check sm ${p.done ? 'on' : ''}" data-act="togglePractice" data-s="${s.id}" data-id="${p.id}" aria-label="Toggle">${icon('check')}</button><span class="grow">${esc(p.text)}</span><button class="icon-btn sm" data-act="delPractice" data-s="${s.id}" data-id="${p.id}" aria-label="Delete">${icon('x')}</button></div>`).join('') : '<p class="muted small">Small exercises, e.g. "Rebuild the AP aging report with XLOOKUP".</p>'}
            ${projects.length ? `<h4 class="group-title">Projects</h4>${projects.map((p) => `<div class="mini-row">${p.status === 'done' ? '✅' : '🛠️'} ${esc(p.title)}</div>`).join('')}` : ''}
            <button class="btn btn-ghost sm mt8" data-act="skillNotes" data-s="${s.id}">${icon('note')}Notes${st.notes ? ' •' : ''}</button>
          </div></div></article>`;
      }).join('')}`;
  }

  function renderRoadmap() {
    const { list, cur } = stages();
    const fill = Math.min(1, (cur + (list[cur] ? list[cur].value : 0)) / list.length);
    return `
      <p class="section-note reveal" style="--i:1">${icon('info')}<span>Each stage completes automatically from your skills, study and portfolio data. Tap a stage to see its rule.</span></p>
      <section class="roadmap reveal" style="--i:2"><span class="rm-line"><i style="--h:${fill * 100}%"></i></span>
        ${list.map((s, i) => `<button class="rm-stage ${s.state}" style="--i:${i}" data-act="stageInfo" data-i="${i}">
          <span class="rm-dot">${s.state === 'done' ? icon('check') : s.state === 'current' ? '<span class="pulse-dot"></span>' : icon('lock')}</span>
          <span class="rm-body"><small class="muted">Stage ${i + 1}${s.state === 'current' ? ' · You are here' : ''}</small><b>${esc(s.title)}</b><small class="muted block">${esc(s.sub)}</small>
          ${s.state !== 'done' && s.value > 0 ? App.bar(s.value, s.state === 'current' ? 'sky' : 'violet', 'thin') : ''}</span></button>`).join('')}
      </section>`;
  }

  function renderPortfolio() {
    const f = App.ui.pfFilter;
    const items = App.state.career.portfolio.filter((p) => f === 'All' || p.type === f).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const ST = { idea: '💡 Idea', doing: '🛠️ In progress', done: '✅ Done' };
    return `
      <div class="chips scroll reveal" style="--i:1">${['All'].concat(App.PORTFOLIO_TYPES).map((t) => `<button class="pchip ${t === f ? 'on' : ''}" data-act="pfFilter" data-v="${t}">${t}</button>`).join('')}</div>
      ${items.length ? items.map((p, i) => { const s = App.SKILLS.find((x) => x.id === p.skill); return `<button class="card pf-card reveal" style="--i:${i + 2}" data-act="editProject" data-id="${p.id}" data-flip="pf${p.id}">
        <div class="row between"><span class="pill">${esc(p.type)}</span><span class="pill ${p.status === 'done' ? 'ok' : p.status === 'doing' ? 'warn' : ''}">${ST[p.status]}</span></div>
        <b class="pf-title">${esc(p.title)}</b>${p.desc ? `<p class="muted small">${esc(p.desc)}</p>` : ''}
        <div class="row gap small mt8">${s ? `<span>${s.emoji} ${s.name}</span>` : ''}${p.link ? `<span class="link">${icon('link')}Link</span>` : ''}${p.date ? `<span class="muted">${prettyDate(p.date)}</span>` : ''}</div></button>`; }).join('')
        : App.empty('folder', 'Build your portfolio', 'Save Excel automations, Power BI dashboards, models and scripts. Recruiters love proof.', `<button class="btn btn-primary" data-act="editProject">${icon('plus')}Add project</button>`)}`;
  }

  /* ---------- actions ---------- */
  App.actions.toggleSkill = (el) => { App.ui.openSkill[el.dataset.id] = !App.ui.openSkill[el.dataset.id]; el.closest('.skill-card').classList.toggle('open'); };
  App.actions.skillMs = (el) => {
    const st = sk(el.dataset.s), id = el.dataset.id;
    const s = App.SKILLS.find((x) => x.id === el.dataset.s);
    if (st.milestones[id]) delete st.milestones[id];
    else {
      st.milestones[id] = dkey();
      const m = s.msList.find((x) => x.id === id);
      const all = s.msList.every((x) => st.milestones[x.id]);
      setTimeout(() => App.unlockOverlay({ title: m.title, sub: all ? `${s.name} mastered!` : s.name, emoji: all ? '🏆' : s.emoji, xp: 30 }), 200);
    }
    App.buzz(15);
    App.commit();
  };
  App.actions.editCourse = (el) => {
    const st = sk(el.dataset.s);
    const c = el.dataset.id ? st.courses.find((x) => x.id === el.dataset.id) : null;
    const v = c || { name: '', platform: '', progress: 0, link: '' };
    App.sheet({
      title: c ? 'Edit course' : 'Add course',
      body: `${App.field('Course', App.input('name', { value: v.name, required: true, placeholder: 'e.g. SQL for Data Analysis' }))}
        <div class="grid2">${App.field('Platform', App.input('platform', { value: v.platform, placeholder: 'YouTube, Coursera, Udemy…' }))}${App.field('Link', App.input('link', { value: v.link || '', type: 'url', placeholder: 'https://' }))}</div>
        ${App.field('Progress', `<div class="range-wrap"><input class="range" type="range" name="progress" min="0" max="100" step="5" value="${v.progress}" oninput="this.nextElementSibling.textContent=this.value+'%'"><output>${v.progress}%</output></div>`)}`,
      danger: c ? { act: 'delCourse', label: 'Delete', attrs: `data-s="${el.dataset.s}" data-id="${c.id}"` } : null,
      onSubmit: (d) => {
        const obj = { name: d.name.trim().slice(0, 80), platform: (d.platform || '').slice(0, 40), link: (d.link || '').slice(0, 300), progress: App.clamp(+d.progress || 0, 0, 100) };
        if (c) Object.assign(c, obj); else st.courses.push({ id: uid(), ...obj });
        if (obj.progress === 100 && (!c || c.progress !== 100)) App.toast('Course completed! 🎉');
        App.commit();
      },
    });
  };
  App.actions.delCourse = (el) => { const st = sk(el.dataset.s); st.courses = st.courses.filter((x) => x.id !== el.dataset.id); App.closeSheet(); App.commit(); };
  App.actions.addPractice = (el) => App.sheet({ title: 'Practice task', body: App.field('Task', App.input('text', { required: true, placeholder: 'e.g. Build a pivot of vendor spend' })), onSubmit: (d) => { sk(el.dataset.s).practice.push({ id: uid(), text: d.text.trim().slice(0, 120), done: false }); App.commit(); } });
  App.actions.togglePractice = (el) => { const p = sk(el.dataset.s).practice.find((x) => x.id === el.dataset.id); p.done = !p.done; App.buzz(10); App.commit(); };
  App.actions.delPractice = (el) => { const st = sk(el.dataset.s); st.practice = st.practice.filter((x) => x.id !== el.dataset.id); App.commit(); };
  App.actions.skillNotes = (el) => { const st = sk(el.dataset.s); App.sheet({ title: 'Skill notes', body: App.field('Notes', App.textarea('notes', st.notes, 'Shortcuts, formulas, resources…', 8)), onSubmit: (d) => { st.notes = (d.notes || '').slice(0, 5000); App.commit(); } }); };
  App.actions.stageInfo = (el) => { const s = stages().list[+el.dataset.i]; App.sheet({ title: s.title, body: `<p class="small">${esc(s.sub)}</p><p class="muted small mt8"><b>Completes when:</b> ${esc(s.rule)}</p>${s.state !== 'done' ? `<div class="mt12">${App.bar(s.value, 'sky')}</div><p class="small mt8">${Math.round(s.value * 100)}% there</p>` : '<p class="pos mt8">✅ Completed</p>'}` }); };
  App.actions.pfFilter = (el) => { App.ui.pfFilter = el.dataset.v; App.render({ quiet: true }); };
  App.actions.editProject = (el) => {
    const p = el.dataset.id ? App.state.career.portfolio.find((x) => x.id === el.dataset.id) : null;
    const v = p || { title: '', type: App.PORTFOLIO_TYPES[0], skill: 'excel', link: '', desc: '', status: 'idea', date: dkey() };
    App.sheet({
      title: p ? 'Edit project' : 'New portfolio project',
      cls: 'sheet-tall',
      body: `${App.field('Project', App.input('title', { value: v.title, required: true, placeholder: 'e.g. Automated vendor reconciliation' }))}
        ${App.field('Type', App.chips('type', App.PORTFOLIO_TYPES.map((t) => ({ value: t, label: t })), v.type))}
        ${App.field('Status', App.chips('status', [{ value: 'idea', label: '💡 Idea' }, { value: 'doing', label: '🛠️ In progress' }, { value: 'done', label: '✅ Done' }], v.status))}
        <div class="grid2">${App.field('Main skill', App.select('skill', App.SKILLS.filter((s) => !s.derived).map((s) => ({ value: s.id, label: `${s.emoji} ${s.name}` })), v.skill))}${App.field('Date', App.input('date', { type: 'date', value: v.date }))}</div>
        ${App.field('Link', App.input('link', { value: v.link, type: 'url', placeholder: 'GitHub, Drive, Power BI link' }))}
        ${App.field('Description', App.textarea('desc', v.desc, 'Problem, what you built, result (e.g. saved 3 hrs/week)', 3))}
        <p class="field-hint">Don't attach confidential company data. Describe the outcome instead.</p>`,
      danger: p ? { act: 'delProject', label: 'Delete', attrs: `data-id="${p.id}"` } : null,
      onSubmit: (d) => {
        const obj = { title: d.title.trim().slice(0, 80), type: App.PORTFOLIO_TYPES.includes(d.type) ? d.type : App.PORTFOLIO_TYPES[0], status: ['idea', 'doing', 'done'].includes(d.status) ? d.status : 'idea', skill: d.skill, date: d.date || dkey(), link: (d.link || '').slice(0, 300), desc: (d.desc || '').slice(0, 600) };
        const wasDone = p && p.status === 'done';
        if (p) Object.assign(p, obj); else App.state.career.portfolio.push({ id: uid(), ...obj });
        if (obj.status === 'done' && !wasDone) setTimeout(() => App.unlockOverlay({ title: obj.title, sub: 'Portfolio project completed', emoji: '🛠️', xp: 60 }), 300);
        App.commit();
      },
    });
  };
  App.actions.delProject = (el) => { if (!confirm('Delete this project?')) return; App.state.career.portfolio = App.state.career.portfolio.filter((x) => x.id !== el.dataset.id); App.closeSheet(); App.commit(); };

  App.views.career = { render };
})();
