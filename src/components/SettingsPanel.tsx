import { useState } from 'react';
import type { CatPrefs } from '../lib/focusSession';
import { playChime, unlockSound } from '../lib/focusSound';
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
};

export function SettingsPanel({ login, name, theme, cat, onName, onTheme, onCat }: SettingsPanelProps) {
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
      setSoundNote('Браузер не дал включить звук. Остальное работает как обычно.');
      return;
    }
    const result = await playChime(volume);
    setSoundNote(result === 'blocked' ? 'Браузер не дал включить звук. Остальное работает как обычно.' : 'Сигнал проигран.');
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
      <h3 className="mt-6 text-2xl text-ink">Звук</h3>
      <label className="mt-3 flex min-h-11 items-center gap-3 text-sm font-semibold text-ink">
        <input type="checkbox" checked={cat.sound} onChange={async (event) => {
          if (event.target.checked) {
            const ready = await unlockSound();
            if (!ready) setSoundNote('Браузер не дал включить звук. Остальное работает как обычно.');
          }
          onCat({ ...cat, sound: event.target.checked });
        }} />
        Звуковые сигналы
      </label>
      <label className="mt-2 block text-sm font-semibold text-ink" htmlFor="sound-volume">Громкость</label>
      <input id="sound-volume" type="range" min={0} max={100} value={Math.round(volume * 100)} onChange={(event) => setDraftVolume(Number(event.target.value) / 100)} onPointerUp={(event) => commitVolume(Number(event.currentTarget.value) / 100)} onKeyUp={(event) => commitVolume(Number(event.currentTarget.value) / 100)} onBlur={(event) => commitVolume(Number(event.currentTarget.value) / 100)} className="mt-2 w-full max-w-xs" />
      <button type="button" onClick={() => void testSound()} className="paper-choice mt-2 px-0">Проверить звук</button>
      {soundNote ? <p role="status" className="mt-2 text-sm text-ink">{soundNote}</p> : null}
      <p className="mt-2 max-w-xl text-sm text-muted">Мяуканье берётся из файла sounds/meow.mp3. Пока файла нет, напоминание использует короткий тихий сигнал.</p>
      <h3 className="mt-6 text-2xl text-ink">Котёнок</h3>
      <label className="mt-3 flex min-h-11 items-center gap-3 text-sm font-semibold text-ink">
        <input type="checkbox" checked={cat.reminders} onChange={(event) => onCat({ ...cat, reminders: event.target.checked })} />
        Кот напоминает о фокусе
      </label>
      <p className="text-sm text-muted">Одно тихое напоминание в середине сессии. По умолчанию выключено.</p>
      {cat.hidden ? <button type="button" onClick={() => onCat({ ...cat, hidden: false })} className="paper-submit mt-3">Вернуть котёнка</button> : <p className="mt-3 text-sm text-muted">Котёнок на экране. Скрыть его можно нажатием на него.</p>}
      <h3 className="mt-6 text-2xl text-ink">Цвет приложения</h3>
      <div className="mt-3">
        <ThemePicker theme={theme ?? 'yellow'} onChange={onTheme} />
      </div>
    </section>
  );
}
