/**
 * Stats and Analytics Module
 * Tracks focus session history, calculates daily focus minutes, current streak, and 7-day activity.
 */

export class StatsManager {
  constructor(initialData = {}) {
    this.sessions = Array.isArray(initialData.sessions) ? [...initialData.sessions] : [];
    this.streakDays = Array.isArray(initialData.streakDays) ? [...initialData.streakDays] : [];
    this.onChange = initialData.onChange || (() => {});
  }

  static formatDateKey(dateObj = new Date()) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  static getDayLabel(dateObj = new Date()) {
    return dateObj.toLocaleDateString(undefined, { weekday: 'short' });
  }

  recordSession({ mode, durationMinutes = 25, taskId = null, taskTitle = null, timestamp = Date.now() }) {
    if (mode !== 'focus') return null;

    const dateKey = StatsManager.formatDateKey(new Date(timestamp));
    const session = {
      id: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp,
      dateKey,
      mode,
      durationMinutes: Math.round(durationMinutes),
      taskId,
      taskTitle,
    };

    this.sessions.push(session);

    if (!this.streakDays.includes(dateKey)) {
      this.streakDays.push(dateKey);
      this.streakDays.sort();
    }

    this.emitChange();
    return session;
  }

  getTodayStats(now = new Date()) {
    const todayKey = StatsManager.formatDateKey(now);
    const todaySessions = this.sessions.filter(s => s.dateKey === todayKey);

    const count = todaySessions.length;
    const focusMinutes = todaySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

    return {
      dateKey: todayKey,
      count,
      focusMinutes,
      streak: this.getCurrentStreak(now),
    };
  }

  getCurrentStreak(now = new Date()) {
    if (this.streakDays.length === 0) return 0;

    const sortedDays = Array.from(new Set(this.streakDays)).sort().reverse();
    const todayKey = StatsManager.formatDateKey(now);

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = StatsManager.formatDateKey(yesterday);

    // If neither today nor yesterday has a recorded session, the streak is broken (0)
    if (!sortedDays.includes(todayKey) && !sortedDays.includes(yesterdayKey)) {
      return 0;
    }

    let streak = 0;
    let checkDate = sortedDays.includes(todayKey) ? new Date(now) : yesterday;

    while (true) {
      const key = StatsManager.formatDateKey(checkDate);
      if (sortedDays.includes(key)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  getLast7DaysChartData(now = new Date()) {
    const todayKey = StatsManager.formatDateKey(now);
    const result = [];

    // Past 6 days + today
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = StatsManager.formatDateKey(d);
      const dayLabel = StatsManager.getDayLabel(d);

      const daySessions = this.sessions.filter(s => s.dateKey === dateKey);
      const focusMinutes = daySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
      const sessionCount = daySessions.length;

      result.push({
        dateKey,
        dayLabel,
        focusMinutes,
        sessionCount,
        isToday: dateKey === todayKey,
      });
    }

    const maxMinutes = Math.max(...result.map(r => r.focusMinutes), 60); // min scale 60 mins

    return result.map(item => ({
      ...item,
      percentage: Math.min(100, Math.round((item.focusMinutes / maxMinutes) * 100)),
    }));
  }

  clearAll() {
    this.sessions = [];
    this.streakDays = [];
    this.emitChange();
  }

  toJSON() {
    return {
      sessions: this.sessions,
      streakDays: this.streakDays,
    };
  }

  emitChange() {
    this.onChange(this.toJSON());
  }
}
