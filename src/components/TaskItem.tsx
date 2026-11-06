import { Check, MoreHorizontal } from 'lucide-react';
import { useId, useState } from 'react';
import { DAY_PARTS, PRIORITIES, WEEKDAYS, repeatLabel } from '../lib/plannerCopy';
import type { DayPart, Priority, Task, TaskEdit } from '../types';

type TaskItemProps = {
  task: Task;
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

export function TaskItem({
  task,
  tomorrow,
  focusFull,
  onToggle,
  onMove,
  onPart,
  onPriority,
  onFocus,
  onOpenFocus,
  onDelete,
  onSave,
}: TaskItemProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const [date, setDate] = useState(task.date);
  const [dayPart, setDayPart] = useState(task.dayPart);
  const [priority, setPriorityValue] = useState(task.priority);
  const [repeatKind, setRepeatKind] = useState<TaskEdit['repeatKind']>(task.repeatKind ?? 'none');
  const [weekdays, setWeekdays] = useState(task.weekdays);
  const [customDate, setCustomDate] = useState(task.date);
  const titleId = useId();

  function beginEdit() {
    setDraft(task.title);
    setDate(task.date);
    setDayPart(task.dayPart);
    setPriorityValue(task.priority);
    setRepeatKind(task.repeatKind ?? 'none');
    setWeekdays(task.weekdays);
    setEditing(true);
  }

  const edit: TaskEdit = { title: draft, date, dayPart, priority, repeatKind, weekdays };

  return (
    <li className={`rounded-2xl border border-line px-2 py-2 ${task.completed ? 'bg-[#F8F4EC]' : 'bg-card'}`}>
      <div className="flex items-start gap-1">
        <button
          type="button"
          role="checkbox"
          aria-checked={task.completed}
          aria-label={task.completed ? `Вернуть в работу: ${task.title}` : `Отметить выполненной: ${task.title}`}
          onClick={() => onToggle(task.id)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
        >
          <span className={`grid h-6 w-6 place-items-center rounded-md border-2 ${task.completed ? 'border-success bg-success text-ink' : 'border-[#d8c4b0] bg-white'}`}>
            {task.completed ? <Check aria-hidden="true" size={16} strokeWidth={3} /> : null}
          </span>
        </button>
        <div className="min-w-0 flex-1 pt-2.5">
          <p id={titleId} className={`break-words text-base font-bold leading-snug ${task.completed ? 'text-muted line-through' : 'text-ink'}`}>
            {task.title}
          </p>
          <p className="mt-1 text-xs font-semibold text-muted">
            {PRIORITIES.find((item) => item.id === task.priority)?.label}
            {task.repeatKind ? ` · ${repeatLabel(task.repeatKind, task.weekdays)}` : ''}
            {task.exception && task.originalDate && task.originalDate !== task.date ? ' · перенесено отдельно' : ''}
          </p>
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-label={`Действия: ${task.title}`}
          onClick={() => setOpen((value) => !value)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-cream hover:text-ink"
        >
          <MoreHorizontal aria-hidden="true" size={18} />
        </button>
      </div>
      {open ? (
        <div className="mx-2 mb-1 mt-1 grid gap-2 rounded-xl bg-cream p-3" role="group" aria-label="Меню задачи">
          <div className="flex flex-wrap gap-2">
            {DAY_PARTS.map((item) => (
              <button key={item.id} type="button" onClick={() => onPart(task.id, item.id)} className={`min-h-11 rounded-xl px-3 text-sm font-extrabold ${task.dayPart === item.id ? 'bg-primary text-ink' : 'bg-card text-ink'}`}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {PRIORITIES.map((item) => (
              <button key={item.id} type="button" onClick={() => onPriority(task.id, item.id)} className={`min-h-11 rounded-xl px-3 text-sm font-extrabold ${task.priority === item.id ? 'bg-primary text-ink' : 'bg-card text-ink'}`}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onMove(task.id, tomorrow)} className="min-h-11 rounded-xl bg-card px-3 text-sm font-extrabold text-ink">
              На завтра
            </button>
            <label className="flex min-h-11 items-center gap-2 rounded-xl bg-card px-3 text-sm font-extrabold text-ink">
              Выбрать дату
              <input type="date" value={customDate} onChange={(event) => setCustomDate(event.target.value)} className="bg-transparent text-sm" />
              <button type="button" onClick={() => customDate && onMove(task.id, customDate)} className="rounded-lg bg-primary px-2 py-1">
                Ок
              </button>
            </label>
            <button type="button" onClick={() => onFocus(task.id, !task.inFocus)} disabled={focusFull && !task.inFocus} className="min-h-11 rounded-xl bg-card px-3 text-sm font-extrabold text-ink disabled:opacity-50">
              {task.inFocus ? 'Убрать из фокуса' : 'В фокус'}
            </button>
            {task.inFocus ? (
              <button type="button" onClick={() => onOpenFocus(task.id)} className="min-h-11 rounded-xl bg-primary px-3 text-sm font-extrabold text-ink">
                Начать фокус
              </button>
            ) : null}
            <button type="button" onClick={beginEdit} className="min-h-11 rounded-xl bg-card px-3 text-sm font-extrabold text-ink">
              Изменить
            </button>
            <button type="button" onClick={() => setConfirming(true)} className="min-h-11 rounded-xl bg-[#A24B3A] px-3 text-sm font-extrabold text-white">
              Удалить
            </button>
          </div>
          {editing ? (
            <form
              className="grid gap-2"
              onSubmit={(event) => {
                event.preventDefault();
              }}
            >
              <label className="text-sm font-extrabold" htmlFor={`${titleId}-edit`}>Название</label>
              <input id={`${titleId}-edit`} value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={160} className="min-h-11 rounded-xl border border-line bg-white px-3" />
              <div className="flex flex-wrap gap-2">
                {(['none', 'daily', 'weekdays', 'weekly'] as const).map((kind) => (
                  <button key={kind} type="button" onClick={() => setRepeatKind(kind)} className={`min-h-11 rounded-xl px-3 text-sm font-extrabold ${repeatKind === kind ? 'bg-primary' : 'bg-card'}`}>
                    {kind === 'none' ? 'Без повтора' : kind === 'daily' ? 'Ежедневно' : kind === 'weekdays' ? 'По будням' : 'По дням'}
                  </button>
                ))}
              </div>
              {repeatKind === 'weekly' ? (
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((day) => {
                    const selected = weekdays.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setWeekdays((current) => selected ? current.filter((item) => item !== day.id) : [...current, day.id])}
                        className={`min-h-11 rounded-xl px-3 text-sm font-extrabold ${selected ? 'bg-primary' : 'bg-card'}`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void onSave(task.id, edit, 'one')} className="min-h-11 rounded-xl bg-primary px-3 text-sm font-extrabold">
                  Только эту задачу
                </button>
                <button type="button" onClick={() => void onSave(task.id, edit, 'future')} className="min-h-11 rounded-xl bg-ink px-3 text-sm font-extrabold text-cream">
                  Эту и будущие
                </button>
              </div>
            </form>
          ) : null}
          {confirming ? (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Подтверждение удаления">
              <button type="button" onClick={() => onDelete(task.id, 'one')} className="min-h-11 rounded-xl bg-[#A24B3A] px-3 text-sm font-extrabold text-white">
                Только эту
              </button>
              {task.seriesId ? (
                <button type="button" onClick={() => onDelete(task.id, 'future')} className="min-h-11 rounded-xl bg-[#A24B3A] px-3 text-sm font-extrabold text-white">
                  Эту и будущие
                </button>
              ) : null}
              <button type="button" onClick={() => setConfirming(false)} className="min-h-11 rounded-xl bg-card px-3 text-sm font-extrabold">
                Оставить
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
