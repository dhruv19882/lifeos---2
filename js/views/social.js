'use strict';
/* Digital wellbeing: manual screen-time entry with per-app low (warning) and max (stop) limits, weekly + monthly
   analytics, most-used app, streak. LifeOS does NOT read phone usage automatically; you type the minutes in. */
(function () {
  const { icon, esc, fmtMin, dkey, uid, lastNDays, parseD, DOW, sum } = App;
  App.ui.socialDate = dkey();
  App.ui.socialFlash = null;

  const statusOf = (mins, a) => (mins >= a.high ? 'over' : mins >= a.low ? 'warn' : 'ok');
  const STATUS = { ok: { label: 'Within limit', cls: 'ok' }, warn: { label: 'Low limit crossed', cls: 'warn' }, over: { label: 'Max limit crossed', cls: 'bad' } };
  const minsFor = (date, id) => (App.state.social.logs[date] || {})[id] || 0;
  App.socialToday = (date = dkey()) => App.state.social.apps.map((a) => { const mins = minsFor(date, a.id); return { ...a, mins, status: statusOf(mins, a) }; });

  function render() {
    const date = App.ui.socialDate, apps = App.socialToday(date);
    const total = sum(apps, (x) => x.mins), totalHigh = sum(apps, (x) => x.high), totalLow = sum(apps, (x) => x.low);
    const days7 = lastNDays(7), days30 = lastNDays(30);
    const dayTotal = (d) => sum(App.state.social.apps, (a) => minsFor(d, a.id));
    const weekly = days7.map((d) => { const v = dayTotal(d); return { label: DOW[parseD(d).getDay()][0], value: v, on: d === date, title: `${d}: ${fmtMin(v)}`, cls: v >= totalHigh ? 'grad-red' : v >= totalLow ? 'grad-warm' : 'grad-green' }; });
    const logged30 = days30.filter((d) => App.state.social.logs[d] && Object.keys(App.state.social.logs[d]).length);
    const m30 = sum(logged30, dayTotal);
    const over30 = logged30.filter((d) => App.state.social.apps.some((a) => minsFor(d, a.id) >= a.high)).length;
    const perApp7 = App.state.social.apps.map((a) => ({ a, v: sum(days7, (d) => minsFor(d, a.id)) })).sort((x, y) => y.v - x.v);
    const top = perApp7[0] && perApp7[0].v ? perApp7[0] : null;
    const streak = App.streaks()[3].n;
    const yesterday = dkey(App.addDays(new Date(), -1));

    const appCard = (a, i) => {
      const s = STATUS[a.status], max = Math.max(a.high * 1.25, a.mins, 1);
      return `<article class="card app-card status-${a.status} ${App.ui.socialFlash === a.id ? 'flash-' + a.status : ''} reveal" style="--i:${i + 5}">
        <div class="row between">
          <button class="row gap ta-l" data-act="editApp" data-id="${a.id}"><span class="app-dot" style="--c:${esc(a.color)}">${esc(a.name[0] || '?')}</span>
            <span><b>${esc(a.name)}</b><small class="muted block">Low ${fmtMin(a.low)} · Max ${fmtMin(a.high)}</small></span></button>
          <span class="badge ${s.cls}">${icon(a.status === 'over' ? 'alert' : a.status === 'warn' ? 'bell' : 'shield')}${s.label}</span>
        </div>
        <div class="app-time"><b>${App.count(a.mins, { key: 'soc' + a.id })}</b><span>min</span>${a.status !== 'over' ? `<small class="muted">${fmtMin(a.high - a.mins)} to max</small>` : `<small class="neg">${fmtMin(a.mins - a.high)} over</small>`}</div>
        <div class="limit-bar"><span class="lb-fill lb-${a.status}" data-w="${(a.mins / max) * 100}" data-key="b:soc${a.id}"></span>
          <span class="lb-mark low" style="left:${(a.low / max) * 100}%"><i>Low</i></span><span class="lb-mark high" style="left:${(a.high / max) * 100}%"><i>Max</i></span></div>
        <div class="step-row">
          <button class="step" data-act="socAdd" data-id="${a.id}" data-n="-15" aria-label="Minus 15 minutes">−15</button>
          <button class="step" data-act="socAdd" data-id="${a.id}" data-n="5">+5</button>
          <button class="step" data-act="socAdd" data-id="${a.id}" data-n="15">+15</button>
          <button class="step" data-act="socAdd" data-id="${a.id}" data-n="30">+30</button>
          <button class="step accent" data-act="socSet" data-id="${a.id}" aria-label="Enter exact time">${icon('edit')}</button>
        </div></article>`;
    };

    return `
      ${App.header('Screen time', 'Digital wellbeing', `<button class="fab-sm" data-act="addApp" aria-label="Track another app">${icon('plus')}</button>`)}
      <div class="reveal" style="--i:0">${App.seg('socDate', [{ value: dkey(), label: 'Today' }, { value: yesterday, label: 'Yesterday' }], date)}</div>
      <section class="card hero reveal mt12" style="--i:1">
        <div class="hero-main">
          ${App.donut(apps.filter((a) => a.mins).map((a) => ({ value: a.mins, color: a.color })), { size: 136, stroke: 16, center: `${App.count(total, { key: 'soctotal' })}<small>min total</small>` })}
          <div class="hero-side">
            <div class="mini-stat"><span class="dot" style="--c:#facc15"></span><div><b>${fmtMin(totalLow)}</b><small>Total low limit</small></div></div>
            <div class="mini-stat"><span class="dot" style="--c:#ef4444"></span><div><b>${fmtMin(totalHigh)}</b><small>Total max limit</small></div></div>
            <div class="mini-stat"><span class="dot" style="--c:#22c55e"></span><div><b>${streak} day${streak === 1 ? '' : 's'}</b><small>Under-limit streak</small></div></div>
          </div></div>
        <div class="legend">${apps.map((a) => `<span><i style="background:${esc(a.color)}"></i>${esc(a.name)}</span>`).join('')}</div>
      </section>
      <section class="card reveal" style="--i:2"><div class="card-head"><h3>${icon('cal')}Last 7 days</h3><span class="muted small">Avg ${fmtMin(sum(weekly, (w) => w.value) / 7)}/day</span></div>
        ${App.barChart(weekly, { height: 120, lines: [{ v: totalLow, cls: 'warn', label: 'Low' }, { v: totalHigh, cls: 'bad', label: 'Max' }], fmt: (v) => fmtMin(v) })}</section>
      <section class="card reveal" style="--i:3"><div class="card-head"><h3>${icon('chart')}30-day analytics</h3><span class="muted small">${logged30.length} days logged</span></div>
        <div class="stat-row four">${App.stat('Total', fmtMin(m30))}${App.stat('Avg/day', fmtMin(logged30.length ? m30 / logged30.length : 0))}${App.stat('Days over', `<span class="${over30 ? 'neg' : 'pos'}">${over30}</span>`)}${App.stat('Most used', top ? esc(top.a.name) : '—', top ? fmtMin(top.v) + ' / 7d' : '')}</div>
        ${perApp7.some((x) => x.v) ? `<div class="cat-list mt12">${perApp7.map((x) => `<div><div class="row between small"><span>${esc(x.a.name)}</span><b>${fmtMin(x.v)}</b></div><div class="bar thin"><span class="bar-fill" data-w="${(x.v / (perApp7[0].v || 1)) * 100}" style="background:${esc(x.a.color)}"></span></div></div>`).join('')}</div>` : ''}</section>
      <p class="section-note reveal" style="--i:4">${icon('info')}<span>LifeOS can't read your phone's usage automatically. Check Digital Wellbeing (Android) or Screen Time (iPhone) and enter the minutes here. <b class="warn-t">Yellow</b> = low limit crossed, <b class="neg">red</b> = max limit crossed.</span></p>
      ${apps.map(appCard).join('')}`;
  }

  /* ---------- actions ---------- */
  App.actions.socDate = (el) => { App.ui.socialDate = el.dataset.v; App.render({ quiet: true }); };
  function setMins(id, mins) {
    const date = App.ui.socialDate, logs = App.state.social.logs;
    const a = App.state.social.apps.find((x) => x.id === id);
    if (!a) return;
    const before = statusOf(minsFor(date, id), a);
    logs[date] = logs[date] || {};
    logs[date][id] = Math.max(0, Math.min(1440, Math.round(mins)));
    const after = statusOf(logs[date][id], a);
    App.ui.socialFlash = null;
    if (after !== before && after !== 'ok') {
      App.ui.socialFlash = id;
      App.buzz(after === 'over' ? [90, 60, 90] : 40);
      App.toast(after === 'over' ? `${a.name}: max limit crossed. Phone side mein rakho!` : `${a.name}: low limit crossed. ${fmtMin(a.high - logs[date][id])} left.`, after === 'over' ? 'bad' : 'warn');
      setTimeout(() => (App.ui.socialFlash = null), 1200);
    }
    App.commit();
  }
  App.actions.socAdd = (el) => { App.buzz(4); setMins(el.dataset.id, minsFor(App.ui.socialDate, el.dataset.id) + +el.dataset.n); };
  App.actions.socSet = (el) => {
    const a = App.state.social.apps.find((x) => x.id === el.dataset.id);
    const cur = minsFor(App.ui.socialDate, a.id);
    App.sheet({
      title: `${a.name} time`,
      body: `<div class="grid2">${App.field('Hours', App.input('h', { type: 'number', value: Math.floor(cur / 60), min: 0, max: 24, inputmode: 'numeric' }))}${App.field('Minutes', App.input('m', { type: 'number', value: cur % 60, min: 0, max: 59, inputmode: 'numeric' }))}</div>
        <p class="field-hint">Total for ${App.ui.socialDate === dkey() ? 'today' : 'yesterday'} from your phone's screen-time settings.</p>`,
      onSubmit: (d) => setMins(a.id, (+d.h || 0) * 60 + (+d.m || 0)),
    });
  };
  const COLORS = ['#e1306c', '#ff3b3b', '#25d366', '#f5e000', '#1877f2', '#1da1f2', '#8b5cf6', '#ff7a00', '#22d3ee', '#a3a3a3'];
  const PRESETS = [15, 30, 45, 60, 90, 120, 180];
  function appSheet(a) {
    const isNew = !a;
    a = a || { name: '', color: COLORS[App.state.social.apps.length % COLORS.length], low: 30, high: 60 };
    App.sheet({
      title: isNew ? 'Track a new app' : `Edit ${a.name}`,
      submit: isNew ? 'Add app' : 'Save limits',
      body: `${App.field('App name', App.input('name', { value: a.name, placeholder: 'e.g. Facebook, Reels, Games', required: true }))}
        ${App.field('Colour', `<div class="chips colors">${COLORS.map((c) => `<label class="chip color"><input type="radio" name="color" value="${c}" ${c === a.color ? 'checked' : ''}><span style="--c:${c}"></span></label>`).join('')}</div>`)}
        ${App.field('🟡 Daily low limit (warning)', App.input('low', { type: 'number', value: a.low, min: 1, max: 1440, required: true, inputmode: 'numeric' }), 'Yellow warning after this many minutes.')}
        <div class="preset-row">${PRESETS.map((p) => `<button type="button" class="pchip" data-act="preset" data-f="low" data-v="${p}">${fmtMin(p)}</button>`).join('')}</div>
        ${App.field('🔴 Daily maximum limit', App.input('high', { type: 'number', value: a.high, min: 2, max: 1440, required: true, inputmode: 'numeric' }), 'Red alert when you cross this.')}
        <div class="preset-row">${PRESETS.map((p) => `<button type="button" class="pchip" data-act="preset" data-f="high" data-v="${p}">${fmtMin(p)}</button>`).join('')}</div>`,
      danger: isNew ? null : { act: 'deleteApp', label: 'Remove', attrs: `data-id="${a.id}"` },
      onSubmit: (d) => {
        const name = (d.name || '').trim().slice(0, 24);
        const low = Math.round(+d.low), high = Math.round(+d.high);
        if (!name) return false;
        if (!(low > 0 && high > low)) { App.toast('Max limit must be more than the low limit', 'bad'); return false; }
        const obj = { name, color: COLORS.includes(d.color) ? d.color : COLORS[0], low, high };
        if (isNew) App.state.social.apps.push({ id: uid(), ...obj }); else Object.assign(a, obj);
        App.toast(isNew ? `Tracking ${name}` : 'Limits saved');
        App.commit();
      },
    });
  }
  App.actions.preset = (el) => {
    const inp = document.querySelector(`#sheetForm [name="${el.dataset.f}"]`);
    if (inp) { inp.value = el.dataset.v; inp.classList.add('flash'); setTimeout(() => inp.classList.remove('flash'), 400); }
  };
  App.actions.addApp = () => appSheet(null);
  App.actions.editApp = (el) => appSheet(App.state.social.apps.find((x) => x.id === el.dataset.id));
  App.actions.deleteApp = (el) => {
    if (!confirm('Stop tracking this app? Past logs are kept.')) return;
    App.state.social.apps = App.state.social.apps.filter((x) => x.id !== el.dataset.id);
    App.closeSheet();
    App.commit();
  };

  App.views.social = { render };
})();
