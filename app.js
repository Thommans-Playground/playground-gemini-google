/**
 * Pomodoro Timer Application with Session Task Tracker
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
  tasks: [],
  activeTaskId: null,
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

// Task Tracker DOM Elements
const activeTaskPill = document.getElementById('active-task-pill');
const activeTaskLabel = document.getElementById('active-task-label');
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskList = document.getElementById('task-list');
const taskEmptyState = document.getElementById('task-empty-state');
const taskCounterPill = document.getElementById('task-counter-pill');
const btnClearDone = document.getElementById('btn-clear-done');

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
 * Utility: HTML Escaping
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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

  // Render tasks
  renderTasks();
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

/* ==========================================================================
   Task Tracker Logic
   ========================================================================== */

/**
 * Load tasks from localStorage
 */
function loadTasks() {
  try {
    const savedTasks = localStorage.getItem('pomodoro_tasks');
    if (savedTasks) {
      state.tasks = JSON.parse(savedTasks);
    } else {
      // Default initial tasks for a calm start
      state.tasks = [
        { id: 'task-1', title: 'Focus on main priority', completed: false, createdAt: Date.now() },
        { id: 'task-2', title: 'Review notes & wrap up', completed: false, createdAt: Date.now() + 1 },
      ];
      saveTasks();
    }

    state.activeTaskId = localStorage.getItem('pomodoro_active_task_id') || (state.tasks[0]?.id || null);
  } catch (err) {
    console.error('Error loading tasks:', err);
    state.tasks = [];
    state.activeTaskId = null;
  }
}

/**
 * Save tasks to localStorage
 */
function saveTasks() {
  try {
    localStorage.setItem('pomodoro_tasks', JSON.stringify(state.tasks));
    if (state.activeTaskId) {
      localStorage.setItem('pomodoro_active_task_id', state.activeTaskId);
    } else {
      localStorage.removeItem('pomodoro_active_task_id');
    }
  } catch (err) {
    console.error('Error saving tasks:', err);
  }
}

/**
 * Add a new task
 */
function addTask(title) {
  const trimmed = title.trim();
  if (!trimmed) return;

  const newTask = {
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    title: trimmed,
    completed: false,
    createdAt: Date.now(),
  };

  state.tasks.push(newTask);

  // If no active task currently, select this one
  if (!state.activeTaskId) {
    state.activeTaskId = newTask.id;
  }

  saveTasks();
  renderTasks();
}

/**
 * Toggle task completed state
 */
function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;

  task.completed = !task.completed;

  // If the active task was just completed, attempt to set the next incomplete task as active
  if (task.completed && state.activeTaskId === id) {
    const nextIncomplete = state.tasks.find(t => !t.completed && t.id !== id);
    if (nextIncomplete) {
      state.activeTaskId = nextIncomplete.id;
    }
  } else if (!task.completed && !state.activeTaskId) {
    state.activeTaskId = id;
  }

  saveTasks();
  renderTasks();
}

/**
 * Delete a task
 */
function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);

  if (state.activeTaskId === id) {
    const nextIncomplete = state.tasks.find(t => !t.completed);
    state.activeTaskId = nextIncomplete ? nextIncomplete.id : null;
  }

  saveTasks();
  renderTasks();
}

/**
 * Set a task as the current focus session target
 */
function setActiveTask(id) {
  if (state.activeTaskId === id) {
    // Clicking again deselects
    state.activeTaskId = null;
  } else {
    state.activeTaskId = id;
  }
  saveTasks();
  renderTasks();
}

/**
 * Clear all completed tasks
 */
function clearDoneTasks() {
  const completedIds = new Set(state.tasks.filter(t => t.completed).map(t => t.id));
  state.tasks = state.tasks.filter(t => !t.completed);

  if (completedIds.has(state.activeTaskId)) {
    const nextIncomplete = state.tasks.find(t => !t.completed);
    state.activeTaskId = nextIncomplete ? nextIncomplete.id : null;
  }

  saveTasks();
  renderTasks();
}

/**
 * Render the Task List and Header counters
 */
function renderTasks() {
  if (!taskList) return;

  const total = state.tasks.length;
  const completedCount = state.tasks.filter(t => t.completed).length;

  // Update header counter
  if (total === 0) {
    taskCounterPill.textContent = '0 tasks';
  } else {
    taskCounterPill.textContent = `${completedCount} of ${total} done`;
  }

  // Toggle "Clear done" button
  if (completedCount > 0) {
    btnClearDone.classList.remove('hidden');
  } else {
    btnClearDone.classList.add('hidden');
  }

  // Toggle empty state
  if (total === 0) {
    taskEmptyState.classList.remove('hidden');
    taskList.innerHTML = '';
  } else {
    taskEmptyState.classList.add('hidden');

    // Build task item elements
    taskList.innerHTML = state.tasks
      .map(task => {
        const isCurrentActive = state.activeTaskId === task.id;
        return `
          <li class="task-item ${task.completed ? 'completed' : ''} ${isCurrentActive ? 'active-focus' : ''}" data-id="${task.id}">
            <button type="button" class="task-check-btn" aria-label="${task.completed ? 'Mark incomplete' : 'Mark completed'}" data-action="toggle">
              <svg class="task-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
            <span class="task-label" data-action="select" title="Click to set as current focus task">
              ${escapeHtml(task.title)}
            </span>
            ${isCurrentActive ? '<span class="task-focus-tag">Focus</span>' : ''}
            <button type="button" class="task-delete-btn" aria-label="Delete task" data-action="delete" title="Delete task">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
          </li>
        `;
      })
      .join('');
  }

  // Update Active Task Pill on the Timer Card
  const activeTask = state.tasks.find(t => t.id === state.activeTaskId && !t.completed);
  if (activeTask && activeTaskPill && activeTaskLabel) {
    activeTaskLabel.textContent = activeTask.title;
    activeTaskPill.classList.remove('hidden');
  } else if (activeTaskPill) {
    activeTaskPill.classList.add('hidden');
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

  // Task Form Submission
  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addTask(taskInput.value);
    taskInput.value = '';
    taskInput.focus();
  });

  // Task list click delegation (check, select, delete)
  taskList.addEventListener('click', (e) => {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;

    const taskItem = e.target.closest('.task-item');
    if (!taskItem) return;

    const taskId = taskItem.dataset.id;
    const action = actionEl.dataset.action;

    if (action === 'toggle') {
      toggleTask(taskId);
    } else if (action === 'delete') {
      deleteTask(taskId);
    } else if (action === 'select') {
      setActiveTask(taskId);
    }
  });

  // Clear completed tasks button
  btnClearDone.addEventListener('click', clearDoneTasks);

  // Keyboard accessibility shortcuts (Space to toggle start/pause, 'r' to reset)
  document.addEventListener('keydown', (e) => {
    // Avoid interfering if focus is in an input or button
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

  loadTasks();
  initEventListeners();
  render();
}

// Start app once DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
