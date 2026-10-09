/**
 * Storage Abstraction Module
 * Provides safe localStorage access with fallback handling and structured defaults.
 */

export const STORAGE_KEYS = {
  TASKS: 'pomodoro_tasks',
  ACTIVE_TASK_ID: 'pomodoro_active_task_id',
  SETTINGS: 'pomodoro_settings',
  STATS: 'pomodoro_stats',
};

export const DEFAULT_SETTINGS = {
  focusDuration: 25, // minutes
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4, // cycles before long break
  autoStartBreaks: false,
  autoStartFocus: false,
  soundEnabled: true,
  soundVolume: 0.7,
  chimeTone: 'calm',
  theme: 'light', // 'light' or 'dark'
  ambientSound: 'none', // 'none', 'rain', 'waves', 'whiteNoise'
  ambientVolume: 0.4,
};

export const DEFAULT_TASKS = [
  { id: 'task-1', title: 'Focus on main priority', completed: false, createdAt: Date.now() },
  { id: 'task-2', title: 'Review notes & wrap up', completed: false, createdAt: Date.now() + 1 },
];

export const Storage = {
  /**
   * Safely read JSON data from localStorage
   */
  get(key, defaultValue = null) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return defaultValue;
      }
      const raw = window.localStorage.getItem(key);
      if (raw === null || raw === undefined) {
        return defaultValue;
      }
      return JSON.parse(raw);
    } catch (err) {
      console.warn(`Storage.get failed for key "${key}":`, err);
      return defaultValue;
    }
  },

  /**
   * Safely write JSON data to localStorage
   */
  set(key, value) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn(`Storage.set failed for key "${key}":`, err);
    }
  },

  /**
   * Safely remove a key
   */
  remove(key) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.removeItem(key);
    } catch (err) {
      console.warn(`Storage.remove failed for key "${key}":`, err);
    }
  },

  /**
   * Helper to load settings merged with defaults
   */
  getSettings() {
    const saved = this.get(STORAGE_KEYS.SETTINGS, {});
    return { ...DEFAULT_SETTINGS, ...saved };
  },

  /**
   * Helper to save settings
   */
  saveSettings(settings) {
    this.set(STORAGE_KEYS.SETTINGS, settings);
  },

  /**
   * Helper to get tasks
   */
  getTasks() {
    const saved = this.get(STORAGE_KEYS.TASKS, null);
    if (!saved || !Array.isArray(saved)) {
      return DEFAULT_TASKS;
    }
    return saved;
  },

  /**
   * Helper to save tasks
   */
  saveTasks(tasks) {
    this.set(STORAGE_KEYS.TASKS, tasks);
  },

  /**
   * Helper to get active task ID
   */
  getActiveTaskId() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      return window.localStorage.getItem(STORAGE_KEYS.ACTIVE_TASK_ID) || null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Helper to set active task ID
   */
  setActiveTaskId(id) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      if (id) {
        window.localStorage.setItem(STORAGE_KEYS.ACTIVE_TASK_ID, id);
      } else {
        window.localStorage.removeItem(STORAGE_KEYS.ACTIVE_TASK_ID);
      }
    } catch (e) {
      // ignore
    }
  },

  /**
   * Helper to get stats
   */
  getStats() {
    return this.get(STORAGE_KEYS.STATS, {
      sessions: [], // { id, timestamp, mode, durationMinutes, taskId }
      streakDays: [], // list of YYYY-MM-DD
    });
  },

  /**
   * Helper to save stats
   */
  saveStats(stats) {
    this.set(STORAGE_KEYS.STATS, stats);
  },
};
