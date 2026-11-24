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
  onName: (name: string) => Promise<string | null>;
  onTheme: (theme: AppTheme) => Promise<string | null>;
  onCat: (cat: CatPrefs) => Promise<string | null>;
  here?: boolean;
};

function saveMinute(input: HTMLInputElement, current: number, max: number, apply: (value: number) => void) {
  const number = Number(input.value);
  if (!Number.isInteger(number) || number < 1 || number > max) input.value = String(current);
  else apply(number);
}

function FieldNote({ pending, failed, onRetry }: { pending: boolean; failed: boolean; onRetry: () => void }) {
  if (pending) return <p role="status" className="mt-1 text-sm text-muted">Сохраняем…</p>;
  if (!failed) return null;
  return (
    <p role="alert" className="mt-1 text-sm font-semibold text-danger">
      Не сохранилось.
      <button type="button" onClick={onRetry} className="paper-choice">Повторить</button>
    </p>
  );
}

export function SettingsPanel({ login, name, theme, cat, onName, onTheme, onCat, here = false }: SettingsPanelProps) {
  const [draft, setDraft] = useState(name);
  const [hint, setHint] = useState<string | null>(null);
  const [draftVolume, setDraftVolume] = useState<number | null>(null);
  const [soundNote, setSoundNote] = useState<string | null>(null);
  const [namePending, setNamePending] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [nameFailed, setNameFailed] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const volume = draftVolume ?? cat.volume;

  function dismissName() {
    setNameSaved(false);
  }

  async function saveName() {
    const next = draft.trim();
    if (!next || next.includes('@')) {
      setHint(next.includes('@') ? 'Напиши имя, не почту.' : 'Введи имя, чтобы продолжить');
      setNameSaved(false);
      return;
    }
    setNamePending(true);
    setNameSaved(false);
    setNameFailed(false);
    setHint(null);
    const message = await onName(next);
    setNamePending(false);
    if (message) {
      setNameFailed(true);
      return;
    }
    setDraft(next);
    setNameSaved(true);
  }

  async function saveCat(field: string, next: CatPrefs) {
    dismissName();
    setPending(field);
    setFailed(null);
    const message = await onCat(next);
    setPending((current) => current === field ? null : current);
    if (message) setFailed(field);
  }

  async function saveTheme(next: AppTheme) {
    dismissName();
    setPending('theme');
    setFailed(null);
    const message = await onTheme(next);
    setPending((current) => current === 'theme' ? null : current);
    if (message) setFailed('theme');
  }

  function commitVolume(value: number) {
    const next = Math.min(1, Math.max(0, value));
    const changed = draftVolume != null && next !== cat.volume;
    setDraftVolume(null);
    if (!changed) return;
    void saveCat('volume', { ...cat, volume: next });
  }

  function fieldNote(field: string, retry: () => void) {
    return <FieldNote pending={pending === field} failed={failed === field} onRetry={retry} />;
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
      <p className="mt-2 text-sm text-muted break-words">{login.includes('@') ? 'Почта' : 'Логин'}: {login}</p>
      {here ? <p className="mt-1 text-sm text-muted">Кабинет открывается в этом браузере.</p> : null}
      <form className="mt-4" onSubmit={(event) => { event.preventDefault(); void saveName(); }}>
        <label htmlFor="settings-name" className="text-sm font-semibold text-ink">Имя</label>
        <p className="mt-1 text-sm text-muted">Сохраняется кнопкой «Сохранить».</p>
        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end">
          <input id="settings-name" value={draft} onChange={(event) => { setDraft(event.target.value); setHint(null); setNameSaved(false); setNameFailed(false); }} maxLength={40} autoComplete="nickname" className="paper-field" />
          <button type="submit" className="paper-submit" disabled={namePending}>{namePending ? 'Сохраняем…' : 'Сохранить'}</button>
        </div>
        {hint ? <p role="alert" className="mt-2 text-sm font-semibold text-danger">{hint}</p> : null}
        {nameSaved && !nameFailed && !namePending ? <p role="status" className="mt-2 text-sm text-ink">Сохранено</p> : null}
        {nameFailed ? (
          <p role="alert" className="mt-2 text-sm font-semibold text-danger">
            Не сохранилось.
            <button type="button" onClick={() => void saveName()} className="paper-choice">Повторить</button>
          </p>
        ) : null}
      </form>
      <h3 className="mt-6 text-2xl text-ink">Звук</h3>
      <p className="mt-1 text-sm text-muted">Эти настройки сохраняются сами.</p>
      <label className="mt-3 flex min-h-11 items-center gap-3 text-sm font-semibold text-ink">
        <input type="checkbox" checked={cat.sound} onChange={(event) => {
          const checked = event.target.checked;
          dismissName();
          void (async () => {
            if (checked) {
              const ready = await unlockSound();
              if (!ready) setSoundNote('Звук не включился.');
            }
            await saveCat('sound', { ...cat, sound: checked });
          })();
        }} />
        Звуковые сигналы
      </label>
      {fieldNote('sound', () => void saveCat('sound', cat))}
      <label className="mt-2 block text-sm font-semibold text-ink" htmlFor="sound-volume">Громкость</label>
      <input id="sound-volume" type="range" min={0} max={100} value={Math.round(volume * 100)} onChange={(event) => setDraftVolume(Number(event.target.value) / 100)} onPointerUp={(event) => commitVolume(Number(event.currentTarget.value) / 100)} onKeyUp={(event) => commitVolume(Number(event.currentTarget.value) / 100)} onBlur={(event) => commitVolume(Number(event.currentTarget.value) / 100)} className="mt-2 block h-11 w-full max-w-xs" />
      {fieldNote('volume', () => void saveCat('volume', cat))}
      <button type="button" onClick={() => void testSound()} className="paper-choice mt-2 px-0">Проверить звук</button>
      {soundNote ? <p role="status" className="mt-2 text-sm text-ink">{soundNote}</p> : null}
      <h3 className="mt-6 text-2xl text-ink">Фокус и перерывы</h3>
      <div className="mt-3 grid max-w-sm gap-3">
        <label className="text-sm font-semibold text-ink" htmlFor="pomodoro-focus">Фокус, минуты
          <input id="pomodoro-focus" inputMode="numeric" defaultValue={cat.pomodoroMinutes} key={`focus-${cat.pomodoroMinutes}`} onBlur={(event) => {
            const next = parseFocusMinutes(event.target.value);
            if (next == null) event.target.value = String(cat.pomodoroMinutes);
            else if (next !== cat.pomodoroMinutes) void saveCat('focus', { ...cat, pomodoroMinutes: next });
          }} className="paper-field mt-1" />
          {fieldNote('focus', () => void saveCat('focus', cat))}
        </label>
        <label className="text-sm font-semibold text-ink" htmlFor="pomodoro-short">Короткий перерыв, минуты
          <input id="pomodoro-short" inputMode="numeric" defaultValue={cat.shortMinutes} key={`short-${cat.shortMinutes}`} onBlur={(event) => saveMinute(event.target, cat.shortMinutes, 60, (value) => { if (value !== cat.shortMinutes) void saveCat('short', { ...cat, shortMinutes: value }); })} className="paper-field mt-1" />
          {fieldNote('short', () => void saveCat('short', cat))}
        </label>
        <label className="text-sm font-semibold text-ink" htmlFor="pomodoro-long">Длинный перерыв, минуты
          <input id="pomodoro-long" inputMode="numeric" defaultValue={cat.longMinutes} key={`long-${cat.longMinutes}`} onBlur={(event) => saveMinute(event.target, cat.longMinutes, 60, (value) => { if (value !== cat.longMinutes) void saveCat('long', { ...cat, longMinutes: value }); })} className="paper-field mt-1" />
          {fieldNote('long', () => void saveCat('long', cat))}
        </label>
        <label className="text-sm font-semibold text-ink" htmlFor="pomodoro-rounds">Подходов до длинного перерыва
          <input id="pomodoro-rounds" inputMode="numeric" defaultValue={cat.rounds} key={`rounds-${cat.rounds}`} onBlur={(event) => saveMinute(event.target, cat.rounds, 8, (value) => { if (value !== cat.rounds) void saveCat('rounds', { ...cat, rounds: value }); })} className="paper-field mt-1" />
          {fieldNote('rounds', () => void saveCat('rounds', cat))}
        </label>
      </div>
      <label className="mt-3 flex min-h-11 items-center gap-3 text-sm font-semibold text-ink">
        <input type="checkbox" checked={cat.autoStart} onChange={(event) => void saveCat('auto', { ...cat, autoStart: event.target.checked })} />
        Автозапуск перерыва и следующего подхода
      </label>
      {fieldNote('auto', () => void saveCat('auto', cat))}
      <h3 className="mt-6 text-2xl text-ink">Котёнок</h3>
      <label className="mt-3 flex min-h-11 items-center gap-3 text-sm font-semibold text-ink">
        <input type="checkbox" checked={cat.reminders} onChange={(event) => void saveCat('remind', { ...cat, reminders: event.target.checked })} />
        Кот напоминает о фокусе
      </label>
      {fieldNote('remind', () => void saveCat('remind', cat))}
      <p className="text-sm text-muted">Один раз в середине подхода.</p>
      {cat.hidden ? <button type="button" onClick={() => void saveCat('cat', { ...cat, hidden: false })} className="paper-submit mt-3">Вернуть котёнка</button> : null}
      {fieldNote('cat', () => void saveCat('cat', cat))}
      <details className="mt-3 text-sm text-ink">
        <summary className="cursor-pointer font-semibold">Как двигать котёнка</summary>
        <p className="mt-2 text-muted">Потяни, чтобы переставить. Нажми, чтобы открыть меню.</p>
      </details>
      <h3 className="mt-6 text-2xl text-ink">Цвет приложения</h3>
      <div className="mt-3">
        <ThemePicker theme={theme ?? 'yellow'} onChange={(next) => void saveTheme(next)} />
        {fieldNote('theme', () => void saveTheme(theme ?? 'yellow'))}
      </div>
    </section>
  );
}
