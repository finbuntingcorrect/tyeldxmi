import { useState } from 'react';
import type { AppTheme } from '../lib/notebook';
import { ThemePicker } from './ThemePicker';

type SettingsPanelProps = {
  login: string;
  name: string;
  theme: AppTheme | null;
  onName: (name: string) => void;
  onTheme: (theme: AppTheme) => void;
};

export function SettingsPanel({ login, name, theme, onName, onTheme }: SettingsPanelProps) {
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
    <section className="border-b border-line px-4 py-5 sm:px-6">
      <h2 className="text-3xl text-ink">Настройки</h2>
      <p className="mt-2 text-sm text-muted">Логин кабинета: {login}. Задачи этого логина видны только тебе.</p>
      <form className="mt-4" onSubmit={(event) => { event.preventDefault(); saveName(); }}>
        <label htmlFor="settings-name" className="text-sm font-semibold text-ink">Имя</label>
        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end">
          <input id="settings-name" value={draft} onChange={(event) => { setDraft(event.target.value); setHint(false); }} maxLength={40} className="paper-field" />
          <button type="submit" className="paper-submit">Сохранить</button>
        </div>
        {hint ? <p role="alert" className="mt-2 text-sm font-semibold text-danger">Введи имя, чтобы продолжить</p> : null}
      </form>
      <h3 className="mt-6 text-2xl text-ink">Цвет приложения</h3>
      <div className="mt-3">
        <ThemePicker theme={theme ?? 'yellow'} onChange={onTheme} />
      </div>
    </section>
  );
}
