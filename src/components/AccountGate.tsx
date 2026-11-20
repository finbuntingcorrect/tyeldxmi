import { useState } from 'react';

type AccountGateProps = {
  notice?: string | null;
  browser?: boolean;
  resetToken?: string | null;
  onEnter: (email: string, password: string) => Promise<string | null>;
  onCreate: (email: string, password: string) => Promise<string | null>;
  onForgot: (email: string) => Promise<string | null>;
  onReset: (token: string, password: string) => Promise<string | null>;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export function AccountGate({ notice = null, browser = false, resetToken = null, onEnter, onCreate, onForgot, onReset }: AccountGateProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(notice);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  function fieldErrors() {
    const nextEmail = email.trim();
    const nextEmailError = !nextEmail
      ? 'Введи почту.'
      : EMAIL_PATTERN.test(nextEmail) ? null : 'Введи почту в обычном виде.';
    const nextPasswordError = password.length >= 6 && password.length <= 72 ? null : 'Пароль — от 6 до 72 символов.';
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    return Boolean(nextEmailError || nextPasswordError);
  }

  async function submit(kind: 'enter' | 'create') {
    setFormError(null);
    if (fieldErrors()) return;
    setPending(true);
    const message = kind === 'enter' ? await onEnter(email.trim(), password) : await onCreate(email.trim(), password);
    setPending(false);
    setFormError(message);
  }

  async function forgot() {
    setFormError(null);
    setPasswordError(null);
    if (browser) {
      setFormError('Письма ещё не подключены.');
      return;
    }
    const nextEmail = email.trim();
    if (!nextEmail) {
      setEmailError('Введи почту.');
      return;
    }
    if (!EMAIL_PATTERN.test(nextEmail)) {
      setEmailError('Введи почту в обычном виде.');
      return;
    }
    setEmailError(null);
    setPending(true);
    const message = await onForgot(nextEmail);
    setPending(false);
    if (message) {
      setFormError(message);
      return;
    }
    setSent(true);
  }

  async function sendAgain() {
    setFormError(null);
    setPending(true);
    const message = await onForgot(email.trim());
    setPending(false);
    setFormError(message);
  }

  async function savePassword() {
    if (!resetToken) return;
    const nextPasswordError = password.length >= 6 && password.length <= 72 ? null : 'Пароль — от 6 до 72 символов.';
    setPasswordError(nextPasswordError);
    if (nextPasswordError) return;
    setPending(true);
    const message = await onReset(resetToken, password);
    setPending(false);
    setFormError(message);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-10">
      <article className="w-full border border-line p-2">
        <div className="border border-line bg-card px-6 py-10 text-center sm:px-10">
          <p className="text-xs font-semibold tracking-[0.22em] text-muted uppercase">Today Cat</p>
          <img src="/mascot/cat-wave.png" alt="Рыжий котёнок с поднятой лапкой" className="mx-auto mt-6 h-44 w-auto max-w-full object-contain sm:h-52" />
          <h1 className="mt-8 text-center text-4xl leading-tight text-ink sm:text-5xl">Привет! Окей, лэсгоу</h1>
          {resetToken ? (
            <form className="mt-8 text-left" onSubmit={(event) => { event.preventDefault(); void savePassword(); }}>
              <p className="text-sm text-muted">Задай новый пароль. После этого откроется кабинет.</p>
              <label htmlFor="cabinet-password" className="mt-4 block text-sm font-semibold">Пароль</label>
              <input id="cabinet-password" type="password" value={password} onChange={(event) => { setPassword(event.target.value); setPasswordError(null); setFormError(null); }} autoComplete="new-password" maxLength={72} className="paper-field mt-1 text-lg" />
              {passwordError ? <p role="alert" className="mt-2 text-sm font-semibold text-danger">{passwordError}</p> : null}
              {formError ? <p role="alert" className="mt-2 text-sm font-semibold text-danger">{formError}</p> : null}
              <div className="mt-8 flex justify-center">
                <button type="submit" disabled={pending} className="paper-submit min-w-44 disabled:opacity-60">Сохранить</button>
              </div>
            </form>
          ) : sent ? (
            <div className="mt-8">
              <p className="text-lg text-ink">Ссылка отправлена</p>
              <p className="mt-2 text-sm text-muted">Открой письмо и задай новый пароль.</p>
              {formError ? <p role="alert" className="mt-3 text-sm font-semibold text-danger">{formError}</p> : null}
              <div className="mt-6 flex flex-col items-center gap-2">
                <button type="button" disabled={pending} onClick={() => void sendAgain()} className="paper-choice">Прислать ссылку ещё раз</button>
                <button type="button" onClick={() => { setSent(false); setFormError(null); }} className="paper-choice">Другая почта</button>
              </div>
            </div>
          ) : (
            <form className="mt-8 text-left" onSubmit={(event) => { event.preventDefault(); void submit('enter'); }}>
              <label htmlFor="cabinet-email" className="block text-sm font-semibold">Почта</label>
              <input id="cabinet-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setEmailError(null); setFormError(null); }} autoComplete="email" maxLength={200} placeholder="name@example.com" className="paper-field mt-1 text-lg" />
              {emailError ? <p role="alert" className="mt-2 text-sm font-semibold text-danger">{emailError}</p> : null}
              <label htmlFor="cabinet-password" className="mt-4 block text-sm font-semibold">Пароль</label>
              <input id="cabinet-password" type="password" value={password} onChange={(event) => { setPassword(event.target.value); setPasswordError(null); setFormError(null); }} autoComplete="current-password" maxLength={72} className="paper-field mt-1 text-lg" />
              {passwordError ? <p role="alert" className="mt-2 text-sm font-semibold text-danger">{passwordError}</p> : null}
              {formError ? <p role="alert" className="mt-2 text-sm font-semibold text-danger">{formError}</p> : null}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button type="submit" disabled={pending} className="paper-submit min-w-32 disabled:opacity-60">Войти</button>
                <button type="button" disabled={pending} onClick={() => void submit('create')} className="paper-choice">Создать кабинет</button>
              </div>
              <div className="mt-4 text-center">
                <button type="button" disabled={pending} onClick={() => void forgot()} className="paper-choice">Забыла пароль</button>
              </div>
            </form>
          )}
        </div>
      </article>
    </main>
  );
}
