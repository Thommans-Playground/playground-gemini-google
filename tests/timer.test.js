import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PomodoroTimer, TIMER_MODES } from '../src/timer.js';

describe('PomodoroTimer Engine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default durations in seconds', () => {
    const timer = new PomodoroTimer();
    expect(timer.mode).toBe(TIMER_MODES.FOCUS);
    expect(timer.totalDuration).toBe(25 * 60);
    expect(timer.timeLeft).toBe(25 * 60);
    expect(timer.isRunning).toBe(false);
  });

  it('formats seconds properly into MM:SS', () => {
    expect(PomodoroTimer.formatTime(1500)).toBe('25:00');
    expect(PomodoroTimer.formatTime(65)).toBe('01:05');
    expect(PomodoroTimer.formatTime(0)).toBe('00:00');
    expect(PomodoroTimer.formatTime(-5)).toBe('00:00');
  });

  it('switches modes and updates durations', () => {
    const timer = new PomodoroTimer();
    timer.switchMode(TIMER_MODES.SHORT_BREAK);
    expect(timer.mode).toBe(TIMER_MODES.SHORT_BREAK);
    expect(timer.totalDuration).toBe(5 * 60);
    expect(timer.timeLeft).toBe(5 * 60);

    timer.switchMode(TIMER_MODES.LONG_BREAK);
    expect(timer.mode).toBe(TIMER_MODES.LONG_BREAK);
    expect(timer.totalDuration).toBe(15 * 60);
  });

  it('starts countdown and ticks down over time', () => {
    const tickSpy = vi.fn();
    const timer = new PomodoroTimer({ onTick: tickSpy });

    timer.start();
    expect(timer.isRunning).toBe(true);

    vi.advanceTimersByTime(2000);
    expect(timer.timeLeft).toBeLessThanOrEqual(25 * 60 - 2);
    expect(tickSpy).toHaveBeenCalled();

    timer.pause();
    expect(timer.isRunning).toBe(false);
    const pausedTime = timer.timeLeft;

    vi.advanceTimersByTime(3000);
    expect(timer.timeLeft).toBe(pausedTime);
  });

  it('resets timer properly back to mode total duration', () => {
    const timer = new PomodoroTimer();
    timer.start();
    vi.advanceTimersByTime(5000);
    expect(timer.timeLeft).toBeLessThan(25 * 60);

    timer.reset();
    expect(timer.isRunning).toBe(false);
    expect(timer.timeLeft).toBe(25 * 60);
  });

  it('triggers onComplete and transitions to short break on cycle 1', () => {
    const completeSpy = vi.fn();
    const timer = new PomodoroTimer({
      settings: { focusDuration: 1 / 60 }, // 1 second focus for quick test
      onComplete: completeSpy,
    });

    timer.start();
    vi.advanceTimersByTime(1500);

    expect(completeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: TIMER_MODES.FOCUS,
        nextMode: TIMER_MODES.SHORT_BREAK,
        completedCycles: 1,
      })
    );
    expect(timer.mode).toBe(TIMER_MODES.SHORT_BREAK);
    expect(timer.isRunning).toBe(false);
  });

  it('triggers long break after configured longBreakInterval cycles', () => {
    const completeSpy = vi.fn();
    const timer = new PomodoroTimer({
      completedCycles: 3,
      settings: { focusDuration: 1 / 60, longBreakInterval: 4 },
      onComplete: completeSpy,
    });

    timer.start();
    vi.advanceTimersByTime(1500);

    expect(completeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: TIMER_MODES.FOCUS,
        nextMode: TIMER_MODES.LONG_BREAK,
        completedCycles: 4,
      })
    );
    expect(timer.mode).toBe(TIMER_MODES.LONG_BREAK);
  });

  it('supports auto-start breaks setting', () => {
    const timer = new PomodoroTimer({
      settings: {
        focusDuration: 1 / 60,
        autoStartBreaks: true,
      },
    });

    timer.start();
    vi.advanceTimersByTime(1500);

    expect(timer.mode).toBe(TIMER_MODES.SHORT_BREAK);
    expect(timer.isRunning).toBe(true);
    timer.destroy();
  });

  it('updates durations dynamically on settings change', () => {
    const timer = new PomodoroTimer();
    expect(timer.timeLeft).toBe(25 * 60);

    timer.updateSettings({ focusDuration: 30 });
    expect(timer.totalDuration).toBe(30 * 60);
    expect(timer.timeLeft).toBe(30 * 60);
  });
});
