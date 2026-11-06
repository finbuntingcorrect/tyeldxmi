import { useState } from 'react';
import { PRIORITIES } from '../lib/plannerCopy';
import { tasksForDate, type Notebook } from '../lib/notebook';
import type { Priority } from '../types';

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
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');

  return (
    <section className="rounded-[28px] border border-line bg-card p-4 sm:p-6">
      <h2 className="text-lg font-extrabold">Главное сегодня</h2>
      {main ? (
        <div className="mt-3 rounded-2xl bg-cream p-4">
          <p className={`text-2xl font-extrabold ${main.completed ? 'text-muted line-through' : ''}`}>{main.title}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => onToggle(main.id)} className="min-h-11 rounded-xl bg-primary px-4 text-sm font-extrabold">{main.completed ? 'Вернуть в работу' : 'Отметить выполненной'}</button>
            <button type="button" onClick={() => onFocus(null)} className="min-h-11 rounded-xl bg-card px-4 text-sm font-extrabold">Убрать из главного</button>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm font-semibold text-muted">Выберите одну задачу из списка и закрепите её здесь.</p>
      )}
      <form className="mt-5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]" onSubmit={(event) => { event.preventDefault(); onCreate(title, priority); setTitle(''); }}>
        <label htmlFor="focus-task" className="sr-only">Новая задача на сегодня</label>
        <input id="focus-task" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Задача на сегодня" maxLength={160} className="min-h-12 rounded-2xl border border-line bg-field px-4 text-ink" />
        <button type="submit" className="min-h-12 rounded-2xl bg-primary px-5 font-extrabold">Добавить</button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {PRIORITIES.map((item) => (
          <button key={item.id} type="button" onClick={() => setPriority(item.id)} className={`min-h-11 rounded-xl px-3 text-sm font-extrabold ${priority === item.id ? 'bg-primary' : 'bg-cream'}`}>{item.label}</button>
        ))}
      </div>
      <div className="mt-5 grid gap-2">
        {tasks.length === 0 ? <p className="text-sm font-semibold text-muted">На сегодня задач пока нет.</p> : null}
        {tasks.map((task) => (
          <article key={task.id} className="rounded-2xl border border-line bg-field p-3">
            <div className="flex items-start gap-2">
              <button type="button" aria-pressed={task.completed} aria-label={task.completed ? `Вернуть «${task.title}»` : `Выполнить «${task.title}»`} onClick={() => onToggle(task.id)} className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 ${task.completed ? 'border-success bg-success text-white' : 'border-line bg-cream'}`}>
                {task.completed ? '✓' : ''}
              </button>
              <div className="min-w-0 flex-1">
                <h3 className={`break-words text-base font-extrabold ${task.completed ? 'text-muted line-through' : ''}`}>{task.title}</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PRIORITIES.map((item) => (
                    <button key={item.id} type="button" onClick={() => onPriority(task.id, item.id)} className={`min-h-11 rounded-xl px-3 text-sm font-extrabold ${task.priority === item.id ? 'bg-primary' : 'bg-cream'}`}>{item.label}</button>
                  ))}
                  <button type="button" onClick={() => onFocus(task.id)} className="min-h-11 rounded-xl bg-card px-3 text-sm font-extrabold">{book.focusId === task.id ? 'Это главное' : 'Сделать главной'}</button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
