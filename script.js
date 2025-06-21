// Get references to canvas and its drawing context
let canvas = document.getElementById("canvas");
let context = canvas.getContext("2d");

// Support high-DPI (Retina) screens
let resolution = window.devicePixelRatio || 1;

// Grab inputs and buttons
let hoursInput = document.getElementById("hours");
let minutesInput = document.getElementById("minutes");
let secondsInput = document.getElementById("seconds");
let startBtn = document.getElementById("startBtn");
let pauseBtn = document.getElementById("pauseBtn");
let resetBtn = document.getElementById("resetBtn");
let timerLabel = document.getElementById("timerLabel");

let indicator = document.getElementById("wave-indicator");



// Canvas size
let vw, vh;
let waves = [];           // Array to hold wave objects
let resized = false;      // Flag to detect window resize

// Timer state
let totalMs = 0;          // Total duration in milliseconds
let remainingMs = 0;      // Time remaining
let startTime = null;     // Timestamp when the timer started
let running = false;      // Is the timer currently counting?
let paused = false;       // Is the timer currently paused?
let pausedAt = 0;         // Timestamp when timer was paused
let animFrame = null;     // For canceling animations later if needed

// Set initial canvas size
resizeCanvas();

// Create waves and push to the waves array
let wave1 = createWave(context, {
  amplitude: 40,
  duration: 1.5,
  fillStyle: "rgba(33, 40, 243, 0.7)", // A different blue
  frequency: 1,
  width: vw,
  height: vh,
  segments: 120,
  waveHeight: 0 // Start at full height
});

let wave2 = createWave(context, {
  amplitude: 25,                       // Height of wave oscillation
  duration: 2,                         // Speed of wave motion
  fillStyle: "rgba(33,150,243,0.7)",   // Wave color
  frequency: 1.5,                      // Number of wave peaks across screen
  width: vw,
  height: vh,
  segments: 120,                       // Number of points that define the wave
  waveHeight: 0                      // Starting vertical position
});

let wave3 = createWave(context, {
  amplitude: 15,
  duration: 3,
  fillStyle: "rgba(33, 194, 243, 0.7)", // A different blue
  frequency: 3,
  width: vw,
  height: vh,
  segments: 120,
  waveHeight: 0 // Start at full height
});

waves.push(wave1);
waves.push(wave2);
waves.push(wave3);

// Watch for window resizing
window.addEventListener("resize", () => resized = true);

// Start and reset buttons
startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", togglePause);
resetBtn.addEventListener("click", resetTimer);
updateButtonStates();

// Start the animation loop with GSAP's ticker
gsap.ticker.add(update);

// TIMER FUNCTIONS ///////////////////////////////////////
function startTimer() {
  // Get user input from form
  const hours = parseInt(hoursInput.value) || 0;
  const minutes = parseInt(minutesInput.value) || 0;
  const seconds = parseInt(secondsInput.value) || 0;

  // Calculate total and remaining time in milliseconds
  totalMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
  remainingMs = totalMs;
  startTime = performance.now();  // Save the start time
  running = true;
  paused = false;
  pauseBtn.textContent = "Pause";
  updateButtonStates();
}

function togglePause() {
  if (!running) return;

  paused = !paused;

  if (paused) {
    // Save how much time is left
    pausedAt = remainingMs;
    pauseBtn.textContent = "Resume";
  } else {
    // Resume timer from paused time
    startTime = performance.now() - (totalMs - pausedAt);
    pauseBtn.textContent = "Pause";
  }
  updateButtonStates();
}

function resetTimer() {
  running = false;
  paused = false;
  pauseBtn.textContent = "Pause";
  remainingMs = totalMs;          // Reset to full time
  updateTimerLabel();             // Update the time display

  waves.forEach(wave => {          // Reset wave to top
    let h = wave.waveHeight;
    gsap.to(wave, {
      duration: h / vh + 0.5,
      waveHeight: 0,
      ease: "sine.out"
    });
  });
  updateButtonStates();
}

function updateButtonStates() {        // Handle button on/off logic
  startBtn.disabled = running;
  pauseBtn.disabled = !running;
  resetBtn.disabled = !running && remainingMs !== 0;
}

// MAIN UPDATE LOOP ///////////////////////////////////////
function update() {
  // Handle window resize
  if (resized) {
    resizeCanvas();
    waves.forEach(w => w.resize(vw, vh)); // Recalculate wave points
    resized = false;
  }

  // Timer logic: reduce remaining time
  if (running && !paused && totalMs > 0) {
    const now = performance.now();
    remainingMs = Math.max(0, totalMs - (now - startTime));
    if (remainingMs <= 0) {     // Stop when done
        running = false;
        paused = false;
        pauseBtn.textContent = "Pause";
    }
  }

  // Calculate progress: 1 = full, 0 = done
  let progress = totalMs > 0 ? remainingMs / totalMs : 1;

  // Update vertical wave height based on timer progress
  if(running) {
    waves.forEach(wave => {
        wave.waveHeight = vh * (1 - progress);
    });
  }

  updateTimerLabel();

  // Clear canvas before redrawing
  context.clearRect(0, 0, vw, vh);
  context.globalCompositeOperation = "soft-light";

  // Draw each wave
  waves.forEach(w => w.draw());

  // Update indicator bar
  indicator.style.top = `${waves[0].waveHeight}px`;

  updateButtonStates();
}

// TIMER TEXT DISPLAY ///////////////////////////////////////
function updateTimerLabel() {
  const secs = Math.ceil(remainingMs / 1000);
  const hrs = String(Math.floor(secs/3600)).padStart(2, '0');
  const min = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const sec = String(secs % 60).padStart(2, '0');
  timerLabel.textContent = `${hrs}:${min}:${sec}`;
}

// CANVAS RESIZE ////////////////////////////////////////
function resizeCanvas() {
  vw = window.innerWidth;
  vh = window.innerHeight;

  // Physically resize canvas for high-resolution screens
  canvas.width = vw * resolution;
  canvas.height = vh * resolution;

  // Resize for CSS layout
  canvas.style.width = vw + "px";
  canvas.style.height = vh + "px";

  // Scale drawing context to match resolution
  context.scale(resolution, resolution);
}

// WAVE GENERATOR //////////////////////////////////////
function createWave(context, options) {
  options = options || {};

  // The wave object
  let wave = {
    amplitude: options.amplitude || 50,
    context: context,
    duration: options.duration || 2,
    fillStyle: options.fillStyle || "rgba(0,150,255,0.5)",
    frequency: options.frequency || 2,
    height: options.height || 600,
    points: [],
    segments: options.segments || 100,
    tweens: [],
    waveHeight: options.waveHeight || 300,
    width: options.width || 800,
    x: options.x || 0,
    y: options.y || 0,
    init, resize, draw, kill
  };

  // Set up wave animation points
  init();
  return wave;

  function kill() {
    // Stop all animations
    wave.tweens.forEach(t => t.kill());
    wave.tweens = [];
    wave.points = [];
  }

  function init() {
    kill();
    let interval = wave.width / wave.segments;

    for (let i = 0; i <= wave.segments; i++) {
      let norm = i / wave.segments;

      let point = {
        x: wave.x + i * interval,
        y: 1 // This will be animated between -1 and 1
      };

      // Animate vertical oscillation using GSAP
      let tween = gsap.to(point, {
        duration: wave.duration,
        y: -1,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      }).progress(norm * wave.frequency); // Phase shift

      wave.tweens.push(tween);
      wave.points.push(point);
    }
  }

  function draw() {
    let points = wave.points;
    let height = wave.amplitude / 2;
    let startY = wave.waveHeight;

    context.beginPath();
    context.moveTo(points[0].x, startY + points[0].y * height);

    for (let i = 1; i < points.length; i++) {
      let p = points[i];
      context.lineTo(p.x, startY + p.y * height);
    }

    // Close and fill the wave shape
    context.lineTo(wave.x + wave.width, wave.y + wave.height);
    context.lineTo(wave.x, wave.y + wave.height);
    context.closePath();
    context.fillStyle = wave.fillStyle;
    context.fill();
  }

  function resize(width, height) {
    wave.width = width;
    wave.height = height;
    let interval = wave.width / wave.segments;

    wave.points.forEach((p, i) => {
      p.x = wave.x + i * interval;
    });
  }
}

