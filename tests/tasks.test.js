import { describe, it, expect, vi } from 'vitest';
import { TaskManager } from '../src/tasks.js';

describe('TaskManager Module', () => {
  it('initializes with given tasks and auto-selects first incomplete task', () => {
    const tasks = [
      { id: '1', title: 'Task 1', completed: true },
      { id: '2', title: 'Task 2', completed: false },
    ];
    const manager = new TaskManager({ initialTasks: tasks });
    expect(manager.activeTaskId).toBe('2');
    expect(manager.getActiveTask()?.title).toBe('Task 2');
  });

  it('adds a new task and rejects empty titles', () => {
    const changeSpy = vi.fn();
    const manager = new TaskManager({ onChange: changeSpy });

    const task = manager.addTask('Write unit tests');
    expect(task).toBeDefined();
    expect(task?.title).toBe('Write unit tests');
    expect(manager.tasks.length).toBe(1);
    expect(manager.activeTaskId).toBe(task?.id);
    expect(changeSpy).toHaveBeenCalled();

    const empty = manager.addTask('   ');
    expect(empty).toBeNull();
    expect(manager.tasks.length).toBe(1);
  });

  it('toggles task completion and switches active task to next incomplete', () => {
    const manager = new TaskManager({
      initialTasks: [
        { id: '1', title: 'Task 1', completed: false },
        { id: '2', title: 'Task 2', completed: false },
      ],
      initialActiveTaskId: '1',
    });

    manager.toggleTask('1');
    expect(manager.tasks.find(t => t.id === '1')?.completed).toBe(true);
    // Should advance activeTaskId to Task 2
    expect(manager.activeTaskId).toBe('2');
  });

  it('deletes a task and handles activeTaskId fallback', () => {
    const manager = new TaskManager({
      initialTasks: [
        { id: '1', title: 'Task 1', completed: false },
        { id: '2', title: 'Task 2', completed: false },
      ],
      initialActiveTaskId: '1',
    });

    manager.deleteTask('1');
    expect(manager.tasks.length).toBe(1);
    expect(manager.activeTaskId).toBe('2');
  });

  it('clears completed tasks properly', () => {
    const manager = new TaskManager({
      initialTasks: [
        { id: '1', title: 'Task 1', completed: true },
        { id: '2', title: 'Task 2', completed: false },
        { id: '3', title: 'Task 3', completed: true },
      ],
      initialActiveTaskId: '1',
    });

    const removed = manager.clearCompleted();
    expect(removed).toBe(2);
    expect(manager.tasks.length).toBe(1);
    expect(manager.activeTaskId).toBe('2');
  });

  it('increments pomodoro count on active task', () => {
    const manager = new TaskManager({
      initialTasks: [{ id: '1', title: 'Task 1', completed: false, pomodoros: 1 }],
      initialActiveTaskId: '1',
    });

    manager.incrementActiveTaskPomodoro();
    expect(manager.getActiveTask()?.pomodoros).toBe(2);
  });
});
