/**
 * Pomodoro Timer Application
 * Clean, modern single-page timer with Focus, Short Break, and Long Break modes.
 */

// Configuration for timer modes (durations in seconds)
const TIMER_MODES = {
  focus: {
    name: 'Focus Time',
    duration: 25 * 60, // 25 minutes
    themeClass: 'theme-focus',
    idleCaption: 'Ready to focus',
    runningCaption: 'Stay in the flow',
    pausedCaption: 'Session paused',
    completedCaption: 'Focus session complete! 🎉',
  },
  shortBreak: {
    name: 'Short Break',
    duration: 5 * 60, // 5 minutes
    themeClass: 'theme-shortBreak',
    idleCaption: 'Time to unwind',
    runningCaption: 'Rest your eyes & breathe',
    pausedCaption: 'Break paused',
    completedCaption: 'Break finished! Ready to focus?',
  },
  longBreak: {
    name: 'Long Break',
    duration: 15 * 60, // 15 minutes
    themeClass: 'theme-longBreak',
    idleCaption: 'Extended refresh',
    runningCaption: 'Step away & recharge',
    pausedCaption: 'Break paused',
    completedCaption: 'Long break done! Refreshed & set.',
  },
};

// SVG Circle properties for progress calculation
const CIRCLE_RADIUS = 140;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

// State management
const state = {
  currentMode: 'focus',
  timeLeft: TIMER_MODES.focus.duration,
  totalDuration: TIMER_MODES.focus.duration,
  isRunning: false,
  timerInterval: null,
  endTime: null,
  soundEnabled: true,
};

// DOM Elements
const bodyEl = document.body;
const timeDisplayEl = document.getElementById('time-display');
const modeIndicatorEl = document.getElementById('mode-indicator');
const sessionCaptionEl = document.getElementById('session-caption');
const progressCircle = document.getElementById('progress-circle');

const startBtn = document.getElementById('btn-start');
const pauseBtn = document.getElementById('btn-pause');
const resetBtn = document.getElementById('btn-reset');

const tabButtons = document.querySelectorAll('.tab-btn');
const soundToggleBtn = document.getElementById('btn-sound-toggle');
const soundOnIcon = soundToggleBtn.querySelector('.sound-on');
const soundOffIcon = soundToggleBtn.querySelector('.sound-off');
const soundLabel = soundToggleBtn.querySelector('.sound-label');

/**
 * Audio Synthesizer using Web Audio API for a soft, pleasant chime
 */
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playGentleChime() {
  if (!state.soundEnabled) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Pleasant three-note calming chord (E5, G#5, B5)
    const notes = [659.25, 830.61, 987.77];
    const now = ctx.currentTime;

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.12);

      // Smooth soft fade-in and exponential decay
      gain.gain.setValueAtTime(0.001, now + index * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.2, now + index * 0.12 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.12 + 1.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + index * 0.12);
      osc.stop(now + index * 0.12 + 1.7);
    });
  } catch (err) {
    console.warn('Audio chime could not be played:', err);
  }
}

/**
 * Format seconds into MM:SS string
 */
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const paddedMins = String(mins).padStart(2, '0');
  const paddedSecs = String(secs).padStart(2, '0');
  return `${paddedMins}:${paddedSecs}`;
}

/**
 * Update the SVG circular progress ring
 */
function updateProgressRing() {
  if (!progressCircle) return;
  const ratio = state.timeLeft / state.totalDuration;
  // Progress decreases as time counts down
  const offset = CIRCLE_CIRCUMFERENCE * (1 - ratio);
  progressCircle.style.strokeDasharray = `${CIRCLE_CIRCUMFERENCE}`;
  progressCircle.style.strokeDashoffset = `${offset}`;
}

/**
 * Update the browser tab title
 */
function updateDocumentTitle() {
  const formattedTime = formatTime(state.timeLeft);
  const modeConfig = TIMER_MODES[state.currentMode];
  document.title = `(${formattedTime}) ${modeConfig.name} - Pomodoro`;
}

/**
 * Render all UI elements according to the current state
 */
function render() {
  const modeConfig = TIMER_MODES[state.currentMode];

  // Update digital time display
  timeDisplayEl.textContent = formatTime(state.timeLeft);

  // Update progress ring
  updateProgressRing();

  // Update mode badge
  modeIndicatorEl.textContent = modeConfig.name;

  // Update dynamic session caption
  if (state.timeLeft === 0) {
    sessionCaptionEl.textContent = modeConfig.completedCaption;
  } else if (state.isRunning) {
    sessionCaptionEl.textContent = modeConfig.runningCaption;
  } else if (state.timeLeft < state.totalDuration) {
    sessionCaptionEl.textContent = modeConfig.pausedCaption;
  } else {
    sessionCaptionEl.textContent = modeConfig.idleCaption;
  }

  // Update control button states
  startBtn.disabled = state.isRunning;
  pauseBtn.disabled = !state.isRunning;

  // Update body styling class for running effect
  if (state.isRunning) {
    bodyEl.classList.add('timer-running');
  } else {
    bodyEl.classList.remove('timer-running');
  }

  // Update document title
  updateDocumentTitle();
}

/**
 * Switch timer mode (Focus, Short Break, Long Break)
 */
function switchMode(newMode) {
  if (!TIMER_MODES[newMode]) return;

  // Stop running timer
  clearInterval(state.timerInterval);
  state.isRunning = false;
  state.timerInterval = null;

  // Update mode
  state.currentMode = newMode;
  state.totalDuration = TIMER_MODES[newMode].duration;
  state.timeLeft = state.totalDuration;

  // Update Theme on body element
  bodyEl.className = `${TIMER_MODES[newMode].themeClass}`;

  // Update Tab buttons visual active state and ARIA
  tabButtons.forEach(btn => {
    const isActive = btn.dataset.mode === newMode;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  render();
}

/**
 * Start or resume countdown
 */
function startTimer() {
  if (state.isRunning) return;

  // Unlock Web Audio context on user gesture
  getAudioContext();

  // If session already finished, reset to full duration before starting again
  if (state.timeLeft <= 0) {
    state.timeLeft = state.totalDuration;
  }

  state.isRunning = true;
  state.endTime = Date.now() + state.timeLeft * 1000;

  state.timerInterval = setInterval(() => {
    const remainingSeconds = Math.ceil((state.endTime - Date.now()) / 1000);

    if (remainingSeconds <= 0) {
      // Timer finished!
      state.timeLeft = 0;
      clearInterval(state.timerInterval);
      state.isRunning = false;
      state.timerInterval = null;

      render();
      playGentleChime();
    } else {
      state.timeLeft = remainingSeconds;
      render();
    }
  }, 250);

  render();
}

/**
 * Pause countdown
 */
function pauseTimer() {
  if (!state.isRunning) return;

  clearInterval(state.timerInterval);
  state.isRunning = false;
  state.timerInterval = null;

  render();
}

/**
 * Reset timer to mode default
 */
function resetTimer() {
  clearInterval(state.timerInterval);
  state.isRunning = false;
  state.timerInterval = null;

  state.timeLeft = state.totalDuration;
  render();
}

/**
 * Toggle Chime Sound
 */
function toggleSound() {
  state.soundEnabled = !state.soundEnabled;

  if (state.soundEnabled) {
    soundOnIcon.classList.remove('hidden');
    soundOffIcon.classList.add('hidden');
    soundLabel.textContent = 'Chime on';
    // Play a brief preview chime when turned on
    playGentleChime();
  } else {
    soundOnIcon.classList.add('hidden');
    soundOffIcon.classList.remove('hidden');
    soundLabel.textContent = 'Chime off';
  }
}

/**
 * Event Listeners
 */
function initEventListeners() {
  // Mode selection tabs
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      if (mode !== state.currentMode) {
        switchMode(mode);
      }
    });
  });

  // Action controls
  startBtn.addEventListener('click', startTimer);
  pauseBtn.addEventListener('click', pauseTimer);
  resetBtn.addEventListener('click', resetTimer);

  // Sound toggle
  soundToggleBtn.addEventListener('click', toggleSound);

  // Keyboard accessibility shortcuts (Space to toggle start/pause, 'r' to reset)
  document.addEventListener('keydown', (e) => {
    // Avoid interfering if focus is in an input
    if (['input', 'textarea'].includes(e.target.tagName.toLowerCase())) return;

    if (e.code === 'Space') {
      e.preventDefault();
      if (state.isRunning) {
        pauseTimer();
      } else {
        startTimer();
      }
    } else if (e.key.toLowerCase() === 'r') {
      resetTimer();
    }
  });
}

/**
 * Initialize application
 */
function init() {
  // Set initial circumference for the SVG ring
  if (progressCircle) {
    progressCircle.style.strokeDasharray = `${CIRCLE_CIRCUMFERENCE}`;
    progressCircle.style.strokeDashoffset = '0';
  }

  initEventListeners();
  render();
}

// Start app once DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
