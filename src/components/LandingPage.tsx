import { AppLink } from './AppLink';

const FEATURES = [
  { title: 'Планируй день', text: 'Календарь и задачи на выбранный день.' },
  { title: 'Работай в фокусе', text: 'Таймер и перерывы.' },
  { title: 'Создавай привычки', text: 'Отметки ежедневных действий.' },
];

export function LandingPage({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="public">
      <header className="public-bar">
        <AppLink href="/" className="public-logo">Today Cat</AppLink>
        <div className="public-bar-actions">
          {signedIn ? (
            <AppLink href="/app" className="public-primary">Открыть планер</AppLink>
          ) : (
            <>
              <AppLink href="/login" className="public-secondary">Войти</AppLink>
              <AppLink href="/signup" className="public-primary">Регистрация</AppLink>
            </>
          )}
        </div>
      </header>
      <section className="hero">
        <div className="hero-copy">
          <h1>Планы на день. Время для себя.</h1>
          <p>Задачи, привычки и таймер фокуса в одном уютном планере. А котёнок составит компанию.</p>
          {signedIn ? (
            <AppLink href="/app" className="public-primary">Открыть планер</AppLink>
          ) : (
            <div className="hero-actions">
              <AppLink href="/signup" className="public-primary">Регистрация</AppLink>
              <AppLink href="/login" className="public-secondary">Войти</AppLink>
            </div>
          )}
        </div>
        <img
          className="hero-cover"
          src="/cover/today-cat-cover.png"
          alt=""
          width={1536}
          height={1024}
        />
      </section>
      <section className="public-features" aria-label="Возможности">
        {FEATURES.map((feature) => (
          <div key={feature.title}>
            <h2>{feature.title}</h2>
            <p>{feature.text}</p>
          </div>
        ))}
      </section>
      <section className="public-preview" aria-label="Пример дня">
        <h2>Так выглядит день</h2>
        <div className="preview-sheet">
          <p className="preview-date">Понедельник</p>
          <div className="preview-row">
            <span className="preview-mark" aria-hidden="true" />
            <span>Зарядка</span>
            <span className="preview-flag">важно</span>
          </div>
          <div className="preview-row">
            <span className="preview-mark" aria-hidden="true" />
            <span>Короткий звонок</span>
          </div>
          <div className="preview-row preview-row-done">
            <span className="preview-mark preview-mark-done" aria-hidden="true" />
            <span>Вода</span>
          </div>
        </div>
      </section>
      {signedIn ? null : (
        <section className="public-again">
          <AppLink href="/signup" className="public-primary">Регистрация</AppLink>
          <AppLink href="/login" className="public-secondary">Войти</AppLink>
        </section>
      )}
      <footer className="public-foot">Today Cat</footer>
    </div>
  );
}
