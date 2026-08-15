# Архитектура

## Карта проекта

```
theatre-light-note-app/
├── docs/                 # документация (TOKENS, I18N, ARCHITECTURE)
├── public/               # статика для Vite
├── src/
│   ├── components/       # UI-kit (Button, Chip, Badge, Field, Toaster, FileDrop, EmptyState, cn)
│   ├── editor/           # Секции левой панели — ввод данных
│   │   ├── MetaSection.jsx
│   │   ├── TimesSection.jsx
│   │   ├── PlotsSection.jsx
│   │   ├── GallerySection.jsx
│   │   ├── FixturesSection.jsx
│   │   ├── CuesSection.jsx
│   │   ├── CommentarySection.jsx
│   │   └── GroupTitle.jsx
│   ├── doc/              # DocumentView и подкомпоненты — рендер документа
│   │   ├── DocumentView.jsx
│   │   ├── DocHeader.jsx
│   │   ├── DocTimes.jsx
│   │   ├── DocPlots.jsx
│   │   ├── DocGallery.jsx
│   │   ├── DocFixtures.jsx
│   │   ├── DocCues.jsx
│   │   ├── DocCommentary.jsx
│   │   ├── DocFooter.jsx
│   │   └── markdown.js   # мини-парсер markdown
│   ├── i18n/             # словарь + I18nProvider
│   │   ├── dict.js
│   │   └── I18nProvider.jsx
│   ├── state/            # модель + reducer + storage + Provider
│   │   ├── model.js
│   │   ├── reducer.js
│   │   ├── storage.js
│   │   └── ProjectProvider.jsx
│   ├── styles/           # CSS (модули)
│   │   ├── tokens.css    # дизайн-токены — единственное место цветов/шрифтов
│   │   ├── base.css
│   │   ├── components.css
│   │   ├── layout.css
│   │   ├── document.css
│   │   ├── print.css
│   │   └── index.css     # импортирует все
│   ├── utils/            # хелперы
│   │   ├── files.js      # readAsDataURL, compressImage, escapeHtml
│   │   ├── toast.js      # pushToast, Toaster
│   │   └── exportHtml.jsx # renderToStaticMarkup → standalone HTML
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── vite.config.js
└── package.json
```

## Принципы

### 1. Один источник правды

- Данные проекта — в одном объекте `project`, мутации только через `dispatch` (useReducer).
- Дизайн-токены — только в `src/styles/tokens.css`.
- Строки UI — только через `t(key)`.

### 2. Слои изолированы

- `editor/*` (ввод) ↔ `doc/*` (рендер документа) — разные React-поддеревья, оба читают один `project`.
- `doc/*` — чистая функция от `project`. Может рендериться где угодно (preview, экспорт, печать).
- `utils/exportHtml.jsx` использует только `DocumentView` + CSS-токены.

### 3. Все мутации через reducer

```js
dispatch({ type: "META", patch: { showName: "..." } });
```

Одна точка входа. Удобно для логирования, undo/redo, синхронизации.

### 4. React и побочки

- localStorage изолирован в `state/storage.js`.
- Чтение файлов — в `utils/files.js`.
- Toast-уведомления — `utils/toast.js` (глобальная очередь).

### 5. localStorage

- Ключ: `tld.project.v1`. Версия в `model.js#SCHEMA_VERSION`.
- Сохранение — `useEffect` на каждое изменение `project`. Автоматически.
- Миграция — `storage.load` (programmer → director, window → staff, +logo).

### 6. Документ = та же React-иерархия

`<DocumentView>` рендерится и в preview, и в экспортированный HTML (через `renderToStaticMarkup`). Один код — два вывода.

### 7. Печать

Все стили печати — в `src/styles/print.css`. Page break перед каждой `.doc__section`. A4 portrait, поля 14mm.

## Как добавить новую секцию документа

1. **Данные** — добавить поле в `state/model.js#emptyProject`.
2. **Словарь** — добавить ключи в `i18n/dict.js`.
3. **Редактор** — создать `editor/MySection.jsx`, добавить в `<Editor>` в `App.jsx`.
4. **Документ** — создать `doc/DocMySection.jsx`, вставить в `<DocumentView>`.
5. **Готово.** Storage, экспорт, превью, печать — всё подхватится автоматически.

## Как добавить язык

См. `docs/I18N.md`.

## Changelog

### iter 5 (2026-08-12) — миграция на Vite + офлайн

- Полностью отказались от CDN (React, ReactDOM, Babel Standalone больше не тянутся из сети)
- Vite 5 вместо single-file HTML
- Структура `src/{components,editor,doc,i18n,state,utils,styles}`
- CSS-токены вынесены в `src/styles/tokens.css`
- JSX компилируется на этапе билда (Babel Standalone не нужен в рантайме)
- Размер production-бандла: ~79 KB gzip (JS) + 4.7 KB gzip (CSS) + 0.5 KB HTML
- `dist/` — полностью статичен, работает через `file://`

### iter 4 (2026-08-11)

- Мобильный хедер, секция "Развес" с разделителем, fix ReactDOMServer

### iter 1–3 (2026-08-11)

- Начальная архитектура, UI-кит, локализация, editor + document, экспорт
- Сжатие фото, toaster, markdown-парсер
