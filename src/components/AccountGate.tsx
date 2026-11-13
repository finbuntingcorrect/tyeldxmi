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
      return;
    }
    setPending(true);
    const message = await onRequest(email);
    setPending(false);
    setError(message);
    setSent(!message);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-10">
      <article className="w-full border border-line p-2">
        <div className="border border-line bg-card px-6 py-10 text-center sm:px-10">
          <p className="text-xs font-semibold tracking-[0.22em] text-muted uppercase">Today Cat</p>
          <img src="/mascot/cat-wave.png" alt="Рыжий котёнок с поднятой лапкой" className="mx-auto mt-6 h-44 w-auto max-w-full object-contain sm:h-52" />
          <form className="mt-8 text-left" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
            <h1 className="text-center text-4xl leading-tight text-ink sm:text-5xl">Привет! Давай знакомиться, работяга!</h1>
            <p className="mt-6 text-center font-serif text-2xl text-ink">Вход по почте. Пароль не нужен.</p>
            <label htmlFor="cabinet-email" className="mt-6 block text-sm font-semibold">Почта</label>
            <input id="cabinet-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(null); setSent(false); }} autoComplete="email" maxLength={200} placeholder="name@example.com" className="paper-field mt-1 text-lg" />
            {error ? <p role="alert" className="mt-3 text-sm font-semibold text-danger">{error}</p> : null}
            {sent ? <p className="mt-3 text-sm text-ink">Ссылка отправлена. Открой письмо и перейди по ней.</p> : null}
            <div className="mt-8 flex justify-center">
              <button type="submit" disabled={pending} className="paper-submit min-w-44 disabled:opacity-60">Прислать ссылку</button>
            </div>
          </form>
        </div>
      </article>
    </main>
  );
}
