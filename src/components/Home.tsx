import { useEffect, useState } from 'react';
import { localDateKey, dateFromKey, formatLocalDate } from '../lib/date';
import { DEFAULT_FOCUS_MINUTES, catPose } from '../lib/focusSession';
import { habitsForDate, tasksForDate } from '../lib/notebook';
import { unlockSound } from '../lib/focusSound';
import { useFocusController } from '../hooks/useFocusController';
import { useNotebook } from '../hooks/useNotebook';
import type { Priority } from '../types';
import { AccountGate, CabinetSplash } from './AccountGate';
import { CatCompanion } from './CatCompanion';
import { FocusBar } from './FocusBar';
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
  const [greeting, setGreeting] = useState(false);
  const [pickedMinutes, setPickedMinutes] = useState<number | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [soundNote, setSoundNote] = useState<string | null>(null);
  const book = notebook.book;
  const mode = book.mode;
  const focus = useFocusController({
    login: notebook.login,
    session: book.focusSession,
    focusAt: book.focusAt,
    reminders: book.cat.reminders,
    sound: book.cat.sound,
    volume: book.cat.volume,
    onApply: notebook.applyFocus,
  });

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(media.matches);
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (mode !== 'planner') return;
    const start = window.setTimeout(() => setGreeting(true), 0);
    const stop = window.setTimeout(() => setGreeting(false), 2800);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(stop);
    };
  }, [mode]);

  useEffect(() => {
    if (!conflict) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setConflict(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [conflict]);

  if (notebook.status === 'loading') return <CabinetSplash />;
  if (notebook.status === 'anon') return <AccountGate onRegister={notebook.register} onLogin={notebook.signIn} />;

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
  const hint = burst > 0
    ? 'Задача выполнена'
    : open
      ? 'Есть незакрытые дела'
      : todayTasks.length === 0 && todayHabits.length === 0 ? 'На сегодня тихо' : 'Можно отдохнуть';
  const minutes = pickedMinutes ?? book.focusSession?.focusMinutes ?? DEFAULT_FOCUS_MINUTES;
  const showingGreeting = greeting && mode === 'planner';
  const pose = catPose({
    greeting: showingGreeting,
    openTasks: todayTasks.some((task) => !task.completed),
    taskSuccess: burst > 0,
    remindVisible: focus.remindOpen,
    session: book.focusSession,
    now: focus.now,
  });
  const session = book.focusSession;
  const sessionTask = book.tasks.find((task) => task.id === session?.taskId) ?? null;

  function toggle(id: string) {
    const task = book.tasks.find((item) => item.id === id);
    notebook.toggleTask(id);
    if (task && !task.completed) {
      setBurst((value) => value + 1);
      window.setTimeout(() => setBurst(0), 1500);
    }
  }

  function requestFocus(taskId: string) {
    const current = book.focusSession;
    if (current && current.taskId !== taskId) {
      setConflict(taskId);
      return;
    }
    notebook.setFocus(taskId, today);
    notebook.chooseMode('focus');
  }

  function confirmConflict() {
    if (!conflict) return;
    if (book.focusSession && !book.focusSession.settled) focus.finish();
    focus.clear();
    notebook.setFocus(conflict, today);
    notebook.chooseMode('focus');
    setConflict(null);
  }

  function startSelected() {
    if (!book.focusId) return;
    const current = book.focusSession;
    if (current && !current.settled && current.taskId !== book.focusId) {
      setConflict(book.focusId);
      return;
    }
    focus.start(book.focusId, minutes);
  }

  function completeSessionTask() {
    if (!session) return;
    const task = book.tasks.find((item) => item.id === session.taskId);
    if (task && !task.completed) {
      notebook.toggleTask(session.taskId);
      setBurst((value) => value + 1);
      window.setTimeout(() => setBurst(0), 1500);
    }
    focus.clear();
  }

  async function toggleSound() {
    const next = !book.cat.sound;
    if (next) {
      const ready = await unlockSound();
      if (!ready) setSoundNote('Браузер не дал включить звук. Сессия идёт без сигнала.');
    }
    notebook.setCat({ ...book.cat, sound: next });
  }

  return (
    <div className={`mx-auto w-full max-w-6xl px-3 py-6 sm:px-6 sm:py-10 ${session ? 'pb-40' : ''}`}>
      <div className={`border border-line bg-card ${session ? 'pb-36' : ''}`}>
        <header className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h1 className="text-2xl leading-tight sm:text-4xl">{book.name ? `Привет, ${book.name}` : 'Today Cat'}</h1>
            <p className="mt-1 text-sm text-muted">{formatLocalDate(dateFromKey(today))}</p>
            <p className="text-sm text-muted">{hint}</p>
            <p className="text-sm text-muted">Личный кабинет · {notebook.login}</p>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <button type="button" aria-expanded={settings} onClick={() => setSettings((value) => !value)} className={`min-h-11 px-1 text-sm font-semibold underline underline-offset-4 ${settings ? 'decoration-primary' : 'decoration-line'}`}>Настройки</button>
            <button type="button" onClick={() => void notebook.signOut()} className="min-h-11 px-1 text-sm font-semibold underline underline-offset-4 decoration-line">Выйти</button>
          </div>
        </header>
        <ModeSwitch mode={mode} onChange={notebook.chooseMode} />
        {settings ? (
          <SettingsPanel
            login={notebook.login}
            name={book.name}
            theme={book.theme}
            cat={book.cat}
            onName={notebook.setName}
            onTheme={notebook.setTheme}
            onCat={notebook.setCat}
          />
        ) : null}
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
            onFocus={requestFocus}
          />
        ) : null}
        {mode === 'focus' ? (
          <FocusScreen
            book={book}
            today={today}
            minutes={minutes}
            session={session}
            onMinutes={setPickedMinutes}
            onCreate={(title, priority: Priority) => notebook.createTask({ title, date: today, dayPart: 'anytime', priority, repeatKind: 'none', weekdays: [] })}
            onToggle={toggle}
            onPriority={notebook.setPriority}
            onFocus={(id) => { if (id) requestFocus(id); else notebook.setFocus(null, today); }}
            onStart={startSelected}
          />
        ) : null}
      </div>
      <CatCompanion
        pose={pose}
        hidden={book.cat.hidden}
        pinned={book.cat.pinned}
        walks={book.cat.walks}
        sound={book.cat.sound}
        reduced={reduced}
        position={{ x: book.cat.x, y: book.cat.y }}
        remind={focus.remindOpen}
        greeting={showingGreeting}
        onMove={(point) => notebook.setCat({ ...book.cat, x: point.x, y: point.y })}
        onToggleSound={() => void toggleSound()}
        onToggleWalks={() => notebook.setCat({ ...book.cat, walks: !book.cat.walks })}
        onTogglePin={() => notebook.setCat({ ...book.cat, pinned: !book.cat.pinned })}
        onHide={() => notebook.setCat({ ...book.cat, hidden: true })}
        onWorking={focus.dismissRemind}
        onPause={() => { focus.dismissRemind(); focus.pause(); }}
      />
      {session ? (
        <FocusBar
          session={session}
          title={sessionTask?.title ?? 'Задача недоступна'}
          remaining={focus.remaining}
          minutes={minutes}
          notice={focus.notice ?? soundNote}
          onPause={focus.pause}
          onResume={focus.resume}
          onFinish={focus.finish}
          onBreak={focus.beginBreak}
          onAgain={() => focus.again(minutes)}
          onComplete={completeSessionTask}
          onClose={focus.clear}
          onDismissNotice={() => { focus.clearNotice(); setSoundNote(null); }}
        />
      ) : null}
      {conflict ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgb(46_33_27_/_0.28)] px-4 py-6 sm:items-center">
          <div role="dialog" aria-modal="true" aria-labelledby="focus-conflict-title" className="w-full max-w-md border border-line bg-card p-5">
            <h2 id="focus-conflict-title" className="text-2xl">Сначала заверши текущую сессию</h2>
            <p className="mt-2 text-sm text-ink">Сейчас идёт другая задача. Она не переключится сама.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" autoFocus onClick={confirmConflict} className="paper-submit">Завершить сессию</button>
              <button type="button" onClick={() => setConflict(null)} className="paper-choice">Оставить</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
