# Light Note

Offline browser-based editor for theatrical lighting show technical documentation.
Single static HTML file as output — no backend, no CDN, no external resources at runtime.

## Features

- **Show metadata** — title, venue, date, lighting designer, director, console, logo
- **Time** — installation, focus, runtime, staff (per role, with auto-sum and capacity notes)
- **Plots** — base + show (JPG/PNG capture)
- **Fixture gallery** — mosaic that keeps every photo's shape (no cropping), tags and captions; click opens a full-screen carousel (‹ ›, arrow keys, swipe)
- **Fixtures for additional rig** — name, quantity, free-form info, with reorder and auto-sum
- **Cue list** — grandMA2 XML import, auto-numbering, fade, trigger (Go/Follow/Time), description, macro command
- **Commentary** — markdown editor with toolbar (bold, italic, H3, list, quote, link)
- **Export** — single-file HTML (CSS inlined, photos embedded as base64, interactive carousel via inline vanilla JS)
- **Open & edit an export** — "Файл → Открыть HTML…" (or drop the .html on the window) loads the project back from an exported file, pictures included. Works for files exported by this version and newer.
- **Autosave** — IndexedDB (project + images as Blobs), saves coalesced, nothing leaves the browser
- **Adaptive layout** — desktop and mobile (≤600px), tablet (≤900px)
- **Print styles** — A4 portrait, each section on a new page
- **Accessible** — images, chips, drop zones and the "Файл" menu work with the keyboard; destructive actions ask first
- **i18n** — Russian only for now, dictionary isolated in `src/i18n/dict.js`, ready for additional locales

## Tech stack

- **React 18** + **ReactDOM** (`renderToStaticMarkup` for export)
- **Vite 5** — bundler, dev server, HMR
- **Plain CSS** with design tokens in `:root` — no CSS frameworks
- **IndexedDB** for the project and its images (photos, plots, logo)
- No state-management libraries (custom reducer + context)
- No router (single-page)

## Project structure

```
.
├── src/
│   ├── components/   — UI kit: Button, Chip, Badge, Field, Toaster, FileDrop, GrowTextarea, Lightbox, Menu, ChoiceDialog
│   ├── editor/       — left-panel sections (input)
│   ├── doc/          — DocumentView + subcomponents (rendered output)
│   ├── i18n/         — dict.js + I18nProvider
│   ├── state/        — model, reducer, storage (IDB), idb, ProjectProvider
│   ├── utils/        — files, toast, ma2 parser, storageQuota, useSpaceWarning, exportHtml, exportScript
│   ├── styles/       — tokens, base, components, layout, document, print
│   ├── App.jsx
│   └── main.jsx
├── public/
├── scripts/
│   └── postbuild.js  — Vite inline-CSS plugin + post-build cleanup
├── docs/             — ARCHITECTURE.md, TOKENS.md, I18N.md
├── dist/             — production build output (gitignored)
├── index.html        — entry point
└── vite.config.js
```

## Requirements

- **Node.js ≥ 18** (Vite 5 requirement)
- **npm** (or any compatible package manager)

## Install

```bash
npm install
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start Vite dev server with HMR at <http://localhost:5173> |
| `npm run build` | Production build into `dist/` (single IIFE bundle, CSS inlined via custom Vite plugin) |
| `npm run preview` | Serve `dist/` locally for final verification |
| `npm run lint` | Strict ESLint check (`eslint.config.js`); `npm run lint:fix` applies safe autofixes |
| `npm test` | Vitest in a real headless browser (`npm run test:watch` for watch mode) |
| `npm run test:coverage` | Tests + coverage report in `coverage/` (fails below 95%) |

## Build output

`npm run build` produces:

```
dist/
├── index.html          # entry, ~5–7 KB gzip
├── light-note.js       # IIFE bundle with React + app, ~80 KB gzip
└── (no .css)           # CSS is inlined into <style> in index.html
```

The custom Vite plugin (`inlineCssPlugin` in `vite.config.js`) inlines all CSS into the HTML during build, so the final file works from `file://` without cross-origin issues. `scripts/postbuild.js` removes the leftover `light-note.css`.

## Run / deploy

`dist/` is **fully static** and works in three modes:

1. Open `dist/index.html` directly via `file://` — no server required.
2. Drop into any static host (GitHub Pages, Netlify, S3, nginx).
3. Embed inside a larger app via `<iframe>`.

The exported single-file HTML (downloaded via "↓ HTML" button) is a self-contained document with inlined CSS, base64 photos, and an inline `<script>` (~3 KB) for the full-screen carousel.

## Data storage

- **IndexedDB** — the project JSON and every image (photos, plots, logo) as a Blob under a stable key. One project per origin. The browser is asked to keep the data persistent.
- **Migration** — projects from v0.3 and older (localStorage) are moved to IndexedDB once, on first load, and checked before the old copy is removed.
- **No compression** — images are stored and exported exactly as uploaded (PNG stays PNG). Big camera photos make big exports: ~10 MB per 24 MP photo.
- **Low-space warning** — a toast that stays until closed when less than 1 GB of browser storage is left (from `navigator.storage.estimate()`).
- **localStorage** — only the UI locale (`tld.locale.v1`).

No data leaves the browser. Clearing site data erases everything.

## Git workflow

This project uses **trunk-based development** with short-lived feature branches.

### Branching

- `main` — always releasable; protected. Direct pushes are blocked.
- `features/<short-name>` — feature branches (e.g., `features/ma2-import`, `features/idxedb-storage`). Branched from `main`, merged back via PR.
- `hotfix/<short-name>` — urgent fixes branched from `main`.

Branch names use lowercase kebab-case. Keep them descriptive but short.

### Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

<body>

<footer>
```

**Types:**

| Type | When to use |
|---|---|
| `feat` | New user-visible feature |
| `fix` | Bug fix |
| `refactor` | Code change without behavior change |
| `style` | Formatting, missing semicolons, etc. (no logic change) |
| `docs` | Documentation only |
| `test` | Adding or fixing tests |
| `chore` | Tooling, dependencies, configs |

**Scopes** (optional): `cues`, `fixtures`, `gallery`, `storage`, `export`, `i18n`, `quota`, `editor`, `doc`, `css`, `vite`.

**Examples:**

```
feat(cues): import grandMA2 XML with cmd/description parsing
fix(storage): auto-offload binaries to IDB on QuotaExceededError
refactor(editor): replace fixtures table with collapsible list
docs: document MA2 parser behaviour
chore(deps): bump vite to 5.4.21
```

Rules:

- Imperative mood in subject ("add", not "added").
- Subject ≤ 72 chars, no trailing period.
- Body explains *why*, not *what* (the diff shows the *what*).
- Reference issues in footer: `Closes #42`, `Refs #15`.

### Pull requests

1. Branch from `main`: `git checkout -b features/<name>`
2. Commit in logical chunks (one feature/fix per commit when possible).
3. Push and open a PR against `main`.
4. PR title follows Conventional Commits.
5. PR description: **what** changed, **why**, screenshots for UI changes, manual test steps.
6. Self-review the diff before requesting review.
7. Squash-merge with the PR title as the squash commit message (or rewrite via GitHub UI).
8. Delete the branch after merge.

### Releases

Tag with [SemVer](https://semver.org/) from `main`:

```bash
git tag -a v0.3.0 -m "v0.3.0 — IndexedDB storage"
git push origin v0.3.0
```

`dist/` for a release is the artifact published to the static host.

## Development tips

- The **editor** and **preview** are siblings in `App.jsx` — any change in `src/editor/*` updates the left panel live, any change in `src/doc/*` updates the right panel.
- Most components take their values from the project context (`useProject()`); mutate through `useDispatch()`.
- After modifying `src/i18n/dict.js`, no rebuild needed beyond HMR.
- To test the export flow: click "↓ HTML", open the downloaded file in a separate browser tab. It has no JS dependencies on the dev environment.

## Documentation

- `docs/ARCHITECTURE.md` — code map, how to add a section, how to add a language
- `docs/TOKENS.md` — design tokens
- `docs/I18N.md` — translation dictionary
- `docs/KNOWN_ISSUES.md` — known bugs, cleanup backlog, testing status

### Tests

Tests run in a real browser through Vitest browser mode + Playwright, because IndexedDB, Blob and XML parsing must be real (fake DOMs have given false passes here before).
The browser is `CHROMIUM_PATH` if set, otherwise Brave from snap, otherwise Playwright's own Chromium (`npx playwright install chromium` once).

