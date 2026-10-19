# Known issues and backlog

Found during the lint cleanup (2026-10-19) but not fixed yet: each one changes behavior and deserves its own commit.
Ordered by priority.

## Bugs

### 1. Hundreds of heavy photos: memory and export hit hard limits (high)

Without compression, artists will load many big photos (a 24 MP JPEG ≈ 10 MB). Storage (IndexedDB, quota ≈ a share of the free disk) is fine with that, but two other limits are not:

- **Memory:** every image lives in React state as a base64 **string** (+33%). 300 × 10 MB ≈ 4 GB of strings → the tab may crash.
- **Export:** `renderExportHTML` builds the whole HTML as **one string**. V8 strings are capped at ~512 MB (2^29 chars), so a big gallery can't be exported at all.
- **Open HTML:** `file.text()` + `DOMParser` hold the whole file as a string and a parsed document at once: same ~512 MB cap, and ~2–3× the file size in memory while opening.

Fix idea: keep images as `Blob`s in memory and show them via `URL.createObjectURL` (no base64 copies); build the export as a `Blob` from parts (HTML chunks + each image's base64 written separately), never one string. Needs a measured test with a real set of heavy photos.

### 2. Exports made before v0.4 can't be opened (by design)

They have no data block, so "Открыть HTML…" says so instead of guessing the project back from the visible page (that would be lossy). Re-create them once, then export again.

### 3. MA2: `<Number/>` without the `number` attribute becomes cue 0 (low)

`src/utils/ma2.js#readCueNumber`: `Number(null) === 0`. Kept as is on purpose (the old behavior). Probably it should be skipped like a non-numeric number.

### 4. Markdown: `_` inside link URLs breaks the link (low)

`src/doc/markdown.js#mdInline`: italic (`_x_`) runs before links, so `[a](https://x.com/a_b_c)` gets `<em>` inside the URL. Not a security problem (everything is escaped), just a broken link. Bold/italic also apply inside `` `code` ``.

## Cleanup

- **Stylelint** for CSS: raw hex/rgba values are still in `src/styles/*.css` outside `tokens.css` (e.g. `.drop` backgrounds). `document.css` is clean.
- `--sh-accent` and `--c-accent-t` in `tokens.css` are still based on the **old orange** accent; the accent is purple now.
- `dict.js` has emoji (⚠ 🔴 ✓) against rule 4 in `docs/I18N.md`. Decide: drop them, or change the rule.
- No favicon: the browser logs a harmless `favicon.ico` 404. Fix: `<link rel="icon" href="data:,">` in `index.html`.
- `Chip` component is not used anywhere.
- `DocFixtures` turns `"Всего: N шт."` into `"Всего · N шт."` with a regex on the translated string. Better: a separate dictionary key.

## Testing

Vitest in a real browser (`npm test`, see README → Tests). 149 tests, ~100% lines / ~99% branches on the covered modules:
storage (`state/storage.js`, `state/idb.js`, `utils/storageQuota.js`, `utils/useSpaceWarning.js`), gallery and carousel (`doc/DocGallery.jsx`, `doc/DocPlots.jsx`, `doc/ZoomImage.jsx`, `components/Lightbox.jsx`, including the mosaic layout with the real CSS), export (`utils/exportHtml.jsx` + the vanilla runtime in an iframe), upload (`components/FileDrop.jsx`, `utils/files.js`), open HTML (`utils/projectFile.js`, `utils/imageKey.js`, `utils/useHtmlDrop.js`, `Topbar.jsx`, `components/Menu.jsx`, `components/ChoiceDialog.jsx`).

Not covered yet (next candidates, in order):

- `parseMA2`: needs a **real grandMA2 XML export** in `tests/fixtures/`
- `projectReducer`, `renderMarkdown`: the old throwaway characterization cases (60/60 and 14/14) should become real tests
- editor sections (`src/editor/*`) and the rest of `src/doc/*`

⚠️ Lesson learned: `parseMA2` must be tested with a **real** DOM. linkedom ignores XML namespaces, so it missed a bug that broke import completely (an autofix changed the namespace URI to `https`).
