import { describe, it, expect, vi } from 'vitest';
import { StatsManager } from '../src/stats.js';

describe('StatsManager Module', () => {
  it('formats date key properly', () => {
    const d = new Date('2026-10-09T10:00:00Z');
    expect(StatsManager.formatDateKey(d)).toBe('2026-10-09');
  });

  it('records focus sessions and ignores breaks', () => {
    const stats = new StatsManager();
    const sess1 = stats.recordSession({ mode: 'shortBreak', durationMinutes: 5 });
    expect(sess1).toBeNull();
    expect(stats.sessions.length).toBe(0);

    const sess2 = stats.recordSession({
      mode: 'focus',
      durationMinutes: 25,
      taskId: 't1',
      taskTitle: 'Write code',
      timestamp: new Date('2026-10-09T12:00:00').getTime(),
    });

    expect(sess2).toBeDefined();
    expect(stats.sessions.length).toBe(1);
    expect(stats.streakDays).toContain('2026-10-09');
  });

  it('calculates today stats correctly', () => {
    const fakeNow = new Date('2026-10-09T15:00:00');
    const stats = new StatsManager();

    stats.recordSession({
      mode: 'focus',
      durationMinutes: 25,
      timestamp: fakeNow.getTime(),
    });
    stats.recordSession({
      mode: 'focus',
      durationMinutes: 50,
      timestamp: fakeNow.getTime(),
    });

    const todayStats = stats.getTodayStats(fakeNow);
    expect(todayStats.count).toBe(2);
    expect(todayStats.focusMinutes).toBe(75);
    expect(todayStats.streak).toBe(1);
  });

  it('calculates consecutive daily streak correctly', () => {
    const stats = new StatsManager();
    const day1 = new Date('2026-10-07T10:00:00');
    const day2 = new Date('2026-10-08T10:00:00');
    const day3 = new Date('2026-10-09T10:00:00');

    stats.recordSession({ mode: 'focus', durationMinutes: 25, timestamp: day1.getTime() });
    stats.recordSession({ mode: 'focus', durationMinutes: 25, timestamp: day2.getTime() });
    stats.recordSession({ mode: 'focus', durationMinutes: 25, timestamp: day3.getTime() });

    expect(stats.getCurrentStreak(day3)).toBe(3);

    // If day 4 has not happened yet, but day 3 did, streak is still maintained
    const day4Morning = new Date('2026-10-10T08:00:00');
    expect(stats.getCurrentStreak(day4Morning)).toBe(3);

    // If day 5 arrives and neither day 4 nor day 5 had sessions, streak is 0
    const day5 = new Date('2026-10-11T10:00:00');
    expect(stats.getCurrentStreak(day5)).toBe(0);
  });

  it('generates 7-day chart data with percentages', () => {
    const now = new Date('2026-10-09T12:00:00');
    const stats = new StatsManager();

    stats.recordSession({ mode: 'focus', durationMinutes: 60, timestamp: now.getTime() });

    const chartData = stats.getLast7DaysChartData(now);
    expect(chartData.length).toBe(7);
    const todayData = chartData[chartData.length - 1];
    expect(todayData.isToday).toBe(true);
    expect(todayData.focusMinutes).toBe(60);
    expect(todayData.percentage).toBe(100);
  });
});
