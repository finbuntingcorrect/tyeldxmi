# Today Cat

Уютный план с пиксельным котёнком. На входе котёнок здоровается и спрашивает, есть ли логин и пароль. Новый человек создаёт логин и пароль без почты, выбирает цвет и режим. Задачи, привычки и отметки хранятся в личном кабинете этого логина: другой логин их не видит.

Локально, без `DATABASE_URL`, кабинеты лежат в файле `data/local-accounts.json`. На Vercel тот же интерфейс пишет в Postgres, если задан `DATABASE_URL`. Пароль сохраняется только как scrypt-хеш.

## Требования

- Node.js 20 или новее
- npm

## Локальный запуск

Без `DATABASE_URL` кабинеты сохраняются в локальный файл. С `DATABASE_URL` — в Postgres.

```bash
npm install
npm run dev
```

Приложение открывается на [http://127.0.0.1:5173](http://127.0.0.1:5173).

## Проверки и сборка

```bash
npm run lint
npm run typecheck
npm run build
npm run preview
```

Собранная версия открывается на [http://127.0.0.1:4173](http://127.0.0.1:4173). Каталог сборки — `dist`. Картинки из `public/` попадают в корень `dist` и доступны по тем же путям, что и в разработке: `/mascot/cat-working.png`, `/mascot/cat-success.png`, `/mascot/cat-sleeping.png`.

## Изображения котёнка

Оригиналы лежат в `assets-original/`. В интерфейсе используются файлы из `public/mascot/`:

- `cat-wave.png` — котёнок машет лапкой на первом экране
- `cat-working.png` — есть незакрытые задачи
- `cat-success.png` — короткая реакция на выполнение
- `cat-sleeping.png` — открытых задач нет

## Публикация на Vercel

В репозитории есть `vercel.json`: сборка `npm run build`, каталог `dist`, фреймворк Vite. Функции `api/auth` и `api/notebook` собираются в CommonJS. Для общих кабинетов на проде нужен `DATABASE_URL`. Почта не используется.

Продакшен публикует ветку `main`: [https://tyeldxmi-seven.vercel.app](https://tyeldxmi-seven.vercel.app).

Репозиторий: [finbuntingcorrect/tyeldxmi](https://github.com/finbuntingcorrect/tyeldxmi).
