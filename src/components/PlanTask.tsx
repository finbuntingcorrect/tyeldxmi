import { useId, useState } from 'react';
import { addDays } from '../../server/recurrence';
import { DAY_PARTS, PRIORITIES, WEEKDAYS } from '../lib/plannerCopy';
import type { NotebookTask, TaskDraft } from '../lib/notebook';
import type { DayPart, Priority } from '../types';
import { PaperCheck } from './PaperCheck';

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
  const repeat = task.repeatKind === 'daily' ? ' · Каждый день' : task.repeatKind === 'weekdays' ? ' · По будням' : task.repeatKind === 'weekly' ? ' · По дням' : '';

  return (
    <article className="border-b border-line">
      <div className="flex items-start gap-1">
        <PaperCheck checked={task.completed} label={task.completed ? `Вернуть «${task.title}»` : `Выполнить «${task.title}»`} onClick={() => onToggle(task.id)} />
        <div className="min-w-0 flex-1 py-2.5">
          <p id={titleId} className={`text-base leading-snug ${task.completed ? 'text-muted line-through' : 'text-ink'}`}>{task.title}</p>
          <p className="mt-1 text-xs text-muted">
            {PRIORITIES.find((item) => item.id === task.priority)?.label}
            {repeat}
            {task.exception && task.originalDate && task.originalDate !== task.date ? ' · перенесено отдельно' : ''}
          </p>
        </div>
        <button type="button" aria-expanded={open} aria-label={`Действия: ${task.title}`} onClick={() => setOpen((value) => !value)} className="min-h-11 px-2 text-sm font-semibold text-muted">Ещё</button>
      </div>
      {open ? (
        <div className="mb-3 ml-11 border-t border-line pt-2" role="group" aria-label="Меню задачи">
          <div className="flex flex-wrap">
            {DAY_PARTS.map((part) => (
              <button key={part.id} type="button" aria-pressed={task.dayPart === part.id} onClick={() => onPart(task.id, part.id)} className="paper-choice">{part.label}</button>
            ))}
          </div>
          <div className="flex flex-wrap">
            {PRIORITIES.map((item) => (
              <button key={item.id} type="button" aria-pressed={task.priority === item.id} onClick={() => onPriority(task.id, item.id)} className="paper-choice">{item.label}</button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => onMove(task.id, addDays(task.date, 1))} className="paper-choice">Перенести на завтра</button>
            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
              Выбрать дату
              <input type="date" value={customDate} onChange={(event) => setCustomDate(event.target.value)} className="bg-transparent" />
              <button type="button" onClick={() => customDate && onMove(task.id, customDate)} className="paper-submit">Ок</button>
            </label>
          </div>
          <p className="mt-3 text-sm font-semibold">Повторять</p>
          <div className="flex flex-wrap">
            {(['none', 'daily', 'weekdays', 'weekly'] as const).map((kind) => (
              <button key={kind} type="button" aria-pressed={repeatKind === kind} onClick={() => setRepeatKind(kind)} className="paper-choice">
                {kind === 'none' ? 'Без повтора' : kind === 'daily' ? 'Каждый день' : kind === 'weekdays' ? 'По будням' : 'По дням'}
              </button>
            ))}
          </div>
          {repeatKind === 'weekly' ? (
            <div className="flex flex-wrap">
              {WEEKDAYS.map((day) => {
                const selected = weekdays.includes(day.id);
                return (
                  <button key={day.id} type="button" aria-pressed={selected} onClick={() => setWeekdays((current) => selected ? current.filter((item) => item !== day.id) : [...current, day.id])} className="paper-choice">
                    {day.label}
                  </button>
                );
              })}
            </div>
          ) : null}
          <label className="mt-2 block text-sm font-semibold" htmlFor={`${titleId}-title`}>Название</label>
          <input id={`${titleId}-title`} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} className="paper-field" />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => onUpdate(task.id, draft, 'one')} className="paper-choice">Только эту задачу</button>
            <button type="button" onClick={() => onUpdate(task.id, draft, 'future')} className="paper-submit">Эту и будущие</button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
