# Known issues and backlog

Found during the lint cleanup (2026-10-19) but not fixed yet: each one changes behavior and deserves its own commit.
Ordered by priority.

## Bugs

### 1. "Заменить" (replace) skips image compression (medium)

`src/editor/MetaSection.jsx`, `src/editor/PlotsSection.jsx`. The first upload goes through `FileDrop` (compressed), but "Заменить" uses `readAsDataURL` directly, so a 10 MB photo goes straight into storage.

Fix idea: reuse `compressImage`, or open a `FileDrop` picker instead. (Will likely go away: the next stage drops compression.)

### 2. MA2: `<Number/>` without the `number` attribute becomes cue 0 (low)

`src/utils/ma2.js#readCueNumber`: `Number(null) === 0`. Kept as is on purpose (the old behavior). Probably it should be skipped like a non-numeric number.

### 3. Markdown: `_` inside link URLs breaks the link (low)

`src/doc/markdown.js#mdInline`: italic (`_x_`) runs before links, so `[a](https://x.com/a_b_c)` gets `<em>` inside the URL. Not a security problem (everything is escaped), just a broken link. Bold/italic also apply inside `` `code` ``.

## Cleanup

- **Stylelint** for CSS: raw hex/rgba values are still in `src/styles/*.css` outside `tokens.css` (e.g. `.drop` backgrounds, lightbox colors).
- `--sh-accent` and `--c-accent-t` in `tokens.css` are still based on the **old orange** accent; the accent is purple now.
- `dict.js` has emoji (⚠ 🔴 ✓) against rule 4 in `docs/I18N.md`. Decide: drop them, or change the rule.
- No favicon: the browser logs a harmless `favicon.ico` 404. Fix: `<link rel="icon" href="data:,">` in `index.html`.
- `Chip` component is not used anywhere.
- `DocFixtures` turns `"Всего: N шт."` into `"Всего · N шт."` with a regex on the translated string. Better: a separate dictionary key.

## Testing

There are no automated tests yet. During the lint refactor, behavior was checked with throwaway scripts:

- **characterization tests** (old vs new code on the same inputs): `renderMarkdown` 14/14, `projectReducer` 60/60, `parseMA2` 5/5 in a real browser
- **browser smoke test** (headless Brave via `playwright-core`): 28/29 checks pass (the one failure is the favicon 404); the export was opened from `file://`

Next step: Vitest + these cases as real tests, with a **real grandMA2 XML export** in `tests/fixtures/`.

⚠️ Lesson learned: `parseMA2` must be tested with a **real** DOM. linkedom ignores XML namespaces, so it missed a bug that broke import completely (an autofix changed the namespace URI to `https`).
