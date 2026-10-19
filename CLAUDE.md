# Light Note

Offline browser editor for theatre lighting show documentation (React 18 + Vite 5, plain CSS, no backend).
The built app and the exported document must work from `file://` with **no network**.

## Commands

```bash
npm run dev       # dev server, http://localhost:5173
npm run build     # production build → dist/ (runs scripts/postbuild.js after)
npm run preview   # serve dist/
npm run lint      # strict ESLint (eslint.config.js): every rule is an error
npm test          # Vitest in a real headless browser (Brave/Chromium via Playwright)
npm run test:coverage  # same + coverage; thresholds 95% (vitest.config.js)
```

## Hard rules

- **Offline / `file://`:** no CDN, no web fonts, no runtime fetches. Keep the IIFE output and CSS inlining in `vite.config.js` (ES modules break on `file://`).
- **State:** change `project` only through `dispatch` → `src/state/reducer.js`.
- **Styles:** raw colors, fonts, and spacing only in `src/styles/tokens.css`; everywhere else use `var(--token)`, including inline `style={{}}`.
- **Strings:** all UI and document text through `t()` / `tn()` from `src/i18n/dict.js`. No hardcoded text in JSX.
- **`src/doc/*` stays pure:** it renders in the preview, in the export (`renderToStaticMarkup`), and in print. No dispatch or side effects there.
- **Carousel markup** (`components/Lightbox.jsx`, `doc/ZoomImage.jsx`, `data-zoom-group`) is mirrored by vanilla JS in `src/utils/exportScript.js`. Change both together; `tests/export.test.jsx` drives the export copy.
- **Exported HTML is also a project file** (`utils/projectFile.js`): keep `data-ln-ref` on document images (keys from `utils/imageKey.js`). Changing the project shape → bump `SCHEMA_VERSION` + migration, so old exports keep opening; `tests/projectFile.test.jsx` checks the round trip.
- **Storage:** IndexedDB only, touched only by `src/state/storage.js` / `idb.js` (localStorage holds just the UI locale). Changing the saved shape requires a migration in `storage.load`.

## Before saying "done"

1. `npm run lint`, `npm run test:coverage` and `npm run build` pass. Don't silence a rule with `eslint-disable` without a comment explaining why.
2. For UI changes: check the preview, print, and an exported HTML opened from `file://`.
3. Docs in `docs/` still match the code. Update them in the same commit.
4. Tests live in `tests/` and run in a **real browser** (never linkedom/jsdom). Covered so far: storage, gallery/carousel, export, open HTML, Topbar menu/dialog, file upload (list in `vitest.config.js` → `coverage.include`): when you add tests for a new module, add it there. For refactors of untested code, compare old vs new behavior on the same inputs.

## Lint gotchas

- `eslint --fix` is not always safe: `unicorn/prefer-https` rewrote the MA2 XML namespace URI (broke import), and `prefer-arrow-callback` turned named `forwardRef(function X…)` into anonymous arrows. Review autofix diffs.
- Effects that return a cleanup only sometimes trip `consistent-return`. Always return a cleanup instead.

## Git

Trunk-based: branch from `main` as `features/<name>`, `hotfix/<name>`, etc. (kebab-case), PR to `main`, squash-merge.
Commits follow Conventional Commits: `feat(cues): ...`. Scopes and full rules are in `README.md` → "Git workflow".

## Docs

- `docs/ARCHITECTURE.md`: code map, data model, storage/export flows, MA2 import, recipe to add a section
- `docs/TOKENS.md`: design tokens
- `docs/I18N.md`: dictionary and how to add a language
- `docs/KNOWN_ISSUES.md`: known bugs and backlog. Check it before fixing "new" bugs; update it when you fix or find one

Code comments are in Russian; docs are in English.
