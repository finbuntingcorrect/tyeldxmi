import { useState } from 'react';
import { PRIORITIES } from '../lib/plannerCopy';
import { tasksForDate, type Notebook } from '../lib/notebook';
import type { Priority } from '../types';
import { PaperCheck } from './PaperCheck';

type FocusScreenProps = {
  book: Notebook;
  today: string;
  onCreate: (title: string, priority: Priority) => void;
  onToggle: (id: string) => void;
  onPriority: (id: string, priority: Priority) => void;
  onFocus: (id: string | null) => void;
};

export function FocusScreen({ book, today, onCreate, onToggle, onPriority, onFocus }: FocusScreenProps) {
  const tasks = tasksForDate(book, today);
  const main = tasks.find((task) => task.id === book.focusId) || null;
  const rest = tasks.filter((task) => task.id !== main?.id);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');

  return (
    <section>
      <header className="border-b border-line px-4 py-4 sm:px-6">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">Сегодня</p>
        <h2 className="mt-1 text-3xl">Главное сегодня</h2>
      </header>
      <div className="border-b border-line px-4 py-4 sm:px-6">
        {main ? (
          <div className="flex items-start gap-1">
            <PaperCheck checked={main.completed} label={main.completed ? `Вернуть «${main.title}»` : `Выполнить «${main.title}»`} onClick={() => onToggle(main.id)} />
            <div className="min-w-0 flex-1 py-2">
              <p className={`font-serif text-2xl leading-snug ${main.completed ? 'text-muted line-through' : 'text-ink'}`}>{main.title}</p>
              <p className="mt-1 text-xs text-muted">{PRIORITIES.find((item) => item.id === main.priority)?.label}</p>
              <button type="button" onClick={() => onFocus(null)} className="paper-choice mt-2 px-0">Убрать из главного</button>
            </div>
          </div>
        ) : (
          <p className="py-2 text-sm text-muted">Выберите одну задачу из списка и закрепите её здесь.</p>
        )}
      </div>
      <form className="border-b border-line px-4 py-4 sm:px-6" onSubmit={(event) => { event.preventDefault(); onCreate(title, priority); setTitle(''); }}>
        <label htmlFor="focus-task" className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">Новая задача</label>
        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end">
          <input id="focus-task" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Задача на сегодня" maxLength={160} className="paper-field" />
          <button type="submit" className="paper-submit">Добавить</button>
        </div>
        <div className="mt-2 flex flex-wrap">
          {PRIORITIES.map((item) => (
            <button key={item.id} type="button" aria-pressed={priority === item.id} onClick={() => setPriority(item.id)} className="paper-choice">{item.label}</button>
          ))}
        </div>
      </form>
      <div className="px-4 py-4 sm:px-6">
        <h3 className="text-2xl">Остальные дела</h3>
        <div className="mt-2 border-t border-line">
          {rest.length === 0 ? <p className="py-3 text-sm text-muted">{tasks.length === 0 ? 'На сегодня задач пока нет.' : 'Других дел нет.'}</p> : null}
          {rest.map((task) => (
            <article key={task.id} className="flex items-start gap-1 border-b border-line">
              <PaperCheck checked={task.completed} label={task.completed ? `Вернуть «${task.title}»` : `Выполнить «${task.title}»`} onClick={() => onToggle(task.id)} />
              <div className="min-w-0 flex-1 py-2.5">
                <p className={`text-base leading-snug ${task.completed ? 'text-muted line-through' : 'text-ink'}`}>{task.title}</p>
                <div className="mt-1 flex flex-wrap">
                  {PRIORITIES.map((item) => (
                    <button key={item.id} type="button" aria-pressed={task.priority === item.id} onClick={() => onPriority(task.id, item.id)} className="paper-choice">{item.label}</button>
                  ))}
                  <button type="button" onClick={() => onFocus(task.id)} className="paper-choice">Сделать главной</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
