# Architecture

## Hard constraints

These shape every decision in the codebase. Breaking one breaks the product.

1. **Works from `file://`, fully offline.** No CDN, no web fonts, no network at runtime.
   - That is why the build is a single **IIFE** bundle, not ES modules: Chrome/Brave block module imports on `file://`.
   - That is why all CSS is inlined into `<style>` (see `inlineCssPlugin` in `vite.config.js` and `scripts/postbuild.js`).
2. **The exported document is one self-contained `.html` file**: inlined CSS, base64 images, and a small vanilla-JS runtime. No React in the export.
3. **No data leaves the browser.** No backend, no analytics.

## Code map

```
src/
├── main.jsx                 # entry: snapshots page CSS into window.__INJECTED_CSS__ (for export), mounts <App>
├── App.jsx                  # Shell: Topbar + Editor (left) + Preview (right) + Toaster
├── components/              # UI kit, no project knowledge
│   ├── Button, Chip, Badge, Field, EmptyState, Toast
│   ├── Toaster.jsx          # renders the toast queue via useSyncExternalStore
│   ├── ConfirmButton.jsx    # two-click confirm (used instead of window.confirm)
│   ├── FileDrop.jsx         # drag & drop / picker; files as is (no compression) + pixel size
│   ├── GrowTextarea.jsx     # auto-height textarea (forwardRef)
│   ├── Lightbox.jsx         # full-screen carousel on <dialog>: ‹ › / ← → / swipe, wraps around
│   └── cn.js                # className joiner
├── editor/                  # LEFT panel: input forms, read useProject(), write useDispatch()
│   ├── MetaSection, TimesSection, StaffSection, PlotsSection,
│   ├── GallerySection, FixturesSection, CuesSection, CommentarySection
│   └── GroupTitle.jsx
├── doc/                     # RIGHT panel: the document. Pure function of `project`
│   ├── DocumentView.jsx     # composes all Doc* sections; used by preview AND export
│   ├── DocHeader, DocTimes, DocStaff, DocPlots, DocGallery,
│   ├── DocFixtures, DocCues, DocCommentary, DocFooter
│   ├── ZoomImage.jsx        # <button class="doc__zoom" data-title data-caption> around an image; opens the Lightbox
│   └── markdown.js          # tiny markdown → HTML renderer for commentary (escapes HTML first)
├── state/
│   ├── model.js             # emptyProject(), uid(), STORAGE_KEY, SCHEMA_VERSION
│   ├── reducer.js           # projectReducer: table of handlers, the ONLY place project state changes
│   ├── ProjectProvider.jsx  # context: useProject(), useDispatch(), useProjectLoading()
│   ├── storage.js           # createStorage(): load (migrations, one-time localStorage → IDB move) / save (queued, IDB only); `storage` = the app instance
│   └── idb.js               # minimal IndexedDB wrapper: "project" + "blobs" stores
├── i18n/
│   ├── dict.js              # DICT + SUPPORTED_LOCALES
│   ├── translate.js         # makeTranslator(locale) → { t, tn } without React (export, utils)
│   └── I18nProvider.jsx     # useT() → { t, tn, locale, setLocale }
├── utils/
│   ├── ma2.js               # parseMA2(xml): grandMA2 XML → { cues, fixtures, warnings: [{ code }] }
│   ├── exportHtml.jsx       # renderExportHTML(project) → string; exportDocument() downloads it
│   ├── exportScript.js      # EXPORT_RUNTIME_JS: vanilla JS twin of Lightbox for the export
│   ├── files.js             # readAsDataURL, measureImage, escapeHtml
│   ├── storageQuota.js      # formatBytes(), freeBytes(), isSpaceLow() — warn under 1 GB left
│   ├── useSpaceWarning.js   # hook: sticky "low space" toast when < 1 GB is left
│   └── toast.js             # global toast queue: pushToast(), subscribeToToasts()
└── styles/
    ├── index.css            # imports all below, in order
    ├── tokens.css           # design tokens: the ONLY place for raw colors/sizes
    ├── base.css, components.css, layout.css, document.css
    └── print.css            # all print rules
```

## Principles

### 1. One source of truth

- Project data lives in one `project` object. It changes **only** through `dispatch` (see `state/reducer.js`).
- Raw design values live **only** in `src/styles/tokens.css`. See `docs/TOKENS.md`.
- UI and document strings come **only** from `t(key)`. See `docs/I18N.md`.

### 2. Isolated layers

- `editor/*` (input) and `doc/*` (output) are separate React subtrees. Both read the same `project`.
- `doc/*` is a **pure function of `project`**: no dispatch, no side effects, no browser-only APIs during render. It must render the same way in the preview, in `renderToStaticMarkup` (export), and in print.
- Interactivity in `doc/*` (the carousel) must also work in the export, so it's duplicated in plain JS in `utils/exportScript.js`. It relies on: `[data-zoom-group]` (one per section, holds its own `.lightbox`), `.doc__zoom` (+ `data-title`, `data-caption`; DOM order = carousel order), `.lightbox`, `.lightbox__close`, `.lightbox__nav--prev/--next`, `.lightbox__img`, `.lightbox__count`, `.lightbox__title`, `.lightbox__caption`. If you change them, update `exportScript.js` too.
- `components/*` is a UI kit: it doesn't import `state/`, `editor/`, or `doc/`. Pass data in through props (e.g. `Lightbox` gets `items` / `index`).

These layer rules are enforced by ESLint (`no-restricted-imports` in `eslint.config.js`).

### 3. Side effects stay at the edges

- IndexedDB: only in `state/storage.js` and `state/idb.js`. localStorage: only the locale key in `I18nProvider.jsx` (and the one-time legacy read in `storage.js`).
- File reading and image size: `utils/files.js`. Images are **never** compressed or converted.
- Notifications: `utils/toast.js` (a global queue, callable outside React).

## Data model

Defined in `state/model.js#emptyProject`:

```js
{
  version: 1,
  meta:     { showName, venue, date, ld, director, console, logo },   // logo: dataURL | null
  times:    { installation, focus, runtime, staff: [{ id, role, qty }] },
  plots:    { base, show },                                           // dataURL | null
  photos:   [{ id, src, tag, caption, order, width, height }],       // width/height: pixels, for the mosaic
  fixtures: [{ id, type, qty, info }],
  cues:     [{ id, num, name, info, cmd, fade, trigger }],            // trigger: "Go" | "Follow" | "Time <t>" | ...
  commentary: "",                                                      // markdown
}
```

In memory, `src` / `plots.*` / `meta.logo` are always dataURLs. Only the **saved** JSON holds markers `"__blob:<key>"` instead (see below).

## Storage flow

Everything lives in **IndexedDB** (database `tld`, version 2). Schema version of the project: `SCHEMA_VERSION`.

| Store | Key | Value |
|---|---|---|
| `project` | `"current"` | project JSON; every image replaced by `"__blob:<key>"` |
| `blobs` | `photo:<photo.id>`, `plot:base`, `plot:show`, `logo` | `{ id, blob, mime, bytes }` |

- **Save** (`storage.save`): runs from `ProjectProvider` on every `project` change (the first change after load is skipped). Saves are **queued and coalesced**: while one write runs, newer projects only replace the pending one, and only the latest gets written. One write = **one transaction over both stores** (all or nothing): the JSON, new/changed images, and deletes of removed images. An image is re-encoded only if its dataURL changed (compared with `===` against what was written). Errors go to the handler from `storage.setErrorHandler` (toasts in `App.jsx`).
- **Load** (`storage.load`, async, runs once): read `project`, swap `__blob:` markers back to dataURLs, apply migrations and sanitization (`programmer → director`, add `logo`, add `staff`, normalize `photos`, `cues`, `fixtures`), measure `width`/`height` of photos that don't have them yet (projects before v0.4), then delete blobs nothing refers to. It also calls `navigator.storage.persist()` so the browser doesn't evict the data.
- **Load failure:** if the project can't be read (or has an unknown version), saving is **switched off** for the session and a toast asks for an HTML export. This way an empty project never overwrites the real one.
- **Legacy migration (≤ v0.3):** the project used to live in localStorage (`tld.project.v1` = `STORAGE_KEY`), with images moved to IDB as `"__idbRef:<id>"` only on overflow. If that key exists, `load` resolves the old markers, writes the new layout, **reads it back and compares**, and only then removes the key and the old blobs. If anything fails, the key stays and the migration runs again next time.
- **Low-space warning:** IndexedDB is plain files in the browser profile on disk; nothing is reserved. The browser only names a ceiling (quota, usually a share of the disk). `useSpaceWarning` asks `storage.estimate()` right away on open, then ~0.8 s after each change, and shows one sticky toast when quota − usage < 1 GB. It goes away by itself when space comes back, and warns again on the next drop. No meter in the UI: the ceiling scales with the disk, so a bar mostly confuses.

## Export flow

`exportDocument(project)` in `utils/exportHtml.jsx`:

1. `renderExportHTML(project)`: `renderToStaticMarkup(<I18nProvider initialLocale="ru"><DocumentView/></I18nProvider>)`. Images are already dataURLs in memory, so they end up inline.
2. Wrap in a full HTML page with the CSS from `window.__INJECTED_CSS__` (snapshot taken in `main.jsx`) and `EXPORT_RUNTIME_JS`.
3. Download as `<showName>.html`.

## Gallery and carousel

- **Mosaic** (`doc/DocGallery.jsx`, `.doc__mosaic` / `.doc__tile`): "justified rows". Each tile has `--ar` = width / height and `flex: var(--ar) 1 calc(var(--ar) * var(--gallery-row-h))`. Free space in a row is shared in proportion to `--ar`, so all tiles in a row get the same height and no photo is cropped. `.doc__mosaic::after` with a huge `flex-grow` keeps the last row from stretching. `max-width` is also proportional to `--ar` (× `--gallery-row-max`), so tiles of a row hit it together and a lonely photo in a row doesn't blow up. Photos without a size use 4:3.
- **Carousel** (`components/Lightbox.jsx`): `items` + `index` (or `null` = closed). The `<dialog>` markup is always rendered, also in the export, where `exportScript.js` drives it. Gallery and plots are separate groups, each with its own carousel.

## grandMA2 import

`parseMA2(xmlText)` in `utils/ma2.js` reads a grandMA2 onPC sequence XML export (namespace `http://schemas.malighting.de/grandma2/xml/MA`):

| Field | Source in XML |
|---|---|
| `num` | `<Number number>` |
| `name`, `info` | text of the first `<Info>` in `<InfoItems>` (same text in both) |
| `cmd` | first non-empty `<macro_text>` in a `<CuePart>` |
| `fade` | `<CuePart basic_fade>` (first part) |
| `trigger` | `<Trigger type>`: `Follow`, `Time <data_f>`, other types as-is, default `Go` |

It also collects fixtures from `<CueData><Channel fixture_id attribute_name>`. Cues come back sorted by `num`.

Warnings are codes, not text: `{ code: "empty" | "invalidXml" | "noCues", detail? }`. The UI translates them with `tn("ma2.warn.<code>", detail)`.

## Print

All print rules live in `src/styles/print.css`. A4 portrait, 14mm margins, page break before each `.doc__section`.

## Recipe: add a new document section

1. **Data:** add the field to `state/model.js#emptyProject`. If old saved projects need it, add a default in `storage.load`.
2. **Mutations:** add action types to `state/reducer.js`.
3. **Strings:** add keys to `i18n/dict.js` (every locale).
4. **Editor:** create `editor/MySection.jsx` and add it to `<Editor>` in `App.jsx`.
5. **Document:** create `doc/DocMySection.jsx` (pure!) and add it to `<DocumentView>`.
6. **Check:** preview, print, and the exported HTML. Storage and export pick up the new data automatically, as long as it is in `project`.

## Recipe: add a language

See `docs/I18N.md`.

## Changelog

### Unreleased

- Storage moved to IndexedDB only (project + images as Blobs), one-time migration from localStorage, no more adaptive compression
- Fixed: IndexedDB grew on every save after the first overflow
- Gallery is a mosaic (justified rows, no cropping); click opens a full-screen carousel (buttons, arrow keys, swipe, counter), also in the export; plots use the same carousel
- Images are stored as is: no compression, PNG stays PNG; photos store their pixel size
- Storage indicator removed (the three quota dots); instead a sticky toast warns when less than 1 GB is left

### v0.3.0 (2026-08-15)

- Staff per role, times section, IndexedDB offload for binaries, image file names as tags, storage quota indicator
- grandMA2 XML parsing fixes, export gallery buttons fixed

### iter 5 (2026-08-12): move to Vite + offline

- Dropped the CDN completely (React, ReactDOM, and Babel Standalone are no longer loaded from the network)
- Vite 5 instead of a hand-written single-file HTML
- Structure `src/{components,editor,doc,i18n,state,utils,styles}`
- Design tokens moved to `src/styles/tokens.css`
- JSX compiled at build time
- Production bundle: ~79 KB gzip (JS) + 4.7 KB gzip (CSS) + 0.5 KB HTML

### iter 4 (2026-08-11)

- Mobile header, plots section with a divider, ReactDOMServer fix

### iter 1–3 (2026-08-11)

- Initial architecture, UI kit, localization, editor + document, export
- Photo compression, toaster, markdown parser
