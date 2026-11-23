import { useEffect, useId, useRef, useState } from 'react';
import { AppLink } from './AppLink';

const POINTS = [
  { title: 'Планируй день', text: 'Календарь и задачи на выбранную дату.' },
  { title: 'Работай в фокусе', text: 'Таймер для работы и перерывов.' },
  { title: 'Создавай привычки', text: 'Отмечай то, что хочешь делать регулярно.' },
];

function AccountMenu({ label, onSignOut }: { label: string; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="home-account" ref={root}>
      <button
        type="button"
        className="home-account-toggle"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{label}</span>
      </button>
      {open ? (
        <div id={menuId} className="home-account-menu" role="menu">
          <AppLink href="/app/settings" role="menuitem" onClick={() => setOpen(false)}>Настройки</AppLink>
          <button type="button" role="menuitem" onClick={onSignOut}>Выйти</button>
        </div>
      ) : null}
    </div>
  );
}

export function LandingPage({
  signedIn,
  accountLabel = 'Аккаунт',
  onSignOut,
}: {
  signedIn: boolean;
  accountLabel?: string;
  onSignOut?: () => void;
}) {
  const enter = signedIn ? '/app' : '/login?next=/app';
  return (
    <div className="public">
      <div className="home">
        <header className="home-bar">
          <AppLink href="/" className="home-logo">Today Cat</AppLink>
          {signedIn && onSignOut ? (
            <AccountMenu label={accountLabel} onSignOut={onSignOut} />
          ) : (
            <nav className="home-nav" aria-label="Вход и регистрация">
              <AppLink href="/login">Войти</AppLink>
              <AppLink href="/signup">Регистрация</AppLink>
            </nav>
          )}
        </header>
        <section className="home-hero">
          <div className="home-copy">
            <h1>
              <span>Планы на день.</span>
              <span>Время для себя.</span>
            </h1>
            <p>Задачи, привычки и таймер фокуса в одном уютном планере. А котёнок составит компанию.</p>
            <AppLink href={enter} className="home-enter">Зайти в свой планер</AppLink>
          </div>
          <div className="home-art">
            <img src="/cover/today-cat-hero.png" alt="" width={970} height={875} />
          </div>
        </section>
        <section className="home-day" aria-labelledby="home-day-title">
          <h2 id="home-day-title">Всё для твоего дня</h2>
          <div className="home-day-grid">
            <div className="home-sheet">
              <p className="home-kicker">Пример дня</p>
              <h3>Сегодня</h3>
              <p className="home-task home-task-important">Зарядка<span className="home-sr">, важная</span></p>
              <p className="home-task">Подготовить презентацию</p>
              <p className="home-task home-task-done">Прогулка<span className="home-sr">, выполнена</span></p>
            </div>
            <div className="home-points">
              {POINTS.map((point) => (
                <div key={point.title}>
                  <h3>{point.title}</h3>
                  <p>{point.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <footer className="home-foot">Today Cat</footer>
      </div>
    </div>
  );
}
