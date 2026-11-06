import type { DayPart, Priority, Task, TaskEdit } from '../types';
import { TaskItem } from './TaskItem';

type TaskListProps = {
  tasks: Task[];
  emptyLabel: string;
  tomorrow: string;
  focusFull: boolean;
  onToggle: (id: string) => void;
  onMove: (id: string, date: string) => void;
  onPart: (id: string, part: DayPart) => void;
  onPriority: (id: string, priority: Priority) => void;
  onFocus: (id: string, on: boolean) => void;
  onOpenFocus: (id: string) => void;
  onDelete: (id: string, scope: 'one' | 'future') => void;
  onSave: (id: string, edit: TaskEdit, scope: 'one' | 'future') => Promise<boolean>;
};

export function TaskList(props: TaskListProps) {
  if (props.tasks.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line bg-[#FFFCF8] px-4 py-6 text-center text-sm font-semibold text-muted">
        {props.emptyLabel}
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {props.tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          tomorrow={props.tomorrow}
          focusFull={props.focusFull}
          onToggle={props.onToggle}
          onMove={props.onMove}
          onPart={props.onPart}
          onPriority={props.onPriority}
          onFocus={props.onFocus}
          onOpenFocus={props.onOpenFocus}
          onDelete={props.onDelete}
          onSave={props.onSave}
        />
      ))}
    </ul>
  );
}
