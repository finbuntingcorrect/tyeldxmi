import { useEffect, useState } from 'react';
import { ThemePicker } from './ThemePicker';
import { playMeow, unlockSound } from '../lib/focusSound';
import type { CatPrefs } from '../lib/focusSession';
import type { AppTheme } from '../lib/notebook';

type Props = {
  login: string | null;
  name: string;
  theme: AppTheme | null;
  cat: CatPrefs;
  onName: (name: string) => Promise<string | null>;
  onTheme: (theme: AppTheme) => Promise<string | null>;
  onCat: (cat: CatPrefs) => Promise<string | null>;
};

export function SettingsPanel({ login, name, theme, cat, onName, onTheme, onCat }: Props) {
  const [draft, setDraft] = useState(name);
  const [namePending, setNamePending] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [volumeDraft, setVolumeDraft] = useState<number | null>(null);
  const volume = volumeDraft != null && volumeDraft !== cat.volume ? volumeDraft : cat.volume;
  const [soundState, setSoundState] = useState<'saving' | 'saved' | 'error' | null>(null);
  const [soundHeard, setSoundHeard] = useState<string | null>(null);
  const [catError, setCatError] = useState<string | null>(null);
  const [themeError, setThemeError] = useState<string | null>(null);

  useEffect(() => {
    if (!nameSaved) return;
    const timer = window.setTimeout(() => setNameSaved(false), 2200);
    return () => window.clearTimeout(timer);
  }, [nameSaved]);
  useEffect(() => {
    if (soundState !== 'saved') return;
    const timer = window.setTimeout(() => setSoundState(null), 2200);
    return () => window.clearTimeout(timer);
  }, [soundState]);

  async function saveName() {
    const next = draft.trim();
    if (!next) {
      setNameError('Введи имя, чтобы продолжить.');
      setNameSaved(false);
      return;
    }
    if (next.includes('@')) {
      setNameError('Напиши имя, не почту.');
      setNameSaved(false);
      return;
    }
    setNamePending(true);
    setNameError(null);
    setNameSaved(false);
    const error = await onName(next);
    setNamePending(false);
    if (error) setNameError('Не сохранилось.');
    else {
      setDraft(next);
      setNameSaved(true);
    }
  }

  async function saveSound(next: CatPrefs) {
    setSoundState('saving');
    const error = await onCat(next);
    setSoundState(error ? 'error' : 'saved');
  }

  async function saveKitten(next: CatPrefs) {
    setCatError(null);
    const error = await onCat(next);
    if (error) setCatError('Не сохранилось. Повтори изменение.');
  }

  function commitVolume(value: number) {
    if (!cat.sound) return;
    const next = Number(value.toFixed(2));
    if (next === cat.volume) return;
    void saveSound({ ...cat, volume: next });
  }

  async function testSound() {
    setSoundHeard(null);
    const ready = await unlockSound();
    if (!ready) {
      setSoundHeard('Звук не включился.');
      return;
    }
    await playMeow(volume);
    setSoundHeard('Звук есть.');
  }

  const soundNote = soundState === 'saving' ? 'Сохраняем…' : soundState === 'saved' ? 'Сохранено' : soundState === 'error' ? 'Не сохранилось.' : null;

  return (
    <div className="settings-sheet">
      <section className="settings-block" aria-labelledby="settings-profile">
        <h2 id="settings-profile">Профиль</h2>
        <p className="settings-mail">
          <span>Почта</span>
          <strong>{login ?? 'Почта не указана'}</strong>
        </p>
        <form
          className="settings-name"
          onSubmit={(event) => {
            event.preventDefault();
            void saveName();
          }}
        >
          <label htmlFor="display-name">Имя</label>
          <div className="settings-name-line">
            <input id="display-name" className="paper-field" autoComplete="nickname" value={draft} onChange={(event) => { setDraft(event.target.value); setNameSaved(false); setNameError(null); }} />
            <button type="submit" className="paper-submit" disabled={namePending}>{namePending ? 'Сохраняем…' : 'Сохранить'}</button>
          </div>
          {nameSaved || nameError ? (
            <div className="settings-name-actions">
              {nameSaved ? <p role="status">Сохранено</p> : null}
              {nameError ? (
                <p role="alert">
                  {nameError}{' '}
                  <button type="button" className="settings-retry" onClick={() => void saveName()}>Повторить</button>
                </p>
              ) : null}
            </div>
          ) : null}
        </form>
      </section>

      <section className="settings-block" aria-labelledby="settings-sound">
        <h2 id="settings-sound">Звук</h2>
        <SwitchRow
          id="sound-enabled"
          label="Звук"
          checked={cat.sound}
          onChange={(checked) => void saveSound({ ...cat, sound: checked })}
        />
        <label className="settings-volume" htmlFor="sound-volume">
          <span>Громкость</span>
          <input
            id="sound-volume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            disabled={!cat.sound}
            aria-valuetext={`${Math.round(volume * 100)} процентов`}
            onChange={(event) => setVolumeDraft(Number(event.target.value))}
            onPointerUp={(event) => commitVolume(Number(event.currentTarget.value))}
            onKeyUp={(event) => {
              if (event.key.startsWith('Arrow')) commitVolume(Number(event.currentTarget.value));
            }}
            onBlur={(event) => commitVolume(Number(event.currentTarget.value))}
          />
        </label>
        <button type="button" className="settings-test" disabled={!cat.sound} onClick={() => void testSound()}>Проверить звук</button>
        {soundNote ? <p role="status" className="settings-note">{soundNote}{soundState === 'error' ? ' Повтори изменение.' : ''}</p> : null}
        {soundHeard ? <p role="status" className="settings-note">{soundHeard}</p> : null}
      </section>

      <section className="settings-block" aria-labelledby="settings-cat">
        <h2 id="settings-cat">Котёнок</h2>
        <SwitchRow
          id="cat-motion"
          label="Анимация котёнка"
          hint="Выключена — котёнок остаётся на месте, без покадрового движения."
          checked={cat.walks}
          onChange={(checked) => void saveKitten({ ...cat, walks: checked })}
        />
        <SwitchRow
          id="cat-meow"
          label="Мяукнуть в середине фокуса"
          hint={cat.sound ? 'Один раз за текущую сессию. Пауза в это время не входит.' : 'Сначала включи звук.'}
          checked={cat.reminders}
          disabled={!cat.sound}
          onChange={(checked) => void saveKitten({ ...cat, reminders: checked })}
        />
        {catError ? <p role="alert" className="settings-note">{catError}</p> : null}
      </section>

      <section className="settings-block" aria-labelledby="settings-look">
        <h2 id="settings-look">Оформление</h2>
        <ThemePicker theme={theme ?? 'yellow'} compact label="Оформление" onChange={(next) => {
          setThemeError(null);
          void onTheme(next).then((error) => {
            if (error) setThemeError('Не сохранилось. Повтори выбор.');
          });
        }} />
        {themeError ? <p role="alert" className="settings-note">{themeError}</p> : null}
      </section>
    </div>
  );
}

function SwitchRow({ id, label, hint, checked, disabled, onChange }: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className={`settings-row${disabled ? ' is-disabled' : ''}`}>
      <div className="settings-copy">
        <label htmlFor={id}>{label}</label>
        {hint ? <p id={`${id}-hint`}>{hint}</p> : null}
      </div>
      <span className="settings-switch">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span aria-hidden="true" />
      </span>
    </div>
  );
}
