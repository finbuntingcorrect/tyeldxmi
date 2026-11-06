import { hourInTimeZone } from '../../server/recurrence';
import type { CatRole, DayPart, Task } from '../types';

type CatCoachProps = {
  role: CatRole;
  catName: string;
  today: string;
  timezone: string;
  tasks: Task[];
  onSortAnytime: () => void;
  onStartFocus: () => void;
  onShowHabits: () => void;
  onReviewOpen: () => void;
};

export function CatCoach({ role, catName, today, timezone, tasks, onSortAnytime, onStartFocus, onShowHabits, onReviewOpen }: CatCoachProps) {
  const todayTasks = tasks.filter((task) => task.date === today && !task.completed);
  const anytime = todayTasks.filter((task) => task.dayPart === 'anytime');
  const habits = todayTasks.filter((task) => task.repeatKind);
  const focused = todayTasks.find((task) => task.inFocus);
  const hour = hourInTimeZone(timezone);
  const buttons: { label: string; onClick: () => void }[] = [];
  if (role === 'planner' && anytime.length > 0) buttons.push({ label: 'Разобрать задачи без времени', onClick: onSortAnytime });
  if (role === 'planner' && hour >= 18 && todayTasks.length > 0) buttons.push({ label: 'Разобрать незавершённые', onClick: onReviewOpen });
  if (role === 'focus') buttons.push({ label: 'Начать фокус', onClick: onStartFocus });
  if (role === 'habits') buttons.push({ label: 'Посмотреть привычки', onClick: onShowHabits });

  const text = role === 'focus'
    ? focused
      ? `${catName} держит в фокусе «${focused.title}». Можно начать и закрыть её отдельно.`
      : todayTasks[0]
        ? `${catName} предлагает начать с «${todayTasks[0].title}».`
        : `${catName} подождёт, пока появится главная задача.`
    : role === 'habits'
      ? habits.length
        ? `${catName} видит привычки на сегодня: ${habits.length}`
        : `${catName} может сделать новую задачу привычкой. Выберите дни в меню задачи.`
      : anytime.length
        ? `${catName} предлагает разложить ${anytime.length} без времени на утро, день и вечер.`
        : `${catName} следит, чтобы день был разложен по времени.`;

  return (
    <section className="mt-4 rounded-[28px] border border-line bg-card p-4">
      <h2 className="text-base font-extrabold">Что предлагает {catName}</h2>
      <p className="mt-2 text-sm font-semibold leading-relaxed text-muted">{text}</p>
      <div className="mt-3 grid gap-2">
        {buttons.map((button) => (
          <button key={button.label} type="button" onClick={button.onClick} className="min-h-11 rounded-xl bg-primary px-3 text-sm font-extrabold">
            {button.label}
          </button>
        ))}
      </div>
    </section>
  );
}

export type SortTarget = DayPart;
