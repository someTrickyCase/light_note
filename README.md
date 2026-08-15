# Light Note

Браузерный редактор технической документации для театральных световых шоу.
Полностью офлайн — никаких внешних ресурсов после `npm install`.

## Возможности

- Метаданные шоу: название, площадка, дата, режиссёр, художник по свету, пульт, логотип
- Время: сборка, хронометраж, кол-во персонала (с автоматической нотой про развес)
- Развесы: базовый + шоу (Capture JPG)
- Галерея фото приборов с тегами, сортировкой, каруселью в документе
- Приборы для довеса: список тип × кол-во, с автосуммой
- Cue list: авто-нумерация, fade in/out, trigger
- Заметки художника: **markdown-редактор** с тулбаром (B / I / H3 / список / цитата / ссылка)
- Экспорт в **single-file HTML** (без CDN, без зависимостей)
- Автосохранение в localStorage
- Адаптив: десктоп + мобильный (≤600px)
- Тёмная тема: пока нет (UI-кит готов)
- Многоязычность: только русский, словарь отделён, легко добавить английский
- Печатные стили: A4 portrait, каждая секция с новой страницы

## Стек

- **React 18** + **ReactDOM** (renderToStaticMarkup для экспорта)
- **Vite 5** — сборка, dev-сервер, HMR
- Чистый CSS с design-токенами в `:root` — никаких фреймворков
- localStorage для проекта (один активный проект)

## Структура

```
app/
  src/
    components/   — UI-kit: Button, Chip, Badge, Field, Toaster, FileDrop
    editor/       — секции левой панели (ввод)
    doc/          — DocumentView и подкомпоненты (рендер документа)
    i18n/         — словарь + I18nProvider
    state/        — reducer, storage, ProjectProvider
    utils/        — file helpers, toast, exportHtml
    styles/       — токены + base + components + layout + document + print
    App.jsx
    main.jsx
  public/
  dist/           — production-сборка (после `npm run build`)
  index.html      — точка входа
```

## Команды

```bash
npm install              # один раз
npm run dev              # dev-сервер на http://localhost:5173/
npm run build            # production-сборка в dist/
npm run preview          # локальный preview dist/
```

## Деплой

`dist/` — это **статика**. Положи на любой хостинг или открой `dist/index.html` напрямую через `file://`.

## Документация

- `docs/ARCHITECTURE.md` — карта кода, как добавить секцию, как добавить язык
- `docs/TOKENS.md` — дизайн-токены
- `docs/I18N.md` — словарь переводов

## Что дальше (iter 5+)

- Парсер MA2 XML (импорт cue list из grandMA2)
- Undo/redo через middleware в reducer
- Multi-project (список проектов в localStorage)
- Fixture DB с пресетами (Source Four, Mac Quantum, …) и авто-расчётом каналов/ватт
- Drag-and-drop в галерее
- Rich-text в комментариях (вместо markdown)
- Тёмная тема
