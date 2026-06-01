/* ═══════════════════════════════════════════════════════════════════════════
   SCRIPT.JS — Metabolic Engine Calculator
   Calorie Deficit & Weight Loss · Boxers & Athletes
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

/* ─── 1. GLOBAL STATE ──────────────────────────────────────────────────────── */
const state = {
  gender:    'male',
  heightUnit: 'ft',
  weightUnit: 'kg',
  workoutDays: 4,
  
  // Dynamic Maintenance & Targets
  bmr:          0,
  tdeeRest:     0,
  tdeeWorkout:  0,
  tdeeWeekly:   0,
  restKcal:     0,
  workoutKcal:  0,
  
  weightKg:     0,
  goalWeightKg: 0,
  weeklyLossKg: 0,
  weeklyDeficit: 0,
  calculatedOnce: false,
};

/* ─── 2. DOM REFERENCES ────────────────────────────────────────────────────── */
// Tabs & panels
const tabs          = document.querySelectorAll('.tab');
const tabPanels     = document.querySelectorAll('.tab-panel');
const tiltWrappers  = document.querySelectorAll('.tilt-wrapper');

// Scenes
const bagContainer      = document.querySelector('.bag-container');
const glovesContainer   = document.querySelector('.gloves-container');
const speedbagContainer = document.querySelector('.speedbag-container');
const bagScene          = document.querySelector('.bag-scene');
const glovesScene       = document.querySelector('.gloves-scene');
const speedbagScene     = document.querySelector('.speedbag-scene');

// Form Inputs
const btnMale           = document.getElementById('btn-male');
const btnFemale         = document.getElementById('btn-female');
const inputAge          = document.getElementById('input-age');
const ageSliderVal      = document.getElementById('age-slider-val');
const heightUnitPill    = document.getElementById('height-unit-pill');
const heightInputRowCm  = document.getElementById('height-input-row');
const heightInputRowFt  = document.getElementById('height-input-row-ft');
const inputHeightCm     = document.getElementById('input-height-cm');
const inputHeightFt     = document.getElementById('input-height-ft');
const inputHeightIn     = document.getElementById('input-height-in');
const weightUnitPill    = document.getElementById('weight-unit-pill');
const inputWeight       = document.getElementById('input-weight');
const inputGoalWeight   = document.getElementById('input-goal-weight');
const weightSuffix      = document.getElementById('weight-suffix');
const goalWeightSuffix  = document.getElementById('goal-weight-suffix');
const bmiValue          = document.getElementById('bmi-value');
const bmiCategory       = document.getElementById('bmi-category');

// Activity Dropdowns
const daysSlider         = document.getElementById('days-slider');
const daysVal            = document.getElementById('days-slider-val');
const baseActivitySelect = document.getElementById('base-activity');
const workoutBurnSelect  = document.getElementById('workout-burn');

// TDEE Output
const tdeeRestVal    = document.getElementById('tdee-rest-val');
const tdeeWorkoutVal = document.getElementById('tdee-workout-val');
const tdeeBmrVal     = document.getElementById('tdee-bmr-val');
const tdeeWeeklyVal  = document.getElementById('tdee-weekly-val');
const warningBox     = document.getElementById('warning-box');

// Calorie targets
const inputRestKcal       = document.getElementById('input-rest-kcal');
const inputWorkoutKcal    = document.getElementById('input-workout-kcal');
const restDeficitBadge    = document.getElementById('rest-deficit-badge');
const workoutDeficitBadge = document.getElementById('workout-deficit-badge');

// Macros
const macroBarProtein = document.getElementById('macro-bar-protein');
const macroBarCarbs   = document.getElementById('macro-bar-carbs');
const macroBarFats    = document.getElementById('macro-bar-fats');
const macroValProtein = document.getElementById('macro-val-protein');
const macroValCarbs   = document.getElementById('macro-val-carbs');
const macroValFats    = document.getElementById('macro-val-fats');

// Results & Timeline
const btnCalculate     = document.getElementById('btn-calculate');
const resDailyDeficit  = document.getElementById('res-daily-deficit');
const resWeeklyDeficit = document.getElementById('res-weekly-deficit');
const resFatLossWeek   = document.getElementById('res-fat-loss-week');
const resTimeToGoal    = document.getElementById('res-time-to-goal');
const insightText      = document.getElementById('insight-text');
const timelineList     = document.getElementById('timeline-list');
const metricCards      = document.querySelectorAll('.metric-card');
const calorieTgtCards  = document.querySelectorAll('.calorie-target');

/* ─── 3. CHART INSTANCES ───────────────────────────────────────────────────── */
let chartCalories = null;
let chartDeficit  = null;
let chartTimeline = null;

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

function getActiveContainer() {
  const tab = document.body.getAttribute('data-tab');
  if (tab === 'inputs')   return bagContainer;
  if (tab === 'results')  return glovesContainer;
  if (tab === 'timeline') return speedbagContainer;
  return bagContainer;
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAB NAVIGATION
   ═══════════════════════════════════════════════════════════════════════════ */
const TAB_SCENE_MAP = {
  inputs:   { scene: bagScene,      container: bagContainer },
  results:  { scene: glovesScene,   container: glovesContainer },
  timeline: { scene: speedbagScene, container: speedbagContainer },
};

function switchTab(tabName) {
  tabs.forEach(t => {
    const isActive = t.getAttribute('data-tab') === tabName;
    t.classList.toggle('active', isActive);
    t.setAttribute('aria-selected', isActive);
  });

  tabPanels.forEach(p => {
    const isActive = p.id === `tab-${tabName}`;
    p.classList.toggle('active', isActive);
  });

  document.body.setAttribute('data-tab', tabName);

  Object.entries(TAB_SCENE_MAP).forEach(([name, { scene, container }]) => {
    const isThis = name === tabName;
    scene.classList.toggle('tab-active', isThis);

    if (isThis) {
      container.classList.remove('is-hit');
      container.classList.remove('enter-scene');
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

tabs.forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.getAttribute('data-tab')));
});


/* ═══════════════════════════════════════════════════════════════════════════
   HIT ANIMATIONS
   ═══════════════════════════════════════════════════════════════════════════ */
let hitTimeout = null;
function triggerHit() {
  const container = getActiveContainer();
  if (!container) return;

  container.classList.remove('is-hit');
  if (hitTimeout) clearTimeout(hitTimeout);
  
  void container.offsetWidth; 
  container.classList.add('is-hit');

  hitTimeout = setTimeout(() => {
    container.classList.remove('is-hit');
    hitTimeout = null;
  }, 5500); 
}

function triggerAndCalculate() {
  triggerHit();
  calculate();
}

function wireHitListeners() {
  // Normal inputs: hit bag and calculate immediately
  document.querySelectorAll('input[type="number"], select').forEach(el => {
    el.addEventListener('input', triggerAndCalculate);
  });

  // Sliders: Calculate numbers live while dragging, but only hit the bag ONCE when released
  document.querySelectorAll('input[type="range"]').forEach(el => {
    el.addEventListener('input', calculate);     // Live math update
    el.addEventListener('change', triggerHit);   // Single physical hit on release
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   TOGGLES & SLIDERS
   ═══════════════════════════════════════════════════════════════════════════ */
[btnMale, btnFemale].forEach(btn => {
  btn.addEventListener('click', () => {
    state.gender = btn.getAttribute('data-gender');
    btnMale.classList.toggle('active', state.gender === 'male');
    btnFemale.classList.toggle('active', state.gender === 'female');
    triggerAndCalculate();
  });
});

heightUnitPill.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', () => {
    const unit = btn.getAttribute('data-unit');
    if (unit === state.heightUnit) return;
    if (unit === 'ft') {
      const cm = parseFloat(inputHeightCm.value) || 0;
      const totalIn = cm / 2.54;
      inputHeightFt.value = Math.floor(totalIn / 12) || '';
      inputHeightIn.value = Math.round(totalIn % 12) || '';
    } else {
      const ft = parseFloat(inputHeightFt.value) || 0;
      const inches = parseFloat(inputHeightIn.value) || 0;
      inputHeightCm.value = Math.round((ft * 12 + inches) * 2.54) || '';
    }
    state.heightUnit = unit;
    heightUnitPill.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.getAttribute('data-unit') === unit));
    heightInputRowCm.style.display = unit === 'cm' ? '' : 'none';
    heightInputRowFt.style.display = unit === 'ft' ? '' : 'none';
    triggerAndCalculate();
  });
});

weightUnitPill.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', () => {
    const unit = btn.getAttribute('data-unit');
    if (unit === state.weightUnit) return;
    const w = parseFloat(inputWeight.value) || 0;
    const g = parseFloat(inputGoalWeight.value) || 0;
    const mult = unit === 'lbs' ? 2.20462 : 1 / 2.20462;
    inputWeight.value = w > 0 ? fmt(w * mult, 1) : '';
    inputGoalWeight.value = g > 0 ? fmt(g * mult, 1) : '';
    state.weightUnit = unit;
    weightUnitPill.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.getAttribute('data-unit') === unit));
    weightSuffix.textContent = unit;
    goalWeightSuffix.textContent = unit;
    triggerAndCalculate();
  });
});

inputAge.addEventListener('input', () => {
  const val = parseInt(inputAge.value);
  const min = parseInt(inputAge.min);
  const max = parseInt(inputAge.max);
  inputAge.style.setProperty('--prog', `${((val - min) / (max - min)) * 100}%`);
  ageSliderVal.textContent = val;
});

daysSlider.addEventListener('input', () => {
  const val = parseInt(daysSlider.value);
  daysSlider.style.setProperty('--prog', `${(val / 7) * 100}%`);
  daysVal.textContent = val;
  state.workoutDays = val;
  calculate(); // Runs the math silently without hitting the bag
});

btnCalculate.addEventListener('click', () => {
  calculate();
  triggerHit();
  if (!state.calculatedOnce) setTimeout(() => switchTab('results'), 180);
  state.calculatedOnce = true;
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
   CORE MATH & LOGIC
   ═══════════════════════════════════════════════════════════════════════════ */
function getHeightCm() {
  if (state.heightUnit === 'cm') return parseFloat(inputHeightCm.value) || 0;
  const ft = parseFloat(inputHeightFt.value) || 0;
  const inches = parseFloat(inputHeightIn.value) || 0;
  return (ft * 12 + inches) * 2.54;
}

function getWeightKg() {
  const w = parseFloat(inputWeight.value) || 0;
  return state.weightUnit === 'lbs' ? w / 2.20462 : w;
}

function calculate() {
  const age = parseFloat(inputAge.value) || 0;
  const weightKg = getWeightKg();
  const heightCm = getHeightCm();
  const goalKg = state.weightUnit === 'lbs' ? (parseFloat(inputGoalWeight.value) || 0) / 2.20462 : parseFloat(inputGoalWeight.value) || 0;

  // BMI
  if (weightKg > 0 && heightCm > 0) {
    const bmi = weightKg / Math.pow(heightCm / 100, 2);
    let cat = { label: 'Obese', color: 'var(--red)' };
    if (bmi < 18.5) cat = { label: 'Underweight', color: 'var(--blue)' };
    else if (bmi < 25) cat = { label: 'Normal', color: 'var(--green)' };
    else if (bmi < 30) cat = { label: 'Overweight', color: '#FFA726' };
    bmiValue.textContent = fmt(bmi, 1);
    bmiValue.style.color = cat.color;
    bmiCategory.textContent = cat.label;
    bmiCategory.style.color = cat.color;
  }

  if (!age || !weightKg || !heightCm) {
    if(tdeeRestVal) tdeeRestVal.textContent = '—';
    if(tdeeWorkoutVal) tdeeWorkoutVal.textContent = '—';
    if(tdeeWeeklyVal) tdeeWeeklyVal.textContent = '—';
    if(tdeeBmrVal) tdeeBmrVal.textContent = '—';
    return;
  }

  // BMR Calculation (Mifflin-St Jeor)
  const baseBMR = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  const bmr = state.gender === 'male' ? baseBMR + 5 : baseBMR - 161;
  state.bmr = bmr;
  
  // ─── SPLIT TDEE CALCULATION ───
  const baseMult = parseFloat(baseActivitySelect.value) || 1.2;
  const burnAdd = parseFloat(workoutBurnSelect.value) || 0;

  state.tdeeRest = bmr * baseMult;
  state.tdeeWorkout = state.tdeeRest + burnAdd;
  
  const days = state.workoutDays;
  const restDays = 7 - days;
  state.tdeeWeekly = (state.tdeeRest * restDays) + (state.tdeeWorkout * days);

  if(tdeeBmrVal) tdeeBmrVal.textContent = fmtInt(bmr);
  if(tdeeRestVal) tdeeRestVal.textContent = fmtInt(state.tdeeRest);
  if(tdeeWorkoutVal) tdeeWorkoutVal.textContent = fmtInt(state.tdeeWorkout);
  if(tdeeWeeklyVal) tdeeWeeklyVal.textContent = fmtInt(state.tdeeWeekly / 7);

  // Targets Auto-Calculate
  const autoRestTarget = Math.max(1200, state.tdeeRest - 400);
  const autoWorkoutTarget = Math.max(1500, state.tdeeWorkout - 200);

  // Only auto-fill if the user hasn't touched the input yet
  if (inputRestKcal.dataset.auto === 'true') {
    inputRestKcal.value = Math.round(autoRestTarget);
  }
  if (inputWorkoutKcal.dataset.auto === 'true') {
    inputWorkoutKcal.value = Math.round(autoWorkoutTarget);
  }

  // Fallback to 0 if the user completely erases the box so it doesn't crash
  state.restKcal = parseFloat(inputRestKcal.value) || 0;
  state.workoutKcal = parseFloat(inputWorkoutKcal.value) || 0;
  state.weightKg = weightKg;
  state.goalWeightKg = goalKg;

  // Global Deficit Match
  const restDef = state.tdeeRest - state.restKcal;
  const workoutDef = state.tdeeWorkout - state.workoutKcal;
  state.weeklyDeficit = (restDef * restDays) + (workoutDef * days);
  state.weeklyLossKg = state.weeklyDeficit / 7700;

  updateDeficitBadges();
  updateMacros();
  updateResultsPanel();
  updateCharts();
  updateTimeline();

  calorieTgtCards.forEach(card => {
    card.classList.remove('updated');
    void card.offsetWidth;
    card.classList.add('updated');
    card.addEventListener('animationend', () => card.classList.remove('updated'), { once: true });
  });
}

function updateDeficitBadges() {
  if (!state.tdeeRest) return;

  const restDef = Math.round(state.tdeeRest - state.restKcal);
  const workoutDef = Math.round(state.tdeeWorkout - state.workoutKcal);

  restDeficitBadge.textContent = `${restDef >= 0 ? '-' : '+'}${Math.abs(restDef)} deficit`;
  workoutDeficitBadge.textContent = `${workoutDef >= 0 ? '-' : '+'}${Math.abs(workoutDef)} deficit`;

  const minKcal = state.gender === 'female' ? 1200 : 1500;
  warningBox.style.display = (state.restKcal < minKcal || state.workoutKcal < minKcal) ? 'block' : 'none';
}

function updateMacros() {
  const target = state.restKcal;
  if (!target || !state.weightKg) return;
  const pKcal = (state.weightKg * 1.8) * 4;
  const fKcal = target * 0.25;
  const cKcal = Math.max(0, target - pKcal - fKcal);
  const total = pKcal + fKcal + cKcal;

  macroBarProtein.style.width = `${(pKcal/total)*100}%`;
  macroBarCarbs.style.width = `${(cKcal/total)*100}%`;
  macroBarFats.style.width = `${(fKcal/total)*100}%`;

  macroValProtein.textContent = `${Math.round(pKcal/4)}g`;
  macroValCarbs.textContent = `${Math.round(cKcal/4)}g`;
  macroValFats.textContent = `${Math.round(fKcal/9)}g`;
}

function updateResultsPanel() {
  const dailyAvgDef = state.weeklyDeficit / 7;
  const kgToLose = state.weightKg - state.goalWeightKg;
  const weeksToGoal = (kgToLose > 0 && state.weeklyLossKg > 0) ? Math.ceil(kgToLose / state.weeklyLossKg) : null;

  setMetricValue(resDailyDeficit, fmtInt(dailyAvgDef));
  setMetricValue(resWeeklyDeficit, fmtInt(state.weeklyDeficit));
  setMetricValue(resFatLossWeek, fmt(state.weeklyLossKg, 2));
  setMetricValue(resTimeToGoal, weeksToGoal ? `${weeksToGoal} wks` : '—');

  let msg = '';
  if (dailyAvgDef <= 0) msg = 'You are currently in a <strong>surplus</strong>. Lower target calories to lose fat.';
  else if (state.weeklyLossKg > 1.2) msg = '⚠️ Aggressive deficit. High risk of muscle loss. Aim for 0.5–0.8 kg/week.';
  else if (weeksToGoal) msg = `At ${fmt(state.weeklyLossKg, 2)} kg/week, you'll hit your goal in <strong>${weeksToGoal} weeks</strong>. Keep grinding.`;
  else msg = `You are losing <strong>${fmt(state.weeklyLossKg, 2)} kg</strong> per week. Set a goal weight for a full timeline.`;
  insightText.innerHTML = msg;
}

function setMetricValue(el, val) {
  el.textContent = val;
  el.classList.remove('value-flash');
  void el.offsetWidth;
  el.classList.add('value-flash');
}

function updateTimeline() {
  if (!state.weightKg || !state.weeklyLossKg) return;
  const rows = [];
  for (let w = 1; w <= 12; w++) rows.push({ week: w, weight: Math.max(0, state.weightKg - state.weeklyLossKg * w) });
  const maxLoss = state.weightKg - rows[11].weight;
  
  timelineList.innerHTML = '';
  rows.forEach((r, i) => {
    const loss = state.weightKg - r.weight;
    const pct = maxLoss > 0 ? (loss/maxLoss)*100 : 0;
    const div = document.createElement('div');
    div.className = 'timeline-row';
    div.innerHTML = `<div class="timeline-week">Week ${r.week}</div><div class="timeline-bar-wrap"><div class="timeline-bar" style="width:0%"></div></div><div class="timeline-weight">${fmt(r.weight, 1)} kg</div><div class="timeline-delta">-${fmt(loss, 2)} kg</div>`;
    timelineList.appendChild(div);
    setTimeout(() => div.querySelector('.timeline-bar').style.width = `${pct}%`, i * 30 + 50);
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   CHART.JS CONFIGURATION
   ═══════════════════════════════════════════════════════════════════════════ */
Chart.defaults.color = '#555555';
Chart.defaults.font.family = "'DM Mono', monospace";
const C = { red: '#E53935', redDim: 'rgba(229,57,53,0.18)', blue: '#448AFF', border: 'rgba(255,255,255,0.06)', grid: 'rgba(255,255,255,0.04)' };

function initCharts() {
  const ctx1 = document.getElementById('chart-calories').getContext('2d');
  chartCalories = new Chart(ctx1, {
    type: 'bar',
    data: {
      labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
      datasets: [
        { label: 'Intake Target', data: Array(7).fill(0), backgroundColor: C.redDim, borderColor: C.red, borderWidth: 1.5, borderRadius: 4 },
        { label: 'TDEE', data: Array(7).fill(0), type: 'line', borderColor: '#555', borderDash: [5,3], pointRadius: 0, tension: 0 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: C.grid } },
        y: { grid: { color: C.grid }, beginAtZero: false }
      }
    }
  });

  const ctx2 = document.getElementById('chart-deficit').getContext('2d');
  chartDeficit = new Chart(ctx2, {
    type: 'doughnut',
    data: {
      labels: ['Weekly Deficit', 'Weekly Intake'],
      datasets: [{ data: [0, 100], backgroundColor: [C.red, 'rgba(255,255,255,0.04)'], borderColor: [C.red, C.border], borderWidth: 1.5 }]
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: '72%', plugins: { legend: { display: false } } }
  });

  const ctx3 = document.getElementById('chart-timeline').getContext('2d');
  const grad = ctx3.createLinearGradient(0, 0, 0, 240);
  grad.addColorStop(0, 'rgba(229,57,53,0.3)'); grad.addColorStop(1, 'rgba(229,57,53,0)');
  chartTimeline = new Chart(ctx3, {
    type: 'line',
    data: {
      labels: ['Now', 'W1','W2','W3','W4','W5','W6','W7','W8','W9','W10','W11','W12'],
      datasets: [{ data: Array(13).fill(null), borderColor: C.red, backgroundColor: grad, fill: true, tension: 0.35, pointRadius: 4, pointBackgroundColor: C.red }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: C.grid } }, y: { grid: { color: C.grid } } } }
  });
}

function updateCharts() {
  if (!chartCalories) return;
  const isWorkout = Array.from({length: 7}, (_, i) => i < state.workoutDays);
  
  chartCalories.data.datasets[0].data = isWorkout.map(w => w ? state.workoutKcal : state.restKcal);
  chartCalories.data.datasets[1].data = isWorkout.map(w => w ? state.tdeeWorkout : state.tdeeRest);
  chartCalories.update();

  const wDeficit = Math.max(0, state.weeklyDeficit);
  const wIntake = Math.max(0, state.tdeeWeekly - state.weeklyDeficit);
  chartDeficit.data.datasets[0].data = [wDeficit, wIntake];
  chartDeficit.update();

  if (state.weightKg && state.weeklyLossKg) {
    const pts = [state.weightKg];
    for(let w=1; w<=12; w++) pts.push(state.weightKg - state.weeklyLossKg * w);
    chartTimeline.data.datasets[0].data = pts;
    const min = Math.min(...pts), max = Math.max(...pts), pad = (max-min)*0.15 || 2;
    chartTimeline.options.scales.y.min = Math.floor(min - pad);
    chartTimeline.options.scales.y.max = Math.ceil(max + pad);
    chartTimeline.update();
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   INITIALISATION & WATER RIPPLES
   ═══════════════════════════════════════════════════════════════════════════ */
[inputRestKcal, inputWorkoutKcal].forEach(el => {
  el.addEventListener('keydown', () => el.dataset.auto = 'false');
  el.addEventListener('focus', () => el.dataset.auto = 'false');
});

function init() {
  inputRestKcal.dataset.auto = 'true';
  inputWorkoutKcal.dataset.auto = 'true';
  daysSlider.style.setProperty('--prog', `${(parseInt(daysSlider.value)/7)*100}%`);
  
  const ageVal = parseInt(inputAge.value);
  const ageMin = parseInt(inputAge.min);
  const ageMax = parseInt(inputAge.max);
  inputAge.style.setProperty('--prog', `${((ageVal - ageMin) / (ageMax - ageMin)) * 100}%`);

  wireHitListeners();
  initCharts();
  switchTab('inputs');
  setTimeout(calculate, 100); 

  // ── Initialize Liquid Leaf Physics ──
  const leafContainer = document.getElementById('leaf-container');
  const numLeaves = 18; // Increased for a continuous, unbroken stream
  const leavesData = [];

  for (let i = 0; i < numLeaves; i++) {
    const wrap = document.createElement('div');
    wrap.className = 'leaf-wrap';
    
    const inner = document.createElement('div');
    inner.className = 'leaf-inner';
    
    const img = document.createElement('div');
    img.className = 'leaf-img';
    const leafNum = Math.floor(Math.random() * 6) + 1;
    img.style.backgroundImage = `url('leaf${leafNum}.png')`;
    
    inner.appendChild(img);
    wrap.appendChild(inner);
    leafContainer.appendChild(wrap);
    
    const sizeCurve = Math.pow(Math.random(), 1.5); 
    const baseScale = 0.5 + (sizeCurve * 0.7); 

    leavesData.push({ 
      wrap: wrap, 
      inner: inner,
      // Spread them dynamically off-screen so they enter continuously
      streamX: (Math.random() * window.innerWidth * 2) - window.innerWidth, 
      streamY: (Math.random() * window.innerHeight * 2) - window.innerHeight,
      vx: 0, 
      vy: 0, 
      // Increased base speed for a slightly faster stream
      baseSpeedX: 0.8 + Math.random() * 0.9, 
      baseSpeedY: 0.5 + Math.random() * 0.7,
      
      scale: baseScale,
      baseRot: Math.random() * 360, 
      rotSpeed: -0.08 + Math.random() * 0.16, 
      
      wavePhaseX: Math.random() * Math.PI * 2,
      wavePhaseY: Math.random() * Math.PI * 2,
      waveSpeed: 0.0008 + Math.random() * 0.0015, 
      waveAmp: 15 + Math.random() * 35 
    });
  }

  // Animation Loop (60FPS)
  function animateLeaves(time) {
    leavesData.forEach(leaf => {
      leaf.streamX += leaf.baseSpeedX + leaf.vx;
      leaf.streamY += leaf.baseSpeedY + leaf.vy;
      leaf.vx *= 0.92; 
      leaf.vy *= 0.92;
      
      // Smooth staggering reset: Send them far off-screen when they exit
      if (leaf.streamX > window.innerWidth + 150) {
        leaf.streamX = -150 - (Math.random() * 300);
        leaf.streamY = (Math.random() * window.innerHeight) - 200;
      }
      if (leaf.streamY > window.innerHeight + 150) {
        leaf.streamY = -150 - (Math.random() * 300);
        leaf.streamX = (Math.random() * window.innerWidth) - 200;
      }

      const swayX = Math.sin(time * leaf.waveSpeed + leaf.wavePhaseX) * leaf.waveAmp;
      const swayY = Math.cos(time * leaf.waveSpeed + leaf.wavePhaseY) * (leaf.waveAmp * 0.6);
      leaf.baseRot += leaf.rotSpeed;

      const finalX = leaf.streamX + swayX;
      const finalY = leaf.streamY + swayY;

      // Apply geometry independent of CSS opticals
      leaf.wrap.style.transform = `translate3d(${finalX}px, ${finalY}px, 0)`;
      leaf.inner.style.transform = `rotate(${leaf.baseRot}deg) scale(${leaf.scale})`;

      // ── THE MAGIC: Micro-Ripples ──
      // Randomly trigger tiny surface disturbances precisely where the leaf is currently bobbing
      if (Math.random() < 0.015) {
        try {
          // X/Y +45 targets the dead center of the 90x90 leaf wrapper
          $('#water-bg').ripples('drop', finalX + 45, finalY + 45, 12, 0.02);
          $('#water-fg').ripples('drop', finalX + 45, finalY + 45, 12, 0.03);
        } catch(e) {}
      }
    });
    requestAnimationFrame(animateLeaves);
  }
  requestAnimationFrame(animateLeaves);

  // ── Initialize WebGL Ripples ──
  try {
    $('#water-bg').ripples({ resolution: 768, dropRadius: 20, perturbance: 0.02, interactive: false });
    $('#water-fg').ripples({ resolution: 512, dropRadius: 20, perturbance: 0.04, interactive: false });

    $(document).on('mousedown touchstart', function(e) {
      let clickX = e.clientX || (e.originalEvent && e.originalEvent.touches && e.originalEvent.touches[0].clientX);
      let clickY = e.clientY || (e.originalEvent && e.originalEvent.touches && e.originalEvent.touches[0].clientY);
      
      if (clickX !== undefined && clickY !== undefined) {
        $('#water-bg').ripples('drop', clickX, clickY, 35, 0.15); 
        $('#water-fg').ripples('drop', clickX, clickY, 35, 0.20); 

        leavesData.forEach(leaf => {
          const dx = leaf.streamX - clickX;
          const dy = leaf.streamY - clickY;
          const distance = Math.sqrt(dx*dx + dy*dy);
          
          if (distance < 350 && distance > 0) {
            const force = (350 - distance) / 350;
            leaf.vx += (dx / distance) * force * 15; 
            leaf.vy += (dy / distance) * force * 15;
          }
        });
      }
    });
  } catch (err) {
    console.warn("WebGL Water Ripples bypassed: ", err);
  }
}
  

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

