import { useState } from 'react';
import { localDateKey, dateFromKey, formatLocalDate } from '../lib/date';
import { habitsForDate, tasksForDate } from '../lib/notebook';
import { useNotebook } from '../hooks/useNotebook';
import type { Priority } from '../types';
import { FocusScreen } from './FocusScreen';
import { HabitsScreen } from './HabitsScreen';
import { ModeSwitch } from './ModeSwitch';
import { PlannerScreen } from './PlannerScreen';
import { SettingsPanel } from './SettingsPanel';
import { Welcome } from './Welcome';

export function Home() {
  const notebook = useNotebook();
  const today = localDateKey();
  const [burst, setBurst] = useState(0);
  const [settings, setSettings] = useState(false);
  const book = notebook.book;
  const mode = book.mode;

  if (!book.greeted || !mode) {
    return (
      <Welcome
        name={book.name}
        theme={book.theme}
        onName={notebook.setName}
        onTheme={notebook.setTheme}
        onChoose={notebook.chooseMode}
      />
    );
  }

  const todayTasks = tasksForDate(book, today);
  const todayHabits = habitsForDate(book, today);
  const open = mode === 'habits'
    ? todayHabits.some((row) => row.status !== 'done')
    : todayTasks.some((task) => !task.completed);
  const stamp = burst > 0
    ? { src: '/mascot/cat-success.png', hint: 'Задача выполнена' }
    : open
      ? { src: '/mascot/cat-working.png', hint: 'Есть незакрытые дела' }
      : { src: '/mascot/cat-sleeping.png', hint: todayTasks.length === 0 && todayHabits.length === 0 ? 'На сегодня тихо' : 'Можно отдохнуть' };

  function toggle(id: string) {
    const task = book.tasks.find((item) => item.id === id);
    notebook.toggleTask(id);
    if (task && !task.completed) {
      setBurst((value) => value + 1);
      window.setTimeout(() => setBurst(0), 1500);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-6 sm:px-6 sm:py-10">
      <div className="border border-line bg-card">
        <header className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <img src={stamp.src} alt="" className="h-14 w-14 shrink-0 object-contain" />
            <div className="min-w-0">
              <h1 className="text-2xl leading-tight sm:text-4xl">{book.name ? `Привет, ${book.name}` : 'Today Cat'}</h1>
              <p className="mt-1 text-sm text-muted">{formatLocalDate(dateFromKey(today))}</p>
              <p className="text-sm text-muted">{stamp.hint}</p>
            </div>
          </div>
          <button type="button" aria-expanded={settings} onClick={() => setSettings((value) => !value)} className={`min-h-11 shrink-0 px-1 text-sm font-semibold underline underline-offset-4 ${settings ? 'decoration-primary' : 'decoration-line'}`}>Настройки</button>
        </header>
        <ModeSwitch mode={mode} onChange={notebook.chooseMode} />
        {settings ? <SettingsPanel name={book.name} theme={book.theme} onName={notebook.setName} onTheme={notebook.setTheme} /> : null}
        {notebook.error ? <p role="alert" className="border-b border-line px-4 py-3 text-sm font-semibold text-danger sm:px-6">{notebook.error}</p> : null}
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
            onAddWeekItem={notebook.addWeekItem}
            onToggleWeekItem={notebook.toggleWeekItem}
            onAssignWeekItem={notebook.assignWeekItem}
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
  );
}
