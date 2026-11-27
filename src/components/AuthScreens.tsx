import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { AppLink } from './AppLink';
import { NETWORK_FAILURE, PASSWORD_RULE, RESET_SENT, loginNotice, mailNotice, signupNotice } from '../lib/authCopy';
import { cabinetError, verifyEmailLink } from '../lib/cabinetApi';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emailError(value: string) {
  const email = value.trim();
  if (!email) return 'Введи почту.';
  if (!EMAIL.test(email) || email.length > 200) return 'Введи почту в обычном виде.';
  return null;
}

function nameError(value: string) {
  const name = value.trim();
  if (!name) return 'Введи имя.';
  if (name.includes('@')) return 'Напиши имя, не почту.';
  if (name.length > 40) return 'Имя — до 40 символов.';
  return null;
}

function passwordError(value: string) {
  if (!value) return 'Введи пароль.';
  if (value.length < 6 || value.length > 72) return 'Пароль — от 6 до 72 символов.';
  return null;
}

function PublicFrame({ children }: { children: ReactNode }) {
  return (
    <div className="public">
      <header className="public-bar">
        <AppLink href="/" className="public-logo">Today Cat</AppLink>
      </header>
      <main className="auth-main">{children}</main>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  autoComplete,
  error,
  showRule = false,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  autoComplete: 'current-password' | 'new-password';
  error: string | null;
  showRule?: boolean;
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const errorId = `${id}-error`;
  const ruleId = `${id}-rule`;
  const describedBy = [showRule ? ruleId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="auth-password">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="public-field"
        />
        <button type="button" className="auth-reveal" aria-pressed={visible} aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'} onClick={() => setVisible((current) => !current)}>
          {visible ? 'Скрыть' : 'Показать'}
        </button>
      </div>
      {showRule ? <p id={ruleId} className="auth-rule">{PASSWORD_RULE}</p> : null}
      {error ? <p id={errorId} className="auth-error">{error}</p> : null}
    </div>
  );
}

export function LoginScreen({ onEnter }: { onEnter: (email: string, password: string) => Promise<string | null> }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailErrorText, setEmailErrorText] = useState<string | null>(null);
  const [passwordErrorText, setPasswordErrorText] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const emailId = useId();
  const passwordId = useId();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    const nextEmailError = emailError(email);
    const nextPasswordError = passwordError(password);
    setEmailErrorText(nextEmailError);
    setPasswordErrorText(nextPasswordError);
    setFormError(null);
    if (nextEmailError || nextPasswordError) return;
    setPending(true);
    const message = loginNotice(await onEnter(email.trim(), password));
    setPending(false);
    if (message) setFormError(message);
  }

  return (
    <PublicFrame>
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1>С возвращением!</h1>
        <div className="auth-field">
          <label htmlFor={emailId}>Почта</label>
          <input
            id={emailId}
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="email"
            value={email}
            onChange={(event) => { setEmail(event.target.value); setEmailErrorText(null); setFormError(null); }}
            aria-invalid={emailErrorText ? true : undefined}
            aria-describedby={emailErrorText ? `${emailId}-error` : undefined}
            className="public-field"
          />
          {emailErrorText ? <p id={`${emailId}-error`} className="auth-error">{emailErrorText}</p> : null}
        </div>
        <PasswordField
          id={passwordId}
          label="Пароль"
          value={password}
          autoComplete="current-password"
          error={passwordErrorText}
          onChange={(value) => { setPassword(value); setPasswordErrorText(null); setFormError(null); }}
        />
        <p className="auth-links"><AppLink href="/forgot-password">Забыли пароль?</AppLink></p>
        {formError ? <p className="auth-error" role="alert">{formError}</p> : null}
        <p className="auth-status" role="status" aria-live="polite">{pending ? 'Входим…' : ''}</p>
        <button type="submit" className="public-primary auth-submit" disabled={pending}>{pending ? 'Входим…' : 'Войти'}</button>
        <p className="auth-links"><AppLink href="/signup">Нет аккаунта? Зарегистрироваться</AppLink></p>
      </form>
    </PublicFrame>
  );
}

export function SignupScreen({ onCreate }: { onCreate: (email: string, password: string, name: string) => Promise<string | null> }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nameErrorText, setNameErrorText] = useState<string | null>(null);
  const [emailErrorText, setEmailErrorText] = useState<string | null>(null);
  const [passwordErrorText, setPasswordErrorText] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    const nextNameError = nameError(name);
    const nextEmailError = emailError(email);
    const nextPasswordError = passwordError(password);
    setNameErrorText(nextNameError);
    setEmailErrorText(nextEmailError);
    setPasswordErrorText(nextPasswordError);
    setFormError(null);
    if (nextNameError || nextEmailError || nextPasswordError) return;
    setPending(true);
    const message = signupNotice(await onCreate(email.trim(), password, name.trim()));
    setPending(false);
    if (message) setFormError(message);
  }

  return (
    <PublicFrame>
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1>Создать аккаунт</h1>
        <p className="auth-lead">Начни с одного небольшого дела.</p>
        <div className="auth-field">
          <label htmlFor={nameId}>Имя</label>
          <input
            id={nameId}
            type="text"
            autoComplete="name"
            autoCapitalize="words"
            value={name}
            onChange={(event) => { setName(event.target.value); setNameErrorText(null); setFormError(null); }}
            aria-invalid={nameErrorText ? true : undefined}
            aria-describedby={nameErrorText ? `${nameId}-error` : undefined}
            className="public-field"
          />
          {nameErrorText ? <p id={`${nameId}-error`} className="auth-error">{nameErrorText}</p> : null}
        </div>
        <div className="auth-field">
          <label htmlFor={emailId}>Почта</label>
          <input
            id={emailId}
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="email"
            value={email}
            onChange={(event) => { setEmail(event.target.value); setEmailErrorText(null); setFormError(null); }}
            aria-invalid={emailErrorText ? true : undefined}
            aria-describedby={emailErrorText ? `${emailId}-error` : undefined}
            className="public-field"
          />
          {emailErrorText ? <p id={`${emailId}-error`} className="auth-error">{emailErrorText}</p> : null}
        </div>
        <PasswordField
          id={passwordId}
          label="Пароль"
          value={password}
          autoComplete="new-password"
          showRule
          error={passwordErrorText}
          onChange={(value) => { setPassword(value); setPasswordErrorText(null); setFormError(null); }}
        />
        {formError ? <p className="auth-error" role="alert">{formError}</p> : null}
        <p className="auth-status" role="status" aria-live="polite">{pending ? 'Создаём…' : ''}</p>
        <button type="submit" className="public-primary auth-submit" disabled={pending}>{pending ? 'Создаём…' : 'Создать'}</button>
        <p className="auth-links"><AppLink href="/login">Уже есть аккаунт? Войти</AppLink></p>
      </form>
    </PublicFrame>
  );
}

export function ForgotScreen({ onForgot }: { onForgot: (email: string) => Promise<string | null> }) {
  const [email, setEmail] = useState('');
  const [emailErrorText, setEmailErrorText] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const emailId = useId();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    const nextEmailError = emailError(email);
    setEmailErrorText(nextEmailError);
    setFormError(null);
    if (nextEmailError) return;
    setPending(true);
    const message = mailNotice(await onForgot(email.trim()));
    setPending(false);
    if (message) {
      setSent(false);
      setFormError(message);
      return;
    }
    setSent(true);
  }

  return (
    <PublicFrame>
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1>Восстановить пароль</h1>
        {sent ? <p className="auth-lead" role="status">{RESET_SENT}</p> : null}
        <div className="auth-field">
          <label htmlFor={emailId}>Почта</label>
          <input
            id={emailId}
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="email"
            value={email}
            onChange={(event) => { setEmail(event.target.value); setEmailErrorText(null); setFormError(null); setSent(false); }}
            aria-invalid={emailErrorText ? true : undefined}
            aria-describedby={emailErrorText ? `${emailId}-error` : undefined}
            className="public-field"
          />
          {emailErrorText ? <p id={`${emailId}-error`} className="auth-error">{emailErrorText}</p> : null}
        </div>
        {formError ? <p className="auth-error" role="alert">{formError}</p> : null}
        <p className="auth-status" role="status" aria-live="polite">{pending ? 'Отправляем…' : ''}</p>
        <button type="submit" className="public-primary auth-submit" disabled={pending}>{pending ? 'Отправляем…' : 'Отправить письмо'}</button>
        <p className="auth-links"><AppLink href="/login">Вернуться ко входу</AppLink></p>
      </form>
    </PublicFrame>
  );
}

export function ResetScreen({
  token,
  onReset,
}: {
  token: string;
  onReset: (token: string, password: string) => Promise<string | null>;
}) {
  const [password, setPassword] = useState('');
  const [passwordErrorText, setPasswordErrorText] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [check, setCheck] = useState<'checking' | 'ready' | 'invalid' | 'offline'>('checking');
  const [attempt, setAttempt] = useState(0);
  const passwordId = useId();

  useEffect(() => {
    let live = true;
    verifyEmailLink(token)
      .then(() => { if (live) setCheck('ready'); })
      .catch((error: unknown) => {
        if (!live) return;
        const message = cabinetError(error);
        setCheck(message === 'Ссылка уже не действует. Запроси новую.' ? 'invalid' : 'offline');
      });
    return () => { live = false; };
  }, [token, attempt]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending || check !== 'ready') return;
    const nextPasswordError = passwordError(password);
    setPasswordErrorText(nextPasswordError);
    setFormError(null);
    if (nextPasswordError) return;
    setPending(true);
    const message = await onReset(token, password);
    setPending(false);
    if (!message) return;
    if (message === 'Ссылка уже не действует. Запроси новую.') {
      setCheck('invalid');
      return;
    }
    if (message === 'Пароль — от 6 до 72 символов.') {
      setPasswordErrorText(message);
      return;
    }
    setFormError(message === NETWORK_FAILURE || message === 'Не получилось. Попробуй ещё раз.' ? NETWORK_FAILURE : message);
  }

  if (check === 'checking') {
    return (
      <PublicFrame>
        <p className="auth-card" role="status">Проверяю ссылку…</p>
      </PublicFrame>
    );
  }

  if (check === 'invalid') {
    return (
      <PublicFrame>
        <div className="auth-card">
          <h1>Ссылка уже не действует</h1>
          <p className="auth-lead" role="alert">Запроси новое письмо, чтобы задать пароль.</p>
          <AppLink href="/forgot-password" className="public-primary auth-submit">Запросить новое письмо</AppLink>
          <p className="auth-links"><AppLink href="/login">Вернуться ко входу</AppLink></p>
        </div>
      </PublicFrame>
    );
  }

  if (check === 'offline') {
    return (
      <PublicFrame>
        <div className="auth-card">
          <h1>Восстановить пароль</h1>
          <p className="auth-error" role="alert">{NETWORK_FAILURE}</p>
          <button type="button" className="public-primary auth-submit" onClick={() => { setCheck('checking'); setAttempt((value) => value + 1); }}>Попробовать ещё раз</button>
          <p className="auth-links"><AppLink href="/forgot-password">Запросить новое письмо</AppLink></p>
        </div>
      </PublicFrame>
    );
  }

  return (
    <PublicFrame>
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1>Новый пароль</h1>
        <PasswordField
          id={passwordId}
          label="Пароль"
          value={password}
          autoComplete="new-password"
          showRule
          error={passwordErrorText}
          onChange={(value) => { setPassword(value); setPasswordErrorText(null); setFormError(null); }}
        />
        {formError ? <p className="auth-error" role="alert">{formError}</p> : null}
        <p className="auth-status" role="status" aria-live="polite">{pending ? 'Сохраняем…' : ''}</p>
        <button type="submit" className="public-primary auth-submit" disabled={pending}>{pending ? 'Сохраняем…' : 'Сохранить пароль'}</button>
        <p className="auth-links"><AppLink href="/login">Вернуться ко входу</AppLink></p>
      </form>
    </PublicFrame>
  );
}
