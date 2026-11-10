'use strict';
/* Animated exercise demonstrations: a stick figure interpolates between two poses (SVG SMIL).
   Coordinates are in a 100x100 box, side view, floor at y=94. */
(function () {
  const STAND = { head: [50, 15], neck: [50, 25], hip: [50, 55], knee: [51, 74], foot: [50, 93], elbow: [50, 40], hand: [51, 54] };
  const up = (pose, dy) => Object.fromEntries(Object.entries(pose).map(([k, [x, y]]) => [k, [x, y - dy]]));
  const merge = (a, b) => ({ ...a, ...b });

  // each: A, B poses, plate: joint holding weight, gear: static svg, cable: [joint, x, y]
  const F = {
    bench: {
      A: { head: [24, 55], neck: [33, 58], hip: [64, 58], knee: [76, 64], foot: [82, 93], elbow: [34, 46], hand: [34, 33] },
      B: { head: [24, 55], neck: [33, 58], hip: [64, 58], knee: [76, 64], foot: [82, 93], elbow: [28, 66], hand: [36, 52] },
      plate: 'hand', gear: '<rect x="22" y="61" width="48" height="4" rx="2"/><path d="M30 65v29M62 65v29M20 33h0"/>',
    },
    incline: {
      A: { head: [35, 34], neck: [41, 42], hip: [62, 64], knee: [74, 66], foot: [78, 93], elbow: [47, 31], hand: [52, 20] },
      B: { head: [35, 34], neck: [41, 42], hip: [62, 64], knee: [74, 66], foot: [78, 93], elbow: [34, 52], hand: [41, 40] },
      plate: 'hand', gear: '<path d="M64 69 37 44" stroke-width="4"/><path d="M58 70v24M66 69v25"/>',
    },
    fly: {
      A: { head: [24, 55], neck: [33, 58], hip: [64, 58], knee: [76, 64], foot: [82, 93], elbow: [36, 44], hand: [36, 32] },
      B: { head: [24, 55], neck: [33, 58], hip: [64, 58], knee: [76, 64], foot: [82, 93], elbow: [22, 52], hand: [14, 58] },
      plate: 'hand', gear: '<rect x="22" y="61" width="48" height="4" rx="2"/><path d="M30 65v29M62 65v29"/>',
    },
    dip: {
      A: { head: [50, 20], neck: [50, 29], hip: [50, 58], knee: [55, 73], foot: [47, 85], elbow: [51, 41], hand: [52, 52] },
      B: { head: [50, 34], neck: [50, 43], hip: [50, 72], knee: [44, 84], foot: [36, 90], elbow: [38, 48], hand: [52, 52] },
      gear: '<path d="M40 52h28M64 52v42"/>',
    },
    pushdown: {
      A: merge(STAND, { head: [52, 15], neck: [51, 25], elbow: [53, 41], hand: [62, 33] }),
      B: merge(STAND, { head: [52, 15], neck: [51, 25], elbow: [53, 41], hand: [57, 58] }),
      plate: 'hand', cable: ['hand', 66, 0], gear: '<path d="M66 0v4"/>',
    },
    ohext: {
      A: merge(STAND, { elbow: [52, 11], hand: [53, 0] }),
      B: merge(STAND, { elbow: [52, 11], hand: [42, 22] }),
      plate: 'hand',
    },
    pulldown: {
      A: { head: [50, 33], neck: [50, 42], hip: [50, 68], knee: [66, 68], foot: [66, 93], elbow: [52, 27], hand: [52, 14] },
      B: { head: [49, 33], neck: [50, 42], hip: [50, 68], knee: [66, 68], foot: [66, 93], elbow: [58, 54], hand: [55, 40] },
      plate: 'hand', cable: ['hand', 52, 0], gear: '<rect x="40" y="70" width="22" height="4" rx="2"/><path d="M60 72h12"/>',
    },
    pullup: {
      A: { head: [50, 19], neck: [50, 27], hip: [50, 57], knee: [50, 74], foot: [50, 90], elbow: [50, 16], hand: [50, 6] },
      B: { head: [52, 2], neck: [50, 11], hip: [50, 41], knee: [53, 58], foot: [50, 74], elbow: [62, 14], hand: [50, 6] },
      gear: '<path d="M30 6h40" stroke-width="3"/>',
    },
    row: {
      A: { head: [22, 37], neck: [30, 41], hip: [56, 55], knee: [58, 74], foot: [55, 93], elbow: [30, 54], hand: [31, 67] },
      B: { head: [22, 37], neck: [30, 41], hip: [56, 55], knee: [58, 74], foot: [55, 93], elbow: [47, 38], hand: [41, 53] },
      plate: 'hand',
    },
    curl: {
      A: merge(STAND, { elbow: [51, 41], hand: [53, 57] }),
      B: merge(STAND, { elbow: [51, 41], hand: [47, 28] }),
      plate: 'hand',
    },
    ohp: {
      A: { head: [50, 24], neck: [50, 33], hip: [50, 64], knee: [66, 64], foot: [66, 93], elbow: [52, 19], hand: [52, 6] },
      B: { head: [50, 24], neck: [50, 33], hip: [50, 64], knee: [66, 64], foot: [66, 93], elbow: [59, 37], hand: [57, 24] },
      plate: 'hand', gear: '<rect x="40" y="66" width="22" height="4" rx="2"/><path d="M42 70v24M60 70v24M40 66 38 36"/>',
    },
    lateral: {
      A: merge(STAND, { elbow: [46, 40], hand: [45, 54], e2: [54, 40], h2: [55, 54] }),
      B: merge(STAND, { elbow: [38, 28], hand: [25, 27], e2: [62, 28], h2: [75, 27] }),
      plate: 'hand', plate2: 'h2',
    },
    squat: {
      A: merge(STAND, { elbow: [42, 31], hand: [49, 24] }),
      B: { head: [58, 37], neck: [55, 46], hip: [36, 68], knee: [58, 70], foot: [50, 93], elbow: [45, 52], hand: [53, 45] },
      plate: 'neck',
    },
    hinge: {
      A: merge(STAND, { elbow: [50, 42], hand: [51, 58] }),
      B: { head: [24, 42], neck: [32, 45], hip: [60, 56], knee: [57, 74], foot: [54, 93], elbow: [33, 59], hand: [35, 73] },
      plate: 'hand',
    },
    legpress: {
      A: { head: [84, 38], neck: [78, 45], hip: [62, 65], knee: [47, 47], foot: [31, 62], elbow: [70, 60], hand: [63, 68] },
      B: { head: [84, 38], neck: [78, 45], hip: [62, 65], knee: [43, 58], foot: [22, 55], elbow: [70, 60], hand: [63, 68] },
      plate: 'foot', gear: '<path d="M60 70 90 50M60 70h30"/>',
    },
    legcurl: {
      A: { head: [21, 59], neck: [30, 62], hip: [60, 62], knee: [75, 62], foot: [90, 62], elbow: [22, 72], hand: [13, 67] },
      B: { head: [21, 59], neck: [30, 62], hip: [60, 62], knee: [75, 62], foot: [77, 45], elbow: [22, 72], hand: [13, 67] },
      plate: 'foot', gear: '<rect x="18" y="66" width="62" height="4" rx="2"/><path d="M24 70v24M74 70v24"/>',
    },
    legext: {
      A: { head: [42, 21], neck: [43, 30], hip: [46, 60], knee: [64, 60], foot: [65, 87], elbow: [47, 46], hand: [53, 60] },
      B: { head: [42, 21], neck: [43, 30], hip: [46, 60], knee: [64, 60], foot: [86, 57], elbow: [47, 46], hand: [53, 60] },
      plate: 'foot', gear: '<rect x="38" y="62" width="28" height="4" rx="2"/><path d="M40 66v28M40 62 36 30"/>',
    },
    lunge: {
      A: { head: [50, 12], neck: [50, 21], hip: [50, 50], knee: [60, 67], foot: [64, 93], k2: [40, 63], f2: [26, 70], elbow: [48, 36], hand: [49, 50] },
      B: { head: [50, 24], neck: [50, 33], hip: [50, 62], knee: [65, 72], foot: [64, 93], k2: [41, 84], f2: [26, 70], elbow: [48, 48], hand: [49, 62] },
      plate: 'hand', gear: '<rect x="14" y="72" width="20" height="4" rx="2"/><path d="M18 76v18M30 76v18"/>',
    },
    calf: {
      A: merge(STAND, { foot: [52, 92] }),
      B: merge(up(STAND, 6), { foot: [53, 89] }),
      gear: '<rect x="40" y="93" width="24" height="3" rx="1.5"/>',
    },
    kneeraise: {
      A: { head: [50, 19], neck: [50, 27], hip: [50, 57], knee: [50, 74], foot: [50, 90], elbow: [50, 16], hand: [50, 6] },
      B: { head: [50, 19], neck: [50, 27], hip: [50, 55], knee: [65, 47], foot: [70, 63], elbow: [50, 16], hand: [50, 6] },
      gear: '<path d="M30 6h40" stroke-width="3"/>',
    },
    plank: {
      A: { head: [22, 69], neck: [30, 73], hip: [60, 75], knee: [74, 78], foot: [88, 82], elbow: [30, 87], hand: [41, 87] },
      B: { head: [22, 68], neck: [30, 72], hip: [60, 73], knee: [74, 77], foot: [88, 82], elbow: [30, 87], hand: [41, 87] },
    },
  };

  const KEYS = 'keyTimes="0;.42;.5;.92;1" calcMode="spline" keySplines=".45 0 .55 1;0 0 1 1;.45 0 .55 1;0 0 1 1" dur="2.8s" repeatCount="indefinite"';
  const anim = (attr, a, b) => (a === b ? '' : `<animate attributeName="${attr}" values="${a};${b};${b};${a};${a}" ${KEYS}/>`);

  function line(A, B, j1, j2, cls, still) {
    if (!A[j1] || !A[j2]) return '';
    const a1 = A[j1], a2 = A[j2], b1 = B[j1] || a1, b2 = B[j2] || a2;
    return `<line class="${cls}" x1="${a1[0]}" y1="${a1[1]}" x2="${a2[0]}" y2="${a2[1]}">${still ? '' :
      anim('x1', a1[0], b1[0]) + anim('y1', a1[1], b1[1]) + anim('x2', a2[0], b2[0]) + anim('y2', a2[1], b2[1])}</line>`;
  }
  function circle(A, B, j, r, cls, still) {
    const a = A[j], b = B[j] || a;
    return `<circle class="${cls}" cx="${a[0]}" cy="${a[1]}" r="${r}">${still ? '' : anim('cx', a[0], b[0]) + anim('cy', a[1], b[1])}</circle>`;
  }

  App.figure = (pattern) => {
    const f = F[pattern] || F.curl;
    const still = App.reducedMotion();
    const { A, B } = f;
    const bones = [['neck', 'hip', 'fg-torso'], ['hip', 'knee', 'fg-limb'], ['knee', 'foot', 'fg-limb'], ['hip', 'k2', 'fg-limb back'], ['k2', 'f2', 'fg-limb back'],
      ['neck', 'e2', 'fg-limb back'], ['e2', 'h2', 'fg-limb back'], ['neck', 'elbow', 'fg-limb'], ['elbow', 'hand', 'fg-limb']];
    let cable = '';
    if (f.cable) {
      const [j, x, y] = f.cable;
      const a = A[j], b = B[j];
      cable = `<line class="fg-cable" x1="${x}" y1="${y}" x2="${a[0]}" y2="${a[1]}">${still ? '' : anim('x2', a[0], b[0]) + anim('y2', a[1], b[1])}</line>`;
    }
    return `<svg class="figure" viewBox="0 0 100 100" role="img" aria-label="Animated demonstration">
      <line class="fg-floor" x1="4" y1="94.5" x2="96" y2="94.5"/>
      <g class="fg-gear">${f.gear || ''}</g>${cable}
      ${bones.map(([a, b, c]) => line(A, B, a, b, c, still)).join('')}
      ${circle(A, B, 'head', 6.5, 'fg-head', still)}
      ${f.plate ? circle(A, B, f.plate, 5, 'fg-plate', still) : ''}${f.plate2 ? circle(A, B, f.plate2, 5, 'fg-plate', still) : ''}
    </svg>`;
  };
})();
