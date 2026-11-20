import { useState } from 'react';
import { parseFocusMinutes, type CatPrefs } from '../lib/focusSession';
import { playMeow, unlockSound } from '../lib/focusSound';
import type { AppTheme } from '../lib/notebook';
import { ThemePicker } from './ThemePicker';

type SettingsPanelProps = {
  login: string;
  name: string;
  theme: AppTheme | null;
  cat: CatPrefs;
  onName: (name: string) => void;
  onTheme: (theme: AppTheme) => void;
  onCat: (cat: CatPrefs) => void;
  here?: boolean;
};

function saveMinute(input: HTMLInputElement, current: number, max: number, apply: (value: number) => void) {
  const number = Number(input.value);
  if (!Number.isInteger(number) || number < 1 || number > max) input.value = String(current);
  else apply(number);
}

export function SettingsPanel({ login, name, theme, cat, onName, onTheme, onCat, here = false }: SettingsPanelProps) {
  const [draft, setDraft] = useState(name);
  const [hint, setHint] = useState(false);
  const [draftVolume, setDraftVolume] = useState<number | null>(null);
  const [soundNote, setSoundNote] = useState<string | null>(null);
  const volume = draftVolume ?? cat.volume;

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

  function commitVolume(value: number) {
    const next = Math.min(1, Math.max(0, value));
    setDraftVolume(null);
    onCat({ ...cat, volume: next });
  }

  async function testSound() {
    const ready = await unlockSound();
    if (!ready) {
      setSoundNote('Звук не включился.');
      return;
    }
    const result = await playMeow(volume);
    setSoundNote(result === 'blocked' ? 'Звук не включился.' : 'Звук есть.');
  }

  return (
    <section className="border-b border-line px-4 py-5 sm:px-6">
      <h2 className="text-3xl text-ink">Настройки</h2>
      <p className="mt-2 text-sm text-muted">Логин: {login}</p>
      {here ? <p className="mt-1 text-sm text-muted">Кабинет открывается в этом браузере.</p> : null}
      <form className="mt-4" onSubmit={(event) => { event.preventDefault(); saveName(); }}>
        <label htmlFor="settings-name" className="text-sm font-semibold text-ink">Имя</label>
        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end">
          <input id="settings-name" value={draft} onChange={(event) => { setDraft(event.target.value); setHint(false); }} maxLength={40} className="paper-field" />
          <button type="submit" className="paper-submit">Сохранить</button>
        </div>
        {hint ? <p role="alert" className="mt-2 text-sm font-semibold text-danger">Введи имя, чтобы продолжить</p> : null}
      </form>
      <h3 className="mt-6 text-2xl text-ink">Звук</h3>
      <label className="mt-3 flex min-h-11 items-center gap-3 text-sm font-semibold text-ink">
        <input type="checkbox" checked={cat.sound} onChange={async (event) => {
          if (event.target.checked) {
            const ready = await unlockSound();
            if (!ready) setSoundNote('Звук не включился.');
          }
          onCat({ ...cat, sound: event.target.checked });
        }} />
        Звуковые сигналы
      </label>
      <label className="mt-2 block text-sm font-semibold text-ink" htmlFor="sound-volume">Громкость</label>
      <input id="sound-volume" type="range" min={0} max={100} value={Math.round(volume * 100)} onChange={(event) => setDraftVolume(Number(event.target.value) / 100)} onPointerUp={(event) => commitVolume(Number(event.currentTarget.value) / 100)} onKeyUp={(event) => commitVolume(Number(event.currentTarget.value) / 100)} onBlur={(event) => commitVolume(Number(event.currentTarget.value) / 100)} className="mt-2 w-full max-w-xs" />
      <button type="button" onClick={() => void testSound()} className="paper-choice mt-2 px-0">Проверить звук</button>
      {soundNote ? <p role="status" className="mt-2 text-sm text-ink">{soundNote}</p> : null}
      <h3 className="mt-6 text-2xl text-ink">Помидор</h3>
      <div className="mt-3 grid max-w-sm gap-3">
        <label className="text-sm font-semibold text-ink" htmlFor="pomodoro-focus">Фокус, минуты
          <input id="pomodoro-focus" inputMode="numeric" defaultValue={cat.pomodoroMinutes} key={`focus-${cat.pomodoroMinutes}`} onBlur={(event) => {
            const next = parseFocusMinutes(event.target.value);
            if (next == null) event.target.value = String(cat.pomodoroMinutes);
            else onCat({ ...cat, pomodoroMinutes: next });
          }} className="paper-field mt-1" />
        </label>
        <label className="text-sm font-semibold text-ink" htmlFor="pomodoro-short">Короткий перерыв, минуты
          <input id="pomodoro-short" inputMode="numeric" defaultValue={cat.shortMinutes} key={`short-${cat.shortMinutes}`} onBlur={(event) => saveMinute(event.target, cat.shortMinutes, 60, (value) => onCat({ ...cat, shortMinutes: value }))} className="paper-field mt-1" />
        </label>
        <label className="text-sm font-semibold text-ink" htmlFor="pomodoro-long">Длинный перерыв, минуты
          <input id="pomodoro-long" inputMode="numeric" defaultValue={cat.longMinutes} key={`long-${cat.longMinutes}`} onBlur={(event) => saveMinute(event.target, cat.longMinutes, 60, (value) => onCat({ ...cat, longMinutes: value }))} className="paper-field mt-1" />
        </label>
        <label className="text-sm font-semibold text-ink" htmlFor="pomodoro-rounds">Подходов до длинного перерыва
          <input id="pomodoro-rounds" inputMode="numeric" defaultValue={cat.rounds} key={`rounds-${cat.rounds}`} onBlur={(event) => saveMinute(event.target, cat.rounds, 8, (value) => onCat({ ...cat, rounds: value }))} className="paper-field mt-1" />
        </label>
      </div>
      <label className="mt-3 flex min-h-11 items-center gap-3 text-sm font-semibold text-ink">
        <input type="checkbox" checked={cat.autoStart} onChange={(event) => onCat({ ...cat, autoStart: event.target.checked })} />
        Автозапуск следующей фазы
      </label>
      <h3 className="mt-6 text-2xl text-ink">Котёнок</h3>
      <label className="mt-3 flex min-h-11 items-center gap-3 text-sm font-semibold text-ink">
        <input type="checkbox" checked={cat.reminders} onChange={(event) => onCat({ ...cat, reminders: event.target.checked })} />
        Кот напоминает о фокусе
      </label>
      <p className="text-sm text-muted">Один раз в середине сессии.</p>
      {cat.hidden ? <button type="button" onClick={() => onCat({ ...cat, hidden: false })} className="paper-submit mt-3">Вернуть котёнка</button> : null}
      <details className="mt-3 text-sm text-ink">
        <summary className="cursor-pointer font-semibold">Как двигать котёнка</summary>
        <p className="mt-2 text-muted">Потяни, чтобы переставить. Нажми, чтобы открыть меню.</p>
      </details>
      <h3 className="mt-6 text-2xl text-ink">Цвет приложения</h3>
      <div className="mt-3">
        <ThemePicker theme={theme ?? 'yellow'} onChange={onTheme} />
      </div>
    </section>
  );
}
