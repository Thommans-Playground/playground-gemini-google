import { describe, it, expect, beforeEach } from 'vitest';
import { Storage, DEFAULT_SETTINGS, DEFAULT_TASKS, STORAGE_KEYS } from '../src/storage.js';

describe('Storage Module', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns default settings when nothing is in storage', () => {
    const settings = Storage.getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('merges saved settings with defaults', () => {
    Storage.saveSettings({ focusDuration: 50, soundEnabled: false });
    const settings = Storage.getSettings();
    expect(settings.focusDuration).toBe(50);
    expect(settings.soundEnabled).toBe(false);
    expect(settings.shortBreakDuration).toBe(DEFAULT_SETTINGS.shortBreakDuration);
  });

  it('handles getTasks and default initial tasks', () => {
    const tasks = Storage.getTasks();
    expect(tasks).toEqual(DEFAULT_TASKS);

    const customTasks = [{ id: '1', title: 'Task 1', completed: true }];
    Storage.saveTasks(customTasks);
    expect(Storage.getTasks()).toEqual(customTasks);
  });

  it('saves and retrieves activeTaskId correctly', () => {
    expect(Storage.getActiveTaskId()).toBeNull();
    Storage.setActiveTaskId('task-99');
    expect(Storage.getActiveTaskId()).toBe('task-99');
    Storage.setActiveTaskId(null);
    expect(Storage.getActiveTaskId()).toBeNull();
  });

  it('saves and retrieves stats correctly', () => {
    const defaultStats = Storage.getStats();
    expect(defaultStats.sessions).toEqual([]);
    expect(defaultStats.streakDays).toEqual([]);

    const newStats = { sessions: [{ id: 1, durationMinutes: 25 }], streakDays: ['2026-10-09'] };
    Storage.saveStats(newStats);
    expect(Storage.getStats()).toEqual(newStats);
  });
});
