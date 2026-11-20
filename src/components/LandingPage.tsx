import { AppLink } from './AppLink';

const POINTS = [
  { title: 'Планируй день', text: 'Календарь и задачи на выбранную дату.' },
  { title: 'Работай в фокусе', text: 'Таймер для работы и перерывов.' },
  { title: 'Создавай привычки', text: 'Отмечай то, что хочешь делать регулярно.' },
];

export function LandingPage({ signedIn }: { signedIn: boolean }) {
  const enter = signedIn ? '/app' : '/login?next=/app';
  return (
    <div className="public">
      <div className="home">
        <header className="home-bar">
          <AppLink href="/" className="home-logo">Today Cat</AppLink>
          {signedIn ? null : (
            <div className="home-nav">
              <AppLink href="/login?next=/app" className="home-login">Войти</AppLink>
              <AppLink href="/signup" className="home-signup">Регистрация</AppLink>
            </div>
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
