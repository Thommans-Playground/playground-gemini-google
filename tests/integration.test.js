import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AppController } from '../src/app.js';
import { Storage, DEFAULT_SETTINGS } from '../src/storage.js';

describe('FocusFlow Integration Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();

    // Set up mock DOM elements corresponding to index.html
    document.body.innerHTML = `
      <div id="btn-theme-toggle">
        <span class="theme-icon-sun"></span>
        <span class="theme-icon-moon hidden"></span>
      </div>
      <button id="btn-open-settings"></button>
      <div class="mode-tabs">
        <button class="tab-btn active" data-mode="focus" id="tab-focus"></button>
        <button class="tab-btn" data-mode="shortBreak" id="tab-short"></button>
        <button class="tab-btn" data-mode="longBreak" id="tab-long"></button>
      </div>
      <div id="active-task-pill" class="hidden">
        <span id="active-task-label"></span>
      </div>
      <svg><circle id="progress-circle" /></svg>
      <span id="mode-indicator"></span>
      <div id="time-display">25:00</div>
      <span id="session-caption"></span>
      <span id="cycle-pill"></span>
      <button id="btn-start"></button>
      <button id="btn-pause" disabled></button>
      <button id="btn-reset"></button>
      <button id="btn-sound-toggle">
        <span class="sound-on"></span>
        <span class="sound-off hidden"></span>
        <span class="sound-label">Chime on</span>
      </button>

      <!-- Tasks -->
      <section class="task-card">
        <span id="task-counter-pill"></span>
        <button id="btn-clear-done" class="hidden"></button>
        <form id="task-form">
          <input type="text" id="task-input" />
          <button id="btn-add-task" type="submit"></button>
        </form>
        <ul id="task-list"></ul>
        <div id="task-empty-state" class="hidden"></div>
      </section>

      <!-- Analytics -->
      <span id="stat-today-focus">0m</span>
      <span id="stat-today-sessions">0</span>
      <span id="stat-daily-streak">0</span>
      <div id="activity-chart"></div>

      <!-- Soundscapes -->
      <button class="preset-btn active" data-sound="none"></button>
      <button class="preset-btn" data-sound="rain"></button>
      <button class="preset-btn" data-sound="waves"></button>
      <button class="preset-btn" data-sound="whiteNoise"></button>
      <span id="soundscape-status-badge">Off</span>
      <input type="range" id="ambient-volume-slider" value="0.4" />
      <span id="ambient-volume-percent">40%</span>

      <!-- Settings Modal -->
      <div id="settings-modal-backdrop" class="hidden">
        <form id="settings-form">
          <button id="btn-close-modal" type="button"></button>
          <input id="setting-focus" type="number" />
          <input id="setting-short" type="number" />
          <input id="setting-long" type="number" />
          <input id="setting-cycle" type="number" />
          <input id="setting-autobreak" type="checkbox" />
          <input id="setting-autofocus" type="checkbox" />
          <select id="setting-chime-tone"><option value="calm">Calm</option></select>
          <input id="setting-chime-volume" type="range" />
          <button id="btn-test-chime" type="button"></button>
          <span id="notification-status-text"></span>
          <button id="btn-request-notification" type="button"></button>
          <button id="btn-reset-defaults" type="button"></button>
          <button type="submit">Save</button>
        </form>
      </div>
    `;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes controller, binds DOM and renders timer & task state', () => {
    const controller = new AppController();
    controller.init();

    expect(document.getElementById('time-display')?.textContent).toBe('25:00');
    expect(document.getElementById('mode-indicator')?.textContent).toBe('Focus Time');
    expect(document.getElementById('cycle-pill')?.textContent).toBe('Session 1 of 4');

    // Default tasks rendered
    const taskItems = document.querySelectorAll('.task-item');
    expect(taskItems.length).toBe(2);
  });

  it('allows adding and completing tasks through UI events', () => {
    const controller = new AppController();
    controller.init();

    const taskInput = document.getElementById('task-input');
    const taskForm = document.getElementById('task-form');

    // Add a new task
    taskInput.value = 'Finish architectural tests';
    taskForm.dispatchEvent(new Event('submit'));

    expect(document.querySelectorAll('.task-item').length).toBe(3);

    // Toggle the first task completed
    const firstCheckBtn = document.querySelector('.task-item .task-check-btn');
    firstCheckBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(document.querySelector('.task-item')?.classList.contains('completed')).toBe(true);
    expect(document.getElementById('btn-clear-done')?.classList.contains('hidden')).toBe(false);
  });

  it('starts, pauses, and resets timer with control buttons', () => {
    const controller = new AppController();
    controller.init();

    const btnStart = document.getElementById('btn-start');
    const btnPause = document.getElementById('btn-pause');
    const btnReset = document.getElementById('btn-reset');
    const timeDisplay = document.getElementById('time-display');

    btnStart?.click();
    expect(controller.timer.isRunning).toBe(true);
    expect(btnStart.disabled).toBe(true);
    expect(btnPause.disabled).toBe(false);

    vi.advanceTimersByTime(2000);
    expect(timeDisplay.textContent).toBe('24:58');

    btnPause?.click();
    expect(controller.timer.isRunning).toBe(false);

    btnReset?.click();
    expect(timeDisplay.textContent).toBe('25:00');
  });

  it('completes focus session, records stats, and transitions to break', () => {
    const controller = new AppController();
    controller.init();

    // Set 1s focus for quick completion test
    controller.timer.settings.focusDuration = 1 / 60;
    controller.timer.totalDuration = 1;
    controller.timer.timeLeft = 1;

    controller.timer.start();
    vi.advanceTimersByTime(1200);

    // Timer completes, records stats
    const todayStats = controller.statsManager.getTodayStats();
    expect(todayStats.count).toBe(1);
    expect(document.getElementById('stat-today-sessions')?.textContent).toBe('1');
    expect(controller.timer.mode).toBe('shortBreak');
  });

  it('toggles dark and light theme', () => {
    const controller = new AppController();
    controller.init();

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    document.getElementById('btn-theme-toggle')?.click();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(Storage.getSettings().theme).toBe('dark');

    document.getElementById('btn-theme-toggle')?.click();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('opens and saves settings modal', () => {
    const controller = new AppController();
    controller.init();

    const btnOpenSettings = document.getElementById('btn-open-settings');
    btnOpenSettings?.click();

    const backdrop = document.getElementById('settings-modal-backdrop');
    expect(backdrop?.classList.contains('hidden')).toBe(false);

    const settingFocus = document.getElementById('setting-focus');
    settingFocus.value = '50';

    const settingsForm = document.getElementById('settings-form');
    settingsForm?.dispatchEvent(new Event('submit'));

    expect(backdrop?.classList.contains('hidden')).toBe(true);
    expect(controller.settings.focusDuration).toBe(50);
    expect(Storage.getSettings().focusDuration).toBe(50);
    expect(document.getElementById('time-display')?.textContent).toBe('50:00');
  });

  it('selects ambient sounds from preset buttons', () => {
    const controller = new AppController();
    controller.init();

    const rainBtn = document.querySelector('.preset-btn[data-sound="rain"]');
    rainBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(controller.soundEngine.getCurrentAmbientType()).toBe('rain');
    expect(document.getElementById('soundscape-status-badge')?.textContent).toContain('Rain');

    // Click again toggles off
    rainBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(controller.soundEngine.getCurrentAmbientType()).toBe('none');
  });
});
