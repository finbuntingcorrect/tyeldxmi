import { useState } from 'react';
import { localDateKey, dateFromKey, formatLocalDate } from '../lib/date';
import { tasksForDate } from '../lib/notebook';
import { useNotebook } from '../hooks/useNotebook';
import type { Priority } from '../types';
import { FocusScreen } from './FocusScreen';
import { HabitsScreen } from './HabitsScreen';
import { MascotPanel } from './MascotPanel';
import { ModeSwitch } from './ModeSwitch';
import { PlannerScreen } from './PlannerScreen';
import { Welcome } from './Welcome';

export function Home() {
  const notebook = useNotebook();
  const today = localDateKey();
  const [burst, setBurst] = useState(0);
  const book = notebook.book;
  const mode = book.mode;

  if (!book.greeted || !mode) return <Welcome onChoose={notebook.chooseMode} />;

  const todayTasks = tasksForDate(book, today);
  const open = todayTasks.some((task) => !task.completed) || (mode === 'habits' && book.habits.length > 0 && book.marks.filter((mark) => mark.date === today && mark.status === 'done').length < book.habits.length);
  const mascotMode = burst > 0 ? 'success' : open ? 'working' : 'sleeping';

  function toggle(id: string) {
    const task = book.tasks.find((item) => item.id === id);
    notebook.toggleTask(id);
    if (task && !task.completed) {
      setBurst((value) => value + 1);
      window.setTimeout(() => setBurst(0), 1500);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:py-10">
      <div className="min-w-0">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold">Today Cat</h1>
            <p className="mt-1 text-sm font-bold text-muted">{formatLocalDate(dateFromKey(today))}</p>
          </div>
        </header>
        <ModeSwitch mode={mode} onChange={notebook.chooseMode} />
        {notebook.error ? <p role="alert" className="mt-4 rounded-2xl bg-[#FBF1EA] px-4 py-3 text-sm font-bold text-[#8C3F32]">{notebook.error}</p> : null}
        <div className="mt-4">
          {mode === 'habits' ? (
            <HabitsScreen book={book} today={today} onCreate={notebook.createHabit} onMark={notebook.setHabitMark} />
          ) : null}
          {mode === 'planner' ? (
            <PlannerScreen
              book={book}
              today={today}
              onCreate={notebook.createTask}
              onToggle={toggle}
              onMove={notebook.moveTask}
              onPart={notebook.setPart}
              onPriority={notebook.setPriority}
              onUpdate={notebook.updateTask}
            />
          ) : null}
          {mode === 'focus' ? (
            <FocusScreen
              book={book}
              today={today}
              onCreate={(title, priority: Priority) => notebook.createTask({ title, date: today, dayPart: 'anytime', priority, repeatKind: 'none', weekdays: [] })}
              onToggle={toggle}
              onPriority={notebook.setPriority}
              onFocus={(id) => notebook.setFocus(id, today)}
            />
          ) : null}
        </div>
      </div>
      <aside className="lg:sticky lg:top-6">
        <MascotPanel mode={mascotMode} burstKey={burst} total={todayTasks.length} />
      </aside>
    </div>
  );
}
