import { useState } from 'react';

type AccountGateProps = {
  notice?: string | null;
  onRequest: (email: string) => Promise<string | null>;
};

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

export function AccountGate({ notice = null, onRequest }: AccountGateProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(notice);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit() {
    if (!email.trim()) {
      setError('Введи почту.');
      setSent(false);
      return;
    }
    setPending(true);
    const message = await onRequest(email);
    setPending(false);
    setError(message);
    if (!message) setSent(true);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-10">
      <article className="w-full border border-line p-2">
        <div className="border border-line bg-card px-6 py-10 text-center sm:px-10">
          <p className="text-xs font-semibold tracking-[0.22em] text-muted uppercase">Today Cat</p>
          <img src="/mascot/cat-wave.png" alt="Рыжий котёнок с поднятой лапкой" className="mx-auto mt-6 h-44 w-auto max-w-full object-contain sm:h-52" />
          {sent ? (
            <div className="mt-8">
              <h1 className="text-4xl leading-tight text-ink sm:text-5xl">Ссылка отправлена</h1>
              <p className="mt-6 break-words font-serif text-2xl text-ink">Открой письмо на {email} и перейди по ссылке.</p>
              <p className="mt-3 text-sm text-muted">Письмо можно подождать минуту. Новая ссылка не нужна, пока эта жива.</p>
              {error ? <p role="alert" className="mt-3 text-sm font-semibold text-danger">{error}</p> : null}
              <div className="mt-10 flex flex-col items-center gap-2">
                <button type="button" disabled={pending} onClick={() => void submit()} className="paper-choice disabled:opacity-60">Прислать ссылку ещё раз</button>
                <button type="button" onClick={() => { setSent(false); setError(null); }} className="paper-choice">Другая почта</button>
              </div>
            </div>
          ) : (
            <form className="mt-8 text-left" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
              <h1 className="text-center text-4xl leading-tight text-ink sm:text-5xl">Привет. Давай познакомимся.</h1>
              <p className="mt-6 text-center font-serif text-2xl text-ink">Вход по почте. Пароль не нужен.</p>
              <label htmlFor="cabinet-email" className="mt-6 block text-sm font-semibold">Почта</label>
              <input id="cabinet-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(null); }} autoComplete="email" maxLength={200} placeholder="name@example.com" className="paper-field mt-1 text-lg" />
              {error ? <p role="alert" className="mt-3 text-sm font-semibold text-danger">{error}</p> : null}
              <div className="mt-8 flex justify-center">
                <button type="submit" disabled={pending} className="paper-submit min-w-44 disabled:opacity-60">Прислать ссылку</button>
              </div>
            </form>
          )}
        </div>
      </article>
    </main>
  );
}
