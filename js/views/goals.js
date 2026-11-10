'use strict';
/* Goals: long-term goals with milestones (unlock animation + XP), priority, target date, daily actions, status. */
(function () {
  const { icon, esc, dkey, prettyDate, daysBetween, uid } = App;
  App.ui.goalFilter = 'active';

  const CATS = { health: '💪 Health', study: '📚 Study', career: '💼 Career', money: '💰 Money', personal: '🌱 Personal' };
  const PRI = { high: { label: 'High', cls: 'bad', w: 0 }, med: { label: 'Medium', cls: 'warn', w: 1 }, low: { label: 'Low', cls: 'ok', w: 2 } };

  function deadlineText(g) {
    if (g.done) return `Achieved ${g.doneAt ? prettyDate(g.doneAt) : ''}`;
    if (!g.deadline) return 'No target date';
    const n = daysBetween(dkey(), g.deadline);
    if (n < 0) return `<span class="neg">${-n} days overdue</span>`;
    if (n === 0) return 'Due today';
    return n < 60 ? `${n} days left` : `${Math.round(n / 30)} months left`;
  }

  function render() {
    const f = App.ui.goalFilter, today = dkey();
    const goals = App.state.goals.filter((g) => (f === 'done' ? g.done : !g.done)).sort((a, b) => PRI[a.priority || 'med'].w - PRI[b.priority || 'med'].w || (a.deadline || '9').localeCompare(b.deadline || '9'));
    const xp = App.xp();
    return `
      ${App.header('Goals', 'Long-term · Milestones · Daily actions', `<button class="fab-sm" data-act="editGoal" aria-label="Add goal">${icon('plus')}</button>`)}
      <button class="card xp-card reveal" style="--i:0" data-act="go" data-r="xp">
        <span class="lvl-badge">${xp.level}</span><div class="grow ta-l"><b>Level ${xp.level} · ${App.num(xp.total)} XP</b><small class="muted block">${xp.need - xp.into} XP to level ${xp.level + 1} · earned only from recorded progress</small>${App.bar(xp.pct, 'accent', 'thin', 'xpg')}</div>${icon('right')}</button>
      <div class="reveal mt12" style="--i:1">${App.seg('goalFilter', [{ value: 'active', label: `Active · ${App.state.goals.filter((g) => !g.done).length}` }, { value: 'done', label: `Achieved · ${App.state.goals.filter((g) => g.done).length}` }], f)}</div>
      <div class="stack mt12">
      ${goals.length ? goals.map((g, i) => {
        const p = App.goalProgress(g);
        const ms = g.milestones || [];
        const next = ms.find((m) => !m.done);
        return `<article class="card goal-card ${g.done ? 'is-done' : ''} reveal" style="--i:${i + 2}" data-flip="g${g.id}">
          <div class="goal-top">
            ${App.ring(p, { size: 66, stroke: 7, grad: g.done ? 'g-green' : 'g-accent', key: 'goal' + g.id, label: `<b class="small">${Math.round(p * 100)}%</b>` })}
            <button class="grow ta-l goal-info" data-act="editGoal" data-id="${g.id}">
              <span class="row gap"><span class="eyebrow">${CATS[g.cat] || CATS.personal}</span><span class="pill ${PRI[g.priority || 'med'].cls}">${PRI[g.priority || 'med'].label}</span></span>
              <b class="goal-title">${esc(g.title)}</b><small class="muted">${deadlineText(g)}${ms.length ? ` · ${ms.filter((m) => m.done).length}/${ms.length} milestones` : ''}</small></button>
          </div>
          ${g.why ? `<p class="goal-why">“${esc(g.why)}”</p>` : ''}
          ${ms.length ? `<div class="milestones">${ms.map((m) => `<div class="ms ${m.done ? 'done' : ''} ${m === next ? 'next' : ''}">
            <button class="ms-lock" data-act="toggleMilestone" data-g="${g.id}" data-id="${m.id}" aria-label="${m.done ? 'Mark milestone not done' : 'Complete milestone'}">${icon(m.done ? 'unlock' : 'lock')}</button>
            <span class="grow"><b>${esc(m.title)}</b>${m.due ? `<small class="muted block">by ${prettyDate(m.due)}</small>` : ''}</span>${m.done ? '<small class="pos">+75 XP</small>' : ''}</div>`).join('')}</div>` : !g.done ? App.field('Progress', `<div class="range-wrap"><input class="range" type="range" min="0" max="100" step="5" value="${g.progress || 0}" data-change="goalProgress" data-id="${g.id}"><output>${g.progress || 0}%</output></div>`) : ''}
          ${(g.actions || []).length && !g.done ? `<h4 class="group-title">Daily actions · today</h4>${g.actions.map((a) => `<div class="ms-row ${a.log[today] ? 'done' : ''}"><button class="check sm ${a.log[today] ? 'on' : ''}" data-act="goalAction" data-g="${g.id}" data-id="${a.id}" aria-label="Toggle action">${icon('check')}</button><span class="grow">${esc(a.text)}</span><small class="muted">${Object.keys(a.log).length}× done</small></div>`).join('')}` : ''}
          ${!g.done ? `<div class="row gap mt12"><button class="btn btn-soft sm grow" data-act="addTask" data-goal="${g.id}">${icon('list')}Add task</button><button class="btn btn-ghost sm" data-act="editGoal" data-id="${g.id}">${icon('edit')}Edit</button></div>` : ''}
        </article>`;
      }).join('') : App.empty('target', f === 'done' ? 'No achieved goals yet' : 'Set your first goal', 'Break big goals into milestones. Each milestone you unlock earns XP.', `<button class="btn btn-primary" data-act="editGoal">${icon('plus')}Add goal</button>`)}
      </div>`;
  }

  App.actions.goalFilter = (el) => { App.ui.goalFilter = el.dataset.v; App.render({ quiet: true }); };
  App.changes.goalProgress = (el) => {
    const g = App.state.goals.find((x) => x.id === el.dataset.id);
    g.progress = +el.value;
    el.nextElementSibling.textContent = el.value + '%';
    App.commit();
  };
  App.actions.goalAction = (el) => {
    const g = App.state.goals.find((x) => x.id === el.dataset.g), a = g.actions.find((x) => x.id === el.dataset.id), t = dkey();
    if (a.log[t]) delete a.log[t]; else a.log[t] = true;
    App.buzz(10);
    App.commit();
  };
  App.actions.toggleMilestone = (el) => {
    const g = App.state.goals.find((x) => x.id === el.dataset.g), m = g.milestones.find((x) => x.id === el.dataset.id);
    if (m.done) {
      if (!confirm('Mark this milestone as not done?')) return;
      m.done = false; m.doneAt = null;
      if (g.done) { g.done = false; g.doneAt = null; }
      App.commit();
      return;
    }
    m.done = true; m.doneAt = dkey();
    el.classList.add('unlocking');
    App.buzz([20, 50, 30]);
    const all = g.milestones.every((x) => x.done);
    if (all) { g.done = true; g.doneAt = dkey(); }
    setTimeout(() => {
      App.commit();
      App.unlockOverlay(all ? { kind: 'milestone', title: g.title, sub: 'Goal achieved! Every milestone unlocked.', emoji: '🏆', xp: 275 } : { title: m.title, sub: g.title, emoji: '🔓', xp: 75 });
    }, 450);
  };

  App.actions.editGoal = (el) => {
    const g = el && el.dataset && el.dataset.id ? App.state.goals.find((x) => x.id === el.dataset.id) : null;
    const isNew = !g;
    const v = g || { title: '', cat: 'personal', priority: 'med', deadline: '', why: '', milestones: [], actions: [], progress: 0 };
    App.sheet({
      title: isNew ? 'New goal' : 'Edit goal',
      cls: 'sheet-tall',
      body: `
        ${App.field('Goal', App.input('title', { value: v.title, required: true, placeholder: 'e.g. Reach 55 kg' }))}
        ${App.field('Category', App.chips('cat', Object.entries(CATS).map(([value, label]) => ({ value, label })), v.cat))}
        <div class="grid2">${App.field('Priority', App.select('priority', Object.entries(PRI).map(([value, p]) => ({ value, label: p.label })), v.priority || 'med'))}${App.field('Target date', App.input('deadline', { type: 'date', value: v.deadline }))}</div>
        ${App.field('Milestones (one per line)', App.textarea('milestones', (v.milestones || []).map((m) => m.title).join('\n'), 'Reach 50 kg\nReach 52 kg\nReach 55 kg', 5), 'Completed milestones keep their status if the text is unchanged.')}
        ${App.field('Daily actions (one per line)', App.textarea('actions', (v.actions || []).map((a) => a.text).join('\n'), 'Hit protein target\nStudy 2 hours', 3))}
        ${App.field('Why does this matter?', App.textarea('why', v.why || '', 'Your reason keeps you going on hard days', 2))}
        ${!isNew ? `<label class="toggle-row"><input type="checkbox" name="done" ${v.done ? 'checked' : ''}><span>Mark goal as achieved</span></label>` : ''}`,
      danger: isNew ? null : { act: 'deleteGoal', label: 'Delete', attrs: `data-id="${v.id}"` },
      onSubmit: (d) => {
        const title = (d.title || '').trim();
        if (!title) return false;
        const lines = (s) => (s || '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 20);
        const oldMs = v.milestones || [], oldAc = v.actions || [];
        const obj = {
          title: title.slice(0, 120), cat: CATS[d.cat] ? d.cat : 'personal', priority: PRI[d.priority] ? d.priority : 'med', deadline: d.deadline || '', why: (d.why || '').slice(0, 300),
          milestones: lines(d.milestones).map((t) => oldMs.find((m) => m.title === t) || { id: uid(), title: t.slice(0, 100), due: '', done: false, doneAt: null }),
          actions: lines(d.actions).map((t) => oldAc.find((a) => a.text === t) || { id: uid(), text: t.slice(0, 100), log: {} }),
        };
        const wasDone = !!v.done;
        if (isNew) App.state.goals.push({ id: uid(), done: false, doneAt: null, created: dkey(), progress: 0, ...obj });
        else { Object.assign(g, obj); g.done = !!d.done; g.doneAt = g.done ? g.doneAt || dkey() : null; }
        App.commit();
        if (!isNew && !wasDone && d.done) App.unlockOverlay({ title: obj.title, sub: 'Goal achieved!', emoji: '🏆', xp: 200 });
        else App.toast(isNew ? 'Goal added' : 'Goal saved');
      },
    });
  };
  App.actions.deleteGoal = (el) => {
    if (!confirm('Delete this goal? Linked tasks will be unlinked.')) return;
    App.state.goals = App.state.goals.filter((x) => x.id !== el.dataset.id);
    App.state.tasks.forEach((t) => { if (t.goalId === el.dataset.id) t.goalId = ''; });
    App.closeSheet();
    App.commit();
  };

  App.views.goals = { render };
})();
