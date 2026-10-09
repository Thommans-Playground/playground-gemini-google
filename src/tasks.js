/**
 * Task Management Module
 * Handles task state, completion toggling, active session tracking, and persistence triggers.
 */

export class TaskManager {
  constructor(options = {}) {
    this.tasks = options.initialTasks ? [...options.initialTasks] : [];
    this.activeTaskId = options.initialActiveTaskId || null;
    this.onChange = options.onChange || (() => {});

    // Ensure activeTaskId points to a valid, incomplete task if possible
    this.reconcileActiveTask();
  }

  reconcileActiveTask() {
    if (this.activeTaskId) {
      const active = this.tasks.find(t => t.id === this.activeTaskId);
      if (!active || active.completed) {
        const nextIncomplete = this.tasks.find(t => !t.completed);
        this.activeTaskId = nextIncomplete ? nextIncomplete.id : null;
      }
    } else if (this.tasks.length > 0) {
      const firstIncomplete = this.tasks.find(t => !t.completed);
      if (firstIncomplete) {
        this.activeTaskId = firstIncomplete.id;
      }
    }
  }

  addTask(title) {
    const trimmed = (title || '').trim();
    if (!trimmed) return null;

    const newTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title: trimmed,
      completed: false,
      createdAt: Date.now(),
      pomodoros: 0,
    };

    this.tasks.push(newTask);

    if (!this.activeTaskId) {
      this.activeTaskId = newTask.id;
    }

    this.emitChange();
    return newTask;
  }

  toggleTask(id) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return false;

    task.completed = !task.completed;

    if (task.completed && this.activeTaskId === id) {
      const nextIncomplete = this.tasks.find(t => !t.completed && t.id !== id);
      this.activeTaskId = nextIncomplete ? nextIncomplete.id : null;
    } else if (!task.completed && !this.activeTaskId) {
      this.activeTaskId = id;
    }

    this.emitChange();
    return true;
  }

  deleteTask(id) {
    const prevCount = this.tasks.length;
    this.tasks = this.tasks.filter(t => t.id !== id);

    if (this.tasks.length !== prevCount) {
      if (this.activeTaskId === id) {
        const nextIncomplete = this.tasks.find(t => !t.completed);
        this.activeTaskId = nextIncomplete ? nextIncomplete.id : null;
      }
      this.emitChange();
      return true;
    }
    return false;
  }

  setActiveTask(id) {
    if (this.activeTaskId === id) {
      // Toggle off
      this.activeTaskId = null;
    } else {
      const exists = this.tasks.some(t => t.id === id);
      if (exists) {
        this.activeTaskId = id;
      }
    }
    this.emitChange();
  }

  incrementActiveTaskPomodoro() {
    if (!this.activeTaskId) return;
    const task = this.tasks.find(t => t.id === this.activeTaskId);
    if (task) {
      task.pomodoros = (task.pomodoros || 0) + 1;
      this.emitChange();
    }
  }

  clearCompleted() {
    const hadCompleted = this.tasks.some(t => t.completed);
    if (!hadCompleted) return 0;

    const countBefore = this.tasks.length;
    this.tasks = this.tasks.filter(t => !t.completed);
    const removedCount = countBefore - this.tasks.length;

    this.reconcileActiveTask();
    this.emitChange();
    return removedCount;
  }

  getActiveTask() {
    if (!this.activeTaskId) return null;
    return this.tasks.find(t => t.id === this.activeTaskId) || null;
  }

  getSummary() {
    const total = this.tasks.length;
    const completed = this.tasks.filter(t => t.completed).length;
    return {
      total,
      completed,
      activeTask: this.getActiveTask(),
    };
  }

  emitChange() {
    this.onChange({
      tasks: [...this.tasks],
      activeTaskId: this.activeTaskId,
      summary: this.getSummary(),
    });
  }
}
