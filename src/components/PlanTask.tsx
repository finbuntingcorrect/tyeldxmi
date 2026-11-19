import { useId, useState } from 'react';
import { addDays } from '../../server/recurrence';
import { DAY_PARTS, PRIORITIES, WEEKDAYS } from '../lib/plannerCopy';
import type { NotebookTask, TaskDraft } from '../lib/notebook';
import type { DayPart, Priority } from '../types';
import { PaperCheck } from './PaperCheck';
import { WhyLine } from './WhyLine';

type PlanTaskProps = {
  task: NotebookTask;
  today: string;
  onToggle: (id: string) => void;
  onMove: (id: string, date: string) => void;
  onPart: (id: string, part: DayPart) => void;
  onPriority: (id: string, priority: Priority) => void;
  onUpdate: (id: string, draft: TaskDraft, scope: 'one' | 'future') => void;
  onSkip: (id: string) => void;
  onFocus: (id: string) => void;
  onNote: (id: string, text: string) => void;
  shelves?: boolean;
};

const SHELF_MOVES = DAY_PARTS.filter((part) => part.id !== 'anytime');

export function PlanTask({ task, today, onToggle, onMove, onPart, onPriority, onUpdate, onSkip, onFocus, onNote, shelves = false }: PlanTaskProps) {
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
  const repeat = task.repeatKind === 'daily' ? 'Каждый день' : task.repeatKind === 'weekdays' ? 'По будням' : task.repeatKind === 'weekly' ? 'По дням' : '';
  const moved = Boolean(task.exception && task.originalDate && task.originalDate !== task.date);
  const priority = task.priority === 'normal' ? '' : PRIORITIES.find((item) => item.id === task.priority)?.label ?? '';
  const notes = [priority, repeat, moved ? 'перенесено отдельно' : ''].filter(Boolean).join(' · ');

  return (
    <article className="mx-3 min-w-0 border-b border-line">
      <div className="flex items-start gap-1">
        <PaperCheck checked={task.completed} label={task.completed ? `Вернуть «${task.title}»` : `Выполнить «${task.title}»`} onClick={() => onToggle(task.id)} />
        <div className="min-w-0 flex-1 py-2">
          <p id={titleId} className={`text-base leading-snug break-words ${task.completed ? 'text-muted line-through' : 'text-ink'}`}>{task.title}</p>
          <WhyLine text={task.note} onSave={(text) => onNote(task.id, text)} />
          {notes ? <p className="text-xs break-words text-muted">{notes}</p> : null}
          <div className="flex flex-wrap items-center">
            <button type="button" onClick={() => onMove(task.id, addDays(task.date, 1))} className="paper-choice px-2">завтра</button>
            {task.date === today ? <button type="button" onClick={() => onFocus(task.id)} className="paper-choice my-1">В фокус</button> : null}
            <button type="button" aria-expanded={open} aria-label={`Действия: ${task.title}`} onClick={() => setOpen((value) => !value)} className="paper-choice">Ещё</button>
          </div>
        </div>
      </div>
      {shelves && task.dayPart === 'anytime' ? (
        <div className="flex flex-wrap pb-1 pl-11">
          {SHELF_MOVES.map((part) => (
            <button key={part.id} type="button" onClick={() => onPart(task.id, part.id)} className="paper-choice">{part.label}</button>
          ))}
        </div>
      ) : null}
      {open ? (
        <div className="mb-3 ml-11 min-w-0 border-t border-line pt-2" role="group" aria-label="Меню задачи">
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
            <button type="button" onClick={() => onMove(task.id, addDays(task.date, 7))} className="paper-choice">на следующую неделю</button>
            <button type="button" onClick={() => onSkip(task.id)} className="paper-choice">{task.seriesId ? 'этот раз не надо' : 'Убрать'}</button>
            <label className="flex min-h-11 min-w-0 flex-wrap items-center gap-2 text-sm font-semibold">
              Выбрать дату
              <input type="date" value={customDate} onChange={(event) => setCustomDate(event.target.value)} className="w-36 max-w-full bg-transparent" />
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
            {task.seriesId ? (
              <>
                <button type="button" onClick={() => onUpdate(task.id, draft, 'one')} className="paper-choice">Только эту задачу</button>
                <button type="button" onClick={() => onUpdate(task.id, draft, 'future')} className="paper-choice">Эту и будущие</button>
              </>
            ) : (
              <button type="button" onClick={() => onUpdate(task.id, draft, 'one')} className="paper-submit">Сохранить</button>
            )}
          </div>
        </div>
      ) : null}
    </article>
  );
}
