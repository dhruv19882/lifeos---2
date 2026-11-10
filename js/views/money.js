'use strict';
/* Money (INR): purchases with receipt photos + cinematic receipt, income, refunds, budgets, recurring bills,
   savings goals, monthly report, CSV. Balance = opening balance + recorded entries (no bank sync). */
(function () {
  const { icon, esc, inr, dkey, mkey, uid, parseD, prettyDate, MON, sum } = App;
  App.ui.moneyMonth = mkey();

  const sign = (t) => (t.type === 'expense' ? -1 : 1);
  App.monthMoney = (month = mkey()) => {
    const m = App.state.money;
    const tx = m.txns.filter((t) => t.date.startsWith(month));
    const exp = sum(tx.filter((t) => t.type === 'expense'), (t) => t.amount);
    const refunds = sum(tx.filter((t) => t.type === 'refund'), (t) => t.amount);
    const income = sum(tx.filter((t) => t.type === 'income'), (t) => t.amount);
    const spent = Math.max(0, exp - refunds);
    const budget = m.monthly || 0;
    const left = budget - spent;
    const [y, mo] = month.split('-').map(Number);
    const daysInMonth = new Date(y, mo, 0).getDate();
    const daysLeft = month === mkey() ? daysInMonth - new Date().getDate() + 1 : 0;
    return { tx, exp, refunds, spent, income, budget, left, perDay: daysLeft ? left / daysLeft : 0, daysLeft, daysInMonth };
  };
  App.balance = () => (+App.state.settings.openingBalance || 0) + sum(App.state.money.txns, (t) => sign(t) * t.amount);
  const catSpend = (tx, id) => sum(tx.filter((t) => t.cat === id && t.type === 'expense'), (t) => t.amount) - sum(tx.filter((t) => t.cat === id && t.type === 'refund'), (t) => t.amount);
  const monthLabel = (m) => { const d = parseD(m + '-01'); return `${MON[d.getMonth()]} ${d.getFullYear()}`; };

  function render() {
    const month = App.ui.moneyMonth, tab = App.ui.moneyTab, mm = App.monthMoney(month), isNow = month === mkey();
    const head = `
      ${App.header('Money', 'Personal finance · ₹ INR', `<button class="fab-sm" data-act="purchase" aria-label="Add purchase">${icon('plus')}</button>`)}
      <div class="month-nav reveal" style="--i:0"><button class="icon-btn" data-act="monthNav" data-n="-1" aria-label="Previous month">${icon('left')}</button><b>${monthLabel(month)}</b><button class="icon-btn" data-act="monthNav" data-n="1" ${isNow ? 'disabled' : ''} aria-label="Next month">${icon('right')}</button></div>
      <div class="reveal" style="--i:1">${App.seg('tab', [{ value: 'overview', label: 'Overview' }, { value: 'list', label: `History · ${mm.tx.length}` }, { value: 'plan', label: 'Bills & goals' }], tab).replace(/data-act="tab"/g, 'data-act="tab" data-k="moneyTab"')}</div>`;
    if (tab === 'list') return head + `<div class="stack mt12">${renderList(mm)}</div>`;
    if (tab === 'plan') return head + `<div class="stack mt12">${renderPlan()}</div>`;

    const pct = mm.budget ? mm.spent / mm.budget : 0;
    const barCls = pct >= 1 ? 'red' : pct >= 0.8 ? 'warm' : 'green';
    const bal = App.balance();
    const byCat = App.EXP.map((c) => ({ ...c, v: catSpend(mm.tx, c.id) })).filter((c) => c.v > 0 || App.state.money.budgets[c.id]).sort((a, b) => b.v - a.v);
    const six = Array.from({ length: 6 }, (_, i) => { const d = parseD(month + '-01'); d.setMonth(d.getMonth() - 5 + i); const k = mkey(d); const x = App.monthMoney(k); return { label: MON[d.getMonth()], value: x.income, value2: x.spent, on: k === month, title: `${k}: in ${inr(x.income)} / out ${inr(x.spent)}` }; });
    const daily = Array.from({ length: mm.daysInMonth }, (_, i) => { const k = `${month}-${String(i + 1).padStart(2, '0')}`; const v = Math.max(0, sum(mm.tx.filter((t) => t.date === k && t.type === 'expense'), (t) => t.amount) - sum(mm.tx.filter((t) => t.date === k && t.type === 'refund'), (t) => t.amount)); return { label: (i + 1) % 5 === 0 || i === 0 ? String(i + 1) : '', value: v, cls: v > App.state.settings.dailySpendLimit ? 'grad-red' : 'grad-sky', title: `${k}: ${inr(v)}`, on: k === dkey() }; });
    return `${head}
      <section class="card balance reveal mt12" style="--i:2">
        <div class="row between"><small class="muted">Tracked balance</small><button class="link small" data-act="balanceInfo">${icon('info')}How?</button></div>
        <div class="balance-big ${bal < 0 ? 'neg' : ''}" id="balNum">${App.count(bal, { prefix: '₹', key: 'bal' })}</div>
        <div class="row between small"><span class="muted">Spent in ${MON[parseD(month + '-01').getMonth()]}</span><b>${App.count(mm.spent, { prefix: '₹', key: 'mspent' })} <small class="muted">/ ${inr(mm.budget)}</small></b></div>
        ${App.bar(pct, barCls, `thick ${pct >= 1 ? 'bar-bad' : pct >= 0.8 ? 'bar-warn' : ''}`, 'mbudget')}
        ${pct >= 0.8 ? `<div class="inline-alert ${pct >= 1 ? 'bad' : 'warn'} pulse-once">${icon('alert')}${pct >= 1 ? `Budget crossed by ${inr(mm.spent - mm.budget)}.` : `${Math.round(pct * 100)}% of the monthly budget used.`}</div>` : ''}
        <div class="stat-row three">
          <div class="stat"><span class="tile-ic g-green sm">${icon('up')}</span><small>Income</small><b>${inr(mm.income)}</b></div>
          <div class="stat"><span class="tile-ic g-red sm">${icon('downT')}</span><small>Expenses</small><b>${inr(mm.spent)}</b>${mm.refunds ? `<small class="muted">after ${inr(mm.refunds)} refunds</small>` : ''}</div>
          <div class="stat"><span class="tile-ic g-sky sm">${icon('piggy')}</span><small>Savings</small><b class="${mm.income - mm.spent < 0 ? 'neg' : ''}">${inr(mm.income - mm.spent)}</b>${mm.income ? `<small class="muted">${Math.round(((mm.income - mm.spent) / mm.income) * 100)}% rate</small>` : ''}</div>
        </div>
        ${isNow ? `<p class="muted small mt8">Safe to spend <b class="pos">${inr(Math.max(0, mm.perDay))}/day</b> for ${mm.daysLeft} days · daily limit ${inr(App.state.settings.dailySpendLimit)}</p>` : ''}
        <div class="row gap mt12">
          <button class="btn btn-primary grow" data-act="purchase">${icon('minus')}Purchase</button>
          <button class="btn btn-soft grow" data-act="addTxn" data-type="income">${icon('plus')}Income</button>
          <button class="btn btn-ghost" data-act="addTxn" data-type="refund" aria-label="Add refund">${icon('refund')}</button>
        </div>
      </section>
      <section class="card reveal" style="--i:3">
        <div class="card-head"><h3>${icon('chart')}Income vs expenses</h3><div class="legend"><span><i style="background:#22c55e"></i>In</span><span><i style="background:#ef4444"></i>Out</span></div></div>
        ${App.barChart(six.map((x) => ({ ...x, cls: 'grad-green' })), { height: 130, fmt: (v) => inr(v) })}
      </section>
      <section class="card reveal" style="--i:4">
        <div class="card-head"><h3>${icon('cal')}Daily spending</h3><span class="muted small">limit ${inr(App.state.settings.dailySpendLimit)}</span></div>
        ${App.barChart(daily, { height: 100, lines: [{ v: App.state.settings.dailySpendLimit, cls: 'bad', label: 'Limit' }], fmt: () => '' })}
      </section>
      <section class="card reveal" style="--i:5">
        <div class="card-head"><h3>${icon('target')}Category spending</h3><button class="link" data-act="editBudgets">Budgets ${icon('edit')}</button></div>
        ${byCat.length ? `<div class="donut-wrap">${App.donut(byCat.filter((c) => c.v > 0).map((c) => ({ value: c.v, color: c.c })), { size: 150, stroke: 20, center: `<b>${inr(mm.spent)}</b><small>spent</small>` })}</div>
          <div class="cat-list">${byCat.map((c) => { const b = App.state.money.budgets[c.id]; const p = b ? c.v / b : 0; return `<div class="cat-row"><span class="cat-e" style="--c:${c.c}">${c.e}</span>
            <div class="grow"><div class="row between"><b>${c.label}</b><span>${inr(c.v)}${b ? `<small class="muted"> / ${inr(b)}</small>` : ''}</span></div>
            ${b ? App.bar(p, p >= 1 ? 'red' : p >= 0.8 ? 'warm' : 'green', 'thin', 'cb' + c.id) : `<div class="bar thin"><span class="bar-fill" data-w="${(c.v / (mm.spent || 1)) * 100}" data-key="b:cs${c.id}" style="background:${c.c}"></span></div>`}</div></div>`; }).join('')}</div>`
          : App.empty('wallet', 'No spending yet', 'Log every chai and recharge. Chhote kharche bhi add hote hain.')}
      </section>
      <div class="row gap reveal"><button class="btn btn-soft grow" data-act="monthReport">${icon('receipt')}Monthly report</button><button class="btn btn-ghost grow" data-act="exportTxCsv">${icon('download')}CSV</button></div>`;
  }

  function renderList(mm) {
    if (!mm.tx.length) return App.empty('rupee', 'No transactions', 'Add a purchase, income or refund for this month.', `<button class="btn btn-primary" data-act="purchase">${icon('plus')}Add purchase</button>`);
    const byDate = {};
    mm.tx.slice().sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts).forEach((t) => (byDate[t.date] = byDate[t.date] || []).push(t));
    return Object.entries(byDate).map(([d, list], i) => {
      const net = sum(list, (t) => sign(t) * t.amount);
      return `<section class="reveal" style="--i:${i + 2}"><h4 class="group-title">${prettyDate(d)}<span class="${net < 0 ? 'neg' : 'pos'}">${net < 0 ? '-' : '+'}${inr(Math.abs(net))}</span></h4>
        <div class="card list-card">${list.map(txnRow).join('')}</div></section>`;
    }).join('');
  }
  const txnRow = (t) => {
    const c = App.moneyCat(t.cat);
    return `<button class="txn" data-act="viewTxn" data-id="${t.id}" data-flip="x${t.id}"><span class="cat-e" style="--c:${c.c}">${t.type === 'refund' ? '↩️' : c.e}</span>
      <span class="grow ta-l"><b>${esc(t.merchant || t.note || c.label)}</b><small class="muted block">${t.type === 'refund' ? 'Refund · ' : ''}${c.label} · ${esc(t.mode || 'UPI')}${t.receiptId ? ' · 📎' : ''}</small></span>
      <b class="${t.type === 'expense' ? '' : 'pos'}">${t.type === 'expense' ? '-' : '+'}${inr(t.amount, true)}</b></button>`;
  };

  function renderPlan() {
    const m = App.state.money, mk = mkey();
    const rec = m.recurring;
    return `
      <section class="card reveal" style="--i:2">
        <div class="card-head"><h3>${icon('repeat')}Recurring expenses</h3><button class="link" data-act="editRecurring">${icon('plus')}Add</button></div>
        ${rec.length ? rec.map((r) => { const paid = (r.paid || {})[mk]; const c = App.moneyCat(r.cat); return `<div class="rec-row ${paid ? 'paid' : ''}" data-flip="r${r.id}">
          <span class="cat-e" style="--c:${c.c}">${c.e}</span><button class="grow ta-l" data-act="editRecurring" data-id="${r.id}"><b>${esc(r.name)}</b><small class="muted block">${inr(r.amount)} · day ${r.day} · ${esc(r.mode)}</small></button>
          ${paid ? `<span class="badge ok">${icon('check')}Paid</span>` : `<button class="btn btn-soft sm" data-act="payRecurring" data-id="${r.id}">Pay</button>`}</div>`; }).join('')
          : '<p class="muted small">Add rent, gym fee, phone recharge, subscriptions. Tap "Pay" each month to record it, so nothing is posted without you.</p>'}
      </section>
      <section class="card reveal" style="--i:3">
        <div class="card-head"><h3>${icon('piggy')}Financial goals</h3><button class="link" data-act="editMoneyGoal">${icon('plus')}Add</button></div>
        ${m.goals.length ? m.goals.map((g) => { const p = g.target ? g.saved / g.target : 0; const months = g.deadline ? Math.max(1, Math.ceil(App.daysBetween(dkey(), g.deadline) / 30)) : null; return `<div class="mgoal" data-flip="g${g.id}">
          <div class="row between"><button class="ta-l grow" data-act="editMoneyGoal" data-id="${g.id}"><b>${esc(g.name)}</b><small class="muted block">${inr(g.saved)} of ${inr(g.target)}${months && g.saved < g.target ? ` · save ${inr((g.target - g.saved) / months)}/month` : ''}</small></button>
            <button class="btn btn-soft sm" data-act="contribute" data-id="${g.id}">${icon('plus')}Add</button></div>
          ${App.bar(p, p >= 1 ? 'green' : 'sky', '', 'mg' + g.id)}</div>`; }).join('')
          : '<p class="muted small">e.g. Emergency fund ₹30,000, CMA exam fees, new phone.</p>'}
      </section>
      <section class="card reveal" style="--i:4"><div class="card-head"><h3>${icon('settings')}Money settings</h3></div>
        <div class="stat-row three">${App.stat('Monthly budget', inr(m.monthly))}${App.stat('Daily limit', inr(App.state.settings.dailySpendLimit))}${App.stat('Opening balance', inr(App.state.settings.openingBalance))}</div>
        <button class="btn btn-ghost btn-block mt12" data-act="editBudgets">${icon('edit')}Edit budgets & limits</button></section>`;
  }

  /* ---------- purchase / income / refund entry ---------- */
  App.ui.receiptDraft = null;
  function txnSheet(t, type) {
    const isNew = !t;
    type = (t && t.type) || type || 'expense';
    t = t || { type, amount: '', cat: type === 'income' ? 'salary' : 'food', merchant: '', note: '', date: dkey(), mode: 'UPI' };
    App.ui.receiptDraft = null;
    const cats = (type === 'income' ? App.INC : App.EXP);
    const title = isNew ? { expense: 'New purchase', income: 'Add income', refund: 'Add refund' }[type] : 'Edit transaction';
    App.sheet({
      title,
      cls: isNew && type === 'expense' ? 'sheet-full purchase' : 'sheet-tall',
      submit: isNew ? (type === 'expense' ? 'Pay & save' : 'Save') : 'Save changes',
      body: `
        <div class="amount-inp ${type}"><span>₹</span><input name="amount" type="number" inputmode="decimal" min="0.01" step="0.01" placeholder="0" value="${t.amount}" required aria-label="Amount"></div>
        <input type="hidden" name="type" value="${type}">
        <div class="field"><span class="field-label">${type === 'refund' ? 'Refunded category' : 'Category'}</span>
          <div class="cat-grid">${cats.map((c, i) => `<label class="cat-opt" style="--i:${i};--c:${c.c}"><input type="radio" name="cat" value="${c.id}" ${c.id === t.cat ? 'checked' : ''}><span><i>${c.e}</i>${c.label}</span></label>`).join('')}</div></div>
        ${App.field(type === 'income' ? 'From' : 'Merchant / shop', App.input('merchant', { value: t.merchant, placeholder: type === 'income' ? 'e.g. Employer name' : 'e.g. Swiggy, D-Mart, Jio' }))}
        <div class="grid2">${App.field('Date', App.input('date', { type: 'date', value: t.date, max: dkey(), required: true }))}${App.field(type === 'income' ? 'Received via' : 'Paid via', App.select('mode', App.PAY_MODES.map((m) => ({ value: m, label: m })), t.mode))}</div>
        ${App.field('Notes', App.input('note', { value: t.note, placeholder: 'Optional' }))}
        ${type !== 'income' ? `<div class="field"><span class="field-label">Receipt photo</span>
          <label class="receipt-drop" id="rcptDrop">${icon('camera')}<span id="rcptLbl">${t.receiptId ? 'Receipt attached · tap to replace' : 'Attach a photo (optional)'}</span><input type="file" accept="image/*" capture="environment" data-change="receiptPick" hidden></label>
          <img id="rcptPrev" class="rcpt-prev" alt="" hidden></div>` : ''}`,
      danger: isNew ? null : { act: 'deleteTxn', label: 'Delete', attrs: `data-id="${t.id}"` },
      onOpen: () => {
        if (t.receiptId) App.blobGet(t.receiptId).then((b) => { if (b) { const im = document.getElementById('rcptPrev'); im.src = URL.createObjectURL(b); im.hidden = false; } }).catch(() => {});
      },
      onSubmit: (d) => {
        const amount = Math.round(+d.amount * 100) / 100;
        if (!(amount > 0)) { App.toast('Enter an amount greater than ₹0', 'bad'); return false; }
        if (amount > 10000000) { App.toast('That amount looks too large', 'bad'); return false; }
        const valid = cats.some((c) => c.id === d.cat);
        if (!valid) { App.toast('Choose a category', 'bad'); return false; }
        const obj = { type, amount, cat: d.cat, merchant: (d.merchant || '').trim().slice(0, 60), note: (d.note || '').trim().slice(0, 120), date: d.date || dkey(), mode: App.PAY_MODES.includes(d.mode) ? d.mode : 'UPI' };
        const beforeBal = App.balance();
        const before = App.monthMoney(obj.date.slice(0, 7));
        const finish = (receiptId) => {
          let rec;
          if (isNew) { rec = { id: uid(), ts: Date.now(), ...obj, receiptId: receiptId || null }; App.state.money.txns.push(rec); }
          else { Object.assign(t, obj); if (receiptId) t.receiptId = receiptId; rec = t; }
          const after = App.monthMoney(obj.date.slice(0, 7));
          App.save();
          if (isNew && type === 'expense') App.paymentCinema(rec, beforeBal, App.balance(), before, after);
          else {
            App.toast(`${type === 'income' ? 'Income' : type === 'refund' ? 'Refund' : 'Transaction'} of ${inr(amount, true)} saved`);
            App.commit();
          }
          budgetWarn(before, after);
        };
        if (App.ui.receiptDraft) {
          const id = 'rcpt-' + uid();
          App.blobPut(id, App.ui.receiptDraft).then(() => finish(id)).catch(() => { App.toast('Could not store the photo; saved without it', 'warn'); finish(null); });
        } else finish(null);
      },
    });
  }
  function budgetWarn(before, after) {
    if (!after.budget) return;
    if (before.spent < after.budget && after.spent >= after.budget) setTimeout(() => { App.toast('Monthly budget crossed!', 'bad'); App.buzz([80, 60, 80]); }, 2600);
    else if (before.spent < after.budget * 0.8 && after.spent >= after.budget * 0.8) setTimeout(() => App.toast('80% of your monthly budget used', 'warn'), 2600);
  }

  /** Compress the picked photo to ≤1280 px JPEG and keep it as a draft until save. */
  App.changes.receiptPick = (el) => {
    const f = el.files && el.files[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) return App.toast('Please choose an image', 'bad');
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1280 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => {
        App.ui.receiptDraft = b;
        const im = document.getElementById('rcptPrev');
        im.src = URL.createObjectURL(b); im.hidden = false;
        document.getElementById('rcptLbl').textContent = `Photo ready (${Math.round(b.size / 1024)} KB) · tap to replace`;
      }, 'image/jpeg', 0.78);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => App.toast('Could not read that image', 'bad');
    img.src = URL.createObjectURL(f);
  };

  /* ---------- cinematic payment + digital receipt ---------- */
  App.paymentCinema = (t, fromBal, toBal, before, after) => {
    App.closeSheet();
    const c = App.moneyCat(t.cat);
    const el = document.getElementById('cinema');
    const when = new Date(t.ts);
    el.hidden = false;
    el.className = 'cinema pay';
    el.innerHTML = `<div class="pay-stage">
      <div class="pay-balance"><small>Available balance</small><b id="payBal">${inr(fromBal, true)}</b><span class="pay-delta">-${inr(t.amount, true)}</span></div>
      <div class="pay-path"><span class="coin">₹</span><span class="coin c2">₹</span><span class="coin c3">₹</span></div>
      <div class="pay-cat" style="--c:${c.c}"><i>${c.e}</i><small>${c.label}</small></div>
      <div class="receipt" role="dialog" aria-label="Digital receipt">
        <div class="rc-top"><span class="rc-ok">${icon('check')}</span><b>Payment recorded</b><small>${when.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</small></div>
        <div class="rc-amt">${inr(t.amount, true)}</div>
        <div class="rc-rows">
          <div><span>Merchant</span><b>${esc(t.merchant || '—')}</b></div><div><span>Category</span><b>${c.e} ${c.label}</b></div>
          <div><span>Date</span><b>${prettyDate(t.date)}</b></div><div><span>Paid via</span><b>${esc(t.mode)}</b></div>
          ${t.note ? `<div><span>Note</span><b>${esc(t.note)}</b></div>` : ''}
          <div><span>Receipt no.</span><b class="mono">LOS-${t.id.slice(-8).toUpperCase()}</b></div>
          <div class="sep"></div>
          <div><span>Spent this month</span><b>${inr(after.spent)}</b></div><div><span>Budget left</span><b class="${after.left < 0 ? 'neg' : 'pos'}">${inr(after.left)}</b></div>
        </div>
        <div class="rc-zig"></div>
        <div class="row gap rc-actions"><button class="btn btn-ghost grow" data-act="shareReceipt" data-id="${t.id}">${icon('share')}Share</button><button class="btn btn-primary grow" data-act="closeCinema">Done</button></div>
      </div></div>`;
    App.buzz([15, 30, 15]);
    const balEl = document.getElementById('payBal');
    const rm = App.reducedMotion();
    if (rm) { balEl.textContent = inr(toBal, true); el.classList.add('show-receipt'); return; }
    setTimeout(() => {
      const start = performance.now(), dur = 900;
      const step = (now) => { const k = Math.min(1, (now - start) / dur); const e = 1 - Math.pow(1 - k, 3); balEl.textContent = inr(fromBal + (toBal - fromBal) * e, true); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
      el.classList.add('moving');
    }, 350);
    setTimeout(() => { el.classList.add('show-receipt'); App.buzz(10); }, 1500);
  };
  App.actions.closeCinema = () => {
    const el = document.getElementById('cinema');
    el.classList.add('out');
    setTimeout(() => { el.hidden = true; el.className = 'cinema'; el.innerHTML = ''; }, 320);
    App.commit();
  };
  App.actions.shareReceipt = (b) => {
    const t = App.state.money.txns.find((x) => x.id === b.dataset.id);
    if (!t) return;
    const txt = `LifeOS receipt LOS-${t.id.slice(-8).toUpperCase()}\n${t.merchant || App.moneyCat(t.cat).label}: ${inr(t.amount, true)}\n${prettyDate(t.date)} · ${t.mode}${t.note ? '\n' + t.note : ''}`;
    if (navigator.share) navigator.share({ title: 'Receipt', text: txt }).catch(() => {});
    else App.copyText(txt);
  };

  App.actions.viewTxn = (el) => {
    const t = App.state.money.txns.find((x) => x.id === el.dataset.id);
    if (!t) return;
    const c = App.moneyCat(t.cat);
    App.sheet({
      title: t.type === 'income' ? 'Income' : t.type === 'refund' ? 'Refund' : 'Purchase',
      body: `<div class="receipt static"><div class="rc-amt ${t.type !== 'expense' ? 'pos' : ''}">${t.type === 'expense' ? '-' : '+'}${inr(t.amount, true)}</div>
        <div class="rc-rows"><div><span>${t.type === 'income' ? 'From' : 'Merchant'}</span><b>${esc(t.merchant || '—')}</b></div><div><span>Category</span><b>${c.e} ${c.label}</b></div>
        <div><span>Date</span><b>${prettyDate(t.date)}</b></div><div><span>Mode</span><b>${esc(t.mode)}</b></div>${t.note ? `<div><span>Note</span><b>${esc(t.note)}</b></div>` : ''}
        <div><span>Receipt no.</span><b class="mono">LOS-${t.id.slice(-8).toUpperCase()}</b></div></div></div>
        ${t.receiptId ? '<div class="sk sk-img" id="rcptView"></div>' : ''}`,
      foot: `<button type="button" class="btn btn-ghost" data-act="shareReceipt" data-id="${t.id}">${icon('share')}</button>${t.type === 'expense' ? `<button type="button" class="btn btn-ghost" data-act="refundOf" data-id="${t.id}">${icon('refund')}Refund</button>` : ''}<button type="button" class="btn btn-primary grow" data-act="editTxn" data-id="${t.id}">${icon('edit')}Edit</button>`,
      onOpen: () => {
        if (t.receiptId) App.blobGet(t.receiptId).then((b) => { const box = document.getElementById('rcptView'); if (!box) return; if (b) box.outerHTML = `<img class="rcpt-prev full" alt="Receipt photo" src="${URL.createObjectURL(b)}">`; else box.outerHTML = '<p class="muted small">Receipt photo not found on this device.</p>'; }).catch(() => {});
      },
    });
  };
  App.actions.refundOf = (el) => {
    const t = App.state.money.txns.find((x) => x.id === el.dataset.id);
    App.closeSheet();
    setTimeout(() => txnSheet(null, 'refund'), 320);
    setTimeout(() => { const f = document.getElementById('sheetForm'); if (!f || !t) return; f.amount.value = t.amount; f.merchant.value = t.merchant || ''; const r = f.querySelector(`input[name=cat][value="${t.cat}"]`); if (r) r.checked = true; f.note.value = `Refund of LOS-${t.id.slice(-8).toUpperCase()}`; }, 420);
  };
  App.actions.purchase = () => txnSheet(null, 'expense');
  App.actions.addTxn = (el) => txnSheet(null, el.dataset.type || 'expense');
  App.actions.editTxn = (el) => { const t = App.state.money.txns.find((x) => x.id === el.dataset.id); App.closeSheet(); setTimeout(() => txnSheet(t), 320); };
  App.actions.deleteTxn = (el) => {
    if (!confirm('Delete this transaction?')) return;
    const t = App.state.money.txns.find((x) => x.id === el.dataset.id);
    if (t && t.receiptId) App.blobDel(t.receiptId).catch(() => {});
    App.state.money.txns = App.state.money.txns.filter((x) => x.id !== el.dataset.id);
    Object.values(App.state.money.recurring).forEach((r) => Object.keys(r.paid || {}).forEach((k) => r.paid[k] === el.dataset.id && delete r.paid[k]));
    App.closeSheet();
    App.toast('Deleted');
    App.commit();
  };

  App.actions.balanceInfo = () => App.sheet({ title: 'Tracked balance', body: `<p class="small">Balance = opening balance (${inr(App.state.settings.openingBalance)}) + all income + refunds − all purchases you recorded.</p><p class="muted small mt8">LifeOS is not connected to any bank. Set your opening balance in Bills & goals → Edit budgets so it matches your real account.</p>` });

  App.actions.monthNav = (el) => {
    const d = parseD(App.ui.moneyMonth + '-01');
    d.setMonth(d.getMonth() + +el.dataset.n);
    const next = mkey(d);
    if (next > mkey()) return;
    App.ui.moneyMonth = next;
    App.render({ quiet: true });
  };

  App.actions.editBudgets = () => {
    const b = App.state.money.budgets;
    App.sheet({
      title: 'Budgets & limits',
      body: `<div class="grid2">${App.field('Monthly budget (₹)', App.input('monthly', { type: 'number', value: App.state.money.monthly, min: 0, inputmode: 'numeric', required: true }))}${App.field('Daily spend limit (₹)', App.input('daily', { type: 'number', value: App.state.settings.dailySpendLimit, min: 0, inputmode: 'numeric' }))}</div>
        ${App.field('Opening balance (₹)', App.input('opening', { type: 'number', value: App.state.settings.openingBalance, step: 'any', inputmode: 'decimal' }), 'Your real cash + bank balance when you started tracking.')}
        <p class="field-label mt12">Category limits (optional)</p>
        <div class="budget-grid">${App.EXP.map((c) => `<label class="budget-row"><span>${c.e} ${c.label}</span><input class="inp sm" type="number" inputmode="numeric" min="0" name="b_${c.id}" value="${b[c.id] || ''}" placeholder="—"></label>`).join('')}</div>`,
      onSubmit: (d) => {
        App.state.money.monthly = Math.max(0, Math.round(+d.monthly || 0));
        App.state.settings.dailySpendLimit = Math.max(0, Math.round(+d.daily || 0));
        App.state.settings.openingBalance = Math.round((+d.opening || 0) * 100) / 100;
        App.EXP.forEach((c) => { const v = Math.round(+d['b_' + c.id] || 0); if (v > 0) b[c.id] = v; else delete b[c.id]; });
        App.toast('Budgets saved');
        App.commit();
      },
    });
  };

  App.actions.editRecurring = (el) => {
    const r = el.dataset.id ? App.state.money.recurring.find((x) => x.id === el.dataset.id) : null;
    const v = r || { name: '', amount: '', cat: 'mobile', day: 1, mode: 'UPI', active: true };
    App.sheet({
      title: r ? 'Edit recurring expense' : 'New recurring expense',
      body: `${App.field('Name', App.input('name', { value: v.name, required: true, placeholder: 'e.g. Gym fee, Jio recharge' }))}
        <div class="grid2">${App.field('Amount (₹)', App.input('amount', { type: 'number', value: v.amount, min: 1, step: 'any', required: true, inputmode: 'decimal' }))}${App.field('Day of month', App.input('day', { type: 'number', value: v.day, min: 1, max: 28, inputmode: 'numeric' }))}</div>
        <div class="grid2">${App.field('Category', App.select('cat', App.EXP.map((c) => ({ value: c.id, label: `${c.e} ${c.label}` })), v.cat))}${App.field('Paid via', App.select('mode', App.PAY_MODES.map((m) => ({ value: m, label: m })), v.mode))}</div>`,
      danger: r ? { act: 'delRecurring', label: 'Delete', attrs: `data-id="${r.id}"` } : null,
      onSubmit: (d) => {
        const obj = { name: d.name.trim().slice(0, 40), amount: Math.round(+d.amount * 100) / 100, day: App.clamp(+d.day || 1, 1, 28), cat: d.cat, mode: d.mode, active: true };
        if (!(obj.amount > 0)) { App.toast('Enter an amount', 'bad'); return false; }
        if (r) Object.assign(r, obj); else App.state.money.recurring.push({ id: uid(), paid: {}, ...obj });
        App.commit();
      },
    });
  };
  App.actions.delRecurring = (el) => { App.state.money.recurring = App.state.money.recurring.filter((x) => x.id !== el.dataset.id); App.closeSheet(); App.commit(); };
  App.actions.payRecurring = (el) => {
    const r = App.state.money.recurring.find((x) => x.id === el.dataset.id);
    const mk = mkey();
    const before = App.monthMoney(), beforeBal = App.balance();
    const t = { id: uid(), ts: Date.now(), type: 'expense', amount: r.amount, cat: r.cat, merchant: r.name, note: 'Recurring', date: dkey(), mode: r.mode, receiptId: null };
    App.state.money.txns.push(t);
    r.paid = r.paid || {};
    r.paid[mk] = t.id;
    App.save();
    App.paymentCinema(t, beforeBal, App.balance(), before, App.monthMoney());
    budgetWarn(before, App.monthMoney());
  };

  App.actions.editMoneyGoal = (el) => {
    const g = el.dataset.id ? App.state.money.goals.find((x) => x.id === el.dataset.id) : null;
    const v = g || { name: '', target: '', saved: 0, deadline: '' };
    App.sheet({
      title: g ? 'Edit financial goal' : 'New financial goal',
      body: `${App.field('Goal', App.input('name', { value: v.name, required: true, placeholder: 'e.g. Emergency fund' }))}
        <div class="grid2">${App.field('Target (₹)', App.input('target', { type: 'number', value: v.target, min: 1, required: true, inputmode: 'numeric' }))}${App.field('Saved so far (₹)', App.input('saved', { type: 'number', value: v.saved, min: 0, inputmode: 'numeric' }))}</div>
        ${App.field('Target date', App.input('deadline', { type: 'date', value: v.deadline }))}`,
      danger: g ? { act: 'delMoneyGoal', label: 'Delete', attrs: `data-id="${g.id}"` } : null,
      onSubmit: (d) => {
        const obj = { name: d.name.trim().slice(0, 40), target: Math.max(1, +d.target || 0), saved: Math.max(0, +d.saved || 0), deadline: d.deadline || '' };
        if (g) Object.assign(g, obj); else App.state.money.goals.push({ id: uid(), contribs: [], ...obj });
        App.commit();
      },
    });
  };
  App.actions.delMoneyGoal = (el) => { App.state.money.goals = App.state.money.goals.filter((x) => x.id !== el.dataset.id); App.closeSheet(); App.commit(); };
  App.actions.contribute = (el) => {
    const g = App.state.money.goals.find((x) => x.id === el.dataset.id);
    App.sheet({
      title: `Add to ${g.name}`,
      body: App.field('Amount set aside (₹)', App.input('amt', { type: 'number', min: 1, required: true, inputmode: 'numeric' }), 'Moves money into this goal on paper. It is not an expense.'),
      onSubmit: (d) => {
        const a = +d.amt;
        if (!(a > 0)) return false;
        const was = g.saved;
        g.saved = Math.round((g.saved + a) * 100) / 100;
        (g.contribs = g.contribs || []).push({ date: dkey(), amount: a });
        if (was < g.target && g.saved >= g.target) setTimeout(() => App.unlockOverlay({ title: g.name, sub: `${inr(g.target)} saved!`, emoji: '💰', kind: 'milestone' }), 300);
        App.commit();
      },
    });
  };

  /* ---------- report & CSV ---------- */
  App.actions.monthReport = () => {
    const m = App.ui.moneyMonth, mm = App.monthMoney(m);
    const pd = parseD(m + '-01'); pd.setMonth(pd.getMonth() - 1);
    const prev = App.monthMoney(mkey(pd));
    const cats = App.EXP.map((c) => ({ ...c, v: catSpend(mm.tx, c.id) })).filter((c) => c.v > 0).sort((a, b) => b.v - a.v);
    const biggest = mm.tx.filter((t) => t.type === 'expense').sort((a, b) => b.amount - a.amount)[0];
    const days = m === mkey() ? new Date().getDate() : mm.daysInMonth;
    const delta = prev.spent ? ((mm.spent - prev.spent) / prev.spent) * 100 : null;
    App.sheet({
      title: `Report · ${monthLabel(m)}`,
      cls: 'sheet-tall',
      body: `<div class="report">
        <div class="stat-row three">${App.stat('Income', inr(mm.income))}${App.stat('Spent', inr(mm.spent))}${App.stat('Saved', `<span class="${mm.income - mm.spent < 0 ? 'neg' : 'pos'}">${inr(mm.income - mm.spent)}</span>`)}</div>
        <div class="stat-row three mt8">${App.stat('Savings rate', mm.income ? Math.round(((mm.income - mm.spent) / mm.income) * 100) + '%' : '—')}${App.stat('Daily average', inr(mm.spent / Math.max(1, days)))}${App.stat('vs last month', delta == null ? '—' : `<span class="${delta > 0 ? 'neg' : 'pos'}">${delta > 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(0)}%</span>`)}</div>
        <h4 class="group-title">Budget</h4><p class="small">${mm.budget ? `${inr(mm.spent)} of ${inr(mm.budget)} (${Math.round((mm.spent / mm.budget) * 100)}%). ${mm.left >= 0 ? `${inr(mm.left)} left.` : `Over by ${inr(-mm.left)}.`}` : 'No budget set.'}</p>
        <h4 class="group-title">Top categories</h4>${cats.slice(0, 6).map((c) => `<div class="shop-row"><span>${c.e} ${c.label}</span><b>${inr(c.v)} <small class="muted">${Math.round((c.v / (mm.spent || 1)) * 100)}%</small></b></div>`).join('') || '<p class="muted small">No spending.</p>'}
        ${biggest ? `<h4 class="group-title">Biggest purchase</h4><p class="small">${esc(biggest.merchant || App.moneyCat(biggest.cat).label)}: ${inr(biggest.amount, true)} on ${prettyDate(biggest.date)}</p>` : ''}
        <p class="muted small mt12">${mm.tx.length} transactions · refunds ${inr(mm.refunds)}</p></div>`,
      foot: `<button type="button" class="btn btn-ghost grow" data-act="exportTxCsv">${icon('download')}CSV</button><button type="button" class="btn btn-primary grow" data-act="copyReport">${icon('copy')}Copy summary</button>`,
    });
    App.ui.lastReport = `LifeOS money report: ${monthLabel(m)}\nIncome ${inr(mm.income)} · Spent ${inr(mm.spent)} · Saved ${inr(mm.income - mm.spent)}\nBudget ${inr(mm.budget)} (${mm.budget ? Math.round((mm.spent / mm.budget) * 100) : 0}% used)\nTop: ${cats.slice(0, 3).map((c) => `${c.label} ${inr(c.v)}`).join(', ')}`;
  };
  App.actions.copyReport = () => App.copyText(App.ui.lastReport || '');
  App.actions.exportTxCsv = () => {
    const rows = [['Date', 'Type', 'Amount (INR)', 'Category', 'Merchant', 'Payment mode', 'Notes', 'Receipt no.']].concat(
      App.state.money.txns.slice().sort((a, b) => a.date.localeCompare(b.date)).map((t) => [t.date, t.type, t.amount, App.moneyCat(t.cat).label, t.merchant, t.mode, t.note, `LOS-${t.id.slice(-8).toUpperCase()}`]));
    App.download(`lifeos-transactions-${dkey()}.csv`, App.csv(rows), 'text/csv');
    App.toast('Transactions CSV downloaded');
  };

  App.views.money = { render };
})();
