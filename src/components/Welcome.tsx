import { useState } from 'react';
import type { AppMode, AppTheme } from '../lib/notebook';
import { ThemePicker } from './ThemePicker';

const CHOICES: { id: AppMode; label: string; text: string }[] = [
  { id: 'habits', label: 'Я хочу вести трекер привычек', text: 'Отдельная карточка и 30 дней на каждую привычку' },
  { id: 'planner', label: 'Хочу вести рабочий планер', text: 'Семь дней недели, цели и список дел' },
  { id: 'focus', label: 'Не терять фокус дня', text: 'Задачи сегодняшнего дня и одно главное дело' },
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
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-10">
      <article className="w-full border border-line p-2">
        <div className="border border-line bg-card px-6 py-10 text-center sm:px-10">
          <p className="text-xs font-semibold tracking-[0.22em] text-muted uppercase">Today Cat</p>
          <img src="/mascot/cat-wave.png" alt="Рыжий котёнок с поднятой лапкой" className="mx-auto mt-6 h-44 w-auto max-w-full object-contain sm:h-52" />
          {step === 1 ? (
            <form className="mt-8" onSubmit={(event) => { event.preventDefault(); continueName(); }}>
              <h1 className="text-4xl leading-tight text-ink sm:text-5xl">Привет! Давай знакомиться, работяга!</h1>
              <label htmlFor="your-name" className="mt-6 block font-serif text-2xl text-ink">Как тебя зовут?</label>
              <input id="your-name" value={draft} onChange={(event) => { setDraft(event.target.value); setNameHint(false); }} maxLength={40} autoComplete="nickname" placeholder="Твоё имя" className="paper-field mt-2 text-center text-lg" />
              {nameHint ? <p role="alert" className="mt-3 text-sm font-semibold text-danger">Введи имя, чтобы продолжить</p> : null}
              <button type="submit" className="paper-submit mt-8 min-w-32">Дальше</button>
            </form>
          ) : null}
          {step === 2 ? (
            <div className="mt-8 text-left">
              <h1 className="text-center text-4xl leading-tight text-ink">Приятно познакомиться, {name}!</h1>
              <p className="mt-3 text-center text-2xl text-ink">Какой у тебя любимый цвет?</p>
              <div className="mt-6">
                <ThemePicker theme={theme} onChange={(next) => { onTheme(next); setThemeHint(false); }} />
              </div>
              {themeHint ? <p role="alert" className="mt-3 text-sm font-semibold text-danger">Выбери цвет, чтобы продолжить</p> : null}
              <button type="button" onClick={continueTheme} className="paper-submit mt-8 min-w-32">Дальше</button>
            </div>
          ) : null}
          {step === 3 ? (
            <div className="mt-8 text-left">
              <h1 className="text-center text-4xl leading-tight text-ink">{name}, для чего тебе трекер?</h1>
              <div className="mt-6 border-t border-line">
                {CHOICES.map((choice) => (
                  <button key={choice.id} type="button" onClick={() => onChoose(choice.id)} className="block w-full border-b border-line px-1 py-4 text-left">
                    <span className="block text-base font-semibold text-ink">{choice.label}</span>
                    <span className="mt-1 block text-sm text-muted">{choice.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </article>
    </main>
  );
}
