import { useEffect, useRef, useState } from 'react';
import { useTasks } from '../hooks/useTasks';
import { dateFromKey, formatLocalDate } from '../lib/date';
import { earlierTasksPrompt, emptyCopy, filterTasks } from '../lib/tasks';
import type { MascotMode, TaskFilter } from '../types';
import { CommentForm } from './CommentForm';
import { MascotPanel } from './MascotPanel';
import { ProgressBar } from './ProgressBar';
import { TaskInput } from './TaskInput';
import { TaskList } from './TaskList';

const FILTERS: { value: TaskFilter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'active', label: 'В работе' },
  { value: 'done', label: 'Выполненные' },
];

const CELEBRATION_MS = 1500;

export function TaskTracker() {
  const {
    ready,
    today,
    storageError,
    todayTasks,
    earlierIncompleteCount,
    addTask,
    toggleTask,
    renameTask,
    deleteTask,
    carryIncompleteForward,
  } = useTasks();
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [carryDismissed, setCarryDismissed] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-muted">
        <p className="text-base font-bold">Открываем блокнот…</p>
      </div>
    );
  }

  const completedCount = todayTasks.filter((task) => task.completed).length;
  const hasOpen = todayTasks.some((task) => !task.completed);
  const mode: MascotMode = celebrating ? 'success' : hasOpen ? 'working' : 'sleeping';
  const visibleTasks = filterTasks(todayTasks, filter);

  function startCelebration() {
    setCelebrating(true);
    setBurstKey((key) => key + 1);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setCelebrating(false);
      timerRef.current = null;
    }, CELEBRATION_MS);
  }

  async function handleToggle(id: string) {
    const completed = await toggleTask(id);
    if (completed) startCelebration();
  }

  async function handleAdd(title: string) {
    const added = await addTask(title);
    if (added) setStatusMessage('Задача добавлена');
    return added;
  }

  function handleDelete(id: string) {
    deleteTask(id);
    setStatusMessage('Задача удалена');
  }

  async function handleCarry() {
    const moved = await carryIncompleteForward();
    if (moved > 0) {
      setStatusMessage(
        moved === 1 ? 'Задача перенесена на сегодня' : 'Задачи перенесены на сегодня',
      );
    }
  }

  return (
    <div className="min-h-screen">
      <p className="sr-only" aria-live="polite">
        {statusMessage}
      </p>
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-start gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,13fr)_minmax(280px,7fr)] lg:gap-8 lg:py-10">
        <section aria-labelledby="today-heading" className="min-w-0">
          <header className="mb-6">
            <div className="mb-3 flex items-center gap-3">
              <span className="grid grid-cols-2 gap-0.5" aria-hidden="true">
                <span className="h-2.5 w-2.5 bg-primary" />
                <span className="h-2.5 w-2.5 bg-ink" />
                <span className="h-2.5 w-2.5 bg-sage" />
                <span className="h-2.5 w-2.5 bg-primary" />
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Today Cat</h1>
            </div>
            <p className="mt-3 text-base font-bold text-muted">{formatLocalDate(dateFromKey(today))}</p>
            <h2 id="today-heading" className="mt-6 text-2xl font-extrabold tracking-tight text-ink">
              Задачи на сегодня
            </h2>
            <p className="mt-2 max-w-xl text-base leading-relaxed font-semibold text-muted">
              Короткий список только на этот день. Котёнок бодрствует, пока есть незакрытые дела.
            </p>
          </header>

          <div className="rounded-[28px] border border-line bg-card p-4 shadow-[0_16px_40px_rgba(46,33,27,0.06)] sm:p-6">
            {storageError ? (
              <p
                role="alert"
                className="mb-4 rounded-2xl border border-[#e7c7b8] bg-[#FBF1EA] px-4 py-3 text-sm font-bold leading-relaxed text-[#8C3F32]"
              >
                {storageError}
              </p>
            ) : null}

            {earlierIncompleteCount > 0 && !carryDismissed ? (
              <div className="mb-4 rounded-2xl border border-line bg-[#F6F3EA] px-4 py-3">
                <p className="text-sm font-bold leading-relaxed text-ink">
                  {earlierTasksPrompt(earlierIncompleteCount)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleCarry}
                    className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-extrabold text-ink hover:bg-primary-hover"
                  >
                    Перенести
                  </button>
                  <button
                    type="button"
                    onClick={() => setCarryDismissed(true)}
                    className="inline-flex min-h-11 items-center rounded-xl border border-line bg-card px-4 text-sm font-extrabold text-ink"
                  >
                    Не сейчас
                  </button>
                </div>
              </div>
            ) : null}

            <ProgressBar completed={completedCount} total={todayTasks.length} />

            <div className="mt-5">
              <TaskInput onAdd={handleAdd} />
            </div>

            <fieldset className="mt-5">
              <legend className="sr-only">Фильтр задач</legend>
              <div className="flex flex-wrap gap-1 rounded-full bg-[#F4EADF] p-1">
                {FILTERS.map((item) => (
                  <label key={item.value} className="cursor-pointer">
                    <input
                      type="radio"
                      name="task-filter"
                      value={item.value}
                      checked={filter === item.value}
                      onChange={() => setFilter(item.value)}
                      className="peer sr-only"
                    />
                    <span className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-extrabold text-muted peer-checked:bg-primary peer-checked:text-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-hover">
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-4">
              <TaskList
                tasks={visibleTasks}
                emptyLabel={emptyCopy(filter, todayTasks.length)}
                onToggle={handleToggle}
                onRename={renameTask}
                onDelete={handleDelete}
              />
            </div>

            <p className="mt-4 text-xs font-semibold text-muted">
              Задачи хранятся в базе и видны всем, кто открывает этот список. Прошлые дни сами на сегодня не переезжают.
            </p>
          </div>
          <CommentForm />
        </section>

        <aside className="lg:sticky lg:top-6">
          <MascotPanel mode={mode} burstKey={burstKey} total={todayTasks.length} />
        </aside>
      </div>
    </div>
  );
}
