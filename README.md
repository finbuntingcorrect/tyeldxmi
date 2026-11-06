# Today Cat

Уютный план дня с пиксельным котёнком. Вход по ссылке из письма, без пароля. Задачи, повторы, фокус и настройки котёнка лежат в Neon Postgres и привязаны к аккаунту. Браузер не получает строку подключения.

Старые задачи из `localStorage` (`today-cat.tasks.v1`) можно импортировать после входа. Повторный импорт не создаёт дубли. Если запрос не удался, запись в браузере остаётся.

## Требования

- Node.js 20 или новее
- npm

## Локальный запуск

Для сервера нужны переменные в `.env` или в Vercel. Файл `.env` не коммитится, значения не попадают в браузер.

- `DATABASE_URL` — Neon Postgres
- `RESEND_API_KEY` — отправка ссылки для входа
- `EMAIL_FROM` — адрес отправителя, который разрешён в Resend
- `APP_URL` — необязательный адрес сайта в ссылке, иначе берётся адрес запроса

```bash
npm install
npm run dev
```

Приложение открывается на [http://127.0.0.1:5173](http://127.0.0.1:5173). В этом режиме `/api/tasks` обслуживает сам Vite.

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

- `cat-working.png` — есть незакрытые задачи
- `cat-success.png` — короткая реакция на выполнение
- `cat-sleeping.png` — открытых задач нет

## Публикация на Vercel

В репозитории есть `vercel.json`: сборка `npm run build`, каталог `dist`, фреймворк Vite. Функции `api/auth`, `api/profile` и `api/tasks` собираются в CommonJS и читают секреты только на сервере.

На Vercel для Preview и Production должны быть заданы `DATABASE_URL`, `RESEND_API_KEY` и `EMAIL_FROM`. `APP_URL` можно указать как `https://tyeldxmi-seven.vercel.app`.

Продакшен публикует ветку `main`: [https://tyeldxmi-seven.vercel.app](https://tyeldxmi-seven.vercel.app).

Репозиторий: [finbuntingcorrect/tyeldxmi](https://github.com/finbuntingcorrect/tyeldxmi).
