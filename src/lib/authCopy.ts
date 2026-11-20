export const LOGIN_FAILURE = 'Не удалось войти. Проверь почту и пароль.';
export const NETWORK_FAILURE = 'Не удалось связаться с сервером. Попробуй ещё раз.';
export const RESET_SENT = 'Если аккаунт с этой почтой существует, мы отправили письмо для восстановления пароля.';
export const PASSWORD_RULE = 'От 6 до 72 символов.';

const CREDENTIALS = new Set([
  'Неверная почта или пароль.',
  'Для этой почты пароль ещё не задан. Нажми „Забыла пароль“.',
  'Введи почту в обычном виде.',
  'Логин — от 3 до 24 символов: буквы, цифры, знак _ или -.',
  'Такой логин уже есть. Войди или придумай другой.',
  'Для этой почты кабинет уже есть. Войди.',
  'Пароль — от 6 до 72 символов.',
]);

const RATE = 'Слишком много попыток. Подожди немного и попробуй снова.';

export function loginNotice(message: string | null) {
  if (!message) return null;
  if (message === RATE) return message;
  if (CREDENTIALS.has(message)) return LOGIN_FAILURE;
  return NETWORK_FAILURE;
}

const SIGNUP_FIELD = new Set([
  'Введи почту в обычном виде.',
  'Логин — от 3 до 24 символов: буквы, цифры, знак _ или -.',
  'Пароль — от 6 до 72 символов.',
  'Такой логин уже есть. Войди или придумай другой.',
  'Для этой почты кабинет уже есть. Войди.',
  'Кабинет не сохранился. Попробуй ещё раз.',
  RATE,
]);

export function signupNotice(message: string | null) {
  if (!message) return null;
  if (SIGNUP_FIELD.has(message)) return message;
  return NETWORK_FAILURE;
}

export function mailNotice(message: string | null) {
  if (!message) return null;
  if (message === 'Письма ещё не подключены.' || message === 'Письмо не отправилось. Попробуй ещё раз.' || message === RATE || message === 'Введи почту в обычном виде.') return message;
  return NETWORK_FAILURE;
}
