import { useId, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { addDays } from '../../server/recurrence';
import { DAY_PARTS, PRIORITIES, WEEKDAYS } from '../lib/plannerCopy';
import type { NotebookTask, TaskDraft } from '../lib/notebook';
import type { DayPart, Priority } from '../types';

type PlanTaskProps = {
  task: NotebookTask;
  onToggle: (id: string) => void;
  onMove: (id: string, date: string) => void;
  onPart: (id: string, part: DayPart) => void;
  onPriority: (id: string, priority: Priority) => void;
  onUpdate: (id: string, draft: TaskDraft, scope: 'one' | 'future') => void;
};

export function PlanTask({ task, onToggle, onMove, onPart, onPriority, onUpdate }: PlanTaskProps) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [customDate, setCustomDate] = useState(task.date);
  const [title, setTitle] = useState(task.title);
  const [repeatKind, setRepeatKind] = useState<TaskDraft['repeatKind']>(task.repeatKind ?? 'none');
  const [weekdays, setWeekdays] = useState<number[]>(task.weekdays);
  const draft: TaskDraft = {
    title,
    date: task.date,
    dayPart: task.dayPart,
    priority: task.priority,
    repeatKind,
    weekdays,
  };

  return (
    <article className="rounded-2xl border border-line bg-white">
      <div className="flex items-start gap-2 px-2 py-2">
        <button
          type="button"
          aria-pressed={task.completed}
          aria-label={task.completed ? `Вернуть «${task.title}»` : `Выполнить «${task.title}»`}
          onClick={() => onToggle(task.id)}
          className={`mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 ${task.completed ? 'border-success bg-success text-white' : 'border-line bg-cream'}`}
        >
          {task.completed ? '✓' : ''}
        </button>
        <div className="min-w-0 flex-1 pt-2.5">
          <p id={titleId} className={`break-words text-base font-bold leading-snug ${task.completed ? 'text-muted line-through' : 'text-ink'}`}>{task.title}</p>
          <p className="mt-1 text-xs font-semibold text-muted">
            {PRIORITIES.find((item) => item.id === task.priority)?.label}
            {task.repeatKind === 'daily' ? ' · Каждый день' : task.repeatKind === 'weekdays' ? ' · По будням' : task.repeatKind === 'weekly' ? ' · По дням' : ''}
            {task.exception && task.originalDate && task.originalDate !== task.date ? ' · перенесено отдельно' : ''}
          </p>
        </div>
        <button type="button" aria-expanded={open} aria-label={`Действия: ${task.title}`} onClick={() => setOpen((value) => !value)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted">
          <MoreHorizontal aria-hidden="true" size={18} />
        </button>
      </div>
      {open ? (
        <div className="mx-2 mb-2 grid gap-2 rounded-xl bg-cream p-3" role="group" aria-label="Меню задачи">
          <div className="flex flex-wrap gap-2">
            {DAY_PARTS.map((part) => (
              <button key={part.id} type="button" onClick={() => onPart(task.id, part.id)} className={`min-h-11 rounded-xl px-3 text-sm font-extrabold ${task.dayPart === part.id ? 'bg-primary' : 'bg-card'}`}>{part.label}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {PRIORITIES.map((item) => (
              <button key={item.id} type="button" onClick={() => onPriority(task.id, item.id)} className={`min-h-11 rounded-xl px-3 text-sm font-extrabold ${task.priority === item.id ? 'bg-primary' : 'bg-card'}`}>{item.label}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onMove(task.id, addDays(task.date, 1))} className="min-h-11 rounded-xl bg-card px-3 text-sm font-extrabold">Перенести на завтра</button>
            <label className="flex min-h-11 items-center gap-2 rounded-xl bg-card px-3 text-sm font-extrabold">
              Выбрать дату
              <input type="date" value={customDate} onChange={(event) => setCustomDate(event.target.value)} className="bg-transparent" />
              <button type="button" onClick={() => customDate && onMove(task.id, customDate)} className="rounded-lg bg-primary px-2 py-1">Ок</button>
            </label>
          </div>
          <div>
            <p className="text-sm font-extrabold">Повторять</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(['none', 'daily', 'weekdays', 'weekly'] as const).map((kind) => (
                <button key={kind} type="button" onClick={() => setRepeatKind(kind)} className={`min-h-11 rounded-xl px-3 text-sm font-extrabold ${repeatKind === kind ? 'bg-primary' : 'bg-card'}`}>
                  {kind === 'none' ? 'Без повтора' : kind === 'daily' ? 'Каждый день' : kind === 'weekdays' ? 'По будням' : 'По дням'}
                </button>
              ))}
            </div>
            {repeatKind === 'weekly' ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => {
                  const selected = weekdays.includes(day.id);
                  return (
                    <button key={day.id} type="button" aria-pressed={selected} onClick={() => setWeekdays((current) => selected ? current.filter((item) => item !== day.id) : [...current, day.id])} className={`min-h-11 rounded-xl px-3 text-sm font-extrabold ${selected ? 'bg-primary' : 'bg-card'}`}>
                      {day.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
            <label className="mt-2 block text-sm font-extrabold" htmlFor={`${titleId}-title`}>Название</label>
            <input id={`${titleId}-title`} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} className="mt-1 min-h-11 w-full rounded-xl border border-line bg-white px-3" />
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => onUpdate(task.id, draft, 'one')} className="min-h-11 rounded-xl bg-card px-3 text-sm font-extrabold">Только эту задачу</button>
              <button type="button" onClick={() => onUpdate(task.id, draft, 'future')} className="min-h-11 rounded-xl bg-primary px-3 text-sm font-extrabold">Эту и будущие</button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
