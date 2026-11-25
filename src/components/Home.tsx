import { useEffect, useRef, useState } from 'react';
import { localDateKey, dateFromKey, formatLocalDate } from '../lib/date';
import { claimTreat } from '../lib/treats';
import type { TreatKind } from '../lib/focusSession';
import { catPose } from '../lib/focusSession';
import { dayHint, isOpenTask, needsHello, personName, taskMark, tasksForDate } from '../lib/notebook';
import { isPlannerPage, modeForPage, pagePath, safeNext, weekMonday } from '../lib/route';
import { useRoute } from '../hooks/routeContext';
import { unlockSound } from '../lib/focusSound';
import { useFocusController } from '../hooks/useFocusController';
import { useNotebook } from '../hooks/useNotebook';
import { ForgotScreen, LoginScreen, ResetScreen, SignupScreen } from './AuthScreens';
import { CabinetSplash } from './AccountGate';
import { FirstHello } from './FirstHello';
import { LandingPage } from './LandingPage';
import { CatCompanion } from './CatCompanion';
import { FocusBar } from './FocusBar';
import { FocusScreen } from './FocusScreen';
import { HabitsScreen } from './HabitsScreen';
import { ModeSwitch } from './ModeSwitch';
import { DiaryScreen } from './DiaryScreen';
import { AppLink } from './AppLink';
import { SettingsPanel } from './SettingsPanel';
import { useDialogLayer } from '../hooks/useDialogLayer';

export function Home() {
  const notebook = useNotebook();
  const today = localDateKey();
  const { page, go, replace } = useRoute();
  const [burst, setBurst] = useState(0);
  const [greeting, setGreeting] = useState(false);
  const [conflict, setConflict] = useState<{ id: string | null } | null>(null);
  const conflictOpener = useRef<HTMLElement | null>(null);
  const conflictDialog = useDialogLayer(Boolean(conflict), () => setConflict(null), conflictOpener);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [soundNote, setSoundNote] = useState<string | null>(null);
  const book = notebook.book;
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
    if (notebook.status === 'loading') {
      document.title = 'Today Cat';
      return;
    }
    const title = page.name === 'day'
      ? formatLocalDate(dateFromKey(page.date))
      : page.name === 'habits' ? 'Привычки'
        : page.name === 'focus' ? 'Фокус'
          : page.name === 'settings' ? 'Настройки'
            : page.name === 'login' ? 'Вход'
              : page.name === 'signup' ? 'Регистрация'
                : page.name === 'forgot' ? 'Восстановление пароля'
                  : page.name === 'calendar' ? 'Дневник'
                    : '';
    document.title = title ? `${title} — Today Cat` : 'Today Cat';
  }, [page, notebook.status]);

  const guestPlanner = notebook.status === 'anon' && !notebook.resetToken && isPlannerPage(page);
  const authedGate = notebook.status === 'ready' && (page.name === 'login' || page.name === 'signup');
  const redirectTo = guestPlanner
    ? `/login?next=${encodeURIComponent(pagePath(page))}`
    : authedGate
      ? (safeNext(new URLSearchParams(window.location.search).get('next')) || '/app')
      : null;

  useEffect(() => {
    if (!redirectTo) return;
    const here = `${window.location.pathname}${window.location.search}`;
    if (here === redirectTo) return;
    replace(redirectTo);
  }, [redirectTo, replace]);

  if (notebook.status === 'loading') return <CabinetSplash />;
  if (notebook.status === 'error') {
    if (!isPlannerPage(page)) return <LandingPage signedIn={false} />;
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="font-serif text-3xl">Today Cat</h1>
        <p role="alert" className="mt-4 text-base text-ink">{notebook.error ?? 'Не получилось загрузить данные.'}</p>
        <button type="button" className="paper-submit mt-4" onClick={() => void notebook.reload()}>Повторить</button>
      </main>
    );
  }
  if (notebook.resetToken && notebook.status === 'anon') {
    return <ResetScreen token={notebook.resetToken} onReset={notebook.setPassword} />;
  }
  if (notebook.status === 'anon') {
    if (guestPlanner) return <CabinetSplash />;
    if (page.name === 'login') return <LoginScreen onEnter={notebook.signIn} />;
    if (page.name === 'signup') return <SignupScreen onCreate={notebook.register} />;
    if (page.name === 'forgot') return <ForgotScreen onForgot={notebook.requestEmail} />;
    return <LandingPage signedIn={false} />;
  }
  if (authedGate) return <CabinetSplash />;
  if (page.name === 'landing') {
    return (
      <LandingPage
        signedIn
        accountLabel={personName(book.name, notebook.login) || 'Аккаунт'}
        onSignOut={() => { void notebook.signOut().then((left) => { if (left) go('/'); }); }}
      />
    );
  }
  if (page.name === 'forgot') return <ForgotScreen onForgot={notebook.requestEmail} />;

  if (needsHello(book) && isPlannerPage(page)) {
    return (
      <FirstHello
        onAdd={() => {
          notebook.chooseMode('planner');
          go(`/app/day/${today}`);
        }}
        onSkip={() => {
          notebook.chooseMode('planner');
          go('/app');
        }}
      />
    );
  }

  const person = personName(book.name, notebook.login);

  const todayTasks = tasksForDate(book, today);
  const openToday = todayTasks.filter((task) => isOpenTask(task)).length;
  const missedToday = todayTasks.filter((task) => taskMark(task) === 'missed').length;
  const hint = dayHint(openToday, todayTasks.length, true, missedToday);
  const showingGreeting = greeting && (page.name === 'calendar' || page.name === 'day');
  const pose = catPose({
    greeting: showingGreeting,
    openTasks: todayTasks.some((task) => isOpenTask(task)),
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
      conflictOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setConflict({ id: taskId });
      return;
    }
    notebook.setFocus(taskId, today);
    go('/app/focus');
  }

  function selectTask(id: string | null) {
    const current = book.focusSession;
    if (current && !current.settled && (current.taskId || null) !== id) {
      conflictOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
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
    go('/app/focus');
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
    notebook.setCat({ ...book.cat, sound: next });
    if (!next) return;
    const ready = await unlockSound();
    if (!ready) setSoundNote('Звук не включился.');
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
          <div className="account-actions">
            <AppLink href="/app/settings" aria-current={page.name === 'settings' ? 'page' : undefined} className={page.name === 'settings' ? 'is-current' : undefined}>Настройки</AppLink>
            <button type="button" onClick={() => { void notebook.signOut().then((left) => { if (left) go('/'); }); }}>Выйти</button>
          </div>
        </header>
        <ModeSwitch page={page} />
        {notebook.error ? (
          <p role="alert" className="border-b border-line px-4 py-3 text-sm font-semibold text-danger sm:px-6">
            {notebook.error}
            {notebook.canRetry ? <button type="button" onClick={() => void notebook.retrySave()} className="paper-choice">Повторить</button> : null}
          </p>
        ) : null}
        {page.name === 'settings' ? (
          <div>
            <div className="px-4 pt-4 sm:px-6">
              <AppLink href="/app" className="inline-flex min-h-11 items-center text-sm font-semibold text-muted">К дневнику</AppLink>
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
            onMark={notebook.setHabitMark}
          />
        ) : null}
        {page.name === 'calendar' || page.name === 'day' ? (
          <DiaryScreen
            book={book}
            today={today}
            week={page.name === 'day' ? weekMonday(page.date) : page.week}
            highlight={page.name === 'day' ? page.date : null}
            reduced={reduced}
            onOpenWeek={(monday) => go(monday === weekMonday(today) ? '/app' : `/app/week/${monday}`)}
            onOpenDay={(date) => go(`/app/day/${date}`)}
            onCreate={notebook.createTask}
            onPart={notebook.setPart}
            onPriority={notebook.setPriority}
            onMove={notebook.moveTask}
            onUpdate={notebook.updateTask}
            onSkip={notebook.skipThis}
            onDeleteFollowing={notebook.deleteFollowing}
            onFocus={requestFocus}
            onNote={notebook.setTaskNote}
            onMark={notebook.setTaskVerdict}
            onAddWeekItem={notebook.addWeekItem}
            onToggleWeekItem={notebook.toggleWeekItem}
            ensureWeek={notebook.ensureWeek}
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
        hidden={book.cat.hidden || page.name === 'focus'}
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
          onOpen={() => go('/app/focus')}
          onPause={focus.pause}
          onResume={focus.resume}
        />
      ) : null}
      {conflict ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgb(46_33_27_/_0.28)] px-4 py-6 sm:items-center">
          <div ref={conflictDialog} role="dialog" aria-modal="true" aria-labelledby="focus-conflict-title" className="w-full max-w-md border border-line bg-card p-5">
            <h2 id="focus-conflict-title" className="text-2xl">Сначала заверши текущий фокус или перерыв</h2>
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
