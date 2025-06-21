// ----------------------
// Canvas Setup
// ----------------------
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
const resolution = window.devicePixelRatio || 1; // Retina support

let vw, vh;                // Viewport dimensions
let waves = [];            // Array of wave objects
let resized = false;       // Resize flag

// ----------------------
// DOM Elements
// ----------------------
const hoursInput = document.getElementById("hours");
const minutesInput = document.getElementById("minutes");
const secondsInput = document.getElementById("seconds");
const startstopBtn = document.getElementById("startstopBtn");
const resetBtn = document.getElementById("resetBtn");
const timerLabel = document.getElementById("timerLabel");
const indicator = document.getElementById("wave-indicator");

// ----------------------
// Timer State
// ----------------------
let totalMs = 0;
let remainingMs = 0;
let startTime = null;
let pausedAt = 0;
let running = false;
let paused = false;

// ----------------------
// Initialization
// ----------------------
resizeCanvas();
setupWaves();
window.addEventListener("resize", () => resized = true);
startstopBtn.addEventListener("click", toggleTimer);
resetBtn.addEventListener("click", resetTimer);
gsap.ticker.add(update);
updateButtonStates();

// ----------------------
// Timer Control Functions
// ----------------------

function toggleTimer() {
  if (!running) {
    startTimer();
  } else {
    togglePause();
  }
}

function startTimer() {
  const hours = parseInt(hoursInput.value) || 0;
  const minutes = parseInt(minutesInput.value) || 0;
  const seconds = parseInt(secondsInput.value) || 0;

  totalMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
  remainingMs = totalMs;
  startTime = performance.now();
  running = true;
  paused = false;
  updateButtonStates();
}

function togglePause() {
  paused = !paused;

  if (paused) {
    pausedAt = remainingMs;
  } else {
    startTime = performance.now() - (totalMs - pausedAt);
  }

  updateButtonStates();
}

function resetTimer() {
  running = false;
  paused = false;
  remainingMs = totalMs;
  updateTimerLabel();

  // Smoothly refill the wave
  waves.forEach(wave => {
    gsap.to(wave, {
      duration: wave.waveHeight / vh + 0.5,
      waveHeight: 0,
      ease: "sine.out"
    });
  });

  updateButtonStates();
}

function updateButtonStates() {
  startstopBtn.textContent = (!running || paused) ? "Start" : "Pause";
  resetBtn.disabled = !running;
}

// ----------------------
// Animation Update Loop
// ----------------------

function update() {
  if (resized) {
    resizeCanvas();
    waves.forEach(w => w.resize(vw, vh));
    resized = false;
  }

  if (running && !paused && totalMs > 0) {
    const now = performance.now();
    remainingMs = Math.max(0, totalMs - (now - startTime));

    if (remainingMs <= 0) {
      running = false;
      paused = false;
    }
  }

  const progress = totalMs > 0 ? remainingMs / totalMs : 1;

  if (running) {
    waves.forEach(wave => {
      wave.waveHeight = vh * (1 - progress);
    });
  }

  updateTimerLabel();

  context.clearRect(0, 0, vw, vh);
  context.globalCompositeOperation = "soft-light";

  waves.forEach(w => w.draw());

  indicator.style.top = `${waves[0].waveHeight}px`;

  updateButtonStates();
}

// ----------------------
// Timer Display
// ----------------------

function updateTimerLabel() {
  const secs = Math.ceil(remainingMs / 1000);
  const hrs = String(Math.floor(secs / 3600)).padStart(2, '0');
  const min = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const sec = String(secs % 60).padStart(2, '0');
  timerLabel.textContent = `${hrs}:${min}:${sec}`;
}

// ----------------------
// Canvas Resizing
// ----------------------

function resizeCanvas() {
  vw = window.innerWidth;
  vh = window.innerHeight;

  canvas.width = vw * resolution;
  canvas.height = vh * resolution;

  canvas.style.width = `${vw}px`;
  canvas.style.height = `${vh}px`;

  context.scale(resolution, resolution);
}

// ----------------------
// Wave Initialization
// ----------------------

function setupWaves() {
  waves.push(createWave(context, {
    amplitude: 40,
    duration: 1.5,
    fillStyle: "rgba(33, 40, 243, 0.7)",
    frequency: 1,
    width: vw,
    height: vh,
    segments: 120,
    waveHeight: 0
  }));

  waves.push(createWave(context, {
    amplitude: 25,
    duration: 2,
    fillStyle: "rgba(33,150,243,0.7)",
    frequency: 1.5,
    width: vw,
    height: vh,
    segments: 120,
    waveHeight: 0
  }));

  waves.push(createWave(context, {
    amplitude: 15,
    duration: 3,
    fillStyle: "rgba(33, 194, 243, 0.7)",
    frequency: 3,
    width: vw,
    height: vh,
    segments: 120,
    waveHeight: 0
  }));
}

// ----------------------
// Wave Generator
// ----------------------

function createWave(context, options = {}) {
  const wave = {
    amplitude: options.amplitude || 50,
    context,
    duration: options.duration || 2,
    fillStyle: options.fillStyle || "rgba(0,150,255,0.5)",
    frequency: options.frequency || 2,
    height: options.height || 600,
    segments: options.segments || 100,
    tweens: [],
    waveHeight: options.waveHeight || 0,
    width: options.width || 800,
    x: options.x || 0,
    y: options.y || 0,
    points: [],
    init,
    resize,
    draw,
    kill
  };

  init();
  return wave;

  // Reset all animation tweens
  function kill() {
    wave.tweens.forEach(t => t.kill());
    wave.tweens = [];
    wave.points = [];
  }

  // Initialize wave animation points
  function init() {
    kill();
    const interval = wave.width / wave.segments;

    for (let i = 0; i <= wave.segments; i++) {
      const norm = i / wave.segments;
      const point = {
        x: wave.x + i * interval,
        y: 1
      };

      const tween = gsap.to(point, {
        duration: wave.duration,
        y: -1,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      }).progress(norm * wave.frequency);

      wave.tweens.push(tween);
      wave.points.push(point);
    }
  }

  // Draw the animated wave to canvas
  function draw() {
    const points = wave.points;
    const height = wave.amplitude / 2;
    const startY = wave.waveHeight;

    context.beginPath();
    context.moveTo(points[0].x, startY + points[0].y * height);

    for (let i = 1; i < points.length; i++) {
      const p = points[i];
      context.lineTo(p.x, startY + p.y * height);
    }

    context.lineTo(wave.x + wave.width, wave.y + wave.height);
    context.lineTo(wave.x, wave.y + wave.height);
    context.closePath();
    context.fillStyle = wave.fillStyle;
    context.fill();
  }

  // Recalculate point positions after canvas resize
  function resize(width, height) {
    wave.width = width;
    wave.height = height;
    const interval = wave.width / wave.segments;

    wave.points.forEach((p, i) => {
      p.x = wave.x + i * interval;
    });
  }
}
