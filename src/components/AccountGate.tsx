import { useState } from 'react';

type AccountGateProps = {
  onRegister: (login: string, password: string) => Promise<string | null>;
  onLogin: (login: string, password: string) => Promise<string | null>;
};

type Step = 'ask' | 'login' | 'register';

export function CabinetSplash() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-10">
      <article className="w-full border border-line p-2">
        <div className="border border-line bg-card px-6 py-10 text-center sm:px-10">
          <img src="/mascot/cat-wave.png" alt="" className="mx-auto h-36 w-auto object-contain" />
          <p className="mt-6 text-2xl text-ink">Смотрю, кто пришёл…</p>
        </div>
      </article>
    </main>
  );
}

export function AccountGate({ onRegister, onLogin }: AccountGateProps) {
  const [step, setStep] = useState<Step>('ask');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function reset(next: Step) {
    setStep(next);
    setError(null);
    setPassword('');
    setRepeat('');
  }

  async function submitLogin() {
    if (!login.trim() || !password) {
      setError('Введи логин и пароль.');
      return;
    }
    setPending(true);
    setError(await onLogin(login, password));
    setPending(false);
  }

  async function submitRegister() {
    if (!login.trim() || !password) {
      setError('Придумай логин и пароль.');
      return;
    }
    if (password !== repeat) {
      setError('Пароли не совпадают.');
      return;
    }
    setPending(true);
    setError(await onRegister(login, password));
    setPending(false);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-10">
      <article className="w-full border border-line p-2">
        <div className="border border-line bg-card px-6 py-10 text-center sm:px-10">
          <p className="text-xs font-semibold tracking-[0.22em] text-muted uppercase">Today Cat</p>
          <img src="/mascot/cat-wave.png" alt="Рыжий котёнок с поднятой лапкой" className="mx-auto mt-6 h-44 w-auto max-w-full object-contain sm:h-52" />
          {step === 'ask' ? (
            <div className="mt-8">
              <h1 className="text-4xl leading-tight text-ink sm:text-5xl">Привет! Давай знакомиться, работяга!</h1>
              <p className="mt-6 font-serif text-2xl text-ink">У тебя уже есть логин и пароль?</p>
              <div className="mt-8 flex flex-col items-center gap-3">
                <button type="button" onClick={() => reset('login')} className="paper-submit min-w-52">Да, войти в кабинет</button>
                <button type="button" onClick={() => reset('register')} className="paper-submit min-w-52">Нет, создать кабинет</button>
              </div>
            </div>
          ) : null}
          {step === 'login' ? (
            <form className="mt-8 text-left" onSubmit={(event) => { event.preventDefault(); void submitLogin(); }}>
              <h1 className="text-center text-4xl leading-tight text-ink">Вход в личный кабинет</h1>
              <label htmlFor="cabinet-login" className="mt-6 block text-sm font-semibold">Логин</label>
              <input id="cabinet-login" value={login} onChange={(event) => { setLogin(event.target.value); setError(null); }} autoComplete="username" maxLength={24} className="paper-field mt-1 text-lg" />
              <label htmlFor="cabinet-password" className="mt-4 block text-sm font-semibold">Пароль</label>
              <input id="cabinet-password" type="password" value={password} onChange={(event) => { setPassword(event.target.value); setError(null); }} autoComplete="current-password" maxLength={72} className="paper-field mt-1 text-lg" />
              {error ? <p role="alert" className="mt-3 text-sm font-semibold text-danger">{error}</p> : null}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button type="button" onClick={() => reset('ask')} className="min-h-11 px-3 text-sm font-semibold underline underline-offset-4">Назад</button>
                <button type="submit" disabled={pending} className="paper-submit min-w-32 disabled:opacity-60">Войти</button>
              </div>
            </form>
          ) : null}
          {step === 'register' ? (
            <form className="mt-8 text-left" onSubmit={(event) => { event.preventDefault(); void submitRegister(); }}>
              <h1 className="text-center text-4xl leading-tight text-ink">Создай свой кабинет</h1>
              <p className="mt-3 text-center text-sm text-muted">Почта не нужна. Задачи этого логина увидишь только ты.</p>
              <label htmlFor="new-login" className="mt-6 block text-sm font-semibold">Логин</label>
              <input id="new-login" value={login} onChange={(event) => { setLogin(event.target.value); setError(null); }} autoComplete="username" maxLength={24} placeholder="Например, Аня" className="paper-field mt-1 text-lg" />
              <label htmlFor="new-password" className="mt-4 block text-sm font-semibold">Пароль</label>
              <input id="new-password" type="password" value={password} onChange={(event) => { setPassword(event.target.value); setError(null); }} autoComplete="new-password" maxLength={72} className="paper-field mt-1 text-lg" />
              <label htmlFor="repeat-password" className="mt-4 block text-sm font-semibold">Пароль ещё раз</label>
              <input id="repeat-password" type="password" value={repeat} onChange={(event) => { setRepeat(event.target.value); setError(null); }} autoComplete="new-password" maxLength={72} className="paper-field mt-1 text-lg" />
              {error ? <p role="alert" className="mt-3 text-sm font-semibold text-danger">{error}</p> : null}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button type="button" onClick={() => reset('ask')} className="min-h-11 px-3 text-sm font-semibold underline underline-offset-4">Назад</button>
                <button type="submit" disabled={pending} className="paper-submit min-w-40 disabled:opacity-60">Создать и войти</button>
              </div>
            </form>
          ) : null}
        </div>
      </article>
    </main>
  );
}
