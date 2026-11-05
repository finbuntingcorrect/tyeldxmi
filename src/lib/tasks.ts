import type { Task, TaskFilter } from '../types';

export function filterTasks(tasks: Task[], filter: TaskFilter): Task[] {
  if (filter === 'active') return tasks.filter((task) => !task.completed);
  if (filter === 'done') return tasks.filter((task) => task.completed);
  return tasks;
}

export function earlierTasksPrompt(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const one = mod10 === 1 && mod100 !== 11;
  const few = mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14);
  const noun = one
    ? 'незавершённая задача'
    : few
      ? 'незавершённые задачи'
      : 'незавершённых задач';
  const verb = one ? 'Осталась' : 'Остались';
  return `${verb} ${count} ${noun} с прошлых дней. Перенести на сегодня?`;
}

export function emptyCopy(filter: TaskFilter, totalToday: number): string {
  if (totalToday === 0) {
    return 'На сегодня ещё нет задач. Добавьте первую — котёнок включится в работу.';
  }
  if (filter === 'active') return 'В работе ничего не осталось.';
  if (filter === 'done') return 'Выполненных задач пока нет.';
  return 'В этом фильтре пусто.';
}
