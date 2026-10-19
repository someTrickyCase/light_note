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
│   ├── FileDrop.jsx         # drag & drop / picker; compresses by quota level (getQuotaLevel prop)
│   ├── GrowTextarea.jsx     # auto-height textarea (forwardRef)
│   ├── Lightbox.jsx         # image zoom (in-app)
│   ├── QuotaLights.jsx      # ok / warn / err storage indicator
│   └── cn.js                # className joiner
├── editor/                  # LEFT panel: input forms, read useProject(), write useDispatch()
│   ├── MetaSection, TimesSection, StaffSection, PlotsSection,
│   ├── GallerySection, FixturesSection, CuesSection, CommentarySection
│   └── GroupTitle.jsx
├── doc/                     # RIGHT panel: the document. Pure function of `project`
│   ├── DocumentView.jsx     # composes all Doc* sections; used by preview AND export
│   ├── DocHeader, DocTimes, DocStaff, DocPlots, DocGallery,
│   ├── DocFixtures, DocCues, DocCommentary, DocFooter
│   ├── ZoomImage.jsx        # <button class="doc__zoom"> around an image; opens the Lightbox
│   └── markdown.js          # tiny markdown → HTML renderer for commentary (escapes HTML first)
├── state/
│   ├── model.js             # emptyProject(), uid(), STORAGE_KEY, SCHEMA_VERSION
│   ├── reducer.js           # projectReducer: table of handlers, the ONLY place project state changes
│   ├── ProjectProvider.jsx  # context: useProject(), useDispatch(), useProjectLoading()
│   ├── storage.js           # load (with migrations) / save (localStorage → IDB offload)
│   └── idb.js               # minimal IndexedDB blob store
├── i18n/
│   ├── dict.js              # DICT + SUPPORTED_LOCALES
│   ├── translate.js         # makeTranslator(locale) → { t, tn } without React (export, utils)
│   └── I18nProvider.jsx     # useT() → { t, tn, locale, setLocale }
├── utils/
│   ├── ma2.js               # parseMA2(xml): grandMA2 XML → { cues, fixtures, warnings: [{ code }] }
│   ├── exportHtml.jsx       # exportDocument(): renderToStaticMarkup → download .html
│   ├── exportScript.js      # EXPORT_RUNTIME_JS: vanilla JS for gallery + lightbox in export
│   ├── files.js             # readAsDataURL, compressImage, escapeHtml
│   ├── storageQuota.js      # size math, quotaLevel() thresholds, projectQuotaLevel()
│   ├── useQuotaWatch.js     # hook: current quota level, toasts when it gets worse
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
- Interactivity in `doc/*` (gallery buttons, lightbox) must also work in the export, so it's duplicated in plain JS in `utils/exportScript.js`. It relies on these classes: `.doc__gallery-wrap`, `.doc__gallery`, `.doc__gallery-btn--prev/--next`, `.doc__photo`, `.doc__zoom` (+ `data-caption`), `.lightbox`, `.lightbox__close`, `.lightbox__img`, `.lightbox__cap`. If you change them, update `exportScript.js` too.
- `components/*` is a UI kit: it doesn't import `state/`, `editor/`, or `doc/`. Pass data in through props (e.g. `FileDrop` gets `getQuotaLevel`).

These layer rules are enforced by ESLint (`no-restricted-imports` in `eslint.config.js`).

### 3. Side effects stay at the edges

- localStorage / IndexedDB: only in `state/storage.js` and `state/idb.js` (and the locale key in `I18nProvider.jsx`).
- File reading and image compression: `utils/files.js`.
- Notifications: `utils/toast.js` (a global queue, callable outside React).

## Data model

Defined in `state/model.js#emptyProject`:

```js
{
  version: 1,
  meta:     { showName, venue, date, ld, director, console, logo },   // logo: dataURL | null
  times:    { installation, focus, runtime, staff: [{ id, role, qty }] },
  plots:    { base, show },                                           // dataURL | null
  photos:   [{ id, src, tag, caption, order }],
  fixtures: [{ id, type, qty, info }],
  cues:     [{ id, num, name, info, cmd, fade, trigger }],            // trigger: "Go" | "Follow" | "Time <t>" | ...
  commentary: "",                                                      // markdown
}
```

When binaries are offloaded, `src` / `plots.*` / `meta.logo` hold a marker `"__idbRef:<id>"` instead of a dataURL.

## Storage flow

- **Key:** `tld.project.v1` (`STORAGE_KEY`), schema version in `SCHEMA_VERSION`.
- **Load** (`storage.load`, async): read JSON, apply migrations and sanitization (`programmer → director`, add `logo`, add `staff`, normalize `cues` and `fixtures`), then `resolveRefs()` swaps `__idbRef:` markers back to dataURLs from IndexedDB.
- **Save** (`storage.save`): runs from `ProjectProvider` on every `project` change (the first change after load is skipped). It tries `localStorage.setItem`. On `QuotaExceededError` it moves all binaries to IndexedDB (`moveBinariesToIDB`), stores the slim JSON, and reports through `storage._onError` (connected to toasts in `App.jsx`).
- **Quota UI:** `useQuotaWatch` measures `JSON.stringify(project)` against a 5 MB budget (warn ≥ 60%, err ≥ 85%). `FileDrop` lowers image quality as the level rises: 1920px/0.82 → 1600px/0.7 → 1280px/0.55.

## Export flow

`exportDocument(project)` in `utils/exportHtml.jsx`:

1. `resolveRefs()` so no `__idbRef:` markers remain.
2. `renderToStaticMarkup(<I18nProvider initialLocale="ru"><DocumentView/></I18nProvider>)`.
3. Wrap in a full HTML page with the CSS from `window.__INJECTED_CSS__` (snapshot taken in `main.jsx`) and `EXPORT_RUNTIME_JS`.
4. Download as `<showName>.html`.

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
