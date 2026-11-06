import { useState } from 'react';
import type { AppMode, AppTheme } from '../lib/notebook';
import { ThemePicker } from './ThemePicker';

const CHOICES: { id: AppMode; label: string; text: string }[] = [
  { id: 'habits', label: 'Я хочу вести трекер привычек', text: 'Отметки на сегодня и расписание' },
  { id: 'planner', label: 'Хочу вести рабочий планер', text: 'Неделя и дела выбранного дня' },
  { id: 'focus', label: 'Не терять фокус дня', text: 'Приоритеты и одно главное дело' },
];

type WelcomeProps = {
  name: string;
  theme: AppTheme | null;
  onName: (name: string) => void;
  onTheme: (theme: AppTheme) => void;
  onChoose: (mode: AppMode) => void;
};

function openingStep(name: string, theme: AppTheme | null): 1 | 2 | 3 {
  if (!name.trim()) return 1;
  if (!theme) return 2;
  return 3;
}

export function Welcome({ name, theme, onName, onTheme, onChoose }: WelcomeProps) {
  const [step, setStep] = useState<1 | 2 | 3>(() => openingStep(name, theme));
  const [draft, setDraft] = useState(name);
  const [nameHint, setNameHint] = useState(false);
  const [themeHint, setThemeHint] = useState(false);

  function continueName() {
    const next = draft.trim();
    if (!next) {
      setNameHint(true);
      return;
    }
    onName(next);
    setStep(2);
  }

  function continueTheme() {
    if (!theme) {
      setThemeHint(true);
      return;
    }
    setStep(3);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-8">
      <section className="w-full rounded-[28px] border border-line bg-card px-5 py-8 sm:px-8">
        <img src="/mascot/cat-wave.png" alt="Улыбающийся котёнок машет лапкой" className="mx-auto h-56 w-auto max-w-full object-contain sm:h-64" />
        {step === 1 ? (
          <form className="mt-6" onSubmit={(event) => { event.preventDefault(); continueName(); }}>
            <h1 className="text-center text-2xl font-extrabold leading-snug text-ink sm:text-3xl">Привет! Давай знакомиться, работяга! Как тебя зовут?</h1>
            <label htmlFor="your-name" className="mt-5 block text-sm font-extrabold text-ink">Твоё имя</label>
            <input id="your-name" value={draft} onChange={(event) => { setDraft(event.target.value); setNameHint(false); }} maxLength={40} autoComplete="nickname" className="mt-2 min-h-12 w-full rounded-2xl border border-line bg-field px-4 text-ink" />
            {nameHint ? <p role="alert" className="mt-2 text-sm font-bold text-danger">Введи имя, чтобы продолжить</p> : null}
            <button type="submit" className="mt-5 min-h-12 rounded-2xl bg-primary px-8 text-base font-extrabold">Дальше</button>
          </form>
        ) : null}
        {step === 2 ? (
          <div className="mt-6">
            <h1 className="text-center text-2xl font-extrabold leading-snug text-ink">Приятно познакомиться, {name}! Какой у тебя любимый цвет?</h1>
            <div className="mt-5">
              <ThemePicker theme={theme} onChange={(next) => { onTheme(next); setThemeHint(false); }} />
            </div>
            {themeHint ? <p role="alert" className="mt-3 text-sm font-bold text-danger">Выбери цвет, чтобы продолжить</p> : null}
            <button type="button" onClick={continueTheme} className="mt-5 min-h-12 rounded-2xl bg-primary px-8 text-base font-extrabold">Дальше</button>
          </div>
        ) : null}
        {step === 3 ? (
          <div className="mt-6">
            <h1 className="text-center text-2xl font-extrabold leading-snug text-ink">{name}, для чего тебе трекер?</h1>
            <div className="mt-5 grid gap-3">
              {CHOICES.map((choice) => (
                <button key={choice.id} type="button" onClick={() => onChoose(choice.id)} className="min-h-16 rounded-3xl border border-line bg-cream px-4 py-3 text-left">
                  <span className="block text-base font-extrabold text-ink">{choice.label}</span>
                  <span className="mt-1 block text-sm font-semibold text-muted">{choice.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
