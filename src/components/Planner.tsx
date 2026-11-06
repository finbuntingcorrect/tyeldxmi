import { useState } from 'react';
import { addDays } from '../../server/recurrence';
import { usePlan } from '../hooks/usePlan';
import { dateFromKey, formatLocalDate } from '../lib/date';
import { DAY_PARTS, WEEKDAYS, priorityRank, purposeExamples } from '../lib/plannerCopy';
import type { DayPart, MascotMode, Priority, Task, TaskEdit } from '../types';
import { AuthScreen } from './AuthScreen';
import { CatCoach } from './CatCoach';
import { MascotPanel } from './MascotPanel';
import { Onboarding } from './Onboarding';
import { ProfileScreen } from './ProfileScreen';
import { TaskList } from './TaskList';

function ruCount(count: number, one: string, few: string, many: string) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const noun = mod10 === 1 && mod100 !== 11 ? one : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many;
  return `${count} ${noun}`;
}

function sortTasks(tasks: Task[]) {
  return [...tasks].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.createdAt.localeCompare(b.createdAt));
}

export function Planner() {
  const plan = usePlan();
  const [screen, setScreen] = useState<'today' | 'profile'>('today');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [habitsOnly, setHabitsOnly] = useState(false);
  const [sorting, setSorting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [pickingFocus, setPickingFocus] = useState(false);
  const [burst, setBurst] = useState(0);
  const [draft, setDraft] = useState<TaskEdit>({
    title: '',
    date: '',
    dayPart: 'anytime',
    priority: 'normal',
    repeatKind: 'none',
    weekdays: [1, 2, 3, 4, 5],
  });

  const today = plan.today;
  const todayTasks = plan.tasks.filter((task) => task.date === today);
  const overdue = sortTasks(plan.tasks.filter((task) => task.date < today && !task.completed));
  const upcoming = plan.tasks.filter((task) => task.date > today).slice(0, 12);
  const recent = plan.tasks.filter((task) => task.completed && task.date !== today).slice(0, 8);
  const focused = sortTasks(todayTasks.filter((task) => task.inFocus));
  const focusTask = plan.tasks.find((task) => task.id === focusId) || null;
  const openToday = todayTasks.some((task) => !task.completed);
  const mode: MascotMode = burst > 0 ? 'success' : openToday ? 'working' : 'sleeping';
  const examples = purposeExamples(plan.user?.purpose || null);

  const sections = DAY_PARTS.map((part) => ({
    ...part,
    tasks: sortTasks(todayTasks.filter((task) => task.dayPart === part.id && (!habitsOnly || task.repeatKind))),
  }));

  if (!plan.ready) {
    return <main className="grid min-h-screen place-items-center text-muted"><p className="font-bold">Открываем блокнот…</p></main>;
  }
  if (!plan.user) return <AuthScreen error={plan.error} onRequest={plan.requestLink} />;
  if (!plan.user.onboardingDone) return <Onboarding profile={plan.user} onSave={plan.saveProfile} />;

  const user = plan.user;
  const tomorrow = today ? addDays(today, 1) : today;
  const handlers = {
    tomorrow,
    focusFull: focused.length >= 3,
    onToggle: (id: string) => {
      const task = plan.tasks.find((item) => item.id === id);
      void plan.toggleTask(id).then((ok) => {
        if (ok && task && !task.completed) {
          setBurst((value) => value + 1);
          window.setTimeout(() => setBurst(0), 1500);
        }
      });
    },
    onMove: (id: string, date: string) => void plan.moveTask(id, date),
    onPart: (id: string, part: DayPart) => void plan.setPart(id, part),
    onPriority: (id: string, priority: Priority) => void plan.setPriority(id, priority),
    onFocus: (id: string, on: boolean) => void plan.focusTask(id, on),
    onOpenFocus: (id: string) => setFocusId(id),
    onDelete: (id: string, scope: 'one' | 'future') => void plan.deleteTask(id, scope),
    onSave: (id: string, edit: TaskEdit, scope: 'one' | 'future') => plan.updateTask(id, edit, scope),
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-start gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,13fr)_minmax(280px,7fr)] lg:gap-8 lg:py-10">
        <section className="min-w-0">
          <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-extrabold text-ink">Today Cat</h1>
              <p className="mt-2 text-base font-bold text-muted">{today ? formatLocalDate(dateFromKey(today)) : ''}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setScreen('today')} className={`min-h-11 rounded-xl px-4 text-sm font-extrabold ${screen === 'today' ? 'bg-primary' : 'bg-card'}`}>Сегодня</button>
              <button type="button" onClick={() => setScreen('profile')} className={`min-h-11 rounded-xl px-4 text-sm font-extrabold ${screen === 'profile' ? 'bg-primary' : 'bg-card'}`}>Профиль</button>
            </div>
          </header>
          {plan.error ? <p role="alert" className="mb-4 rounded-2xl bg-[#FBF1EA] px-4 py-3 text-sm font-bold text-[#8C3F32]">{plan.error}</p> : null}
          {screen === 'profile' ? (
            <ProfileScreen profile={user} onSave={plan.saveProfile} onLogout={() => void plan.logout()} onBack={() => setScreen('today')} />
          ) : focusTask ? (
            <section className="rounded-[28px] border border-line bg-card p-6">
              <button type="button" onClick={() => setFocusId(null)} className="min-h-11 text-sm font-extrabold text-muted">Вернуться к плану</button>
              <p className="mt-4 text-sm font-extrabold text-muted">Фокус</p>
              <h2 className="mt-2 text-3xl font-extrabold">{focusTask.title}</h2>
              <button type="button" onClick={() => handlers.onToggle(focusTask.id)} className="mt-6 min-h-12 rounded-2xl bg-primary px-5 text-base font-extrabold">
                {focusTask.completed ? 'Вернуть в работу' : 'Завершить'}
              </button>
            </section>
          ) : (
            <div className="rounded-[28px] border border-line bg-card p-4 sm:p-6">
              {plan.localTasks.length > 0 ? (
                <div className="mb-4 rounded-2xl bg-[#F6F3EA] p-4">
                  <p className="text-sm font-bold">В этом браузере {ruCount(plan.localTasks.length, 'старая задача', 'старые задачи', 'старых задач')}. Перенести в аккаунт?</p>
                  <button type="button" onClick={() => void plan.importLocal()} className="mt-3 min-h-11 rounded-xl bg-primary px-4 text-sm font-extrabold">Импортировать</button>
                </div>
              ) : null}
              {plan.legacyCount > 0 ? (
                <div className="mb-4 rounded-2xl bg-[#F6F3EA] p-4">
                  <p className="text-sm font-bold">В базе {ruCount(plan.legacyCount, 'задача', 'задачи', 'задач')} без владельца. Привязать только к этому аккаунту?</p>
                  <button type="button" onClick={() => void plan.claimLegacy()} className="mt-3 min-h-11 rounded-xl bg-primary px-4 text-sm font-extrabold">Привязать</button>
                </div>
              ) : null}
              <form
                className="grid gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void plan.createTask({ ...draft, date: draft.date || today }).then((ok) => {
                    if (ok) setDraft((current) => ({ ...current, title: '' }));
                  });
                }}
              >
                <label htmlFor="new-task" className="sr-only">Новая задача</label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input id="new-task" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder={examples[0]} maxLength={160} className="min-h-12 flex-1 rounded-2xl border border-line px-4" />
                  <button type="submit" className="min-h-12 rounded-2xl bg-primary px-5 font-extrabold">Добавить</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {DAY_PARTS.map((part) => (
                    <button key={part.id} type="button" onClick={() => setDraft({ ...draft, dayPart: part.id })} className={`min-h-11 rounded-xl px-3 text-sm font-extrabold ${draft.dayPart === part.id ? 'bg-primary' : 'bg-cream'}`}>{part.label}</button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['none', 'daily', 'weekdays', 'weekly'] as const).map((kind) => (
                    <button key={kind} type="button" onClick={() => setDraft({ ...draft, repeatKind: kind })} className={`min-h-11 rounded-xl px-3 text-sm font-extrabold ${draft.repeatKind === kind ? 'bg-primary' : 'bg-cream'}`}>
                      {kind === 'none' ? 'Один раз' : kind === 'daily' ? 'Ежедневно' : kind === 'weekdays' ? 'По будням' : 'По дням'}
                    </button>
                  ))}
                  <label className="flex min-h-11 items-center gap-2 text-sm font-bold">Дата
                    <input type="date" value={draft.date || today} onChange={(event) => setDraft({ ...draft, date: event.target.value })} />
                  </label>
                </div>
                {draft.repeatKind === 'weekly' ? (
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day) => {
                      const selected = draft.weekdays.includes(day.id);
                      return (
                        <button key={day.id} type="button" aria-pressed={selected} onClick={() => setDraft({ ...draft, weekdays: selected ? draft.weekdays.filter((item) => item !== day.id) : [...draft.weekdays, day.id] })} className={`min-h-11 rounded-xl px-3 text-sm font-extrabold ${selected ? 'bg-primary' : 'bg-cream'}`}>
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </form>
              {focused.length > 0 ? (
                <div className="mt-5">
                  <h2 className="text-lg font-extrabold">Фокус дня</h2>
                  <TaskList tasks={focused} emptyLabel="" {...handlers} />
                </div>
              ) : null}
              {overdue.length > 0 ? (
                <div className="mt-5">
                  <h2 className="text-lg font-extrabold">Просроченные</h2>
                  <TaskList tasks={overdue} emptyLabel="" {...handlers} />
                </div>
              ) : null}
              {pickingFocus ? (
                <div className="mt-5 rounded-2xl bg-cream p-3">
                  <p className="text-sm font-bold">Какую задачу взять в фокус?</p>
                  {todayTasks.filter((task) => !task.completed).map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => {
                        void (async () => {
                          if (!task.inFocus) {
                            const ok = await plan.focusTask(task.id, true);
                            if (!ok) return;
                          }
                          setFocusId(task.id);
                          setPickingFocus(false);
                        })();
                      }}
                      className="mt-2 min-h-11 rounded-xl bg-card px-3 text-sm font-extrabold"
                    >
                      {task.title}
                    </button>
                  ))}
                </div>
              ) : null}
              {sorting ? (
                <div className="mt-5 rounded-2xl bg-cream p-3">
                  <p className="text-sm font-bold">Куда положить задачи без времени?</p>
                  {todayTasks.filter((task) => task.dayPart === 'anytime').map((task) => (
                    <div key={task.id} className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold">{task.title}</span>
                      {DAY_PARTS.filter((part) => part.id !== 'anytime').map((part) => (
                        <button key={part.id} type="button" onClick={() => void plan.setPart(task.id, part.id)} className="min-h-11 rounded-xl bg-card px-3 text-sm font-extrabold">{part.label}</button>
                      ))}
                    </div>
                  ))}
                </div>
              ) : null}
              {reviewing ? (
                <div className="mt-5 rounded-2xl bg-cream p-3">
                  <p className="text-sm font-bold">Незавершённое можно перенести на завтра. Само ничего не сдвинется.</p>
                  {todayTasks.filter((task) => !task.completed).map((task) => (
                    <button key={task.id} type="button" onClick={() => void plan.moveTask(task.id, addDays(today, 1))} className="mt-2 min-h-11 rounded-xl bg-card px-3 text-sm font-extrabold">
                      {task.title} → на завтра
                    </button>
                  ))}
                </div>
              ) : null}
              {sections.map((section) => (
                <div key={section.id} className="mt-5">
                  <h2 className="mb-2 text-lg font-extrabold">{section.label}</h2>
                  <TaskList tasks={section.tasks} emptyLabel="Пока пусто" {...handlers} />
                </div>
              ))}
              {recent.length > 0 ? (
                <div className="mt-5">
                  <h2 className="mb-2 text-lg font-extrabold">Недавно закрытые</h2>
                  <ul className="space-y-1 text-sm font-semibold text-muted">
                    {recent.map((task) => <li key={task.id}>{task.date}: {task.title}</li>)}
                  </ul>
                </div>
              ) : null}
              {upcoming.length > 0 ? (
                <div className="mt-5">
                  <h2 className="mb-2 text-lg font-extrabold">Ближайшие</h2>
                  <ul className="space-y-1 text-sm font-semibold text-muted">
                    {upcoming.map((task) => <li key={task.id}>{task.date}: {task.title}</li>)}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </section>
        <aside className="lg:sticky lg:top-6">
          <MascotPanel mode={mode} burstKey={burst} total={todayTasks.length} look={user.catLook} catName={user.catName} />
          <CatCoach
            role={user.catRole}
            catName={user.catName}
            today={today}
            timezone={user.timezone}
            tasks={plan.tasks}
            onSortAnytime={() => { setScreen('today'); setFocusId(null); setSorting(true); }}
            onStartFocus={() => { setScreen('today'); setFocusId(null); setPickingFocus(true); }}
            onShowHabits={() => { setScreen('today'); setFocusId(null); setHabitsOnly((value) => !value); }}
            onReviewOpen={() => { setScreen('today'); setFocusId(null); setReviewing(true); }}
          />
        </aside>
      </div>
    </div>
  );
}
