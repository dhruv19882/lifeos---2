'use strict';
/* Fitness: workout logger (new split, animated demos, rest timer, progressive overload), nutrition with Indian
   food database + portions, weight analytics with projection, weekly plan. */
(function () {
  const { icon, esc, dkey, DOW, inr, lastNDays, parseD, prettyDate, uid, round1 } = App;
  App.ui.openEx = {};
  App.ui.foodQuery = '';
  App.ui.foodCat = 'All';

  const todayKey = () => App.WEEK[new Date().getDay()];
  const logKey = (date, day) => `${date}|${day}`;
  const rangeTop = (reps) => parseInt(String(reps).split('-').pop(), 10) || 0;
  const rangeLow = (reps) => parseInt(String(reps).split('-')[0], 10) || 0;

  function lastPerformance(exId, excludeKey) {
    const keys = Object.keys(App.state.gym.logs).filter((k) => k !== excludeKey).sort().reverse();
    for (const k of keys) {
      const sets = (App.state.gym.logs[k].sets || {})[exId];
      if (sets && sets.some((s) => s && s.done)) return { date: k.split('|')[0], sets: sets.filter((s) => s && s.done) };
    }
    return null;
  }
  /** Recommend weight increase only when every planned set hit the top of the rep range last time. */
  function suggestion(e, def, last) {
    if (!last) return def.timed ? 'Start with a hold you can do with perfect form.' : 'First session: pick a weight you can lift for the top of the rep range with 2 reps left in the tank.';
    const top = rangeTop(e.reps);
    const allTop = last.sets.length >= e.sets && last.sets.every((s) => +s.r >= top);
    const w = Math.max(...last.sets.map((s) => +s.w || 0));
    if (def.timed) return allTop ? 'You held the full time on every set. Add 10 seconds today.' : 'Same hold time as last session. Try to beat it.';
    if (allTop && w > 0) return `All ${e.sets} sets hit ${top} reps at ${w} kg. Increase to <b>${w + (def.kind === 'lower' ? 5 : 2.5)} kg</b> today.`;
    if (allTop) return 'You hit the top of the range on every set. Add weight or slow the tempo.';
    const missing = last.sets.length < e.sets ? `only ${last.sets.length}/${e.sets} sets were completed` : `not every set reached ${top} reps`;
    return `Stay at <b>${w || '—'} kg</b>: ${missing}. Aim for one more rep per set.`;
  }

  /* ---------- tabs ---------- */
  function render() {
    const tab = App.ui.fitnessTab;
    const body = { workout: renderWorkout, food: renderFood, body: renderBody, week: renderWeek }[tab] || renderWorkout;
    return `
      ${App.header('Fitness', 'Gym coach · Nutrition · Body', `<button class="fab-sm" data-act="${tab === 'food' ? 'logFood' : 'quickWeight'}" aria-label="Add">${icon('plus')}</button>`)}
      <div class="reveal" style="--i:0">${App.seg('tab', [{ value: 'workout', label: 'Workout' }, { value: 'food', label: 'Nutrition' }, { value: 'body', label: 'Body' }, { value: 'week', label: 'Plan' }], tab).replace(/data-act="tab"/g, 'data-act="tab" data-k="fitnessTab"')}</div>
      <div class="stack mt12">${body()}</div>`;
  }

  function dayPicker(sel) {
    const today = new Date().getDay();
    return `<div class="day-pick reveal" style="--i:1">${[1, 2, 3, 4, 5, 6, 0].map((i) => {
      const k = App.WEEK[i];
      return `<button class="dp ${i === today ? 'today' : ''} ${(App.ui.gymDay || todayKey()) === k && (App.ui.gymDayIdx ?? today) === i ? 'on' : ''}" data-act="pickDay" data-d="${k}" data-i="${i}"><small>${DOW[i]}</small><b>${App.DAYS[k].short}</b></button>`;
    }).join('')}</div>`;
  }

  function renderWorkout() {
    const dayK = App.ui.gymDay || todayKey();
    const day = App.DAYS[dayK];
    const key = logKey(dkey(), dayK);
    const log = App.state.gym.logs[key] || { sets: {} };
    const totalSets = App.sum(day.list, (e) => e.sets);
    const doneSets = App.sum(day.list, (e) => (log.sets[e.id] || []).filter((s) => s && s.done).length);
    const mins = Math.round(App.sum(day.list, (e) => e.sets * (e.rest + 40)) / 60);

    if (dayK === 'rest') {
      return `${dayPicker(dayK)}
        <section class="card day-hero ${day.color} reveal" style="--i:2"><span class="eyebrow">Recovery</span><h2>😴 ${day.name}</h2><p>${day.focus}</p></section>
        <section class="card reveal" style="--i:3"><div class="card-head"><h3>${icon('moon')}Recovery checklist</h3></div>
          ${App.REST_DAY.map((r) => `<div class="rest-item"><span class="tile-ic g-sky sm">${icon('check')}</span><div><b>${r.t}</b><small class="muted block">${r.d}</small></div></div>`).join('')}</section>
        <p class="section-note reveal" style="--i:4">${icon('info')}<span>Want to train anyway? Pick another day above.</span></p>`;
    }

    const exCard = (e, i) => {
      const def = App.EX[e.id];
      const sets = log.sets[e.id] || [];
      const last = lastPerformance(e.id, key);
      const done = sets.filter((s) => s && s.done).length;
      const open = App.ui.openEx[e.id];
      const prefill = (si) => (last && last.sets[Math.min(si, last.sets.length - 1)]) || {};
      return `<article class="card ex-card ${done >= e.sets ? 'complete' : ''} ${open ? 'open' : ''} reveal" style="--i:${i + 3}">
        <button class="ex-head" data-act="toggleEx" data-id="${e.id}">
          ${App.ring(done / e.sets, { size: 40, stroke: 4, grad: 'g-green', key: `ex${e.id}`, label: `<span class="ex-num">${done >= e.sets ? icon('check') : i + 1}</span>` })}
          <span class="grow ta-l"><b>${esc(def.name)}</b><small class="muted block">${e.sets} × ${e.reps}${def.timed ? ' sec' : ' reps'} · rest ${e.rest}s</small></span>
          <span class="ex-prog">${done}/${e.sets}</span><span class="chev">${icon('down')}</span>
        </button>
        <div class="ex-body"><div class="ex-inner">
          ${open ? `<div class="ex-demo">${App.figure(def.fig)}<div><p class="ex-muscle">${icon('target')}${esc(def.muscle)}</p><ol class="ex-steps">${def.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div></div>` : ''}
          <div class="ex-tips"><p><b>✅ Form:</b> ${esc(def.tip)}</p><p><b>❌ Common mistake:</b> ${esc(def.mistake)}</p></div>
          <div class="coach-say">${icon('spark')}<span>${suggestion(e, def, last)}${last ? `<small class="muted block">Last (${prettyDate(last.date)}): ${last.sets.map((s) => (def.timed ? `${s.r}s` : `${s.w || 0}×${s.r}`)).join(', ')}</small>` : ''}</span></div>
          <div class="set-grid">
            <span class="sg-h">Set</span><span class="sg-h">${def.timed ? '—' : 'kg'}</span><span class="sg-h">${def.timed ? 'sec' : 'reps'}</span><span class="sg-h"></span>
            ${Array.from({ length: e.sets }, (_, si) => {
              const s = sets[si] || {};
              const p = prefill(si);
              return `<span class="sg-n ${s.done ? 'on' : ''}">${si + 1}</span>
                ${def.timed ? '<span class="muted ta-c">—</span>' : `<input class="inp sm ta-c" type="number" inputmode="decimal" step="0.5" min="0" aria-label="Set ${si + 1} weight" placeholder="${p.w ?? ''}" value="${s.w ?? ''}" data-change="setVal" data-key="${key}" data-ex="${e.id}" data-i="${si}" data-f="w">`}
                <input class="inp sm ta-c" type="number" inputmode="numeric" min="0" aria-label="Set ${si + 1} reps" placeholder="${p.r ?? rangeLow(e.reps)}" value="${s.r ?? ''}" data-change="setVal" data-key="${key}" data-ex="${e.id}" data-i="${si}" data-f="r">
                <button class="check ${s.done ? 'on' : ''}" data-act="doneSet" data-key="${key}" data-ex="${e.id}" data-i="${si}" data-rest="${e.rest}" aria-label="Set ${si + 1} done">${icon('check')}</button>`;
            }).join('')}
          </div>
          <button class="btn btn-ghost sm mt8" data-act="startRest" data-rest="${e.rest}">${icon('timer')}Start ${e.rest}s rest</button>
        </div></div>
      </article>`;
    };

    return `${dayPicker(dayK)}
      <section class="card day-hero ${day.color} reveal" style="--i:2">
        <div class="row between"><div><span class="eyebrow">${dayK === todayKey() ? "Today's workout" : 'Selected workout'}</span><h2>${day.name}</h2><p>${day.focus}</p></div>
          ${App.ring(doneSets / totalSets, { size: 84, stroke: 8, grad: 'g-sky', key: 'workout', label: `<b>${doneSets}</b>`, sub: `/${totalSets} sets` })}</div>
        <div class="row gap small mt8"><span class="pill light">${icon('clock')}~${mins} min</span><span class="pill light">${icon('dumbbell')}${day.list.length} exercises</span></div>
        <details class="warmup"><summary>${icon('flame')}Warm-up (5–8 min)</summary><ul>${App.WARMUP.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></details>
      </section>
      ${day.list.map(exCard).join('')}
      ${log.finished
        ? `<div class="card done-card reveal">${icon('trophy')}<div><b>Workout complete! +50 XP</b><small class="muted block">Now eat a protein-rich meal.</small></div></div>`
        : `<button class="btn btn-primary btn-block btn-lg reveal" data-act="finishWorkout" data-key="${key}" data-day="${dayK}">${icon('trophy')}Finish workout</button>`}`;
  }

  /* ---------- nutrition ---------- */
  function renderFood() {
    const t = App.targets(), today = dkey();
    const f = App.foodOn(today);
    const log = App.state.food.log.filter((x) => x.date === today);
    return `
      <section class="card hero reveal" style="--i:1">
        <div class="row between"><div><span class="eyebrow">${t.mode.label} target</span><h2 class="kcal">${App.num(t.kcal)} <small>kcal/day</small></h2></div><span class="badge">${round1(t.kg)} kg</span></div>
        <div class="food-rings">
          ${App.ring(f.kcal / t.kcal, { size: 128, stroke: 12, grad: f.kcal > t.kcal * 1.1 ? 'g-red' : 'g-warm', key: 'fk', label: App.count(f.kcal, { key: 'fk' }), sub: `/ ${App.num(t.kcal)} kcal` })}
          ${App.ring(f.p / t.protein, { size: 128, stroke: 12, grad: 'g-sky', key: 'fp', label: App.count(f.p, { suffix: 'g', key: 'fp' }), sub: `/ ${t.protein} g protein` })}
        </div>
        <div class="macro-bars">
          <div><div class="row between small"><span>Carbs</span><b>${f.c} / ${t.carbs} g</b></div>${App.bar(f.c / t.carbs, 'warm', 'thin', 'fc')}</div>
          <div><div class="row between small"><span>Fat</span><b>${f.f} / ${t.fat} g</b></div>${App.bar(f.f / t.fat, 'red', 'thin', 'ff')}</div>
        </div>
        <p class="muted small mt8">Maintenance ≈ ${App.num(t.tdee)} kcal (BMR ${App.num(t.bmr)} × activity) ${t.mode.surplus ? `${t.mode.surplus > 0 ? '+' : ''}${t.mode.surplus} kcal` : ''}${t.adj ? ` ${t.adj > 0 ? '+' : ''}${t.adj} trend adjustment` : ''}. Food values are estimates.</p>
        <button class="btn btn-primary btn-block mt12" data-act="logFood">${icon('plus')}Log food</button>
      </section>
      ${App.MEALS.map((m, i) => {
        const items = log.filter((x) => x.meal === m.id);
        if (m.id === 'custom' && !items.length) return '';
        const tot = { kcal: App.sum(items, (x) => x.kcal), p: App.sum(items, (x) => x.p) };
        return `<section class="card meal reveal" style="--i:${i + 2}">
          <div class="meal-head"><span class="meal-emoji">${m.emoji}</span><div class="grow"><b>${m.label}</b><small class="muted">${items.length ? `${Math.round(tot.kcal)} kcal · ${Math.round(tot.p)} g protein` : 'Nothing logged yet'}</small></div>
            <button class="icon-btn" data-act="logFood" data-meal="${m.id}" aria-label="Add to ${m.label}">${icon('plus')}</button></div>
          ${items.length ? `<ul class="food-items">${items.map((x) => `<li data-flip="f${x.id}"><span><b>${esc(x.name)}</b> <small class="muted">${esc(x.qty || '')}</small></span>
            <small>${Math.round(x.kcal)} kcal · ${round1(x.p)}g P · ${round1(x.c)}g C · ${round1(x.f)}g F</small>
            <button class="icon-btn sm" data-act="delFood" data-id="${x.id}" aria-label="Remove ${esc(x.name)}">${icon('x')}</button></li>`).join('')}</ul>` : ''}
        </section>`;
      }).join('')}
      <section class="card reveal">
        <div class="card-head"><h3>🇮🇳 Low-budget bulk meal ideas</h3></div>
        <p class="muted small">Tap a meal to log all its items with standard portions. You can edit or remove items afterwards.</p>
        ${App.PLAN.map((p, i) => { const tt = App.planTotals(p); return `<button class="plan-row" data-act="logPlan" data-i="${i}">
          <span class="meal-emoji sm">${App.MEALS.find((m) => m.id === p.meal).emoji}</span>
          <span class="grow ta-l"><b>${esc(p.title)}</b><small class="muted block">${p.items.map(([id, a]) => App.unitLabel(App.food(id), a) + ' ' + App.food(id).name.split(',')[0].toLowerCase()).join(' + ')}</small><small class="block"><span class="kc">${Math.round(tt.kcal)} kcal</span> · <span class="pc">${Math.round(tt.p)} g protein</span></small></span>${icon('plus')}</button>`; }).join('')}
      </section>`;
  }

  function foodSheet(meal) {
    const h = new Date().getHours();
    meal = meal || (h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 19 ? 'snacks' : 'dinner');
    App.ui.foodPick = null;
    App.sheet({
      title: 'Log food',
      cls: 'sheet-tall',
      submit: 'Add food',
      body: `
        ${App.field('Meal', App.chips('meal', App.MEALS.map((m) => ({ value: m.id, label: `${m.emoji} ${m.label}` })), meal))}
        <div class="search"><span>${icon('food')}</span><input class="inp" id="foodSearch" placeholder="Search roti, dal, paneer…" autocomplete="off" aria-label="Search foods"></div>
        <div class="chips scroll" id="foodCats">${['All', 'Grains', 'Pulses', 'Dairy & eggs', 'Fruit & nuts', 'Vegetables', 'Other', 'My foods'].map((c) => `<button type="button" class="pchip ${c === 'All' ? 'on' : ''}" data-act="foodCat" data-c="${c}">${c}</button>`).join('')}</div>
        <div class="food-list" id="foodList"></div>
        <div id="foodPortion" class="food-portion" hidden></div>
        <button type="button" class="link mt8" data-act="customFood">${icon('plus')}Create a custom food</button>`,
      onOpen: () => {
        const inp = document.getElementById('foodSearch');
        inp.addEventListener('input', () => { App.ui.foodQuery = inp.value; drawFoodList(); });
        App.ui.foodQuery = ''; App.ui.foodCat = 'All';
        drawFoodList();
      },
      onSubmit: (d) => {
        const f = App.ui.foodPick && App.food(App.ui.foodPick);
        if (!f) { App.toast('Pick a food from the list', 'bad'); return false; }
        const amount = +d.amount;
        if (!(amount > 0)) { App.toast('Enter an amount', 'bad'); return false; }
        addFoodEntry(f, amount, App.MEALS.some((m) => m.id === d.meal) ? d.meal : 'snacks');
      },
    });
  }
  function drawFoodList() {
    const list = document.getElementById('foodList');
    if (!list) return;
    const q = App.ui.foodQuery.trim().toLowerCase(), c = App.ui.foodCat;
    const foods = App.allFoods().filter((f) => (c === 'All' || (c === 'My foods' ? f.custom : f.cat === c)) && (!q || f.name.toLowerCase().includes(q)));
    list.innerHTML = foods.length ? foods.map((f, i) => `<button type="button" class="food-opt ${App.ui.foodPick === f.id ? 'on' : ''}" data-act="pickFood" data-id="${f.id}" style="--i:${Math.min(i, 12)}">
      <span class="grow ta-l"><b>${esc(f.name)}</b><small class="muted block">${f.kcal} kcal · ${f.p} g P per ${App.unitLabel(f, f.per)}${f.hint ? ' · ' + esc(f.hint) : ''}</small></span>${icon('plus')}</button>`).join('')
      : `<p class="muted small">No match. <button type="button" class="link" data-act="customFood">Create "${esc(App.ui.foodQuery)}"</button></p>`;
    document.querySelectorAll('#foodCats .pchip').forEach((b) => b.classList.toggle('on', b.dataset.c === c));
  }
  function drawPortion() {
    const f = App.food(App.ui.foodPick);
    const box = document.getElementById('foodPortion');
    if (!f || !box) return;
    const def = f.portions[Math.min(1, f.portions.length - 1)] || f.per;
    box.hidden = false;
    box.innerHTML = `<div class="row between"><b>${esc(f.name)}</b><button type="button" class="icon-btn sm" data-act="unpickFood" aria-label="Change food">${icon('x')}</button></div>
      <div class="preset-row">${f.portions.map((p) => `<button type="button" class="pchip ${p === def ? 'on' : ''}" data-act="portion" data-v="${p}">${App.unitLabel(f, p)}</button>`).join('')}</div>
      <div class="grid2"><label class="field"><span class="field-label">Amount (${f.unit})</span><input class="inp" name="amount" id="foodAmt" type="number" inputmode="decimal" step="any" min="0" value="${def}"></label>
      <div class="macro-preview" id="foodPrev"></div></div>`;
    const amt = document.getElementById('foodAmt');
    amt.addEventListener('input', previewMacros);
    previewMacros();
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function previewMacros() {
    const f = App.food(App.ui.foodPick), amt = document.getElementById('foodAmt'), prev = document.getElementById('foodPrev');
    if (!f || !amt || !prev) return;
    const m = App.macros(f, +amt.value || 0);
    prev.innerHTML = `<b class="kc">${m.kcal} kcal</b><small><span class="pc">${m.p} g P</span> · ${m.c} g C · ${m.f} g F</small>`;
    document.querySelectorAll('#foodPortion .pchip').forEach((b) => b.classList.toggle('on', +b.dataset.v === +amt.value));
  }
  App.actions.foodCat = (el) => { App.ui.foodCat = el.dataset.c; drawFoodList(); };
  App.actions.pickFood = (el) => { App.ui.foodPick = el.dataset.id; App.buzz(6); document.getElementById('foodList').classList.add('picked'); drawFoodList(); drawPortion(); };
  App.actions.unpickFood = () => { App.ui.foodPick = null; document.getElementById('foodPortion').hidden = true; document.getElementById('foodList').classList.remove('picked'); drawFoodList(); };
  App.actions.portion = (el) => { const a = document.getElementById('foodAmt'); a.value = el.dataset.v; previewMacros(); };

  function addFoodEntry(f, amount, meal, silent) {
    const m = App.macros(f, amount);
    const entry = { id: uid(), date: dkey(), meal, foodId: f.id, name: f.name, amount, unit: f.unit, qty: App.unitLabel(f, amount), ...m, ts: Date.now() };
    const before = App.foodOn(dkey());
    App.state.food.log.push(entry);
    if (!silent) foodCardAnimation(entry);
    const t = App.targets(), after = App.foodOn(dkey());
    if (before.p < t.protein && after.p >= t.protein) setTimeout(() => { App.confetti(); App.toast('Protein target hit! +20 XP', 'xp'); }, 900);
    return entry;
  }
  /** Animated food card: pops up, then flies toward the top (rings) while values update smoothly. */
  function foodCardAnimation(x) {
    const c = document.getElementById('cinema');
    if (App.reducedMotion()) { App.toast(`${x.name}: ${x.kcal} kcal · ${x.p} g protein`); return; }
    c.hidden = false;
    c.innerHTML = `<div class="food-fly"><span class="ff-emoji">${(App.MEALS.find((m) => m.id === x.meal) || {}).emoji || '🍽️'}</span><div><b>${esc(x.name)}</b><small>${esc(x.qty)}</small></div><div class="ff-mac"><b>+${x.kcal}</b><small>kcal</small></div><div class="ff-mac p"><b>+${x.p}g</b><small>protein</small></div></div>`;
    const card = c.firstElementChild;
    card.animate([{ transform: 'translateY(40px) scale(.9)', opacity: 0 }, { transform: 'translateY(0) scale(1.03)', opacity: 1, offset: 0.25 }, { transform: 'translateY(0) scale(1)', opacity: 1, offset: 0.6 }, { transform: 'translateY(-48vh) scale(.4)', opacity: 0 }], { duration: 1500, easing: 'cubic-bezier(.2,.8,.2,1)' }).onfinish = () => { c.hidden = true; c.innerHTML = ''; };
  }
  App.actions.logFood = (el) => {
    if (App.ui.fitnessTab !== 'food' || location.hash !== '#fitness') App.go('fitness', 'food');
    setTimeout(() => foodSheet(el && el.dataset && el.dataset.meal), 60);
  };
  App.actions.logPlan = (el) => {
    const p = App.PLAN[+el.dataset.i];
    p.items.forEach(([id, a], i) => addFoodEntry(App.food(id), a, p.meal, i > 0));
    App.buzz(15);
    App.commit();
  };
  App.actions.delFood = (el) => {
    App.state.food.log = App.state.food.log.filter((x) => x.id !== el.dataset.id);
    App.commit();
  };
  App.actions.customFood = () => {
    const q = App.ui.foodQuery || '';
    App.sheet({
      title: 'Custom food',
      submit: 'Save food',
      body: `${App.field('Name', App.input('name', { value: q, required: true, placeholder: 'e.g. Mom’s besan chilla' }))}
        <div class="grid2">${App.field('Unit', App.select('unit', ['pc', 'g', 'ml', 'katori', 'plate', 'serving'].map((u) => ({ value: u, label: u })), 'pc'))}${App.field('Values are per', App.input('per', { type: 'number', value: 1, min: 0.1, step: 'any', inputmode: 'decimal' }), 'e.g. 1 pc or 100 g')}</div>
        <div class="grid2">${App.field('Calories', App.input('kcal', { type: 'number', min: 0, required: true, inputmode: 'numeric' }))}${App.field('Protein (g)', App.input('p', { type: 'number', min: 0, value: 0, step: 'any', inputmode: 'decimal' }))}</div>
        <div class="grid2">${App.field('Carbs (g)', App.input('c', { type: 'number', min: 0, value: 0, step: 'any', inputmode: 'decimal' }))}${App.field('Fat (g)', App.input('f', { type: 'number', min: 0, value: 0, step: 'any', inputmode: 'decimal' }))}</div>
        <p class="field-hint">Check the nutrition label on packets. Home recipes are estimates.</p>`,
      onSubmit: (d) => {
        const per = +d.per > 0 ? +d.per : 1;
        const f = { id: 'c' + uid(), custom: true, name: d.name.trim().slice(0, 40), cat: 'My foods', unit: d.unit || 'pc', per, kcal: Math.max(0, +d.kcal || 0), p: +d.p || 0, c: +d.c || 0, f: +d.f || 0, portions: [per, per * 2] };
        App.state.food.custom.push(f);
        App.save();
        App.toast(`${f.name} saved to My foods`);
        setTimeout(() => { foodSheet(); setTimeout(() => { App.ui.foodPick = f.id; drawFoodList(); drawPortion(); }, 120); }, 320);
      },
    });
  };

  /* ---------- body / weight analytics ---------- */
  function renderBody() {
    const st = App.state, p = App.profile(), t = App.targets(), today = dkey();
    const w = st.body.weights;
    const ws = App.weightStats();
    const cur = App.currentWeight();
    const bmi = cur / Math.pow(p.heightCm / 100, 2);
    const adv = App.calorieAdvice();
    const series = w.slice(-60);
    const avg = series.map((x) => { const from = App.dkey(App.addDays(parseD(x.date), -6)); const xs = w.filter((y) => y.date >= from && y.date <= x.date); return App.sum(xs, (y) => y.kg) / xs.length; });
    let proj = '';
    if (ws && ws.perWeek != null) {
      const left = p.targetWeight - ws.smooth;
      if (left <= 0) proj = `You have reached ${p.targetWeight} kg. Next stage: ${p.finalWeight} kg.`;
      else if (ws.perWeek > 0.02) { const weeks = left / ws.perWeek; const eta = App.addDays(new Date(), Math.round(weeks * 7)); proj = `At ${ws.perWeek.toFixed(2)} kg/week you reach <b>${p.targetWeight} kg around ${eta.getDate()} ${App.MON[eta.getMonth()]} ${eta.getFullYear()}</b> (~${Math.ceil(weeks)} weeks).`; }
      else proj = 'Not gaining yet. At the current trend there is no projection to target.';
    } else proj = 'Need about 2 weeks of entries (3–4 per week) for a projection.';
    // weekly averages
    const weeks = [];
    for (let i = 0; i < 6; i++) {
      const end = App.addDays(new Date(), -7 * i), start = App.addDays(end, -6);
      const xs = w.filter((x) => x.date >= dkey(start) && x.date <= dkey(end));
      if (xs.length) weeks.push({ label: i === 0 ? 'This week' : `${start.getDate()} ${App.MON[start.getMonth()]}`, v: App.sum(xs, (x) => x.kg) / xs.length, n: xs.length });
    }
    const week = lastNDays(7);
    const trainDays = week.filter((d) => App.isTrainingDay(d) && (d < today || App.workoutOn(d).finished));
    const doneW = trainDays.filter((d) => App.workoutOn(d).finished).length;
    const stepsChart = week.map((d) => ({ label: DOW[parseD(d).getDay()][0], value: st.body.steps[d] || 0, cls: (st.body.steps[d] || 0) >= st.settings.stepGoal ? 'grad-green' : 'grad-sky', on: d === today }));
    const water = st.body.water[today] || 0;
    const stage = [p.startWeight, p.targetWeight, p.finalWeight];
    const pct = App.clamp((cur - stage[0]) / ((stage[2] - stage[0]) || 1), 0, 1);
    const f2 = (x) => (x == null ? '—' : `${x >= 0 ? '+' : ''}${x.toFixed(2)} kg`);
    return `
      <section class="card hero reveal" style="--i:1">
        <div class="row between"><div><span class="eyebrow">Current weight</span><h2 class="kcal">${App.count(cur, { dec: 1, key: 'bw' })} <small>kg</small></h2></div><button class="btn btn-soft sm" data-act="quickWeight">${icon('plus')}Log</button></div>
        <div class="weight-track"><div class="wt-line"><span class="wt-fill" style="--w:${pct * 100}%"></span><span class="wt-me" style="left:${pct * 100}%"><b>${round1(cur)}</b></span>
          ${stage.map((s, i) => `<span class="wt-stop ${cur >= s ? 'on' : ''}" style="left:${(App.clamp((s - stage[0]) / ((stage[2] - stage[0]) || 1), 0, 1)) * 100}%"><i></i><small>${s} kg${i === 0 ? ' start' : i === 1 ? ' target' : ' final'}</small></span>`).join('')}</div></div>
        <div class="stat-row four">${App.stat('Week Δ', f2(ws && ws.weekChange), 'avg vs prev')}${App.stat('Month Δ', f2(ws && ws.monthChange), 'avg vs prev')}${App.stat('Trend', ws && ws.perWeek != null ? f2(ws.perWeek) + '/wk' : '—')}${App.stat('BMI', bmi.toFixed(1), 'estimate')}</div>
      </section>
      <section class="card reveal" style="--i:2">
        <div class="card-head"><h3>${icon('up')}Weight trend</h3><span class="muted small">${w.length} entries</span></div>
        ${App.lineChart(series.map((x) => ({ v: x.kg, label: x.date })), { avg, target: p.targetWeight, fmt: (v) => v.toFixed(1) })}
        <div class="legend mt8"><span><i style="background:#38bdf8"></i>Daily</span><span><i style="background:#f8fafc"></i>7-day average</span><span><i style="background:#ef4444"></i>Target</span></div>
        <p class="small mt12">${proj}</p>
      </section>
      <div class="inline-alert ${adv.cls} reveal" style="--i:3">${icon(adv.cls === 'ok' ? 'up' : 'info')}<span>${adv.msg}${adv.delta ? ` <button class="link" data-act="applyAdvice" data-d="${adv.delta}">Apply ${adv.delta > 0 ? '+' : ''}${adv.delta} kcal</button>` : ''}</span></div>
      ${weeks.length ? `<section class="card reveal" style="--i:4"><div class="card-head"><h3>${icon('cal')}Weekly averages</h3></div>
        ${weeks.map((x, i) => `<div class="shop-row"><span>${x.label}<small class="muted block">${x.n} entr${x.n === 1 ? 'y' : 'ies'}</small></span><b>${x.v.toFixed(2)} kg ${weeks[i + 1] ? `<small class="${x.v - weeks[i + 1].v >= 0 ? 'pos' : 'neg'}">${x.v - weeks[i + 1].v >= 0 ? '▲' : '▼'} ${Math.abs(x.v - weeks[i + 1].v).toFixed(2)}</small>` : ''}</b></div>`).join('')}</section>` : ''}
      <section class="card reveal" style="--i:5"><div class="card-head"><h3>${icon('target')}Daily targets</h3></div>
        <div class="stat-row three">${App.stat('Calories', App.num(t.kcal), 'kcal')}${App.stat('Protein', t.protein + ' g', '2 g/kg')}${App.stat('Water', (st.settings.waterGoal * 0.25).toFixed(1) + ' L', `${st.settings.waterGoal} glasses`)}</div>
        <div class="stat-row three mt8">${App.stat('Steps goal', App.num(st.settings.stepGoal))}${App.stat('Workouts (7d)', `${doneW}/${trainDays.length}`)}${App.stat('Water today', (water * 0.25).toFixed(2) + ' L')}</div>
      </section>
      <section class="card reveal" style="--i:6">
        <div class="card-head"><h3>${icon('drop')}Water</h3><span class="muted small">${(water * 0.25).toFixed(2)} / ${(st.settings.waterGoal * 0.25).toFixed(1)} L</span></div>
        <div class="glasses">${Array.from({ length: st.settings.waterGoal }, (_, i) => `<span class="glass ${i < water ? 'full' : ''}" style="--d:${i * 30}ms"></span>`).join('')}</div>
        <div class="row gap mt12"><button class="btn btn-ghost" data-act="subWater" aria-label="Remove a glass">${icon('minus')}</button><button class="btn btn-primary grow" data-act="addWater">${icon('plus')}250 ml glass</button></div>
      </section>
      <section class="card reveal" style="--i:7">
        <div class="card-head"><h3>${icon('steps')}Steps</h3><button class="link" data-act="logSteps">${App.num(st.body.steps[today] || 0)} today ${icon('edit')}</button></div>
        ${App.barChart(stepsChart, { height: 110, lines: [{ v: st.settings.stepGoal, cls: 'ok', label: 'Goal' }], fmt: (v) => (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v) })}
      </section>
      <section class="card reveal" style="--i:8">
        <div class="card-head"><h3>${icon('trophy')}Workout history</h3></div>
        ${historyRows()}
      </section>`;
  }
  function historyRows() {
    const ws = Object.entries(App.state.gym.logs).filter(([, l]) => l.finished).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 8);
    if (!ws.length) return '<p class="muted small">Finish your first workout to see it here.</p>';
    return ws.map(([k, l]) => {
      const [date, day] = k.split('|');
      const sets = Object.values(l.sets || {}).flat().filter((s) => s && s.done);
      const vol = App.sum(sets, (s) => (+s.w || 0) * (+s.r || 0));
      return `<div class="hist-row"><span class="tile-ic ${(App.DAYS[day] || { color: 'g-sky' }).color} sm">${icon('dumbbell')}</span><div class="grow"><b>${esc(App.dayName(day))}</b><small class="muted block">${prettyDate(date)} · ${sets.length} sets</small></div><b>${App.num(vol)} kg</b></div>`;
    }).join('');
  }

  function renderWeek() {
    const tk = todayKey();
    return `
      <section class="card reveal" style="--i:1"><div class="card-head"><h3>${icon('cal')}Your weekly split</h3></div>
        <p class="muted small">5 training days, 2 rest days. Every muscle is trained twice a week, which is ideal for gaining size from 49 kg.</p></section>
      ${[1, 2, 3, 4, 5, 6, 0].map((i, idx) => {
        const k = App.WEEK[i], d = App.DAYS[k];
        return `<button class="card week-row ${i === new Date().getDay() ? 'today' : ''} reveal" style="--i:${idx + 2}" data-act="openDay" data-d="${k}" data-i="${i}">
          <span class="tile-ic ${d.color}">${icon(k === 'rest' ? 'moon' : 'dumbbell')}</span>
          <span class="grow ta-l"><small class="muted">${App.DOW_FULL[i]}${i === new Date().getDay() ? ' · Today' : ''}</small><b class="block">${d.name}</b><small class="muted">${d.list.length ? d.list.map((e) => App.EX[e.id].name).slice(0, 3).join(', ') + '…' : d.focus}</small></span>${icon('right')}</button>`;
      }).join('')}
      <section class="card reveal"><div class="card-head"><h3>${icon('up')}Progressive overload rules</h3></div>
        <ul class="rules"><li>Choose a weight where the last 1–2 reps are hard but form stays clean.</li>
          <li>Increase only when <b>every planned set</b> reached the top of the rep range last session: +2.5 kg upper body, +5 kg legs.</li>
          <li>Missed reps? Keep the weight and add one rep per set next time.</li>
          <li>Ticking a set starts the rest timer automatically.</li>
          <li>Every 8 weeks, take a lighter week (half the sets).</li></ul></section>
      <section class="card reveal"><div class="card-head"><h3>${icon('spark')}Coach tips</h3></div><ul class="rules">${App.COACH_TIPS.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>`;
  }

  /* ---------- actions ---------- */
  App.actions.pickDay = (el) => { App.ui.gymDay = el.dataset.d; App.ui.gymDayIdx = +el.dataset.i; App.buzz(4); App.render({ quiet: true }); };
  App.actions.openDay = (el) => { App.ui.gymDay = el.dataset.d; App.ui.gymDayIdx = +el.dataset.i; App.ui.fitnessTab = 'workout'; App.render({ quiet: true }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  App.actions.toggleEx = (el) => {
    const id = el.dataset.id;
    App.ui.openEx[id] = !App.ui.openEx[id];
    App.render({ quiet: true });
  };
  function setSlot(key, ex, i) {
    const logs = App.state.gym.logs;
    const day = key.split('|')[1];
    logs[key] = logs[key] || { day, sets: {}, finished: false };
    const def = (App.DAYS[day] || { list: [] }).list.find((e) => e.id === ex);
    const arr = (logs[key].sets[ex] = logs[key].sets[ex] || []);
    while (arr.length < (def ? def.sets : i + 1)) arr.push({});
    for (let j = 0; j < arr.length; j++) if (!arr[j]) arr[j] = {};
    return arr[i];
  }
  App.changes.setVal = (el) => {
    const s = setSlot(el.dataset.key, el.dataset.ex, +el.dataset.i);
    s[el.dataset.f] = el.value === '' ? undefined : Math.max(0, +el.value);
    App.save();
  };
  App.actions.doneSet = (el) => {
    const { key, ex } = el.dataset;
    const i = +el.dataset.i;
    const s = setSlot(key, ex, i);
    const grid = el.closest('.set-grid');
    ['w', 'r'].forEach((f) => {
      const inp = grid.querySelector(`[data-ex="${ex}"][data-i="${i}"][data-f="${f}"]`);
      if (!inp) return;
      const v = inp.value !== '' ? inp.value : inp.placeholder;
      if (v !== '') s[f] = Math.max(0, +v);
    });
    s.done = !s.done;
    App.buzz(s.done ? [18, 40, 18] : 6);
    App.save();
    if (s.done) {
      el.classList.add('on', 'pop');
      const def = App.DAYS[key.split('|')[1]].list.find((e) => e.id === ex);
      const all = App.state.gym.logs[key].sets[ex].filter((x) => x && x.done).length;
      if (all >= def.sets) App.toast(`${App.EX[ex].name} complete 💪`);
      App.startRest(+el.dataset.rest, App.EX[ex].name);
      setTimeout(() => App.render({ quiet: true }), 260);
    } else App.render({ quiet: true });
  };
  App.actions.startRest = (el) => App.startRest(+el.dataset.rest);
  App.actions.finishWorkout = (el) => {
    const key = el.dataset.key;
    const logs = App.state.gym.logs;
    logs[key] = logs[key] || { day: el.dataset.day, sets: {}, finished: false };
    const done = Object.values(logs[key].sets).flat().filter((s) => s && s.done).length;
    if (!done && !confirm('No sets ticked yet. Mark the workout as finished anyway?')) return;
    logs[key].finished = true;
    logs[key].finishedAt = Date.now();
    App.actions.restStop();
    App.confetti();
    App.toast('Workout complete! +50 XP', 'xp');
    App.commit();
  };
  App.actions.applyAdvice = (el) => {
    const p = App.profile();
    const last = p.adviceAt;
    if (last && App.daysBetween(last, dkey()) < 14 && !confirm('You adjusted calories less than 2 weeks ago. Weight trends need ~2 weeks to respond. Apply anyway?')) return;
    p.calorieAdjust = (+p.calorieAdjust || 0) + +el.dataset.d;
    p.adviceAt = dkey();
    App.toast(`Calorie target ${+el.dataset.d > 0 ? 'raised' : 'lowered'} by ${Math.abs(+el.dataset.d)} kcal`);
    App.commit();
  };
  App.actions.subWater = () => { const t = dkey(); App.state.body.water[t] = Math.max(0, (App.state.body.water[t] || 0) - 1); App.commit(); };
  App.actions.logSteps = () => {
    const t = dkey();
    App.sheet({
      title: 'Steps today',
      body: App.field('Steps', App.input('steps', { type: 'number', value: App.state.body.steps[t] || '', min: 0, max: 100000, required: true, inputmode: 'numeric' }), "Copy the number from your phone's health app.")
        + App.field('Daily step goal', App.input('goal', { type: 'number', value: App.state.settings.stepGoal, min: 1000, max: 50000, inputmode: 'numeric' })),
      onSubmit: (d) => {
        App.state.body.steps[t] = Math.max(0, Math.round(+d.steps || 0));
        if (+d.goal) App.state.settings.stepGoal = Math.round(+d.goal);
        if (App.state.body.steps[t] >= App.state.settings.stepGoal) App.confetti();
        App.commit();
      },
    });
  };

  App.views.fitness = { render };
})();
