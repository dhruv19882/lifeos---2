'use strict';
/* UI kit: rings, bars, charts, smooth value transitions, FLIP layout transitions, sheets, toasts,
   unlock overlay, confetti, rest timer, form helpers. */
(function () {
  const { esc, icon, clamp } = App;
  const mem = (App._mem = {}); // last rendered value per data-key -> smooth transitions between renders

  /* ---------- progress ring ---------- */
  App.ring = (pct, { size = 120, stroke = 10, grad = 'g-accent', label = '', sub = '', cls = '', key = '' } = {}) => {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const p = clamp(pct || 0, 0, 1);
    return `<div class="ring ${cls}" style="width:${size}px;height:${size}px">
      <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="ring-track"/>
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="ring-val"
          stroke="url(#${grad})" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-offset="${c * (1 - p)}" data-c="${c}" ${key ? `data-key="r:${key}"` : ''}
          transform="rotate(-90 ${size / 2} ${size / 2})"/>
      </svg>
      <div class="ring-label">${label}${sub ? `<small>${sub}</small>` : ''}</div>
    </div>`;
  };

  /** Concentric rings (Apple Fitness style). items: [{value 0..1|null, grad}] outer -> inner */
  App.multiRing = (items, { size = 220, stroke = 12, gap = 4, center = '', act = '', key = 'mr' } = {}) => {
    const rings = items.map((it, i) => {
      const r = size / 2 - stroke / 2 - i * (stroke + gap);
      const c = 2 * Math.PI * r;
      const p = clamp(it.value || 0, 0, 1);
      return `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="ring-track"/>
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="ring-val ${it.value == null ? 'nodata' : ''}" stroke="url(#${it.grad})"
          stroke-dasharray="${c}" stroke-dashoffset="${c}" data-offset="${c * (1 - p)}" data-key="r:${key}${i}" style="--d:${i * 70}ms" transform="rotate(-90 ${size / 2} ${size / 2})"/>`;
    }).join('');
    return `<div class="ring multi" style="width:${size}px;height:${size}px" ${act ? `data-act="${act}" data-size="${size}" data-stroke="${stroke}" data-gap="${gap}"` : ''}>
      <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${rings}</svg><div class="ring-label">${center}</div></div>`;
  };

  /* ---------- linear bar ---------- */
  App.bar = (pct, grad = 'accent', extra = '', key = '') =>
    `<div class="bar ${extra}"><span class="bar-fill grad-${grad}" data-w="${clamp(pct || 0, 0, 1) * 100}" ${key ? `data-key="b:${key}"` : ''}></span></div>`;

  /* ---------- vertical bar chart (supports twin bars via value2) ---------- */
  App.barChart = (items, { height = 140, max, lines = [], fmt = (v) => v, cls2 = 'grad-red' } = {}) => {
    const m = Math.max(max || 0, ...items.map((i) => Math.max(i.value || 0, i.value2 || 0)), ...lines.map((l) => l.v), 1);
    const ln = lines.map((l) => `<div class="chart-line ${l.cls || ''}" style="bottom:${(l.v / m) * 100}%"><span>${esc(l.label || '')}</span></div>`).join('');
    const bars = items.map((i, idx) => `<div class="cbar" title="${esc(i.title || '')}">
        <div class="cbar-col"><span class="cbar-val">${i.value && i.value2 === undefined ? fmt(i.value) : ''}</span>
          <div class="cbar-pair">
            <div class="cbar-fill ${i.cls || 'grad-accent'}" style="--h:${((i.value || 0) / m) * 100}%;--d:${idx * 40}ms"></div>
            ${i.value2 !== undefined ? `<div class="cbar-fill ${cls2}" style="--h:${((i.value2 || 0) / m) * 100}%;--d:${idx * 40 + 20}ms"></div>` : ''}
          </div></div>
        <span class="cbar-label ${i.on ? 'on' : ''}">${esc(i.label)}</span></div>`).join('');
    return `<div class="chart" style="--ch:${height}px"><div class="chart-area">${bars}<div class="chart-lines">${ln}</div></div></div>`;
  };

  /* ---------- line chart: main series + optional smoothed series + target line ---------- */
  App.lineChart = (pts, { height = 160, fmt = (v) => v, avg = null, target = null, targetLabel = 'Target' } = {}) => {
    if (pts.length < 2) return `<div class="empty small">Add at least 2 entries to see your trend</div>`;
    const W = 320, H = height, pad = 20;
    const vs = pts.map((p) => p.v).concat(avg ? avg.filter((x) => x != null) : []).concat(target != null ? [target] : []);
    let lo = Math.min(...vs), hi = Math.max(...vs);
    if (hi - lo < 1) { lo -= 0.5; hi += 0.5; }
    const x = (i) => pad + (i * (W - pad * 2)) / (pts.length - 1);
    const y = (v) => H - pad - ((v - lo) / (hi - lo)) * (H - pad * 2);
    const path = (arr) => arr.map((v, i) => (v == null ? '' : `${i && arr[i - 1] != null ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`)).join(' ');
    const d = path(pts.map((p) => p.v));
    const area = `${d} L${x(pts.length - 1)},${H - pad} L${x(0)},${H - pad} Z`;
    const dots = pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.v)}" r="3" class="lc-dot" style="--d:${i * 30}ms"><title>${esc(p.label)}: ${fmt(p.v)}</title></circle>`).join('');
    return `<svg class="linechart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${H}px">
      <path d="${area}" fill="url(#g-area)" class="lc-area"/>
      ${target != null ? `<line x1="${pad}" x2="${W - pad}" y1="${y(target)}" y2="${y(target)}" class="lc-target"/><text x="${W - pad}" y="${y(target) - 5}" text-anchor="end" class="lc-txt tgt">${esc(targetLabel)} ${fmt(target)}</text>` : ''}
      <path d="${d}" class="lc-path ${avg ? 'thin' : ''}" stroke="url(#g-accent)" pathLength="1"/>
      ${avg ? `<path d="${path(avg)}" class="lc-path avg" pathLength="1"/>` : ''}
      ${dots}
      <text x="${pad}" y="12" class="lc-txt">${fmt(hi)}</text><text x="${pad}" y="${H - 5}" class="lc-txt">${fmt(lo)}</text>
    </svg>`;
  };

  /* ---------- donut ---------- */
  App.donut = (parts, { size = 150, stroke = 18, center = '' } = {}) => {
    const total = parts.reduce((a, p) => a + p.value, 0) || 1;
    const r = (size - stroke) / 2, c = 2 * Math.PI * r;
    let acc = 0;
    const segs = parts.map((p, i) => {
      const len = (p.value / total) * c;
      const s = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${p.color}" stroke-width="${stroke}"
        stroke-dasharray="${Math.max(len - 2, 0)} ${c}" stroke-dashoffset="${-acc}" class="donut-seg" style="--d:${i * 80}ms" transform="rotate(-90 ${size / 2} ${size / 2})"/>`;
      acc += len;
      return s;
    }).join('');
    return `<div class="ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-track" stroke-width="${stroke}"/>${segs}</svg><div class="ring-label">${center}</div></div>`;
  };

  /* ---------- counters ---------- */
  App.count = (v, { prefix = '', suffix = '', dec = 0, key = '' } = {}) =>
    `<span class="num" data-count="${v}" data-prefix="${esc(prefix)}" data-suffix="${esc(suffix)}" data-dec="${dec}" ${key ? `data-key="c:${key}"` : ''}>${prefix}${dec ? (+v).toFixed(dec) : App.num(v)}${suffix}</span>`;

  const fmtCount = (el, v) => {
    const dec = parseInt(el.dataset.dec || '0', 10);
    return (el.dataset.prefix || '') + (dec ? v.toFixed(dec) : App.num(v)) + (el.dataset.suffix || '');
  };
  function tweenCount(el, from, to, dur = 650) {
    if (App.reducedMotion() || from === to) return (el.textContent = fmtCount(el, to));
    const start = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmtCount(el, from + (to - from) * e);
      if (k < 1) requestAnimationFrame(step);
    };
    el.textContent = fmtCount(el, from);
    requestAnimationFrame(step);
  }

  /** After each render: entrance animations (page change) or smooth from-previous transitions (quiet). */
  App.animateIn = (root) => {
    const quiet = root.classList.contains('no-reveal');
    const rm = App.reducedMotion();
    const setFrom = (el, prop, from, to) => {
      el.style.transition = 'none';
      el.style[prop] = from;
      void el.getBoundingClientRect();
      el.style.transition = '';
      requestAnimationFrame(() => (el.style[prop] = to));
    };
    const jump = (el, prop, to) => { el.style.transition = 'none'; el.style[prop] = to; void el.getBoundingClientRect(); el.style.transition = ''; };
    root.querySelectorAll('.ring-val[data-offset]').forEach((el) => {
      const to = +el.dataset.offset, k = el.dataset.key, full = el.getAttribute('stroke-dasharray');
      const prev = k ? mem[k] : undefined;
      if (rm) jump(el, 'strokeDashoffset', to);
      else if (!quiet) setFrom(el, 'strokeDashoffset', full, to);
      else if (prev !== undefined && prev !== to) setFrom(el, 'strokeDashoffset', prev, to);
      else jump(el, 'strokeDashoffset', to);
      if (k) mem[k] = to;
    });
    root.querySelectorAll('.bar-fill[data-w]').forEach((el) => {
      const to = el.dataset.w + '%', k = el.dataset.key, prev = k ? mem[k] : undefined;
      if (rm) jump(el, 'width', to);
      else if (!quiet) setFrom(el, 'width', '0%', to);
      else if (prev !== undefined && prev !== to) setFrom(el, 'width', prev, to);
      else jump(el, 'width', to);
      if (k) mem[k] = to;
    });
    root.querySelectorAll('[data-count]').forEach((el) => {
      const to = parseFloat(el.dataset.count) || 0, k = el.dataset.key, prev = k ? mem[k] : undefined;
      if (!quiet) tweenCount(el, 0, to, 750);
      else if (prev !== undefined && prev !== to) tweenCount(el, prev, to, 600);
      else el.textContent = fmtCount(el, to);
      if (k) mem[k] = to;
    });
    root.classList.add('ready');
  };

  /* ---------- FLIP layout transitions for [data-flip] elements across quiet re-renders ---------- */
  App.flipCapture = () => {
    const m = new Map();
    document.querySelectorAll('#view [data-flip]').forEach((el) => m.set(el.dataset.flip, el.getBoundingClientRect()));
    return m;
  };
  App.flipPlay = (before) => {
    if (!before || App.reducedMotion() || !Element.prototype.animate) return;
    document.querySelectorAll('#view [data-flip]').forEach((el) => {
      const a = before.get(el.dataset.flip);
      const b = el.getBoundingClientRect();
      if (!a) {
        el.animate([{ opacity: 0, transform: 'scale(.94) translateY(-8px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.9,.3,1.2)' });
        return;
      }
      const dx = a.left - b.left, dy = a.top - b.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
    });
  };

  /* ---------- toasts ---------- */
  App.toast = (msg, kind = 'ok') => {
    const box = document.getElementById('toasts');
    const t = document.createElement('div');
    t.className = `toast toast-${kind}`;
    t.setAttribute('role', kind === 'bad' ? 'alert' : 'status');
    t.innerHTML = `${icon(kind === 'bad' ? 'alert' : kind === 'warn' ? 'bell' : kind === 'xp' ? 'star' : 'check')}<span>${esc(msg)}</span>`;
    box.appendChild(t);
    while (box.children.length > 3) box.firstElementChild.remove();
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3000);
  };

  /* ---------- bottom sheet / full-screen panel ---------- */
  let sheetSubmit = null;
  let lastFocus = null;
  App.sheet = ({ title, body, submit = 'Save', onSubmit, danger, cls = '', foot = '', onOpen }) => {
    const root = document.getElementById('sheets');
    lastFocus = document.activeElement;
    root.innerHTML = `<div class="sheet-backdrop" data-act="closeSheet"></div>
      <form class="sheet ${cls}" id="sheetForm" autocomplete="off" novalidate role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="sheet-grip"></div>
        <div class="sheet-head"><h3>${esc(title)}</h3><button type="button" class="icon-btn" data-act="closeSheet" aria-label="Close">${icon('x')}</button></div>
        <div class="sheet-body">${body}</div>
        ${onSubmit || foot ? `<div class="sheet-foot">${foot}${danger ? `<button type="button" class="btn btn-ghost danger" data-act="${danger.act}" ${danger.attrs || ''}>${icon('trash')}${esc(danger.label)}</button>` : ''}${onSubmit ? `<button type="submit" class="btn btn-primary">${esc(submit)}</button>` : ''}</div>` : ''}
      </form>`;
    sheetSubmit = onSubmit || null;
    requestAnimationFrame(() => root.classList.add('open'));
    document.body.classList.add('no-scroll');
    const first = root.querySelector('input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not([type=file]), textarea, select');
    if (first && !('ontouchstart' in window)) setTimeout(() => first.focus(), 250);
    onOpen && onOpen(root.querySelector('.sheet'));
  };
  App.closeSheet = () => {
    const root = document.getElementById('sheets');
    if (!root.classList.contains('open')) return;
    root.classList.remove('open');
    document.body.classList.remove('no-scroll');
    setTimeout(() => { if (!root.classList.contains('open')) root.innerHTML = ''; }, 320);
    sheetSubmit = null;
    if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (_) {}
  };
  App.actions.closeSheet = () => App.closeSheet();

  document.addEventListener('submit', (e) => {
    if (e.target.id !== 'sheetForm') return;
    e.preventDefault();
    const form = e.target;
    const bad = [...form.querySelectorAll('[required]')].find((el) => !String(el.value || '').trim());
    if (bad) {
      bad.classList.add('invalid');
      bad.focus();
      App.toast(`Please fill "${(bad.closest('.field') && bad.closest('.field').querySelector('.field-label')?.textContent) || 'required field'}"`, 'bad');
      return;
    }
    const data = Object.fromEntries(new FormData(form).entries());
    if (sheetSubmit && sheetSubmit(data, form) !== false) App.closeSheet();
  });
  document.addEventListener('input', (e) => e.target.classList && e.target.classList.remove('invalid'));

  /* ---------- form helpers ---------- */
  App.field = (label, input, hint = '') =>
    `<label class="field"><span class="field-label">${esc(label)}</span>${input}${hint ? `<span class="field-hint">${hint}</span>` : ''}</label>`;
  App.input = (name, { type = 'text', value = '', placeholder = '', required = false, min, max, step, inputmode, attrs = '' } = {}) =>
    `<input class="inp" name="${name}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${required ? 'required' : ''}
      ${min !== undefined ? `min="${min}"` : ''} ${max !== undefined ? `max="${max}"` : ''} ${step !== undefined ? `step="${step}"` : ''} ${inputmode ? `inputmode="${inputmode}"` : ''} ${attrs}/>`;
  App.textarea = (name, value = '', placeholder = '', rows = 3) => `<textarea class="inp" name="${name}" rows="${rows}" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`;
  App.select = (name, options, selected) =>
    `<select class="inp" name="${name}">${options.map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(selected) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
  App.chips = (name, options, selected, cls = '') =>
    `<div class="chips ${cls}">${options.map((o, i) => `<label class="chip" style="--i:${i}"><input type="radio" name="${name}" value="${esc(o.value)}" ${String(o.value) === String(selected) ? 'checked' : ''}/><span>${o.label}</span></label>`).join('')}</div>`;

  /* ---------- small helpers ---------- */
  App.header = (title, sub = '', right = '') =>
    `<header class="page-head reveal"><div><p class="eyebrow">${sub}</p><h1>${title}</h1></div><div class="row gap">${right}</div></header>`;
  App.seg = (act, options, current, attr = 'v') =>
    `<div class="seg" role="tablist">${options.map((o) => `<button class="seg-btn ${o.value === current ? 'on' : ''}" data-act="${act}" data-${attr}="${esc(o.value)}" role="tab" aria-selected="${o.value === current}">${o.label}</button>`).join('')}</div>`;
  App.empty = (ic, title, text, btn = '') => `<div class="empty">${icon(ic, 'empty-ic')}<b>${esc(title)}</b><p>${esc(text)}</p>${btn}</div>`;
  App.skeleton = () => `<div class="page"><div class="sk sk-h"></div><div class="sk sk-hero"></div><div class="grid2"><div class="sk sk-tile"></div><div class="sk sk-tile"></div></div><div class="sk sk-card"></div><div class="sk sk-card"></div></div>`;
  App.stat = (label, value, sub = '') => `<div class="stat"><small>${esc(label)}</small><b>${value}</b>${sub ? `<small class="muted">${sub}</small>` : ''}</div>`;
  App.pill = (txt, cls = '') => `<span class="pill ${cls}">${txt}</span>`;

  /* ---------- confetti ---------- */
  App.confetti = () => {
    if (App.reducedMotion()) return;
    const cv = document.getElementById('confetti');
    const ctx = cv.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = ['#ef4444', '#38bdf8', '#7dd3fc', '#f8fafc', '#facc15', '#22c55e'];
    const ps = Array.from({ length: 120 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 90, y: innerHeight * 0.42,
      vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 12 - 4, s: Math.random() * 6 + 4, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
      c: colors[(Math.random() * colors.length) | 0],
    }));
    let frame = 0;
    const tick = () => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ps.forEach((p) => {
        p.vy += 0.32; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.globalAlpha = Math.max(0, 1 - frame / 115);
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
      });
      if (++frame < 115) requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, innerWidth, innerHeight);
    };
    tick();
  };

  /* ---------- unlock overlay (milestones, badges, levels, chapters) ---------- */
  let unlockTimer;
  App.unlockOverlay = ({ title, sub = '', emoji = '🏆', xp = 0, kind = 'milestone' }) => {
    const el = document.getElementById('unlock');
    clearTimeout(unlockTimer);
    el.innerHTML = `<div class="unlock-card k-${kind}" data-act="closeUnlock">
      <div class="unlock-ic"><span class="lk lk-closed">${icon('lock')}</span><span class="lk lk-open">${icon('unlock')}</span><span class="unlock-emoji">${emoji}</span></div>
      <p class="eyebrow">${kind === 'badge' ? 'Badge unlocked' : kind === 'level' ? 'Level up' : kind === 'chapter' ? 'Chapter complete' : 'Milestone unlocked'}</p>
      <h2>${esc(title)}</h2>${sub ? `<p class="muted">${esc(sub)}</p>` : ''}${xp ? `<span class="xp-chip">+${xp} XP</span>` : ''}
      <small class="muted">Tap to continue</small></div>`;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('show'));
    App.buzz([30, 60, 40]);
    setTimeout(App.confetti, 650);
    unlockTimer = setTimeout(App.actions.closeUnlock, 3600);
  };
  App.actions.closeUnlock = () => {
    const el = document.getElementById('unlock');
    el.classList.remove('show');
    setTimeout(() => { el.hidden = true; el.innerHTML = ''; }, 300);
  };

  /* ---------- rest timer ---------- */
  let rt = null;
  App.startRest = (secs, label = 'Rest') => {
    if (rt) clearInterval(rt.int);
    const el = document.getElementById('restTimer');
    rt = { end: Date.now() + secs * 1000, total: secs, label };
    el.hidden = false;
    el.classList.remove('done');
    const draw = () => {
      const left = Math.max(0, Math.round((rt.end - Date.now()) / 1000));
      el.innerHTML = `<div class="rt-ring" style="--p:${left / rt.total}"><span>${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</span></div>
        <div class="rt-info"><b>${esc(rt.label)}</b><small>${left ? 'Rest. Next set when the ring empties' : 'Go! Next set'}</small></div>
        <button class="icon-btn" data-act="restAdd" aria-label="Add 15 seconds">+15</button>
        <button class="icon-btn" data-act="restStop" aria-label="Stop timer">${icon('x')}</button>`;
      if (left <= 0) {
        clearInterval(rt.int);
        el.classList.add('done');
        App.buzz([200, 100, 200]);
        App.toast('Rest over. Next set!', 'warn');
        setTimeout(() => (el.hidden = true), 1400);
      }
    };
    draw();
    rt.int = setInterval(draw, 250);
  };
  App.actions.restAdd = () => { if (rt) { rt.end += 15000; rt.total += 15; } };
  App.actions.restStop = () => { if (rt) clearInterval(rt.int); document.getElementById('restTimer').hidden = true; };

  /* ---------- clipboard / share ---------- */
  App.copyText = async (text) => {
    try { await navigator.clipboard.writeText(text); App.toast('Copied to clipboard'); }
    catch (_) {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); App.toast('Copied to clipboard'); } catch (e) { App.toast('Copy failed. Select the text manually', 'bad'); }
      ta.remove();
    }
  };
  App.download = (name, content, type = 'application/json') => {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  };
  App.csv = (rows) => rows.map((r) => r.map((v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(',')).join('\n');
})();
