// ======= CONSTANTS AND GLOBALS ======= //
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
const resolution = window.devicePixelRatio || 1;

const hoursInput = document.getElementById("hours");
const minutesInput = document.getElementById("minutes");
const secondsInput = document.getElementById("seconds");
const startstopBtn = document.getElementById("startstopBtn");
const resetBtn = document.getElementById("resetBtn");
//const timerLabel = document.getElementById("timerLabel"); // REMOVED**
const indicator = document.getElementById("wave-indicator");

let vw, vh;
let waves = [];
let resized = false;

let totalMs = 0;
let remainingMs = 30000;    // Default 30s timer on page load
let startTime = null;
let running = false;
let paused = false;
let pausedAt = 0;
let animFrame = null;

// ======= INITIALIZATION ======= //
resizeCanvas();

// Create and configure waves
waves.push(
  createWave(context, {
    amplitude: 40,
    duration: 1.5,
    fillStyle: "rgba(33, 40, 243, 0.7)",
    frequency: 1,
    width: vw,
    height: vh,
    segments: 120,
    waveHeight: 0
  }),
  createWave(context, {
    amplitude: 25,
    duration: 2,
    fillStyle: "rgba(33,150,243,0.7)",
    frequency: 1.5,
    width: vw,
    height: vh,
    segments: 120,
    waveHeight: 0
  }),
  createWave(context, {
    amplitude: 15,
    duration: 3,
    fillStyle: "rgba(33, 194, 243, 0.7)",
    frequency: 3,
    width: vw,
    height: vh,
    segments: 120,
    waveHeight: 0
  })
);

// ======= EVENT LISTENERS ======= //
window.addEventListener("resize", () => (resized = true));
startstopBtn.addEventListener("click", toggleTimer);
resetBtn.addEventListener("click", resetTimer);
gsap.ticker.add(update);
updateButtonStates();
initializeTimeInputHandlers();

// ======= TIMER FUNCTIONS ======= //

// Handles the dual functionality of the Start/Pause button
function toggleTimer() {
  running ? togglePause() : startTimer();
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
  setInputsDisabled(true);
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
  setInputsDisabled(false);
  updateTimerLabel();

  waves.forEach(wave => {
    gsap.to(wave, {
      duration: wave.waveHeight / vh + 0.5,
      waveHeight: 0,
      ease: "sine.out"
    });
  });

  updateButtonStates();
}

// Helper function; defines state in which timer finishes (i.e. reaches 00:00:00)
function isFinished() {
  return remainingMs === 0 && totalMs !== 0;
}

// Handles when buttons should be active/inactive
function updateButtonStates() {
  startstopBtn.textContent = (!running || paused) ? "Start" : "Pause";
  startstopBtn.disabled = isFinished();
  resetBtn.disabled = !(running || isFinished());
}

function initializeTimeInputHandlers() {
  document.querySelectorAll(".arrow").forEach(btn => {
    btn.addEventListener("click", () => {
      const unit = btn.dataset.unit;
      const input = document.getElementById(unit);
      let val = parseInt(input.value) || 0;

      if (unit === "seconds") {
        const increment = btn.classList.contains("up") ? 15 : -15;

        if (increment > 0) {
          val = Math.ceil((val + 1) / 15) * 15;
          if (val >= 60) val = 0;
        } else {
          val = Math.floor((val - 1) / 15) * 15;
          if (val < 0) val = 45;
        }
      } else {
        val += btn.classList.contains("up") ? 1 : -1;
        if (unit === "minutes") {
          val = Math.max(0, Math.min(59, val));
        } else {
          val = Math.max(0, val);
        }
      }

      input.value = String(val).padStart(2, "0");
    });
  });

  ["hours", "minutes", "seconds"].forEach(id => {
    const input = document.getElementById(id);

    // Allow only digits during input
    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "");
    });

    // Format on blur or Enter
    const finalizeInput = () => {
      let val = parseInt(input.value, 10) || 0;
      if (id !== "hours") val = Math.min(59, val);
      input.value = String(Math.max(0, val)).padStart(2, "0");
      //updateTimerLabel();
    };

    input.addEventListener("blur", finalizeInput);
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        input.blur(); // triggers blur + formatting
      }
    });
  });
}

function setInputsDisabled(disabled) {
  document.querySelectorAll(".segment, .arrow").forEach(el => {
    el.disabled = disabled;
  });
}

// ======= ANIMATION LOOP ======= //
function update() {
  if (resized) {
    resizeCanvas();
    waves.forEach(wave => wave.resize(vw, vh));
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
    waves.forEach(wave => wave.waveHeight = vh * (1 - progress));
  }

  // Only update timer when running or finished -> otherwise timer never changes, or can't get final update to reach 00
  if(running || isFinished()) updateTimerLabel();

  context.clearRect(0, 0, vw, vh);
  context.globalCompositeOperation = "soft-light";
  waves.forEach(wave => wave.draw());
  indicator.style.top = `${waves[0].waveHeight}px`;
  updateButtonStates();
}

// ======= DISPLAY FUNCTIONS ======= //

function updateTimerLabel() {
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const hrs = Math.floor(totalSeconds / 3600);
  const min = Math.floor((totalSeconds % 3600) / 60);
  const sec = totalSeconds % 60;

  hoursInput.value = String(hrs).padStart(2, "0");
  minutesInput.value = String(min).padStart(2, "0");
  secondsInput.value = String(sec).padStart(2, "0");
}

// ======= CANVAS RESIZE ======= //
function resizeCanvas() {
  vw = window.innerWidth;
  vh = window.innerHeight;
  canvas.width = vw * resolution;
  canvas.height = vh * resolution;
  canvas.style.width = `${vw}px`;
  canvas.style.height = `${vh}px`;
  context.scale(resolution, resolution);
}

// ======= WAVE CREATION ======= //
function createWave(context, options = {}) {
  const wave = {
    amplitude: options.amplitude || 50,
    context,
    duration: options.duration || 2,
    fillStyle: options.fillStyle || "rgba(0,150,255,0.5)",
    frequency: options.frequency || 2,
    height: options.height || 600,
    points: [],
    segments: options.segments || 100,
    tweens: [],
    waveHeight: options.waveHeight || 0,
    width: options.width || 800,
    x: options.x || 0,
    y: options.y || 0,
    init, resize, draw, kill
  };

  init();
  return wave;

  function kill() {
    wave.tweens.forEach(t => t.kill());
    wave.tweens = [];
    wave.points = [];
  }

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

  function draw() {
    const { points, amplitude, waveHeight, width, height, fillStyle, x, y } = wave;
    const halfAmp = amplitude / 2;
    const startY = waveHeight;

    context.beginPath();
    context.moveTo(points[0].x, startY + points[0].y * halfAmp);

    for (let i = 1; i < points.length; i++) {
      const p = points[i];
      context.lineTo(p.x, startY + p.y * halfAmp);
    }

    context.lineTo(x + width, y + height);
    context.lineTo(x, y + height);
    context.closePath();
    context.fillStyle = fillStyle;
    context.fill();
  }

  function resize(width, height) {
    wave.width = width;
    wave.height = height;
    const interval = wave.width / wave.segments;
    wave.points.forEach((p, i) => (p.x = wave.x + i * interval));
  }
}
