import type { Task } from '../types';
import { TaskItem } from './TaskItem';

type TaskListProps = {
  tasks: Task[];
  emptyLabel: string;
  onToggle: (id: string) => void;
  onRename: (id: string, title: string) => Promise<boolean>;
  onDelete: (id: string) => void;
};

export function TaskList({ tasks, emptyLabel, onToggle, onRename, onDelete }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line bg-[#FFFCF8] px-4 py-8 text-center text-base font-semibold leading-relaxed text-muted">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul className="space-y-2" aria-label="Список задач">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={onToggle}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
