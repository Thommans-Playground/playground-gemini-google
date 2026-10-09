/**
 * Application Entry & UI Controller
 * Orchestrates Timer, TaskManager, StatsManager, SoundEngine, and DOM interactions.
 */

import { Storage, DEFAULT_SETTINGS } from './storage.js';
import { PomodoroTimer, TIMER_MODES, MODE_INFO } from './timer.js';
import { TaskManager } from './tasks.js';
import { StatsManager } from './stats.js';
import { SoundEngine } from './sound.js';

// SVG Circle properties
const CIRCLE_RADIUS = 140;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

// HTML Escaping Utility
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// Application State Controller
export class AppController {
  constructor() {
    this.settings = Storage.getSettings();
    this.soundEngine = new SoundEngine({
      soundEnabled: this.settings.soundEnabled,
      soundVolume: this.settings.soundVolume,
      ambientVolume: this.settings.ambientVolume,
    });

    this.statsManager = new StatsManager({
      sessions: Storage.getStats().sessions,
      streakDays: Storage.getStats().streakDays,
      onChange: (data) => Storage.saveStats(data),
    });

    this.taskManager = new TaskManager({
      initialTasks: Storage.getTasks(),
      initialActiveTaskId: Storage.getActiveTaskId(),
      onChange: ({ tasks, activeTaskId }) => {
        Storage.saveTasks(tasks);
        Storage.setActiveTaskId(activeTaskId);
        this.renderTasks();
      },
    });

    this.timer = new PomodoroTimer({
      settings: this.settings,
      onTick: (data) => this.handleTimerTick(data),
      onComplete: (data) => this.handleTimerComplete(data),
      onModeChange: (data) => this.handleTimerModeChange(data),
      onStateChange: (data) => this.handleTimerStateChange(data),
    });
  }

  init() {
    this.cacheDomElements();
    this.applyTheme(this.settings.theme || 'light');
    this.initEventListeners();
    this.render();

    // Start initial ambient sound if configured
    if (this.settings.ambientSound && this.settings.ambientSound !== 'none') {
      this.soundEngine.startAmbient(this.settings.ambientSound);
      this.updateAmbientUI();
    }
  }

  cacheDomElements() {
    // Top Bar
    this.htmlEl = document.documentElement;
    this.btnThemeToggle = document.getElementById('btn-theme-toggle');
    this.themeSunIcon = this.btnThemeToggle?.querySelector('.theme-icon-sun');
    this.themeMoonIcon = this.btnThemeToggle?.querySelector('.theme-icon-moon');
    this.btnOpenSettings = document.getElementById('btn-open-settings');

    // Timer Elements
    this.bodyEl = document.body;
    this.tabButtons = document.querySelectorAll('.tab-btn');
    this.activeTaskPill = document.getElementById('active-task-pill');
    this.activeTaskLabel = document.getElementById('active-task-label');
    this.progressCircle = document.getElementById('progress-circle');
    this.modeIndicatorEl = document.getElementById('mode-indicator');
    this.timeDisplayEl = document.getElementById('time-display');
    this.sessionCaptionEl = document.getElementById('session-caption');
    this.cyclePill = document.getElementById('cycle-pill');

    this.btnStart = document.getElementById('btn-start');
    this.btnPause = document.getElementById('btn-pause');
    this.btnReset = document.getElementById('btn-reset');

    this.btnSoundToggle = document.getElementById('btn-sound-toggle');
    this.soundOnIcon = this.btnSoundToggle?.querySelector('.sound-on');
    this.soundOffIcon = this.btnSoundToggle?.querySelector('.sound-off');
    this.soundLabel = this.btnSoundToggle?.querySelector('.sound-label');

    // Tasks Elements
    this.taskCard = document.querySelector('.task-card');
    this.taskForm = document.getElementById('task-form');
    this.taskInput = document.getElementById('task-input');
    this.taskList = document.getElementById('task-list');
    this.taskEmptyState = document.getElementById('task-empty-state');
    this.taskCounterPill = document.getElementById('task-counter-pill');
    this.btnClearDone = document.getElementById('btn-clear-done');

    // Analytics Elements
    this.statTodayFocus = document.getElementById('stat-today-focus');
    this.statTodaySessions = document.getElementById('stat-today-sessions');
    this.statDailyStreak = document.getElementById('stat-daily-streak');
    this.activityChart = document.getElementById('activity-chart');

    // Soundscapes Elements
    this.presetButtons = document.querySelectorAll('.preset-btn');
    this.ambientSlider = document.getElementById('ambient-volume-slider');
    this.ambientPercent = document.getElementById('ambient-volume-percent');
    this.soundscapeStatusBadge = document.getElementById('soundscape-status-badge');

    // Settings Modal Elements
    this.modalBackdrop = document.getElementById('settings-modal-backdrop');
    this.settingsForm = document.getElementById('settings-form');
    this.btnCloseModal = document.getElementById('btn-close-modal');
    this.btnResetDefaults = document.getElementById('btn-reset-defaults');
    this.settingFocus = document.getElementById('setting-focus');
    this.settingShort = document.getElementById('setting-short');
    this.settingLong = document.getElementById('setting-long');
    this.settingCycle = document.getElementById('setting-cycle');
    this.settingAutoBreak = document.getElementById('setting-autobreak');
    this.settingAutoFocus = document.getElementById('setting-autofocus');
    this.settingChimeTone = document.getElementById('setting-chime-tone');
    this.settingChimeVolume = document.getElementById('setting-chime-volume');
    this.btnTestChime = document.getElementById('btn-test-chime');
    this.btnRequestNotification = document.getElementById('btn-request-notification');
    this.notificationStatusText = document.getElementById('notification-status-text');

    // Set initial SVG progress ring properties
    if (this.progressCircle) {
      this.progressCircle.style.strokeDasharray = `${CIRCLE_CIRCUMFERENCE}`;
      this.progressCircle.style.strokeDashoffset = '0';
    }
  }

  applyTheme(theme) {
    this.settings.theme = theme;
    if (this.htmlEl) {
      this.htmlEl.setAttribute('data-theme', theme);
    }
    if (this.themeSunIcon && this.themeMoonIcon) {
      if (theme === 'dark') {
        this.themeSunIcon.classList.add('hidden');
        this.themeMoonIcon.classList.remove('hidden');
      } else {
        this.themeSunIcon.classList.remove('hidden');
        this.themeMoonIcon.classList.add('hidden');
      }
    }
  }

  toggleTheme() {
    const nextTheme = this.settings.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme(nextTheme);
    Storage.saveSettings(this.settings);
  }

  handleTimerTick({ timeLeft, totalDuration, mode, progressRatio, formattedTime }) {
    if (this.timeDisplayEl) {
      this.timeDisplayEl.textContent = formattedTime;
    }

    if (this.progressCircle) {
      const offset = CIRCLE_CIRCUMFERENCE * (1 - progressRatio);
      this.progressCircle.style.strokeDashoffset = `${offset}`;
    }

    // Update document title
    const modeName = MODE_INFO[mode]?.name || 'Pomodoro';
    document.title = `(${formattedTime}) ${modeName} - FocusFlow`;
  }

  handleTimerComplete({ mode, nextMode, completedCycles }) {
    // 1. Play audible alert chime
    this.soundEngine.playChime(this.settings.chimeTone);

    // 2. Trigger browser notification if granted
    this.triggerNotification(mode, nextMode);

    // 3. Record session in stats and increment task pomodoros if focus mode
    if (mode === TIMER_MODES.FOCUS) {
      const activeTask = this.taskManager.getActiveTask();
      this.statsManager.recordSession({
        mode,
        durationMinutes: this.settings.focusDuration,
        taskId: activeTask ? activeTask.id : null,
        taskTitle: activeTask ? activeTask.title : null,
      });

      this.taskManager.incrementActiveTaskPomodoro();
    }

    this.renderStats();
    this.updateCyclePill();
  }

  handleTimerModeChange({ mode }) {
    // Update theme class on body
    const info = MODE_INFO[mode];
    if (info && this.bodyEl) {
      this.bodyEl.className = info.themeClass;
    }

    // Update tab buttons
    this.tabButtons.forEach(btn => {
      const isActive = btn.dataset.mode === mode;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    if (this.modeIndicatorEl && info) {
      this.modeIndicatorEl.textContent = info.name;
    }

    this.updateCaption();
    this.updateCyclePill();
  }

  handleTimerStateChange({ isRunning }) {
    if (this.btnStart) this.btnStart.disabled = isRunning;
    if (this.btnPause) this.btnPause.disabled = !isRunning;

    if (this.bodyEl) {
      if (isRunning) {
        this.bodyEl.classList.add('timer-running');
      } else {
        this.bodyEl.classList.remove('timer-running');
      }
    }

    this.updateCaption();
  }

  updateCaption() {
    if (!this.sessionCaptionEl) return;
    const modeConfig = MODE_INFO[this.timer.mode];
    if (!modeConfig) return;

    if (this.timer.timeLeft === 0) {
      this.sessionCaptionEl.textContent = modeConfig.completedCaption;
    } else if (this.timer.isRunning) {
      this.sessionCaptionEl.textContent = modeConfig.runningCaption;
    } else if (this.timer.timeLeft < this.timer.totalDuration) {
      this.sessionCaptionEl.textContent = modeConfig.pausedCaption;
    } else {
      this.sessionCaptionEl.textContent = modeConfig.idleCaption;
    }
  }

  updateCyclePill() {
    if (!this.cyclePill) return;
    const current = (this.timer.completedCycles % this.settings.longBreakInterval) + 1;
    this.cyclePill.textContent = `Session ${current} of ${this.settings.longBreakInterval}`;
  }

  triggerNotification(mode, nextMode) {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      const modeName = MODE_INFO[mode]?.name || 'Session';
      const nextName = MODE_INFO[nextMode]?.name || 'Next';

      try {
        new Notification('FocusFlow Timer Finished!', {
          body: `${modeName} is done. Ready for ${nextName}?`,
          icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⏳</text></svg>',
        });
      } catch (e) {
        // notification error fallback
      }
    }
  }

  toggleSound() {
    this.settings.soundEnabled = !this.settings.soundEnabled;
    this.soundEngine.setSoundEnabled(this.settings.soundEnabled);
    Storage.saveSettings(this.settings);
    this.updateSoundToggleUI();

    if (this.settings.soundEnabled) {
      this.soundEngine.playChime(this.settings.chimeTone);
    }
  }

  updateSoundToggleUI() {
    if (!this.btnSoundToggle) return;
    const enabled = this.settings.soundEnabled;

    if (this.soundOnIcon) this.soundOnIcon.classList.toggle('hidden', !enabled);
    if (this.soundOffIcon) this.soundOffIcon.classList.toggle('hidden', enabled);
    if (this.soundLabel) this.soundLabel.textContent = enabled ? 'Chime on' : 'Chime off';
  }

  renderTasks() {
    if (!this.taskList) return;

    const summary = this.taskManager.getSummary();

    // Update Counter
    if (this.taskCounterPill) {
      if (summary.total === 0) {
        this.taskCounterPill.textContent = '0 tasks';
      } else {
        this.taskCounterPill.textContent = `${summary.completed} of ${summary.total} done`;
      }
    }

    // Toggle Clear Done Button
    if (this.btnClearDone) {
      this.btnClearDone.classList.toggle('hidden', summary.completed === 0);
    }

    // Toggle Empty State
    if (summary.total === 0) {
      if (this.taskEmptyState) this.taskEmptyState.classList.remove('hidden');
      this.taskList.innerHTML = '';
    } else {
      if (this.taskEmptyState) this.taskEmptyState.classList.add('hidden');

      this.taskList.innerHTML = this.taskManager.tasks
        .map(task => {
          const isCurrentActive = this.taskManager.activeTaskId === task.id;
          const pomodoroBadge =
            task.pomodoros > 0
              ? `<span class="task-pomodoro-count" title="${task.pomodoros} completed focus sessions">🍅 ${task.pomodoros}</span>`
              : '';

          return `
            <li class="task-item ${task.completed ? 'completed' : ''} ${isCurrentActive ? 'active-focus' : ''}" data-id="${task.id}">
              <button type="button" class="task-check-btn" aria-label="${task.completed ? 'Mark incomplete' : 'Mark completed'}" data-action="toggle">
                <svg class="task-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </button>
              <span class="task-label" data-action="select" title="Click to focus on this task">
                ${escapeHtml(task.title)}
              </span>
              ${pomodoroBadge}
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

    // Update Active Task Pill
    const active = summary.activeTask;
    if (active && !active.completed) {
      if (this.activeTaskLabel) this.activeTaskLabel.textContent = active.title;
      if (this.activeTaskPill) this.activeTaskPill.classList.remove('hidden');
    } else if (this.activeTaskPill) {
      this.activeTaskPill.classList.add('hidden');
    }
  }

  renderStats() {
    const todayStats = this.statsManager.getTodayStats();

    if (this.statTodayFocus) {
      this.statTodayFocus.textContent = `${todayStats.focusMinutes}m`;
    }
    if (this.statTodaySessions) {
      this.statTodaySessions.textContent = todayStats.count;
    }
    if (this.statDailyStreak) {
      this.statDailyStreak.textContent = todayStats.streak;
    }

    this.renderActivityChart();
  }

  renderActivityChart() {
    if (!this.activityChart) return;

    const chartData = this.statsManager.getLast7DaysChartData();

    this.activityChart.innerHTML = chartData
      .map(item => {
        const heightPercent = Math.max(item.percentage, 5); // ensure slight visual indicator
        return `
          <div class="chart-bar-col ${item.isToday ? 'today' : ''}" title="${item.dayLabel} (${item.dateKey}): ${item.focusMinutes} mins (${item.sessionCount} sessions)">
            <div class="chart-bar-track">
              <div class="chart-bar-fill" style="height: ${heightPercent}%"></div>
            </div>
            <span class="chart-bar-day">${item.dayLabel}</span>
          </div>
        `;
      })
      .join('');
  }

  selectAmbientSound(soundType) {
    if (soundType === this.soundEngine.getCurrentAmbientType()) {
      // Clicking same sound turns it off
      this.soundEngine.stopAmbient();
      this.settings.ambientSound = 'none';
    } else {
      this.soundEngine.startAmbient(soundType);
      this.settings.ambientSound = soundType;
    }

    Storage.saveSettings(this.settings);
    this.updateAmbientUI();
  }

  updateAmbientUI() {
    const current = this.soundEngine.getCurrentAmbientType();

    if (this.presetButtons) {
      this.presetButtons.forEach(btn => {
        const isSelected = btn.dataset.sound === current;
        btn.classList.toggle('active', isSelected);
      });
    }

    if (this.soundscapeStatusBadge) {
      const labels = {
        none: 'Off',
        rain: '🌧️ Rain',
        waves: '🌊 Waves',
        whiteNoise: '⚪ White',
      };
      this.soundscapeStatusBadge.textContent = labels[current] || 'Off';
    }
  }

  // Settings Modal Handlers
  openSettingsModal() {
    if (!this.modalBackdrop) return;

    if (this.settingFocus) this.settingFocus.value = this.settings.focusDuration;
    if (this.settingShort) this.settingShort.value = this.settings.shortBreakDuration;
    if (this.settingLong) this.settingLong.value = this.settings.longBreakDuration;
    if (this.settingCycle) this.settingCycle.value = this.settings.longBreakInterval;
    if (this.settingAutoBreak) this.settingAutoBreak.checked = this.settings.autoStartBreaks;
    if (this.settingAutoFocus) this.settingAutoFocus.checked = this.settings.autoStartFocus;
    if (this.settingChimeTone) this.settingChimeTone.value = this.settings.chimeTone;
    if (this.settingChimeVolume) this.settingChimeVolume.value = this.settings.soundVolume;

    this.updateNotificationStatusUI();
    this.modalBackdrop.classList.remove('hidden');
    this.modalBackdrop.setAttribute('aria-hidden', 'false');
  }

  closeSettingsModal() {
    if (!this.modalBackdrop) return;
    this.modalBackdrop.classList.add('hidden');
    this.modalBackdrop.setAttribute('aria-hidden', 'true');
  }

  saveSettingsFromModal() {
    this.settings.focusDuration = Math.max(1, parseInt(this.settingFocus?.value, 10) || 25);
    this.settings.shortBreakDuration = Math.max(1, parseInt(this.settingShort?.value, 10) || 5);
    this.settings.longBreakDuration = Math.max(1, parseInt(this.settingLong?.value, 10) || 15);
    this.settings.longBreakInterval = Math.max(1, parseInt(this.settingCycle?.value, 10) || 4);
    this.settings.autoStartBreaks = Boolean(this.settingAutoBreak?.checked);
    this.settings.autoStartFocus = Boolean(this.settingAutoFocus?.checked);
    this.settings.chimeTone = this.settingChimeTone?.value || 'calm';
    this.settings.soundVolume = parseFloat(this.settingChimeVolume?.value) || 0.7;

    Storage.saveSettings(this.settings);
    this.soundEngine.setSoundVolume(this.settings.soundVolume);
    this.timer.updateSettings(this.settings);

    this.updateCyclePill();
    this.closeSettingsModal();
    this.render();
  }

  resetSettingsToDefault() {
    this.settings = { ...DEFAULT_SETTINGS, theme: this.settings.theme };
    Storage.saveSettings(this.settings);
    this.timer.updateSettings(this.settings);
    this.soundEngine.setSoundVolume(this.settings.soundVolume);
    this.openSettingsModal(); // Refresh modal inputs
    this.render();
  }

  updateNotificationStatusUI() {
    if (!this.notificationStatusText || !this.btnRequestNotification) return;

    if (!('Notification' in window)) {
      this.notificationStatusText.textContent = 'Notifications not supported in this browser';
      this.btnRequestNotification.classList.add('hidden');
      return;
    }

    if (Notification.permission === 'granted') {
      this.notificationStatusText.textContent = '✓ Notifications are enabled';
      this.btnRequestNotification.classList.add('hidden');
    } else if (Notification.permission === 'denied') {
      this.notificationStatusText.textContent = '✕ Notifications are blocked in browser settings';
      this.btnRequestNotification.classList.add('hidden');
    } else {
      this.notificationStatusText.textContent = 'Browser notification for session completion';
      this.btnRequestNotification.classList.remove('hidden');
    }
  }

  async requestNotificationPermission() {
    if ('Notification' in window) {
      await Notification.requestPermission();
      this.updateNotificationStatusUI();
    }
  }

  initEventListeners() {
    // Theme toggle
    this.btnThemeToggle?.addEventListener('click', () => this.toggleTheme());

    // Mode tab buttons
    this.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        if (mode && mode !== this.timer.mode) {
          this.timer.switchMode(mode);
        }
      });
    });

    // Control buttons
    this.btnStart?.addEventListener('click', () => {
      this.soundEngine.getAudioContext();
      this.timer.start();
    });
    this.btnPause?.addEventListener('click', () => this.timer.pause());
    this.btnReset?.addEventListener('click', () => this.timer.reset());

    // Sound quick toggle
    this.btnSoundToggle?.addEventListener('click', () => this.toggleSound());

    // Active Task pill click to deselect
    this.activeTaskPill?.addEventListener('click', () => {
      this.taskManager.setActiveTask(this.taskManager.activeTaskId);
    });

    // Task Form Submit
    this.taskForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (this.taskInput) {
        this.taskManager.addTask(this.taskInput.value);
        this.taskInput.value = '';
        this.taskInput.focus();
      }
    });

    // Task List click delegation
    this.taskList?.addEventListener('click', (e) => {
      const actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;

      const itemEl = e.target.closest('.task-item');
      if (!itemEl) return;

      const taskId = itemEl.dataset.id;
      const action = actionEl.dataset.action;

      if (action === 'toggle') {
        this.taskManager.toggleTask(taskId);
      } else if (action === 'delete') {
        this.taskManager.deleteTask(taskId);
      } else if (action === 'select') {
        this.taskManager.setActiveTask(taskId);
      }
    });

    // Clear completed tasks button
    this.btnClearDone?.addEventListener('click', () => {
      this.taskManager.clearCompleted();
    });

    // Ambient sound preset buttons
    this.presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const soundType = btn.dataset.sound;
        this.selectAmbientSound(soundType);
      });
    });

    // Ambient volume slider
    this.ambientSlider?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.soundEngine.setAmbientVolume(val);
      this.settings.ambientVolume = val;
      if (this.ambientPercent) {
        this.ambientPercent.textContent = `${Math.round(val * 100)}%`;
      }
      Storage.saveSettings(this.settings);
    });

    // Settings Modal
    this.btnOpenSettings?.addEventListener('click', () => this.openSettingsModal());
    this.btnCloseModal?.addEventListener('click', () => this.closeSettingsModal());
    this.modalBackdrop?.addEventListener('click', (e) => {
      if (e.target === this.modalBackdrop) {
        this.closeSettingsModal();
      }
    });

    this.settingsForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSettingsFromModal();
    });

    this.btnResetDefaults?.addEventListener('click', () => {
      this.resetSettingsToDefault();
    });

    this.btnTestChime?.addEventListener('click', () => {
      const tone = this.settingChimeTone?.value || 'calm';
      const vol = parseFloat(this.settingChimeVolume?.value) || 0.7;
      this.soundEngine.setSoundVolume(vol);
      this.soundEngine.playChime(tone);
    });

    this.btnRequestNotification?.addEventListener('click', () => {
      this.requestNotificationPermission();
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if (['input', 'textarea', 'select'].includes(e.target.tagName.toLowerCase())) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (this.timer.isRunning) {
          this.timer.pause();
        } else {
          this.soundEngine.getAudioContext();
          this.timer.start();
        }
      } else if (e.key.toLowerCase() === 'r') {
        this.timer.reset();
      } else if (e.key.toLowerCase() === 's') {
        if (this.modalBackdrop && !this.modalBackdrop.classList.contains('hidden')) {
          this.closeSettingsModal();
        } else {
          this.openSettingsModal();
        }
      } else if (e.key === 'Escape') {
        this.closeSettingsModal();
      }
    });
  }

  render() {
    this.handleTimerModeChange({ mode: this.timer.mode });
    this.handleTimerTick({
      timeLeft: this.timer.timeLeft,
      totalDuration: this.timer.totalDuration,
      mode: this.timer.mode,
      progressRatio: this.timer.getProgressRatio(),
      formattedTime: PomodoroTimer.formatTime(this.timer.timeLeft),
    });
    this.handleTimerStateChange({ isRunning: this.timer.isRunning });
    this.updateSoundToggleUI();
    this.updateAmbientUI();
    this.renderTasks();
    this.renderStats();
    this.updateCyclePill();
  }
}

// Bootstrap once DOM ready
if (typeof window !== 'undefined') {
  window.appController = new AppController();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.appController.init());
  } else {
    window.appController.init();
  }
}
