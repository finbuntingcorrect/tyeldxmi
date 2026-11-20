import { useEffect, useState } from 'react';
import { localDateKey, dateFromKey, formatLocalDate } from '../lib/date';
import { claimTreat } from '../lib/treats';
import type { TreatKind } from '../lib/focusSession';
import { catPose } from '../lib/focusSession';
import { dayHint, habitsForDate, personName, tasksForDate } from '../lib/notebook';
import { modeForPage } from '../lib/route';
import { useRoute } from '../hooks/routeContext';
import { unlockSound } from '../lib/focusSound';
import { useFocusController } from '../hooks/useFocusController';
import { useNotebook } from '../hooks/useNotebook';
import { AccountGate, CabinetSplash } from './AccountGate';
import { CatCompanion } from './CatCompanion';
import { FocusBar } from './FocusBar';
import { FocusScreen } from './FocusScreen';
import { HabitsScreen } from './HabitsScreen';
import { ModeSwitch } from './ModeSwitch';
import { DayBoard, MonthBoard } from './PlannerScreen';
import { AppLink } from './AppLink';
import { SettingsPanel } from './SettingsPanel';
import { Welcome } from './Welcome';

export function Home() {
  const notebook = useNotebook();
  const today = localDateKey();
  const { page, go } = useRoute();
  const [burst, setBurst] = useState(0);
  const [greeting, setGreeting] = useState(false);
  const [conflict, setConflict] = useState<{ id: string | null } | null>(null);
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
    autoStart: book.cat.autoStart,
    rounds: book.cat.rounds,
    cycle: book.cat.focusCycle,
    shortMinutes: book.cat.shortMinutes,
    longMinutes: book.cat.longMinutes,
    onApply: notebook.applyFocus,
  });

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(media.matches);
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (page.name !== 'calendar' && page.name !== 'day') return;
    const start = window.setTimeout(() => setGreeting(true), 0);
    const stop = window.setTimeout(() => setGreeting(false), 2800);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(stop);
    };
  }, [page]);

  useEffect(() => {
    const next = modeForPage(page);
    if (!next || !book.greeted || !personName(book.name, notebook.login) || next === book.mode) return;
    notebook.chooseMode(next);
  }, [page, book.greeted, book.mode, book.name, notebook]);

  useEffect(() => {
    if (notebook.status !== 'ready') {
      document.title = 'Today Cat';
      return;
    }
    const title = page.name === 'day'
      ? formatLocalDate(dateFromKey(page.date))
      : page.name === 'habits' ? 'Привычки'
        : page.name === 'focus' ? 'Фокус'
          : page.name === 'settings' ? 'Настройки'
            : 'Календарь';
    document.title = `${title} — Today Cat`;
  }, [page, notebook.status]);

  useEffect(() => {
    if (!conflict) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setConflict(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [conflict]);

  if (notebook.status === 'loading') return <CabinetSplash />;
  if (notebook.status === 'anon') {
    return (
      <AccountGate
        notice={notebook.error}
        browser={notebook.here}
        resetToken={notebook.resetToken}
        onEnter={notebook.signIn}
        onCreate={notebook.register}
        onForgot={notebook.requestEmail}
        onReset={notebook.setPassword}
      />
    );
  }

  const person = personName(book.name, notebook.login);
  if (!person || !book.greeted || !mode) {
    return (
      <Welcome
        name={person}
        nameOnly={!person && Boolean(book.greeted && mode)}
        theme={book.theme}
        onName={notebook.setName}
        onTheme={notebook.setTheme}
        onChoose={(next) => {
          notebook.chooseMode(next);
          go(next === 'habits' ? '/habits' : next === 'focus' ? '/focus' : '/');
        }}
      />
    );
  }

  const todayTasks = tasksForDate(book, today);
  const todayHabits = habitsForDate(book, today);
  const hint = dayHint(
    todayTasks.filter((task) => !task.completed).length,
    todayTasks.length,
    todayHabits.filter((row) => row.status !== 'done').length,
    todayHabits.length,
    burst > 0,
  );
  const showingGreeting = greeting && (page.name === 'calendar' || page.name === 'day');
  const pose = catPose({
    greeting: showingGreeting,
    openTasks: todayTasks.some((task) => !task.completed),
    taskSuccess: burst > 0,
    remindVisible: focus.remindOpen,
    session: book.focusSession,
    now: focus.now,
  });
  const session = book.focusSession;

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
    if (current && !current.settled && current.taskId !== taskId) {
      setConflict({ id: taskId });
      return;
    }
    notebook.setFocus(taskId, today);
    go('/focus');
  }

  function selectTask(id: string | null) {
    const current = book.focusSession;
    if (current && !current.settled && (current.taskId || null) !== id) {
      setConflict({ id });
      return;
    }
    notebook.setFocus(id, today);
  }

  function confirmConflict() {
    if (!conflict) return;
    if (book.focusSession && !book.focusSession.settled) focus.finish();
    focus.clear();
    notebook.setFocus(conflict.id, today);
    go('/focus');
    setConflict(null);
  }

  function addFocusTask(title: string) {
    const before = book.tasks.length;
    const next = notebook.createTask({ title, date: today, dayPart: 'anytime', priority: 'normal', repeatKind: 'none', weekdays: [] });
    const created = next.tasks.length > before ? next.tasks[next.tasks.length - 1] : null;
    if (created) selectTask(created.id);
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
      if (!ready) setSoundNote('Звук не включился. Сессия идёт.');
    }
    notebook.setCat({ ...book.cat, sound: next });
  }

  return (
    <div className="min-w-0 overflow-x-clip overflow-y-auto" style={{ paddingRight: 'var(--cat-lane, 0px)', height: 'calc(100dvh - var(--cat-bottom, 0px))' }}>
    <div className={`mx-auto w-full min-w-0 max-w-6xl px-2 py-4 sm:px-6 sm:py-10 ${session && !session.settled && page.name !== 'focus' ? 'pb-28' : ''}`}>
      <div className="min-w-0 overflow-x-clip border border-line bg-card">
        <header className="flex flex-col gap-2 px-3 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div className="min-w-0">
            <h1 className="text-2xl leading-tight break-words sm:text-4xl">{person ? `Привет, ${person}` : 'Привет'}</h1>
            <p className="mt-1 text-sm text-muted">{formatLocalDate(dateFromKey(today))}</p>
            <p className="text-sm text-muted">{hint}</p>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <AppLink href="/settings" aria-current={page.name === 'settings' ? 'page' : undefined} className={`min-h-11 px-1 text-sm font-semibold ${page.name === 'settings' ? 'text-ink' : 'text-muted'}`}>Настройки</AppLink>
            <button type="button" onClick={() => void notebook.signOut()} className="min-h-11 px-1 text-sm font-semibold text-muted">Выйти</button>
          </div>
        </header>
        <ModeSwitch page={page} />
        {notebook.error ? <p role="alert" className="border-b border-line px-4 py-3 text-sm font-semibold text-danger sm:px-6">{notebook.error}</p> : null}
        {page.name === 'settings' ? (
          <div>
            <div className="px-4 pt-4 sm:px-6">
              <AppLink href="/" className="text-sm font-semibold text-muted">К календарю</AppLink>
            </div>
            <SettingsPanel
              login={notebook.login}
              name={person}
              theme={book.theme}
              cat={book.cat}
              onName={notebook.setName}
              onTheme={notebook.setTheme}
              onCat={notebook.setCat}
              here={notebook.here}
            />
          </div>
        ) : null}
        {page.name === 'habits' ? (
          <HabitsScreen
            book={book}
            today={today}
            onCreate={notebook.createHabit}
            onRename={notebook.renameHabit}
            onArchive={notebook.setHabitArchived}
            onDelete={notebook.deleteHabit}
            onMark={notebook.setHabitMark}
          />
        ) : null}
        {page.name === 'calendar' ? (
          <MonthBoard
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
            onCarry={notebook.carryOpen}
            onSkip={notebook.skipThis}
            onDeleteFollowing={notebook.deleteFollowing}
            onNote={notebook.setTaskNote}
            onFocus={requestFocus}
          />
        ) : null}
        {page.name === 'day' ? (
          <DayBoard
            date={page.date}
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
            onCarry={notebook.carryOpen}
            onSkip={notebook.skipThis}
            onDeleteFollowing={notebook.deleteFollowing}
            onNote={notebook.setTaskNote}
            onFocus={requestFocus}
          />
        ) : null}
        {page.name === 'focus' ? (
          <FocusScreen
            book={book}
            today={today}
            session={session}
            now={focus.now}
            reduced={reduced}
            notice={focus.notice ?? soundNote}
            remind={focus.remindOpen}
            onStartPhase={(phase, taskId, minutes) => { focus.startPhase(taskId, phase, minutes, book.cat.pomodoroMinutes); }}
            onPause={focus.pause}
            onResume={focus.resume}
            onFinish={focus.finish}
            onBreak={focus.beginBreak}
            onSkipBreak={focus.skipBreak}
            onAgain={() => focus.again(book.cat.pomodoroMinutes)}
            onReset={() => { if (session && !session.settled) focus.finish(); focus.clear(); }}
            onCompleteTask={completeSessionTask}
            onToggle={toggle}
            onSelectTask={selectTask}
            onCreate={addFocusTask}
            onMinutes={(value) => notebook.setCat({ ...book.cat, pomodoroMinutes: value })}
            onToggleSound={() => void toggleSound()}
            onDismissNotice={() => { focus.clearNotice(); setSoundNote(null); }}
            onDismissRemind={focus.dismissRemind}
            onFeed={async (kind: TreatKind) => {
              const won = await claimTreat(notebook.login, today, kind);
              if (!won) return false;
              notebook.feedTreat(today, kind);
              return true;
            }}
          />
        ) : null}
      </div>
      <CatCompanion
        pose={pose}
        hidden={book.cat.hidden || page.name === 'focus' || page.name === 'calendar' || page.name === 'day'}
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
      {session && !session.settled && page.name !== 'focus' ? (
        <FocusBar
          session={session}
          remaining={focus.remaining}
          onOpen={() => go('/focus')}
          onPause={focus.pause}
          onResume={focus.resume}
        />
      ) : null}
      {conflict ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgb(46_33_27_/_0.28)] px-4 py-6 sm:items-center">
          <div role="dialog" aria-modal="true" aria-labelledby="focus-conflict-title" className="w-full max-w-md border border-line bg-card p-5">
            <h2 id="focus-conflict-title" className="text-2xl">Сначала заверши текущую сессию</h2>
            <p className="mt-2 text-sm text-ink">Отработанное время сохранится.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" autoFocus onClick={confirmConflict} className="paper-submit">Завершить и переключить</button>
              <button type="button" onClick={() => setConflict(null)} className="paper-choice">Оставить</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
    </div>
  );
}
