/* ═══════════════════════════════════════════════════════════════════════════
   SCRIPT.JS — Metabolic Engine Calculator
   Calorie Deficit & Weight Loss · Boxers & Athletes
   Author: script companion to index.html / style.css
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

/* ─── 1. GLOBAL STATE ──────────────────────────────────────────────────────── */
const state = {
  gender:    'male',
  heightUnit: 'cm',
  weightUnit: 'kg',
  intensity: 'moderate',
  workoutDays: 4,
  // last calculated values (used by charts & timeline)
  tdee:      0,
  bmr:       0,
  restKcal:  0,
  workoutKcal: 0,
  weightKg:  0,
  goalWeightKg: 0,
  weeklyLossKg: 0,
  calculatedOnce: false,
};

/* Activity multipliers */
const INTENSITY_MULTIPLIERS = {
  sedentary: 1.2,
  light:     1.375,
  moderate:  1.55,
  heavy:     1.725,
  athlete:   1.9,
};

/* ─── 2. DOM REFERENCES ────────────────────────────────────────────────────── */
// Tabs & panels
const tabs          = document.querySelectorAll('.tab');
const tabPanels     = document.querySelectorAll('.tab-panel');

// SVG scene containers (for hit + enter-scene animation)
const bagContainer      = document.querySelector('.bag-container');
const glovesContainer   = document.querySelector('.gloves-container');
const speedbagContainer = document.querySelector('.speedbag-container');

// Scene wrappers (for tab-active class)
const bagScene      = document.querySelector('.bag-scene');
const glovesScene   = document.querySelector('.gloves-scene');
const speedbagScene = document.querySelector('.speedbag-scene');

// Tilt wrappers (3D parallax)
const tiltWrappers  = document.querySelectorAll('.tilt-wrapper');

// Gender buttons
const btnMale   = document.getElementById('btn-male');
const btnFemale = document.getElementById('btn-female');

// Height unit pill
const heightUnitPill    = document.getElementById('height-unit-pill');
const heightInputRowCm  = document.getElementById('height-input-row');
const heightInputRowFt  = document.getElementById('height-input-row-ft');
const inputHeightCm     = document.getElementById('input-height-cm');
const inputHeightFt     = document.getElementById('input-height-ft');
const inputHeightIn     = document.getElementById('input-height-in');

// Weight unit pill
const weightUnitPill    = document.getElementById('weight-unit-pill');
const inputWeight       = document.getElementById('input-weight');
const weightSuffix      = document.getElementById('weight-suffix');
const goalWeightSuffix  = document.getElementById('goal-weight-suffix');

// Body metric inputs
const inputAge          = document.getElementById('input-age');
const inputGoalWeight   = document.getElementById('input-goal-weight');

// BMI
const bmiValue    = document.getElementById('bmi-value');
const bmiCategory = document.getElementById('bmi-category');

// Slider
const daysSlider  = document.getElementById('days-slider');
const daysVal     = document.getElementById('days-slider-val');

// Intensity buttons
const intensityBtns = document.querySelectorAll('.intensity-btn');

// TDEE display
const tdeeValue  = document.getElementById('tdee-value');
const tdeeWeekly = document.getElementById('tdee-weekly');
const tdeeBmrVal = document.getElementById('tdee-bmr-val');

// Warning box
const warningBox = document.getElementById('warning-box');

// Calorie targets
const inputRestKcal      = document.getElementById('input-rest-kcal');
const inputWorkoutKcal   = document.getElementById('input-workout-kcal');
const restDeficitBadge   = document.getElementById('rest-deficit-badge');
const workoutDeficitBadge = document.getElementById('workout-deficit-badge');

// Macro bars + values
const macroBarProtein = document.getElementById('macro-bar-protein');
const macroBarCarbs   = document.getElementById('macro-bar-carbs');
const macroBarFats    = document.getElementById('macro-bar-fats');
const macroValProtein = document.getElementById('macro-val-protein');
const macroValCarbs   = document.getElementById('macro-val-carbs');
const macroValFats    = document.getElementById('macro-val-fats');

// Calculate button
const btnCalculate = document.getElementById('btn-calculate');

// Results
const resDailyDeficit  = document.getElementById('res-daily-deficit');
const resWeeklyDeficit = document.getElementById('res-weekly-deficit');
const resFatLossWeek   = document.getElementById('res-fat-loss-week');
const resTimeToGoal    = document.getElementById('res-time-to-goal');
const insightText      = document.getElementById('insight-text');

// Timeline list
const timelineList = document.getElementById('timeline-list');

// Metric cards for pop-in animation
const metricCards = document.querySelectorAll('.metric-card');
const calorieTgtCards = document.querySelectorAll('.calorie-target');


/* ─── 3. CHART INSTANCES ───────────────────────────────────────────────────── */
let chartCalories  = null;
let chartDeficit   = null;
let chartTimeline  = null;


/* ═══════════════════════════════════════════════════════════════════════════
   UTILITY HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

function fmt(n, dec = 0) {
  if (n == null || isNaN(n)) return '—';
  return n.toFixed(dec);
}

function fmtInt(n) {
  if (n == null || isNaN(n)) return '—';
  return Math.round(n).toLocaleString();
}

/* Get the currently active SVG container based on body data-tab */
function getActiveContainer() {
  const tab = document.body.getAttribute('data-tab');
  if (tab === 'inputs')   return bagContainer;
  if (tab === 'results')  return glovesContainer;
  if (tab === 'timeline') return speedbagContainer;
  return bagContainer;
}


/* ═══════════════════════════════════════════════════════════════════════════
   4. TAB NAVIGATION & SCENE SWITCHING
   ═══════════════════════════════════════════════════════════════════════════ */

/* Map tab name → { scene wrapper, container } */
const TAB_SCENE_MAP = {
  inputs:   { scene: bagScene,      container: bagContainer },
  results:  { scene: glovesScene,   container: glovesContainer },
  timeline: { scene: speedbagScene, container: speedbagContainer },
};

function switchTab(tabName) {
  /* 1. Update tabs */
  tabs.forEach(t => {
    const isActive = t.getAttribute('data-tab') === tabName;
    t.classList.toggle('active', isActive);
    t.setAttribute('aria-selected', isActive);
  });

  /* 2. Update panels */
  tabPanels.forEach(p => {
    const isActive = p.id === `tab-${tabName}`;
    p.classList.toggle('active', isActive);
  });

  /* 3. Update body data-tab so CSS rules take over scene opacity */
  document.body.setAttribute('data-tab', tabName);

  /* 4. Scene visibility + enter-scene animation */
  Object.entries(TAB_SCENE_MAP).forEach(([name, { scene, container }]) => {
    const isThis = name === tabName;

    // Remove tab-active so CSS opacity transitions cleanly
    scene.classList.toggle('tab-active', isThis);

    if (isThis) {
      // Make sure previous is-hit is cleared
      container.classList.remove('is-hit');

      // Trigger enter-scene animation
      container.classList.remove('enter-scene');
      // Force reflow to restart animation
      void container.offsetWidth;
      container.classList.add('enter-scene');

      const onEnterEnd = () => {
        container.classList.remove('enter-scene');
        container.removeEventListener('animationend', onEnterEnd);
      };
      container.addEventListener('animationend', onEnterEnd, { once: true });
    }
  });
}

/* Wire tab click listeners */
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    switchTab(tab.getAttribute('data-tab'));
  });
});


/* ═══════════════════════════════════════════════════════════════════════════
   5. 3D MOUSE TRACKING / PARALLAX TILT
   ═══════════════════════════════════════════════════════════════════════════ */

const TILT_MAX = 12; // degrees

document.addEventListener('mousemove', e => {
  const cx = window.innerWidth  / 2;
  const cy = window.innerHeight / 2;

  // Normalise to -1 … +1
  const nx = (e.clientX - cx) / cx;
  const ny = (e.clientY - cy) / cy;

  const rotY =  nx * TILT_MAX;  // lean left/right
  const rotX = -ny * TILT_MAX;  // lean forward/back

  tiltWrappers.forEach(wrapper => {
    wrapper.style.transform =
      `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
  });
});

/* Reset on mouse leave (keeps tilt on mobile scroll too) */
document.addEventListener('mouseleave', () => {
  tiltWrappers.forEach(wrapper => {
    wrapper.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
  });
});


/* ═══════════════════════════════════════════════════════════════════════════
   6. 'HIT' ANIMATION ON INPUT INTERACTION
   ═══════════════════════════════════════════════════════════════════════════ */

let hitDebounceTimer = null;

function triggerHit() {
  const container = getActiveContainer();
  if (!container) return;

  // Debounce rapid hits so animation isn't interrupted mid-swing
  if (hitDebounceTimer) return;

  container.classList.remove('is-hit');
  void container.offsetWidth; // reflow
  container.classList.add('is-hit');

  const onHitEnd = () => {
    container.classList.remove('is-hit');
    container.removeEventListener('animationend', onHitEnd);
    hitDebounceTimer = null;
  };
  container.addEventListener('animationend', onHitEnd, { once: true });

  // Safety fallback in case animationend doesn't fire
  hitDebounceTimer = setTimeout(() => {
    container.classList.remove('is-hit');
    hitDebounceTimer = null;
  }, 800);
}

/* Attach hit-trigger listeners to all interactive inputs */
function wireHitListeners() {
  const allInputs = document.querySelectorAll(
    'input[type="number"], input[type="range"]'
  );
  allInputs.forEach(el => {
    el.addEventListener('input',  triggerAndCalculate);
    el.addEventListener('change', triggerAndCalculate);
  });
}

function triggerAndCalculate() {
  triggerHit();
  calculate();
}


/* ═══════════════════════════════════════════════════════════════════════════
   7. GENDER TOGGLE
   ═══════════════════════════════════════════════════════════════════════════ */

[btnMale, btnFemale].forEach(btn => {
  btn.addEventListener('click', () => {
    state.gender = btn.getAttribute('data-gender');
    btnMale.classList.toggle('active',   state.gender === 'male');
    btnFemale.classList.toggle('active', state.gender === 'female');
    triggerHit();
    calculate();
  });
});


/* ═══════════════════════════════════════════════════════════════════════════
   8. UNIT TOGGLES — HEIGHT
   ═══════════════════════════════════════════════════════════════════════════ */

heightUnitPill.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', () => {
    const unit = btn.getAttribute('data-unit');
    if (unit === state.heightUnit) return;

    // Convert existing value
    if (unit === 'ft') {
      const cm = parseFloat(inputHeightCm.value) || 0;
      const totalIn = cm / 2.54;
      const ft = Math.floor(totalIn / 12);
      const inches = Math.round(totalIn % 12);
      inputHeightFt.value = ft || '';
      inputHeightIn.value = inches || '';
    } else {
      const ft = parseFloat(inputHeightFt.value) || 0;
      const inches = parseFloat(inputHeightIn.value) || 0;
      inputHeightCm.value = Math.round((ft * 12 + inches) * 2.54) || '';
    }

    state.heightUnit = unit;

    // Update pill active states
    heightUnitPill.querySelectorAll('button').forEach(b =>
      b.classList.toggle('active', b.getAttribute('data-unit') === unit)
    );

    // Show/hide input rows
    heightInputRowCm.style.display = unit === 'cm' ? '' : 'none';
    heightInputRowFt.style.display = unit === 'ft' ? '' : 'none';

    triggerHit();
    calculate();
  });
});


/* ═══════════════════════════════════════════════════════════════════════════
   9. UNIT TOGGLES — WEIGHT
   ═══════════════════════════════════════════════════════════════════════════ */

weightUnitPill.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', () => {
    const unit = btn.getAttribute('data-unit');
    if (unit === state.weightUnit) return;

    // Convert current weight
    const currentWeight = parseFloat(inputWeight.value) || 0;
    const currentGoal   = parseFloat(inputGoalWeight.value) || 0;

    if (unit === 'lbs') {
      inputWeight.value     = currentWeight > 0 ? fmt(currentWeight * 2.20462, 1) : '';
      inputGoalWeight.value = currentGoal   > 0 ? fmt(currentGoal   * 2.20462, 1) : '';
    } else {
      inputWeight.value     = currentWeight > 0 ? fmt(currentWeight / 2.20462, 1) : '';
      inputGoalWeight.value = currentGoal   > 0 ? fmt(currentGoal   / 2.20462, 1) : '';
    }

    state.weightUnit = unit;

    // Update pill active states
    weightUnitPill.querySelectorAll('button').forEach(b =>
      b.classList.toggle('active', b.getAttribute('data-unit') === unit)
    );

    // Update suffix labels
    weightSuffix.textContent    = unit;
    goalWeightSuffix.textContent = unit;

    triggerHit();
    calculate();
  });
});


/* ═══════════════════════════════════════════════════════════════════════════
   10. WORKOUT DAYS SLIDER
   ═══════════════════════════════════════════════════════════════════════════ */

function updateSliderProgress() {
  const val = parseInt(daysSlider.value);
  const pct = ((val - daysSlider.min) / (daysSlider.max - daysSlider.min)) * 100;
  daysSlider.style.setProperty('--prog', `${pct}%`);
  daysVal.textContent = val;
  state.workoutDays = val;
}

daysSlider.addEventListener('input', () => {
  updateSliderProgress();
  triggerHit();
  calculate();
});


/* ═══════════════════════════════════════════════════════════════════════════
   11. INTENSITY BUTTONS
   ═══════════════════════════════════════════════════════════════════════════ */

intensityBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    intensityBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.intensity = btn.getAttribute('data-intensity');
    triggerHit();
    calculate();
  });
});


/* ═══════════════════════════════════════════════════════════════════════════
   12. MANUAL CALORIE OVERRIDE (rest / workout inputs)
   ═══════════════════════════════════════════════════════════════════════════ */

[inputRestKcal, inputWorkoutKcal].forEach(el => {
  el.addEventListener('input', () => {
    triggerHit();
    updateDeficitBadges();
    updateMacros();
    updateResultsPanel();
    updateCharts();
    updateTimeline();
  });
});


/* ═══════════════════════════════════════════════════════════════════════════
   13. CALCULATE BUTTON
   ═══════════════════════════════════════════════════════════════════════════ */

btnCalculate.addEventListener('click', () => {
  calculate();
  triggerHit();

  // Switch to results tab after calculate
  if (!state.calculatedOnce) {
    setTimeout(() => switchTab('results'), 180);
  }
  state.calculatedOnce = true;

  // Pop-in animation on metric cards
  metricCards.forEach((card, i) => {
    card.classList.remove('pop-in');
    void card.offsetWidth;
    card.style.animationDelay = `${i * 55}ms`;
    card.classList.add('pop-in');
    card.addEventListener('animationend', () => {
      card.classList.remove('pop-in');
      card.style.animationDelay = '';
    }, { once: true });
  });
});


/* ═══════════════════════════════════════════════════════════════════════════
   14. CORE MATH — MIFFLIN-ST JEOR
   ═══════════════════════════════════════════════════════════════════════════ */

function getHeightCm() {
  if (state.heightUnit === 'cm') {
    return parseFloat(inputHeightCm.value) || 0;
  } else {
    const ft = parseFloat(inputHeightFt.value) || 0;
    const inches = parseFloat(inputHeightIn.value) || 0;
    return (ft * 12 + inches) * 2.54;
  }
}

function getWeightKg() {
  const w = parseFloat(inputWeight.value) || 0;
  return state.weightUnit === 'lbs' ? w / 2.20462 : w;
}

function getGoalWeightKg() {
  const g = parseFloat(inputGoalWeight.value) || 0;
  return state.weightUnit === 'lbs' ? g / 2.20462 : g;
}

function calcBMR(weightKg, heightCm, age, gender) {
  // Mifflin-St Jeor
  const base = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  return gender === 'male' ? base + 5 : base - 161;
}

function calcBMI(weightKg, heightCm) {
  if (!heightCm) return 0;
  return weightKg / Math.pow(heightCm / 100, 2);
}

function getBMICategory(bmi) {
  if (bmi < 18.5) return { label: 'Underweight', color: 'var(--blue)' };
  if (bmi < 25)   return { label: 'Normal',      color: 'var(--green)' };
  if (bmi < 30)   return { label: 'Overweight',  color: '#FFA726' };
  return              { label: 'Obese',       color: 'var(--red)' };
}

function calculate() {
  const age      = parseFloat(inputAge.value) || 0;
  const weightKg = getWeightKg();
  const heightCm = getHeightCm();
  const goalKg   = getGoalWeightKg();

  // ── BMI ──
  if (weightKg > 0 && heightCm > 0) {
    const bmi  = calcBMI(weightKg, heightCm);
    const cat  = getBMICategory(bmi);
    bmiValue.textContent    = fmt(bmi, 1);
    bmiValue.style.color    = cat.color;
    bmiCategory.textContent = cat.label;
    bmiCategory.style.color = cat.color;
  } else {
    bmiValue.textContent    = '—';
    bmiCategory.textContent = '—';
    bmiValue.style.color    = '';
    bmiCategory.style.color = '';
  }

  if (!age || !weightKg || !heightCm) {
    // Not enough data yet — clear display
    tdeeValue.textContent  = '—';
    tdeeWeekly.textContent = '—';
    tdeeBmrVal.textContent = '—';
    return;
  }

  // ── BMR ──
  const bmr = calcBMR(weightKg, heightCm, age, state.gender);
  state.bmr = bmr;
  tdeeBmrVal.textContent = fmtInt(bmr);

  // ── TDEE ──
  const multiplier = INTENSITY_MULTIPLIERS[state.intensity] ?? 1.55;
  const tdee = bmr * multiplier;
  state.tdee = tdee;

  tdeeValue.textContent  = fmtInt(tdee);
  tdeeWeekly.textContent = fmtInt(tdee * 7);

  // ── Default calorie targets (if user hasn't overridden) ──
  // Rest day: TDEE - 500 kcal deficit
  // Workout day: TDEE - 200 kcal (softer deficit on active days)
  const restDeficit    = 500;
  const workoutDeficit = 250;

  const autoRestKcal    = Math.max(1000, tdee - restDeficit);
  const autoWorkoutKcal = Math.max(1200, tdee - workoutDeficit);

  // Only auto-populate if inputs are empty / show placeholder
  if (!inputRestKcal.value || inputRestKcal.dataset.auto === 'true') {
    inputRestKcal.value = Math.round(autoRestKcal);
    inputRestKcal.dataset.auto = 'true';
  }
  if (!inputWorkoutKcal.value || inputWorkoutKcal.dataset.auto === 'true') {
    inputWorkoutKcal.value = Math.round(autoWorkoutKcal);
    inputWorkoutKcal.dataset.auto = 'true';
  }

  state.weightKg     = weightKg;
  state.goalWeightKg = goalKg;
  state.restKcal     = parseFloat(inputRestKcal.value) || autoRestKcal;
  state.workoutKcal  = parseFloat(inputWorkoutKcal.value) || autoWorkoutKcal;

  updateDeficitBadges();
  updateMacros();
  updateResultsPanel();
  updateCharts();
  updateTimeline();

  // Flash calorie-target cards
  calorieTgtCards.forEach(card => {
    card.classList.remove('updated');
    void card.offsetWidth;
    card.classList.add('updated');
    card.addEventListener('animationend', () => card.classList.remove('updated'), { once: true });
  });
}


/* ─── Deficit badges ─────────────────────────────────────────────────────── */
function updateDeficitBadges() {
  const tdee = state.tdee;
  if (!tdee) return;

  const restKcal    = parseFloat(inputRestKcal.value)    || state.restKcal;
  const workoutKcal = parseFloat(inputWorkoutKcal.value) || state.workoutKcal;

  state.restKcal    = restKcal;
  state.workoutKcal = workoutKcal;

  const restDef    = Math.round(tdee - restKcal);
  const workoutDef = Math.round(tdee - workoutKcal);

  restDeficitBadge.textContent    = `${restDef >= 0 ? '-' : '+'}${Math.abs(restDef)} deficit`;
  workoutDeficitBadge.textContent = `${workoutDef >= 0 ? '-' : '+'}${Math.abs(workoutDef)} deficit`;

  // Warning: below safe threshold
  const minKcal = state.gender === 'female' ? 1200 : 1500;
  const showWarn = restKcal < minKcal || workoutKcal < minKcal;
  warningBox.style.display = showWarn ? 'block' : 'none';
}


/* ─── Macros ─────────────────────────────────────────────────────────────── */
function updateMacros() {
  const restKcal = parseFloat(inputRestKcal.value) || state.restKcal;
  if (!restKcal || !state.weightKg) return;

  // Protein: 2.2g per kg bodyweight
  const proteinG = state.weightKg * 2.2;
  const proteinKcal = proteinG * 4;

  // Fats: 25% of total calories
  const fatKcal = restKcal * 0.25;
  const fatG    = fatKcal / 9;

  // Carbs: remainder
  const carbKcal = Math.max(0, restKcal - proteinKcal - fatKcal);
  const carbG    = carbKcal / 4;

  const total = proteinKcal + fatKcal + carbKcal;

  const protPct = total > 0 ? (proteinKcal / total) * 100 : 0;
  const fatPct  = total > 0 ? (fatKcal     / total) * 100 : 0;
  const carbPct = total > 0 ? (carbKcal    / total) * 100 : 0;

  macroBarProtein.style.width = `${protPct.toFixed(1)}%`;
  macroBarCarbs.style.width   = `${carbPct.toFixed(1)}%`;
  macroBarFats.style.width    = `${fatPct.toFixed(1)}%`;

  macroValProtein.textContent = `${Math.round(proteinG)}g`;
  macroValCarbs.textContent   = `${Math.round(carbG)}g`;
  macroValFats.textContent    = `${Math.round(fatG)}g`;
}


/* ─── Results panel ──────────────────────────────────────────────────────── */
function updateResultsPanel() {
  if (!state.tdee) return;

  const days    = state.workoutDays;
  const restDays = 7 - days;

  const restKcal    = parseFloat(inputRestKcal.value)    || state.restKcal;
  const workoutKcal = parseFloat(inputWorkoutKcal.value) || state.workoutKcal;

  const restDeficit    = state.tdee - restKcal;
  const workoutDeficit = state.tdee - workoutKcal;

  // Weekly deficit = sum of all days
  const weeklyDeficit = (restDeficit * restDays) + (workoutDeficit * days);
  const dailyDeficitAvg = weeklyDeficit / 7;

  // Fat loss: 7700 kcal ≈ 1 kg fat
  state.weeklyLossKg = weeklyDeficit / 7700;

  const lossPerWeek  = state.weeklyLossKg;
  const kgToLose     = state.weightKg - state.goalWeightKg;
  const weeksToGoal  = kgToLose > 0 && lossPerWeek > 0
    ? Math.ceil(kgToLose / lossPerWeek)
    : null;

  // Populate result metrics
  setMetricValue(resDailyDeficit,  fmtInt(dailyDeficitAvg) + ' kcal');
  setMetricValue(resWeeklyDeficit, fmtInt(weeklyDeficit) + ' kcal');
  setMetricValue(resFatLossWeek,   fmt(lossPerWeek, 2) + ' kg');
  setMetricValue(resTimeToGoal,    weeksToGoal != null ? `${weeksToGoal} wks` : '—');

  // Insight text
  updateInsight(dailyDeficitAvg, lossPerWeek, weeksToGoal);
}

function setMetricValue(el, val) {
  el.textContent = val;
  el.classList.remove('value-flash');
  void el.offsetWidth;
  el.classList.add('value-flash');
  el.addEventListener('animationend', () => el.classList.remove('value-flash'), { once: true });
}

function updateInsight(dailyDef, lossPerWeek, weeks) {
  let msg = '';

  if (dailyDef <= 0) {
    msg = 'Your calorie targets are above TDEE — this is a <strong>surplus</strong>, not a deficit. Lower your target calories to create a fat-loss phase.';
  } else if (lossPerWeek < 0.1) {
    msg = 'Your deficit is very small. You\'ll lose weight gradually — great for muscle retention. Consider a slightly larger deficit for faster results.';
  } else if (lossPerWeek > 1.2) {
    msg = '⚠️ This deficit is aggressive. Fat loss above 1 kg/week risks muscle loss. Consider a more moderate target of 0.5–0.8 kg/week for athletes.';
  } else if (weeks && weeks <= 8) {
    msg = `Excellent pace! At ${fmt(lossPerWeek, 2)} kg/week you'll hit your goal in approximately <strong>${weeks} weeks</strong>. Keep training hard.`;
  } else if (weeks) {
    msg = `Steady, sustainable progress. You're on track to reach your goal weight in <strong>${weeks} weeks</strong> at ${fmt(lossPerWeek, 2)} kg/week.`;
  } else {
    msg = `Daily deficit of <strong>${fmtInt(dailyDef)} kcal</strong> projects to <strong>${fmt(lossPerWeek, 2)} kg</strong> fat loss per week. Set a goal weight to see your full timeline.`;
  }

  insightText.innerHTML = msg;
}


/* ═══════════════════════════════════════════════════════════════════════════
   15. TIMELINE GENERATION
   ═══════════════════════════════════════════════════════════════════════════ */

function updateTimeline() {
  if (!state.weightKg || !state.weeklyLossKg) return;

  const WEEKS = 12;
  const startWeight = state.weightKg;
  const lossPerWeek = state.weeklyLossKg;

  const rows = [];
  for (let w = 1; w <= WEEKS; w++) {
    const projected = Math.max(0, startWeight - lossPerWeek * w);
    rows.push({ week: w, weight: projected });
  }

  // Max weight loss for bar % calculation
  const maxLoss = startWeight - rows[WEEKS - 1].weight;

  timelineList.innerHTML = '';

  rows.forEach((row, i) => {
    const loss = startWeight - row.weight;
    const barPct = maxLoss > 0 ? (loss / maxLoss) * 100 : 0;
    const delta  = `-${fmt(loss, 2)} kg`;

    const tr = document.createElement('div');
    tr.className = 'timeline-row';
    tr.innerHTML = `
      <div class="timeline-week">WEEK ${row.week}</div>
      <div class="timeline-bar-wrap">
        <div class="timeline-bar" style="width:0%;"></div>
      </div>
      <div class="timeline-weight">${fmt(row.weight, 1)} kg</div>
      <div class="timeline-delta">${delta}</div>
    `;
    timelineList.appendChild(tr);

    // Animate bar in with stagger
    const bar = tr.querySelector('.timeline-bar');
    setTimeout(() => {
      bar.style.width = `${barPct.toFixed(1)}%`;
    }, i * 30 + 50);
  });
}


/* ═══════════════════════════════════════════════════════════════════════════
   16. CHART.JS INITIALIZATION & UPDATE
   ═══════════════════════════════════════════════════════════════════════════ */

/* Shared dark-theme Chart.js defaults */
Chart.defaults.color = '#555555';
Chart.defaults.font.family = "'DM Mono', monospace";
Chart.defaults.font.size   = 10;

const CHART_COLORS = {
  red:       '#E53935',
  redDim:    'rgba(229,57,53,0.18)',
  redGlow:   'rgba(229,57,53,0.45)',
  green:     '#4CAF50',
  greenDim:  'rgba(76,175,80,0.18)',
  blue:      '#448AFF',
  blueDim:   'rgba(68,138,255,0.18)',
  blueGlow:  'rgba(68,138,255,0.45)',
  grid:      'rgba(255,255,255,0.04)',
  border:    'rgba(255,255,255,0.06)',
  text2:     '#999999',
  text3:     '#555555',
};

/* ── 16a. Bar chart: Weekly Calorie Cycle ──────────────────────────────── */
function initChartCalories() {
  const ctx = document.getElementById('chart-calories').getContext('2d');

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const data = Array(7).fill(0);

  chartCalories = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: days,
      datasets: [
        {
          label: 'Calories',
          data: data,
          backgroundColor: data.map(() => CHART_COLORS.redDim),
          borderColor:     data.map(() => CHART_COLORS.red),
          borderWidth: 1.5,
          borderRadius: 4,
          borderSkipped: false,
        },
        {
          label: 'TDEE',
          data: Array(7).fill(0),
          type: 'line',
          borderColor: CHART_COLORS.text3,
          borderWidth: 1.5,
          borderDash: [5, 3],
          pointRadius: 0,
          tension: 0,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(13,13,13,0.92)',
          borderColor: CHART_COLORS.border,
          borderWidth: 1,
          titleColor: CHART_COLORS.red,
          bodyColor: '#ccc',
          padding: 10,
          callbacks: {
            label: ctx => ` ${Math.round(ctx.parsed.y).toLocaleString()} kcal`,
          }
        },
      },
      scales: {
        x: {
          grid: { color: CHART_COLORS.grid, drawBorder: false },
          ticks: { color: CHART_COLORS.text3 },
        },
        y: {
          grid: { color: CHART_COLORS.grid, drawBorder: false },
          ticks: {
            color: CHART_COLORS.text3,
            callback: v => v > 0 ? `${(v/1000).toFixed(1)}k` : '0',
          },
          beginAtZero: false,
        },
      }
    }
  });
}

/* ── 16b. Doughnut chart: Daily Deficit Balance ───────────────────────── */
function initChartDeficit() {
  const ctx = document.getElementById('chart-deficit').getContext('2d');

  chartDeficit = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Deficit', 'Remaining'],
      datasets: [{
        data: [0, 100],
        backgroundColor: [CHART_COLORS.red, 'rgba(255,255,255,0.04)'],
        borderColor:     [CHART_COLORS.red, CHART_COLORS.border],
        borderWidth: 1.5,
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      animation: { duration: 600, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(13,13,13,0.92)',
          borderColor: CHART_COLORS.border,
          borderWidth: 1,
          titleColor: CHART_COLORS.red,
          bodyColor: '#ccc',
          padding: 10,
          callbacks: {
            label: ctx => ` ${Math.round(ctx.parsed).toLocaleString()} kcal`,
          }
        },
      }
    }
  });
}

/* ── 16c. Line chart: Body Weight Trajectory ──────────────────────────── */
function initChartTimeline() {
  const ctx = document.getElementById('chart-timeline').getContext('2d');

  const labels = Array.from({ length: 13 }, (_, i) => i === 0 ? 'Now' : `W${i}`);
  const data   = Array(13).fill(null);

  // Gradient fill for the area under the line
  const gradient = ctx.createLinearGradient(0, 0, 0, 240);
  gradient.addColorStop(0,   'rgba(229,57,53,0.30)');
  gradient.addColorStop(0.6, 'rgba(229,57,53,0.06)');
  gradient.addColorStop(1,   'rgba(229,57,53,0)');

  chartTimeline = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Weight (kg)',
        data,
        borderColor: CHART_COLORS.red,
        borderWidth: 2,
        backgroundColor: gradient,
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: CHART_COLORS.red,
        pointBorderColor: '#0D0D0D',
        pointBorderWidth: 2,
        pointHoverRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 700, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(13,13,13,0.92)',
          borderColor: CHART_COLORS.border,
          borderWidth: 1,
          titleColor: CHART_COLORS.text2,
          bodyColor: CHART_COLORS.red,
          padding: 10,
          callbacks: {
            label: ctx => ` ${(ctx.parsed.y).toFixed(1)} kg`,
          }
        },
      },
      scales: {
        x: {
          grid: { color: CHART_COLORS.grid, drawBorder: false },
          ticks: { color: CHART_COLORS.text3 },
        },
        y: {
          grid: { color: CHART_COLORS.grid, drawBorder: false },
          ticks: {
            color: CHART_COLORS.text3,
            callback: v => `${v.toFixed(0)} kg`,
          },
        },
      }
    }
  });
}


/* ── 16d. updateCharts — smooth data injection ─────────────────────────── */
function updateCharts() {
  if (!state.tdee || !state.restKcal) return;

  const days = state.workoutDays;

  // Build 7-day pattern: workout days = days from Mon onwards
  const weekPattern = Array.from({ length: 7 }, (_, i) => i < days);

  /* ── Bar chart: calories per day ── */
  if (chartCalories) {
    const calData  = weekPattern.map(isWorkout =>
      Math.round(isWorkout ? state.workoutKcal : state.restKcal)
    );
    const tdeeData = Array(7).fill(Math.round(state.tdee));

    chartCalories.data.datasets[0].data            = calData;
    chartCalories.data.datasets[0].backgroundColor = calData.map(() => CHART_COLORS.redDim);
    chartCalories.data.datasets[0].borderColor     = calData.map(() => CHART_COLORS.red);
    chartCalories.data.datasets[1].data            = tdeeData;
    chartCalories.update();
  }

  /* ── Doughnut chart: daily deficit balance ── */
  if (chartDeficit) {
    const restDef    = Math.max(0, state.tdee - state.restKcal);
    const remaining  = Math.max(0, state.restKcal);
    chartDeficit.data.datasets[0].data = [Math.round(restDef), Math.round(remaining)];
    chartDeficit.update();
  }

  /* ── Line chart: weight trajectory ── */
  if (chartTimeline && state.weightKg && state.weeklyLossKg) {
    const pts = [state.weightKg];
    for (let w = 1; w <= 12; w++) {
      pts.push(+(state.weightKg - state.weeklyLossKg * w).toFixed(2));
    }
    chartTimeline.data.datasets[0].data = pts;

    // Pad Y axis nicely
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const pad = (max - min) * 0.15 || 2;
    chartTimeline.options.scales.y.min = +(min - pad).toFixed(0);
    chartTimeline.options.scales.y.max = +(max + pad).toFixed(0);

    chartTimeline.update();
  }
}


/* ═══════════════════════════════════════════════════════════════════════════
   17. RESET LOGIC — clear auto flags when user manually edits
   ═══════════════════════════════════════════════════════════════════════════ */

[inputRestKcal, inputWorkoutKcal].forEach(el => {
  el.addEventListener('keydown', () => {
    el.dataset.auto = 'false';
  });
  el.addEventListener('focus', () => {
    el.dataset.auto = 'false';
  });
});


/* ═══════════════════════════════════════════════════════════════════════════
   18. INITIALISATION
   ═══════════════════════════════════════════════════════════════════════════ */

function init() {
  // Init slider display
  updateSliderProgress();

  // Mark initial auto flag
  inputRestKcal.dataset.auto    = 'true';
  inputWorkoutKcal.dataset.auto = 'true';

  // Wire hit listeners on number inputs and range
  wireHitListeners();

  // Also wire standard number inputs in the panel left
  [inputAge, inputHeightCm, inputHeightFt, inputHeightIn, inputWeight, inputGoalWeight].forEach(el => {
    el.addEventListener('input', triggerAndCalculate);
  });

  // Init charts
  initChartCalories();
  initChartDeficit();
  initChartTimeline();

  // Ensure correct initial tab state
  switchTab('inputs');

  // Run an initial calculate if any pre-filled values exist
  const hasInitialData = inputAge.value || inputHeightCm.value || inputWeight.value;
  if (hasInitialData) {
    calculate();
  }
}

// Kick off once DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
