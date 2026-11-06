import { useState } from 'react';
import type { AppMode } from '../lib/notebook';

const CHOICES: { id: AppMode; label: string; text: string }[] = [
  { id: 'habits', label: 'Я хочу вести трекер привычек', text: 'Отметки на сегодня и расписание' },
  { id: 'planner', label: 'Хочу вести рабочий планер', text: 'Неделя и дела выбранного дня' },
  { id: 'focus', label: 'Не терять фокус дня', text: 'Приоритеты и одно главное дело' },
];

type WelcomeProps = {
  onChoose: (mode: AppMode) => void;
};

export function Welcome({ onChoose }: WelcomeProps) {
  const [asking, setAsking] = useState(false);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-8">
      <section className="w-full rounded-[28px] border border-line bg-card px-5 py-8 text-center sm:px-8">
        <img src="/mascot/cat-wave.png" alt="Улыбающийся котёнок машет лапкой" className="mx-auto h-64 w-auto max-w-full object-contain sm:h-72" />
        {asking ? (
          <>
            <h1 className="mt-6 text-2xl font-extrabold text-ink">Для чего тебе трекер?</h1>
            <div className="mt-5 grid gap-3 text-left">
              {CHOICES.map((choice) => (
                <button key={choice.id} type="button" onClick={() => onChoose(choice.id)} className="min-h-16 rounded-3xl border border-line bg-cream px-4 py-3 text-left hover:border-primary">
                  <span className="block text-base font-extrabold text-ink">{choice.label}</span>
                  <span className="mt-1 block text-sm font-semibold text-muted">{choice.text}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-2xl font-extrabold leading-snug text-ink sm:text-3xl">Привет! Давай знакомиться, работяга!</h1>
            <button type="button" onClick={() => setAsking(true)} className="mt-6 min-h-12 rounded-2xl bg-primary px-8 text-base font-extrabold text-ink">Давай!</button>
          </>
        )}
      </section>
    </main>
  );
}
