'use strict';
/* Static reference data + calculators: nutrition, Indian food database, exercises, split, CMA, skills, categories. */
(function () {
  /* ---------- Nutrition targets ---------- */
  const ACTIVITY = [
    { id: 1.375, label: 'Light', note: 'Gym 2–3 days, desk job' },
    { id: 1.55, label: 'Moderate', note: 'Gym 4–6 days' },
    { id: 1.725, label: 'Very active', note: 'Gym 6 days + active job' },
  ];
  const GOAL_MODES = {
    bulk: { label: 'Lean bulk', surplus: 400, protein: 2.0 },
    maintain: { label: 'Maintain', surplus: 0, protein: 1.8 },
    cut: { label: 'Fat loss', surplus: -400, protein: 2.2 },
  };

  /** Daily targets from the central profile and latest logged weight. */
  function targets() {
    const p = App.profile();
    if (!p) return null;
    const kg = App.currentWeight() || p.startWeight || 50;
    const bmr = 10 * kg + 6.25 * p.heightCm - 5 * p.age + (p.gender === 'female' ? -161 : 5);
    const tdee = bmr * (p.activity || 1.55);
    const mode = GOAL_MODES[p.mode] || GOAL_MODES.bulk;
    const adj = +p.calorieAdjust || 0;
    const kcal = Math.round((tdee + mode.surplus + adj) / 10) * 10;
    const protein = Math.round(kg * mode.protein);
    const fat = Math.round((kcal * 0.25) / 9);
    const carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);
    return { kg, bmr: Math.round(bmr), tdee: Math.round(tdee), kcal, protein, fat, carbs, mode, adj };
  }

  /* ---------- Indian food database ----------
     Values are approximate (IFCT 2017 / USDA references, rounded). `per` = amount the macros refer to. */
  const FOODS = [
    // grains
    { id: 'roti', name: 'Roti / chapati', cat: 'Grains', unit: 'pc', per: 1, kcal: 100, p: 3.5, c: 21, f: 0.5, portions: [1, 2, 3, 4] },
    { id: 'paratha', name: 'Plain paratha', cat: 'Grains', unit: 'pc', per: 1, kcal: 210, p: 4.5, c: 30, f: 8, portions: [1, 2] },
    { id: 'rice', name: 'Rice, cooked', cat: 'Grains', unit: 'g', per: 100, kcal: 130, p: 2.7, c: 28, f: 0.3, portions: [100, 150, 200, 300], hint: '1 cup ≈ 160 g' },
    { id: 'oats', name: 'Rolled oats, dry', cat: 'Grains', unit: 'g', per: 100, kcal: 380, p: 13.2, c: 66, f: 7, portions: [40, 50, 60, 80] },
    { id: 'poha', name: 'Poha', cat: 'Grains', unit: 'plate', per: 1, kcal: 250, p: 5, c: 45, f: 6, portions: [1, 1.5, 2], hint: '1 plate ≈ 200 g' },
    { id: 'bread', name: 'Brown bread', cat: 'Grains', unit: 'slice', per: 1, kcal: 67, p: 2.6, c: 12, f: 0.9, portions: [2, 4] },
    // pulses
    { id: 'dal', name: 'Dal (toor/moong), cooked', cat: 'Pulses', unit: 'katori', per: 1, kcal: 165, p: 9, c: 24, f: 4, portions: [0.5, 1, 1.5, 2], hint: '1 katori ≈ 150 g' },
    { id: 'rajma', name: 'Rajma / chole curry', cat: 'Pulses', unit: 'katori', per: 1, kcal: 200, p: 10, c: 28, f: 5, portions: [1, 1.5, 2] },
    { id: 'chana', name: 'Roasted chana', cat: 'Pulses', unit: 'g', per: 100, kcal: 365, p: 20, c: 58, f: 5.5, portions: [30, 50, 75] },
    { id: 'soya', name: 'Soya chunks, dry', cat: 'Pulses', unit: 'g', per: 100, kcal: 345, p: 52, c: 33, f: 0.5, portions: [30, 50, 75] },
    { id: 'soybean', name: 'Soybean, dry', cat: 'Pulses', unit: 'g', per: 100, kcal: 446, p: 36, c: 30, f: 20, portions: [30, 50] },
    // dairy & eggs
    { id: 'milk', name: 'Toned milk', cat: 'Dairy & eggs', unit: 'ml', per: 100, kcal: 58, p: 3.1, c: 4.7, f: 3, portions: [200, 250, 300, 500] },
    { id: 'milkfull', name: 'Full-cream milk', cat: 'Dairy & eggs', unit: 'ml', per: 100, kcal: 88, p: 3.2, c: 4.8, f: 6.2, portions: [200, 250, 300] },
    { id: 'curd', name: 'Curd (dahi)', cat: 'Dairy & eggs', unit: 'g', per: 100, kcal: 60, p: 3.3, c: 4.7, f: 3.1, portions: [100, 150, 200] },
    { id: 'paneer', name: 'Paneer', cat: 'Dairy & eggs', unit: 'g', per: 100, kcal: 265, p: 18, c: 3.5, f: 20, portions: [50, 75, 100] },
    { id: 'egg', name: 'Egg, whole', cat: 'Dairy & eggs', unit: 'pc', per: 1, kcal: 72, p: 6.3, c: 0.4, f: 4.8, portions: [1, 2, 3, 4, 6] },
    { id: 'eggwhite', name: 'Egg white', cat: 'Dairy & eggs', unit: 'pc', per: 1, kcal: 17, p: 3.6, c: 0.2, f: 0.1, portions: [2, 4, 6] },
    { id: 'ghee', name: 'Ghee', cat: 'Dairy & eggs', unit: 'tsp', per: 1, kcal: 45, p: 0, c: 0, f: 5, portions: [1, 2] },
    // fruit, nuts
    { id: 'banana', name: 'Banana', cat: 'Fruit & nuts', unit: 'pc', per: 1, kcal: 105, p: 1.3, c: 27, f: 0.4, portions: [1, 2, 3], hint: 'medium, ~118 g' },
    { id: 'pb', name: 'Peanut butter', cat: 'Fruit & nuts', unit: 'g', per: 100, kcal: 588, p: 25, c: 20, f: 50, portions: [16, 32], hint: '1 tbsp ≈ 16 g' },
    { id: 'peanuts', name: 'Roasted peanuts', cat: 'Fruit & nuts', unit: 'g', per: 100, kcal: 567, p: 26, c: 16, f: 49, portions: [20, 30, 50] },
    { id: 'almonds', name: 'Almonds', cat: 'Fruit & nuts', unit: 'g', per: 100, kcal: 579, p: 21, c: 22, f: 50, portions: [10, 20, 30], hint: '10 almonds ≈ 12 g' },
    { id: 'cashew', name: 'Cashews', cat: 'Fruit & nuts', unit: 'g', per: 100, kcal: 553, p: 18, c: 30, f: 44, portions: [10, 20, 30] },
    { id: 'walnut', name: 'Walnuts', cat: 'Fruit & nuts', unit: 'g', per: 100, kcal: 654, p: 15, c: 14, f: 65, portions: [10, 20] },
    { id: 'raisins', name: 'Raisins (kishmish)', cat: 'Fruit & nuts', unit: 'g', per: 100, kcal: 299, p: 3.1, c: 79, f: 0.5, portions: [15, 30] },
    { id: 'dates', name: 'Dates (khajur)', cat: 'Fruit & nuts', unit: 'pc', per: 1, kcal: 23, p: 0.2, c: 6, f: 0, portions: [2, 4, 6] },
    { id: 'apple', name: 'Apple', cat: 'Fruit & nuts', unit: 'pc', per: 1, kcal: 95, p: 0.5, c: 25, f: 0.3, portions: [1] },
    // vegetables
    { id: 'sabzi', name: 'Mixed veg sabzi', cat: 'Vegetables', unit: 'katori', per: 1, kcal: 120, p: 3, c: 12, f: 7, portions: [0.5, 1, 1.5] },
    { id: 'aloo', name: 'Aloo sabzi', cat: 'Vegetables', unit: 'katori', per: 1, kcal: 180, p: 3, c: 25, f: 8, portions: [0.5, 1] },
    { id: 'palak', name: 'Palak / saag', cat: 'Vegetables', unit: 'katori', per: 1, kcal: 110, p: 4, c: 8, f: 7, portions: [1] },
    { id: 'salad', name: 'Salad (onion, tomato, cucumber)', cat: 'Vegetables', unit: 'g', per: 100, kcal: 25, p: 1, c: 5, f: 0.2, portions: [100, 150] },
    // other
    { id: 'chicken', name: 'Chicken breast, cooked', cat: 'Other', unit: 'g', per: 100, kcal: 165, p: 31, c: 0, f: 3.6, portions: [100, 150, 200] },
    { id: 'whey', name: 'Whey protein', cat: 'Other', unit: 'scoop', per: 1, kcal: 120, p: 24, c: 3, f: 1.5, portions: [1], hint: '~30 g scoop; check your label' },
    { id: 'honey', name: 'Honey', cat: 'Other', unit: 'tsp', per: 1, kcal: 21, p: 0, c: 5.7, f: 0, portions: [1, 2] },
    { id: 'chikki', name: 'Peanut chikki', cat: 'Other', unit: 'pc', per: 1, kcal: 150, p: 4, c: 17, f: 7, portions: [1, 2], hint: '~30 g bar' },
  ];
  const allFoods = () => FOODS.concat(App.state.food.custom || []);
  const food = (id) => allFoods().find((f) => f.id === id);

  /** Macros for an amount of a food (amount is in the food's unit). */
  function macros(f, amount) {
    const k = (+amount || 0) / f.per;
    return { kcal: Math.round(f.kcal * k), p: App.round1(f.p * k), c: App.round1(f.c * k), f: App.round1(f.f * k) };
  }
  const unitLabel = (f, amt) => {
    const u = f.unit;
    if (u === 'g' || u === 'ml') return `${amt} ${u}`;
    return `${amt} ${u}${amt !== 1 && !['katori', 'tsp'].includes(u) ? 's' : ''}`;
  };

  const MEALS = [
    { id: 'breakfast', label: 'Breakfast', emoji: '🥣', time: '8:15 AM' },
    { id: 'lunch', label: 'Lunch', emoji: '🍛', time: '1:00 PM' },
    { id: 'snacks', label: 'Snacks', emoji: '🍌', time: 'Anytime' },
    { id: 'dinner', label: 'Dinner', emoji: '🍲', time: 'After work' },
    { id: 'custom', label: 'Custom meal', emoji: '✨', time: '' },
  ];

  /** Indian low-budget bulk template; each item = [foodId, amount]. */
  const PLAN = [
    { meal: 'breakfast', title: 'Oats power bowl', items: [['oats', 60], ['milk', 300], ['banana', 1], ['pb', 16]], tip: 'Cook oats in milk 3–4 min, top with banana and peanut butter.' },
    { meal: 'snacks', title: 'Post-gym eggs + chana', items: [['egg', 3], ['chana', 30]], tip: 'Vegetarian: swap eggs for 75 g paneer.' },
    { meal: 'lunch', title: 'Home thali', items: [['rice', 160], ['dal', 1], ['roti', 2], ['sabzi', 1], ['curd', 150]], tip: 'Do not skip dal and curd; they carry the protein.' },
    { meal: 'snacks', title: 'Work snack box', items: [['banana', 2], ['peanuts', 30], ['almonds', 15]], tip: 'Pack it for your 2–11 PM shift.' },
    { meal: 'dinner', title: 'Soya curry + roti', items: [['roti', 3], ['soya', 50], ['salad', 100]], tip: 'Soak soya 10 min in hot water, squeeze, cook in onion-tomato masala.' },
    { meal: 'dinner', title: 'Bedtime milk', items: [['milk', 250], ['dates', 2]], tip: 'Warm with a pinch of haldi.' },
  ];
  const planTotals = (p) => p.items.reduce((a, [id, amt]) => { const m = macros(food(id), amt); a.kcal += m.kcal; a.p += m.p; a.c += m.c; a.f += m.f; return a; }, { kcal: 0, p: 0, c: 0, f: 0 });

  /* ---------- Exercise library (fig = animation pattern in figures.js) ---------- */
  const EX = {
    bench: { name: 'Barbell Bench Press', fig: 'bench', muscle: 'Chest, front delts, triceps', kind: 'upper',
      steps: ['Lie flat, eyes under the bar, feet planted.', 'Grip slightly wider than shoulders; squeeze shoulder blades together.', 'Lower to mid-chest in 2–3 s, elbows ~45° from body.', 'Press up and slightly back to straight arms.'],
      tip: 'Keep your glutes on the bench and wrists stacked over elbows.', mistake: 'Bouncing the bar off the chest.' },
    incDb: { name: 'Incline Dumbbell Press', fig: 'incline', muscle: 'Upper chest, front delts', kind: 'upper',
      steps: ['Bench at 30°.', 'Dumbbells at chest level, palms forward.', 'Press up until arms are straight.', 'Lower slowly to a deep stretch.'],
      tip: '30° targets the upper chest; steeper becomes a shoulder press.', mistake: 'Flaring elbows to 90°.' },
    dbBench: { name: 'Flat Dumbbell Press', fig: 'bench', muscle: 'Chest, triceps', kind: 'upper',
      steps: ['Lie flat, dumbbells at chest level.', 'Press up and slightly together.', 'Lower slowly for a chest stretch.', 'Keep shoulder blades pinched.'],
      tip: 'Dumbbells fix left-right imbalances.', mistake: 'Shoulders rolling forward at the bottom.' },
    fly: { name: 'Pec Deck / Cable Fly', fig: 'fly', muscle: 'Chest', kind: 'upper',
      steps: ['Slight bend in the elbows.', 'Bring hands together in a hugging arc.', 'Squeeze the chest for 1 s.', 'Open slowly to a comfortable stretch.'],
      tip: 'Elbow angle stays fixed.', mistake: 'Turning it into a press.' },
    dips: { name: 'Parallel / Bench Dips', fig: 'dip', muscle: 'Triceps, lower chest', kind: 'upper',
      steps: ['Hands on bars, arms straight.', 'Lower until elbows reach 90°.', 'Push back up.', 'Lean forward slightly for more chest.'],
      tip: 'Use the assisted machine or bench dips if bar dips are too hard.', mistake: 'Dropping too deep and straining the shoulders.' },
    pushdown: { name: 'Cable Triceps Pushdown', fig: 'pushdown', muscle: 'Triceps', kind: 'upper',
      steps: ['Rope or bar at the top of the cable.', 'Elbows pinned to your sides.', 'Push down to straight arms, squeeze.', 'Return to 90° slowly.'],
      tip: 'Only the forearms move.', mistake: 'Elbows drifting forward.' },
    ohTri: { name: 'Overhead Triceps Extension', fig: 'ohext', muscle: 'Triceps (long head)', kind: 'upper',
      steps: ['One dumbbell overhead with both hands.', 'Lower behind the head by bending elbows.', 'Feel the stretch, then extend.', 'Elbows point forward.'],
      tip: 'Sit down for stability.', mistake: 'Elbows flaring wide.' },
    pulldown: { name: 'Lat Pulldown', fig: 'pulldown', muscle: 'Lats, biceps', kind: 'upper',
      steps: ['Grip slightly wider than shoulders.', 'Lean back slightly, chest up.', 'Pull the bar to the upper chest.', 'Let it rise slowly to straight arms.'],
      tip: 'Think "elbows to back pockets".', mistake: 'Pulling behind the neck or swinging.' },
    pullup: { name: 'Pull-up / Assisted Pull-up', fig: 'pullup', muscle: 'Lats, biceps', kind: 'upper',
      steps: ['Hang with an overhand, shoulder-width grip.', 'Pull your chest toward the bar.', 'Chin clears the bar.', 'Lower to a full hang.'],
      tip: 'Use the assist machine or a band until you can do 5 clean reps.', mistake: 'Half reps and kicking.' },
    bbRow: { name: 'Barbell Row', fig: 'row', muscle: 'Mid back, lats, rear delts', kind: 'upper',
      steps: ['Hinge to ~45°, back flat, knees soft.', 'Grip just outside the knees.', 'Pull to the lower ribs.', 'Lower with control, torso angle fixed.'],
      tip: 'Brace your core hard.', mistake: 'Rounding the lower back.' },
    cableRow: { name: 'Seated Cable Row', fig: 'row', muscle: 'Mid back, lats', kind: 'upper',
      steps: ['Sit tall, slight knee bend.', 'Pull the handle to your belly button.', 'Squeeze shoulder blades 1 s.', 'Reach forward slowly.'],
      tip: 'Chest up, no rocking.', mistake: 'Pulling with the lower back.' },
    dbRow: { name: 'One-arm Dumbbell Row', fig: 'row', muscle: 'Lats, mid back', kind: 'upper',
      steps: ['Knee and hand on the bench, back flat.', 'Pull the dumbbell to your hip.', 'Squeeze at the top.', 'Lower to a full stretch.'],
      tip: 'Pull with the elbow, not the hand.', mistake: 'Twisting the torso.' },
    facePull: { name: 'Face Pull', fig: 'row', muscle: 'Rear delts, upper back', kind: 'upper',
      steps: ['Rope at upper-chest height.', 'Pull toward your face, hands beside ears.', 'Rotate knuckles to the ceiling.', 'Return slowly.'],
      tip: 'Light weight, slow reps; great for posture.', mistake: 'Going too heavy.' },
    rearFly: { name: 'Rear Delt Fly', fig: 'lateral', muscle: 'Rear delts', kind: 'upper',
      steps: ['Bend forward with light dumbbells or use the reverse pec deck.', 'Raise arms out to the sides.', 'Squeeze at shoulder height.', 'Lower slowly.'],
      tip: 'Rear delts make shoulders look round from the side.', mistake: 'Shrugging the traps.' },
    bbCurl: { name: 'Barbell Curl', fig: 'curl', muscle: 'Biceps', kind: 'upper',
      steps: ['Stand tall, shoulder-width grip, palms up.', 'Curl up, elbows at your sides.', 'Squeeze at the top.', 'Lower in 2–3 s.'],
      tip: 'An EZ bar is easier on the wrists.', mistake: 'Swinging the hips.' },
    hammer: { name: 'Hammer Curl', fig: 'curl', muscle: 'Biceps, forearms', kind: 'upper',
      steps: ['Dumbbells at sides, palms facing each other.', 'Curl without rotating the wrist.', 'Pause at shoulder height.', 'Lower slowly.'],
      tip: 'Builds thicker-looking arms.', mistake: 'Elbows moving forward.' },
    incCurl: { name: 'Incline Dumbbell Curl', fig: 'curl', muscle: 'Biceps (long head)', kind: 'upper',
      steps: ['Sit back on a 45° bench, arms hanging.', 'Curl without moving the upper arm.', 'Squeeze at the top.', 'Lower to a full stretch.'],
      tip: 'Go lighter than normal curls.', mistake: 'Shoulders rolling forward.' },
    ohpDb: { name: 'Seated Dumbbell Shoulder Press', fig: 'ohp', muscle: 'Shoulders, triceps', kind: 'upper',
      steps: ['Sit upright, back supported.', 'Dumbbells at ear height.', 'Press overhead to nearly straight.', 'Lower to ear level.'],
      tip: 'Brace so the lower back does not arch.', mistake: 'Cutting the range short.' },
    lateral: { name: 'Dumbbell Lateral Raise', fig: 'lateral', muscle: 'Side delts', kind: 'upper',
      steps: ['Stand tall, light dumbbells.', 'Slight elbow bend, lean forward a little.', 'Raise to shoulder height.', 'Lower in 2–3 s.'],
      tip: 'Lead with the elbows.', mistake: 'Swinging heavy weights.' },
    squat: { name: 'Barbell Back Squat', fig: 'squat', muscle: 'Quads, glutes, core', kind: 'lower',
      steps: ['Bar on upper back, feet shoulder-width.', 'Breathe in and brace.', 'Sit down until thighs are at least parallel.', 'Drive up through the whole foot.'],
      tip: 'Start with the empty bar and film your form from the side.', mistake: 'Knees caving inward.' },
    squatL: { name: 'Back Squat (volume day)', fig: 'squat', muscle: 'Quads, glutes', kind: 'lower',
      steps: ['Same setup as Wednesday.', 'Use ~80% of your Wednesday weight.', 'Slow 3-second lowering.', 'Drive up strongly.'],
      tip: 'Second squat day builds skill and size.', mistake: 'Rushing reps.' },
    rdl: { name: 'Romanian Deadlift', fig: 'hinge', muscle: 'Hamstrings, glutes', kind: 'lower',
      steps: ['Bar at hips, knees slightly bent.', 'Push hips back, bar slides down thighs.', 'Stop at a strong hamstring stretch.', 'Squeeze glutes to stand.'],
      tip: 'Back stays flat throughout.', mistake: 'Turning it into a squat.' },
    legPress: { name: 'Leg Press', fig: 'legpress', muscle: 'Quads, glutes', kind: 'lower',
      steps: ['Feet shoulder-width mid-platform.', 'Lower until knees reach ~90°.', 'Press without locking knees.', 'Lower back flat on the pad.'],
      tip: 'Control the bottom.', mistake: 'Hips lifting off the seat.' },
    legCurl: { name: 'Lying Leg Curl', fig: 'legcurl', muscle: 'Hamstrings', kind: 'lower',
      steps: ['Face down, pad above heels.', 'Curl heels to glutes.', 'Squeeze 1 s.', 'Lower slowly.'],
      tip: 'Hips stay pressed down.', mistake: 'Lifting hips to cheat.' },
    legExt: { name: 'Leg Extension', fig: 'legext', muscle: 'Quads', kind: 'lower',
      steps: ['Pad on lower shins.', 'Straighten legs fully.', 'Squeeze quads 1 s.', 'Lower slowly.'],
      tip: 'Toes up for a stronger squeeze.', mistake: 'Swinging the weight.' },
    bss: { name: 'Bulgarian Split Squat', fig: 'lunge', muscle: 'Quads, glutes (each leg)', kind: 'lower',
      steps: ['Back foot on a bench.', 'Lower straight down.', 'Drive through the front heel.', 'Finish one side, then switch.'],
      tip: 'Start with bodyweight.', mistake: 'Front knee caving in.' },
    calf: { name: 'Standing Calf Raise', fig: 'calf', muscle: 'Calves', kind: 'lower',
      steps: ['Balls of feet on a step.', 'Lower heels for a stretch.', 'Rise as high as possible.', 'Pause top and bottom.'],
      tip: 'Full range beats heavy weight.', mistake: 'Bouncing.' },
    seatedCalf: { name: 'Seated Calf Raise', fig: 'calf', muscle: 'Calves (soleus)', kind: 'lower',
      steps: ['Pad on lower thighs.', 'Lower heels.', 'Rise up high.', 'Pause and repeat.'],
      tip: 'High reps, slow tempo.', mistake: 'Short bouncy reps.' },
    hkr: { name: 'Hanging Knee Raise', fig: 'kneeraise', muscle: 'Abs', kind: 'core',
      steps: ['Hang from a bar, shoulders engaged.', 'Raise knees to chest.', 'Curl the pelvis up.', 'Lower without swinging.'],
      tip: "Use the captain's chair if grip fails.", mistake: 'Swinging.' },
    plank: { name: 'Plank', fig: 'plank', muscle: 'Core', kind: 'core', timed: true,
      steps: ['Forearms down, elbows under shoulders.', 'Straight line head to heels.', 'Squeeze glutes, brace abs.', 'Breathe and hold.'],
      tip: 'Reps column = seconds.', mistake: 'Hips sagging.' },
    // legacy (v1 history)
    ohp: { name: 'Standing Overhead Press', fig: 'ohp', muscle: 'Shoulders', kind: 'upper', steps: ['Bar on front of shoulders.', 'Brace and press overhead.', 'Lock out.', 'Lower to shoulders.'], tip: 'Squeeze glutes.', mistake: 'Leaning back.' },
    deadlift: { name: 'Conventional Deadlift', fig: 'hinge', muscle: 'Posterior chain', kind: 'lower', steps: ['Bar over mid-foot.', 'Hinge and grip.', 'Chest up, back flat.', 'Push the floor away.'], tip: 'Master the hinge first.', mistake: 'Rounding the back.' },
    shrug: { name: 'Dumbbell Shrug', fig: 'curl', muscle: 'Traps', kind: 'upper', steps: ['Heavy dumbbells at sides.', 'Shoulders straight up.', 'Hold 1 s.', 'Lower slowly.'], tip: 'No rolling.', mistake: 'Bending elbows.' },
  };

  const ex = (id, sets, reps, rest) => ({ id, sets, reps, rest });
  const DAYS = {
    chestTri: { name: 'Chest + Triceps', short: 'Chest', focus: 'Chest · Triceps', color: 'g-red',
      list: [ex('bench', 4, '6-8', 120), ex('incDb', 3, '8-10', 90), ex('fly', 3, '12-15', 60), ex('dips', 3, '6-12', 90), ex('pushdown', 3, '10-12', 60), ex('ohTri', 2, '10-12', 60)] },
    backBi: { name: 'Back + Biceps', short: 'Back', focus: 'Back · Biceps', color: 'g-blue',
      list: [ex('pulldown', 4, '8-10', 90), ex('bbRow', 4, '6-8', 120), ex('cableRow', 3, '10-12', 90), ex('facePull', 3, '12-15', 60), ex('bbCurl', 3, '8-10', 60), ex('hammer', 3, '10-12', 60)] },
    legsAbs: { name: 'Legs + Abs', short: 'Legs', focus: 'Quads · Hamstrings · Calves · Abs', color: 'g-green',
      list: [ex('squat', 4, '6-8', 150), ex('rdl', 3, '8-10', 120), ex('legPress', 3, '10-12', 90), ex('legCurl', 3, '10-12', 60), ex('calf', 4, '12-15', 60), ex('hkr', 3, '10-15', 60), ex('plank', 3, '30-45', 45)] },
    upper: { name: 'Chest + Back + Shoulders', short: 'Upper', focus: 'Chest · Back · Shoulders', color: 'g-warm',
      list: [ex('dbBench', 3, '8-10', 90), ex('pullup', 3, '5-10', 120), ex('ohpDb', 3, '8-10', 90), ex('dbRow', 3, '8-10', 90), ex('lateral', 4, '12-15', 60), ex('rearFly', 3, '12-15', 60)] },
    legsArms: { name: 'Legs + Arms', short: 'Legs', focus: 'Legs · Biceps · Triceps', color: 'g-green',
      list: [ex('squatL', 3, '8-10', 120), ex('bss', 3, '8-10', 90), ex('legExt', 3, '12-15', 60), ex('seatedCalf', 4, '15-20', 45), ex('incCurl', 3, '10-12', 60), ex('pushdown', 3, '12-15', 60)] },
    rest: { name: 'Rest & Recover', short: 'Rest', focus: 'Walk · Stretch · Sleep', color: 'g-sky', list: [] },
  };
  // v1 day keys, kept so old workout history still renders
  const LEGACY = { pushA: 'Push A', pullA: 'Pull A', legsA: 'Legs A', pushB: 'Push B', pullB: 'Pull B', legsB: 'Legs B' };
  const dayName = (k) => (DAYS[k] ? DAYS[k].name : LEGACY[k] || k);
  // index = JS getDay(): Sun..Sat
  const WEEK = ['rest', 'chestTri', 'backBi', 'legsAbs', 'rest', 'upper', 'legsArms'];
  const isTrainingDay = (date) => WEEK[App.parseD(date).getDay()] !== 'rest';

  const WARMUP = ['5 min brisk walk or cycle', '10 arm circles each way', '10 bodyweight squats', '1–2 light warm-up sets of the first exercise'];
  const REST_DAY = [
    { t: '30–40 min walk', d: 'Stay active without hurting recovery.' },
    { t: '10 min full-body stretch', d: 'Hips, hamstrings, chest, shoulders.' },
    { t: 'Eat your full calories', d: 'Muscle grows on rest days.' },
    { t: 'Sleep 8 hours', d: 'Recovery happens in deep sleep.' },
    { t: 'Meal-prep', d: 'Boil eggs, soak soya, pack nuts for work.' },
  ];
  const COACH_TIPS = [
    'Aim for +0.25 to 0.5 kg per week. Faster is mostly fat.',
    'Add weight or reps every week. Small jumps add up.',
    'Drink at least 3 litres of water; more on hot days.',
    'Sleep 7–9 hours. Training breaks muscle, sleep rebuilds it.',
    'Protein every day matters more than any supplement.',
    'Creatine monohydrate (3–5 g/day) is well-researched and cheap. Ask a doctor if unsure.',
    'Missed a day? Do not double up. Just continue with the next session.',
    'Thoda thoda roz: consistency beats intensity.',
  ];

  /* ---------- US CMA (based on the IMA content outline; Hock follows the same sections) ---------- */
  const CMA = {
    p1: { name: 'Part 1', title: 'Financial Planning, Performance & Analytics', sections: [
      { id: 'p1a', code: 'A', name: 'External Financial Reporting Decisions', weight: 15, chapters: ['Financial statements', 'Recognition, measurement, valuation & disclosure'] },
      { id: 'p1b', code: 'B', name: 'Planning, Budgeting & Forecasting', weight: 20, chapters: ['Strategic planning', 'Budgeting concepts', 'Forecasting techniques', 'Budget methodologies', 'Annual profit plan & schedules', 'Top-level planning & analysis'] },
      { id: 'p1c', code: 'C', name: 'Performance Management', weight: 20, chapters: ['Cost & variance measures', 'Responsibility centers & reporting segments', 'Performance measures'] },
      { id: 'p1d', code: 'D', name: 'Cost Management', weight: 15, chapters: ['Measurement concepts', 'Costing systems', 'Overhead costs', 'Supply chain management', 'Business process improvement'] },
      { id: 'p1e', code: 'E', name: 'Internal Controls', weight: 15, chapters: ['Governance, risk & compliance', 'Systems controls & security measures'] },
      { id: 'p1f', code: 'F', name: 'Technology & Analytics', weight: 15, chapters: ['Information systems', 'Data governance', 'Technology-enabled finance transformation', 'Data analytics'] },
    ] },
    p2: { name: 'Part 2', title: 'Strategic Financial Management', sections: [
      { id: 'p2a', code: 'A', name: 'Financial Statement Analysis', weight: 20, chapters: ['Basic financial statement analysis', 'Financial ratios', 'Profitability analysis', 'Special issues'] },
      { id: 'p2b', code: 'B', name: 'Corporate Finance', weight: 20, chapters: ['Risk & return', 'Long-term financial management', 'Raising capital', 'Working capital management', 'Corporate restructuring', 'International financial management'] },
      { id: 'p2c', code: 'C', name: 'Decision Analysis', weight: 25, chapters: ['Cost/volume/profit analysis', 'Marginal analysis', 'Pricing'] },
      { id: 'p2d', code: 'D', name: 'Risk Management', weight: 10, chapters: ['Enterprise risk'] },
      { id: 'p2e', code: 'E', name: 'Investment Decisions', weight: 10, chapters: ['Capital budgeting process', 'Capital investment analysis methods'] },
      { id: 'p2f', code: 'F', name: 'Professional Ethics', weight: 15, chapters: ['Business ethics', 'Ethics for management accountants', 'Ethics for the organization'] },
    ] },
  };
  // chapter ids: `${sectionId}.${index}`
  CMA.p1.sections.concat(CMA.p2.sections).forEach((s) => (s.ch = s.chapters.map((n, i) => ({ id: `${s.id}.${i + 1}`, name: n }))));

  const BACKLOG = {
    bm: { name: 'Business Mathematics', units: ['Ratio, proportion & percentage', 'Indices & logarithms', 'Simple & compound interest', 'Annuities', 'Matrices & determinants', 'Differentiation basics', 'Linear programming', 'Statistics basics'] },
    be: { name: 'Business Economics', units: ['Theory of demand', 'Elasticity of demand', 'Consumer behaviour & utility', 'Production function', 'Cost & revenue curves', 'Perfect competition', 'Monopoly & monopolistic competition', 'Factor pricing'] },
  };

  /* ---------- Career ---------- */
  const SKILLS = [
    { id: 'excel', name: 'Advanced Excel', emoji: '📊', color: '#22c55e', ms: ['XLOOKUP, INDEX-MATCH, SUMIFS', 'Pivot tables & pivot charts', 'Power Query data cleaning', 'Dynamic arrays (FILTER, UNIQUE, LET)', 'Dashboard with slicers', 'Macros & VBA basics', 'Automate a monthly report'] },
    { id: 'sql', name: 'SQL', emoji: '🗄️', color: '#38bdf8', ms: ['SELECT, WHERE, ORDER BY', 'JOINs', 'GROUP BY & HAVING', 'Subqueries & CTEs', 'Window functions', 'Finance reporting query set'] },
    { id: 'powerbi', name: 'Power BI', emoji: '📈', color: '#facc15', ms: ['Import & Power Query', 'Star-schema data model', 'DAX measures & CALCULATE', 'Time intelligence', 'P&L dashboard', 'Publish & share'] },
    { id: 'python', name: 'Python', emoji: '🐍', color: '#60a5fa', ms: ['Python basics', 'pandas DataFrames', 'Data cleaning', 'Charts (matplotlib)', 'Automate an Excel report (openpyxl)', 'Finance mini-project'] },
    { id: 'finmodel', name: 'Financial Modeling', emoji: '🧮', color: '#a78bfa', ms: ['3-statement model', 'Revenue & cost drivers', 'DCF valuation', 'Scenario & sensitivity analysis', 'Model formatting standards'] },
    { id: 'finanalysis', name: 'Financial Analysis', emoji: '🔎', color: '#f472b6', ms: ['Ratio analysis', 'Common-size & trend analysis', 'Variance analysis', 'Cash-flow analysis', 'Write an analysis memo'] },
    { id: 'cma', name: 'US CMA', emoji: '🎓', color: '#ef4444', ms: [], derived: true },
    { id: 'fpa', name: 'FP&A', emoji: '🧭', color: '#fb923c', ms: ['Budgeting process', 'Rolling forecasts', 'Budget vs actual reporting', 'Driver-based planning', 'Management reporting pack', 'Business partnering'] },
    { id: 'automation', name: 'Financial Automation', emoji: '⚙️', color: '#2dd4bf', ms: ['Map a manual finance process', 'Power Query refresh workflow', 'Reconciliation macro', 'Python bank-statement parser', 'Reimbursement tracker automation', 'Measure time saved'] },
  ];
  SKILLS.forEach((s) => (s.msList = s.ms.map((t, i) => ({ id: `${s.id}.${i + 1}`, title: t }))));
  const PORTFOLIO_TYPES = ['Excel automation', 'Power BI dashboard', 'Financial model', 'Python project', 'SQL project', 'Accounting automation'];

  /* ---------- Work ---------- */
  const WORK_CATS = ['Project accounting', 'Accounts payable', 'Accounts receivable', 'Reimbursements', 'Vendor reconciliation', 'Bank statement analysis', 'QuickBooks', 'Payroll', 'W-9 / W-8 docs', 'Form 1099', 'Excel reporting', 'Other'];
  const WORK_KINDS = {
    task: { label: 'Task', emoji: '📝' },
    approval: { label: 'Approval', emoji: '✅' },
    reimb: { label: 'Reimbursement', emoji: '🧾' },
    deadline: { label: 'Deadline', emoji: '⏰' },
  };
  const WORK_STATUS = { todo: 'To do', doing: 'In progress', waiting: 'Waiting', done: 'Done' };

  /* ---------- Money ---------- */
  const EXP = [
    { id: 'food', label: 'Food', e: '🍔', c: '#fb923c' },
    { id: 'travel', label: 'Travel', e: '🚌', c: '#38bdf8' },
    { id: 'gym', label: 'Gym', e: '🏋️', c: '#22c55e' },
    { id: 'supplements', label: 'Supplements', e: '💊', c: '#a3e635' },
    { id: 'education', label: 'Education', e: '📚', c: '#60a5fa' },
    { id: 'shopping', label: 'Shopping', e: '🛍️', c: '#f472b6' },
    { id: 'mobile', label: 'Mobile & internet', e: '📱', c: '#2dd4bf' },
    { id: 'entertainment', label: 'Entertainment', e: '🎬', c: '#c084fc' },
    { id: 'family', label: 'Family', e: '👨‍👩‍👦', c: '#facc15' },
    { id: 'other', label: 'Other', e: '📦', c: '#94a3b8' },
  ];
  const INC = [
    { id: 'salary', label: 'Salary', e: '💼', c: '#22c55e' },
    { id: 'freelance', label: 'Freelance', e: '💻', c: '#38bdf8' },
    { id: 'pocket', label: 'From family', e: '🏠', c: '#facc15' },
    { id: 'gift', label: 'Gift', e: '🎁', c: '#f472b6' },
    { id: 'interest', label: 'Interest', e: '🏦', c: '#a78bfa' },
    { id: 'other_in', label: 'Other', e: '➕', c: '#94a3b8' },
  ];
  const PAY_MODES = ['UPI', 'Cash', 'Debit card', 'Credit card', 'Net banking'];
  const moneyCat = (id) => EXP.find((c) => c.id === id) || INC.find((c) => c.id === id) || EXP[EXP.length - 1];

  Object.assign(App, {
    ACTIVITY, GOAL_MODES, targets, FOODS, allFoods, food, macros, unitLabel, MEALS, PLAN, planTotals,
    EX, DAYS, LEGACY, dayName, WEEK, isTrainingDay, WARMUP, REST_DAY, COACH_TIPS,
    CMA, BACKLOG, SKILLS, PORTFOLIO_TYPES, WORK_CATS, WORK_KINDS, WORK_STATUS, EXP, INC, PAY_MODES, moneyCat,
  });
})();
