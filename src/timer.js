/**
 * Timer Engine Module
 * High-precision countdown timer with state machine, mode transitions, and callback events.
 */

export const TIMER_MODES = {
  FOCUS: 'focus',
  SHORT_BREAK: 'shortBreak',
  LONG_BREAK: 'longBreak',
};

export const MODE_INFO = {
  [TIMER_MODES.FOCUS]: {
    name: 'Focus Time',
    themeClass: 'theme-focus',
    idleCaption: 'Ready to focus',
    runningCaption: 'Stay in the flow',
    pausedCaption: 'Session paused',
    completedCaption: 'Focus session complete! 🎉',
  },
  [TIMER_MODES.SHORT_BREAK]: {
    name: 'Short Break',
    themeClass: 'theme-shortBreak',
    idleCaption: 'Time to unwind',
    runningCaption: 'Rest your eyes & breathe',
    pausedCaption: 'Break paused',
    completedCaption: 'Break finished! Ready to focus?',
  },
  [TIMER_MODES.LONG_BREAK]: {
    name: 'Long Break',
    themeClass: 'theme-longBreak',
    idleCaption: 'Extended refresh',
    runningCaption: 'Step away & recharge',
    pausedCaption: 'Break paused',
    completedCaption: 'Long break done! Refreshed & set.',
  },
};

export class PomodoroTimer {
  constructor(options = {}) {
    this.settings = {
      focusDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      longBreakInterval: 4,
      autoStartBreaks: false,
      autoStartFocus: false,
      ...options.settings,
    };

    this.mode = TIMER_MODES.FOCUS;
    this.totalDuration = this.getDurationForMode(this.mode);
    this.timeLeft = this.totalDuration;
    this.isRunning = false;
    this.timerInterval = null;
    this.endTime = null;
    this.completedCycles = options.completedCycles || 0;

    // Callbacks
    this.onTick = options.onTick || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.onModeChange = options.onModeChange || (() => {});
    this.onStateChange = options.onStateChange || (() => {});
  }

  getDurationForMode(mode) {
    if (mode === TIMER_MODES.FOCUS) {
      return this.settings.focusDuration * 60;
    }
    if (mode === TIMER_MODES.SHORT_BREAK) {
      return this.settings.shortBreakDuration * 60;
    }
    if (mode === TIMER_MODES.LONG_BREAK) {
      return this.settings.longBreakDuration * 60;
    }
    return 25 * 60;
  }

  static formatTime(seconds) {
    const safeSecs = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(safeSecs / 60);
    const secs = safeSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  getProgressRatio() {
    if (this.totalDuration <= 0) return 0;
    return Math.max(0, Math.min(1, this.timeLeft / this.totalDuration));
  }

  start() {
    if (this.isRunning) return;

    if (this.timeLeft <= 0) {
      this.timeLeft = this.totalDuration;
    }

    this.isRunning = true;
    this.endTime = Date.now() + this.timeLeft * 1000;

    this.timerInterval = setInterval(() => {
      this.tick();
    }, 250);

    this.emitStateChange();
    this.emitTick();
  }

  tick() {
    if (!this.isRunning) return;

    const remaining = Math.ceil((this.endTime - Date.now()) / 1000);

    if (remaining <= 0) {
      this.timeLeft = 0;
      this.handleSessionCompleted();
    } else {
      this.timeLeft = remaining;
      this.emitTick();
    }
  }

  handleSessionCompleted() {
    this.pause();

    const previousMode = this.mode;
    let nextMode = TIMER_MODES.FOCUS;

    if (previousMode === TIMER_MODES.FOCUS) {
      this.completedCycles += 1;
      const shouldLongBreak = this.completedCycles % this.settings.longBreakInterval === 0;
      nextMode = shouldLongBreak ? TIMER_MODES.LONG_BREAK : TIMER_MODES.SHORT_BREAK;
    } else {
      nextMode = TIMER_MODES.FOCUS;
    }

    this.onComplete({
      mode: previousMode,
      nextMode,
      completedCycles: this.completedCycles,
    });

    const shouldAutoStart =
      (previousMode === TIMER_MODES.FOCUS && this.settings.autoStartBreaks) ||
      (previousMode !== TIMER_MODES.FOCUS && this.settings.autoStartFocus);

    this.switchMode(nextMode);

    if (shouldAutoStart) {
      this.start();
    }
  }

  pause() {
    if (!this.isRunning) return;

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.isRunning = false;
    this.emitStateChange();
    this.emitTick();
  }

  reset() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.isRunning = false;
    this.timeLeft = this.totalDuration;
    this.emitStateChange();
    this.emitTick();
  }

  switchMode(newMode) {
    if (!MODE_INFO[newMode]) return;

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.isRunning = false;

    this.mode = newMode;
    this.totalDuration = this.getDurationForMode(newMode);
    this.timeLeft = this.totalDuration;

    this.onModeChange({
      mode: this.mode,
      totalDuration: this.totalDuration,
      timeLeft: this.timeLeft,
    });
    this.emitStateChange();
    this.emitTick();
  }

  updateSettings(newSettings) {
    const prevMode = this.mode;
    const prevTotal = this.totalDuration;
    const prevLeft = this.timeLeft;

    this.settings = { ...this.settings, ...newSettings };
    this.totalDuration = this.getDurationForMode(prevMode);

    // If timer is not running and was at full duration, update timeLeft too
    if (!this.isRunning && prevLeft === prevTotal) {
      this.timeLeft = this.totalDuration;
    } else {
      // Bound timeLeft to new total
      this.timeLeft = Math.min(this.timeLeft, this.totalDuration);
    }

    this.emitTick();
  }

  emitTick() {
    this.onTick({
      timeLeft: this.timeLeft,
      totalDuration: this.totalDuration,
      mode: this.mode,
      progressRatio: this.getProgressRatio(),
      formattedTime: PomodoroTimer.formatTime(this.timeLeft),
    });
  }

  emitStateChange() {
    this.onStateChange({
      isRunning: this.isRunning,
      mode: this.mode,
      timeLeft: this.timeLeft,
      completedCycles: this.completedCycles,
    });
  }

  destroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.isRunning = false;
  }
}
