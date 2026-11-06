import { useState } from 'react';
import type { AppTheme } from '../lib/notebook';
import { ThemePicker } from './ThemePicker';

type SettingsPanelProps = {
  name: string;
  theme: AppTheme | null;
  onName: (name: string) => void;
  onTheme: (theme: AppTheme) => void;
};

export function SettingsPanel({ name, theme, onName, onTheme }: SettingsPanelProps) {
  const [draft, setDraft] = useState(name);
  const [hint, setHint] = useState(false);

  function saveName() {
    const next = draft.trim();
    if (!next) {
      setHint(true);
      return;
    }
    onName(next);
    setDraft(next);
    setHint(false);
  }

  return (
    <section className="mt-4 rounded-[28px] border border-line bg-card p-4 sm:p-6">
      <h2 className="text-lg font-extrabold text-ink">Настройки</h2>
      <form className="mt-4" onSubmit={(event) => { event.preventDefault(); saveName(); }}>
        <label htmlFor="settings-name" className="text-sm font-extrabold text-ink">Имя</label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input id="settings-name" value={draft} onChange={(event) => { setDraft(event.target.value); setHint(false); }} maxLength={40} className="min-h-12 flex-1 rounded-2xl border border-line bg-field px-4 text-ink" />
          <button type="submit" className="min-h-12 rounded-2xl bg-primary px-5 font-extrabold">Сохранить</button>
        </div>
        {hint ? <p role="alert" className="mt-2 text-sm font-bold text-danger">Введи имя, чтобы продолжить</p> : null}
      </form>
      <p className="mt-5 text-sm font-extrabold text-ink">Цвет приложения</p>
      <div className="mt-3">
        <ThemePicker theme={theme ?? 'yellow'} onChange={onTheme} />
      </div>
    </section>
  );
}
