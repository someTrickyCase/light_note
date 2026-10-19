# Design tokens

All raw colors, fonts, font sizes, spacing, radii, shadows, and timings live in **one file**: `src/styles/tokens.css` (the `:root` block).

To change the palette or branding, edit **only that file**. Component styles must reference tokens with `var(--token)`.

## Themes

- `:root` is the **light** theme (+ the sans font). Other themes are `:root[data-theme="…"]` blocks at the end of `tokens.css`: **graphite** (Графит, the app default), **midnight** (Полночь), **tungsten** (Вольфрам) — dark; **paper** (Бумага) — light; `light` (Светлая) has no block, it is `:root`. The three dark themes share one base block (graphite), then each overrides its surfaces, text and accent (same specificity, the later block wins). Dark ones set `color-scheme: dark` (native date pickers, selects and scrollbars follow). The font: `:root[data-font="serif"]` swaps only `--ff-text` (Arimo → Old Standard TT); headings, the title and mono stay.
- Theme blocks sit inside `@media screen`, so **print is always light**, and so is the **export** (its `<html>` has no `data-theme`, even though it carries the same CSS). The **font block is outside** `@media screen`: print follows the chosen font, and the export gets the same `data-font` on its `<html>`.
- `<html data-theme data-font>` is set by `utils/appearance.js` (header "Меню" → Тема / Шрифт, saved in `localStorage` as `tld.theme.v1` / `tld.font.v1`) and, before the first paint, by a tiny script in `index.html` `<head>` (no flash). Keep their keys, lists and defaults in sync; `tests/appearance.test.jsx` runs the head script. **Add a theme:** a block in `tokens.css`, its id in `THEMES` (`appearance.js`) and in the head script, a name `appearance.theme.<id>` in every `src/i18n/locales/*.js`.
- **Use tokens by role, not by color.** A component that wants "a strong fill" asks for `--c-strong`, not `--c-graphite`: in the dark theme the strong fill is light. Role tokens:

| Token | Role | Light | Dark |
|---|---|---|---|
| `--c-strong` / `--c-strong-2` / `--c-on-strong` | selected chip, section number, `.btn--dark`, table header line | graphite / white text | near-white / dark text |
| `--c-chrome`, `--c-chrome-ink`, `--c-chrome-meta`, `--c-chrome-strong`, `--c-chrome-line` | top bar (dark in both themes) | graphite | almost black |
| `--c-on-accent` | text on the accent (primary button) | white | dark |
| `--c-on-status` | icon on a status color (toast) | white | dark |
| `--c-green-ink`, `--c-amber-ink`, `--c-err-ink`, `--c-info-ink` | text on a status background (toast) | dark tints | light tints |
| `--c-surface-2`, `--c-drop-h`, `--c-placeholder`, `--c-focus-ring`, `--c-err-ring`, `--c-green-bg-h` | soft cards, drop-zone hover, placeholders, focus rings, WhatsApp button hover | | |
| `--c-logo-bg`, `--logo-pad` | backing behind the logo, so a dark logo stays visible on a dark page | white, no padding | light pill |

- `tests/appearance.test.jsx` checks WCAG contrast of the main text/background pairs in **every** theme. Two old light-theme pairs are below the minimum (see `docs/KNOWN_ISSUES.md`).

## Token map

### Base colors

| Token | Value | Used for |
|---|---|---|
| `--c-graphite` | `#1a181b` | header, dark buttons |
| `--c-graphite-2` | `#201d22` | hover on dark buttons |
| `--c-steel` | `#2e4153` | focus ring, links |
| `--c-steel-2` | `#3a5168` | steel hover |
| `--c-ink` | `#1c2127` | main text |
| `--c-ink-2` | `#4b5663` | secondary text |
| `--c-soft` | `#8b95a1` | captions, labels |
| `--c-page` | `#eef1f4` | page background |
| `--c-surface` | `#ffffff` | cards, inputs |
| `--c-line` | `#e2e7ec` | borders |
| `--c-line-2` | `#eef1f4` | soft dividers |

### Brand colors

| Token | Value | Used for |
|---|---|---|
| `--c-accent` | `#c490d1` | **main CTA only** |
| `--c-accent-d` | `#564d65` | accent button hover |
| `--c-accent-t` | `#fbede4` | warm tinted backgrounds (if any) |

### Status colors

Each status has three tokens: the color, `-bg` (background), and `-bd` (border).

| Base token | Set | Meaning |
|---|---|---|
| `--c-green` | `green / green-bg / green-bd` | available, success |
| `--c-amber` | `amber / amber-bg / amber-bd` | on order, warning |
| `--c-greyst` | `greyst / grey-bg / grey-bd` | to be confirmed, neutral |
| `--c-reg` | `reg / reg-bg / reg-bd` | registered (rental) items |
| `--c-err` | `err / err-bg / err-bd` | validation errors |
| `--c-info` | `info / info-bg / info-bd` | info toasts |

### Overlay colors (full-screen carousel)

| Token | Value | Used for |
|---|---|---|
| `--c-backdrop` | `rgba(0,0,0,.88)` | dark background behind the photo |
| `--c-on-overlay` | `#ffffff` | text and icons on it |
| `--c-overlay-btn` / `--c-overlay-btn-h` | `rgba(0,0,0,.4)` / `.7` | ✕ ‹ › buttons / hover |
| `--c-overlay-line` | `rgba(255,255,255,.4)` | button border |
| `--sh-on-overlay` | text shadow | caption readability on any photo |

### Typography

Four Google Fonts (SIL Open Font License, texts in `src/fonts/LICENSE.txt`), **built into the app**: the `.woff2` files live in `src/fonts/`, `src/styles/fonts.css` declares them, and the build inlines them into the CSS as `data:` URLs. Nothing is loaded from the network, and the export carries them too (~250 KB). Only the latin and cyrillic subsets; `unicode-range` makes the browser decode only the files whose letters are on the page.

| Token | Font | Used for |
|---|---|---|
| `--ff-title` | Yeseva One (one weight: 400) | the show title on the document cover |
| `--ff-display` | Oswald (400–700) | headings, time values, the logo |
| `--ff-text` | Arimo (400–700 + italic) · serif: Old Standard TT (400, 700, italic) | body text, inputs, buttons |
| `--ff-mono` | system `ui-monospace, "SF Mono", …` | labels, numbers, cue data |

Each stack ends with system fallbacks. **Add or update a font:** put the `.woff2` files in `src/fonts/`, add `@font-face` rules to `fonts.css` (keep `unicode-range`), add its license to `LICENSE.txt`, use it through a token.

Sizes are base values × `--fs-scale` (now **1.1**, i.e. +10%; change it to resize all text in the app, the export and print at once): `--fs-2xs` 9px, `--fs-xs` 11px, `--fs-sm` 12.5px, `--fs-md` 14px, `--fs-lg` 15px, `--fs-xl` 18px, `--fs-icon` 20px, `--fs-2xl` 22px, `--fs-3xl` 30px, `--fs-4xl` 40px. No raw `font-size` in px outside `tokens.css` (`em` for relative sizes is fine).
Line heights: `--lh-tight` 1.1, `--lh-snug` 1.25, `--lh-normal` 1.5, `--lh-loose` 1.7.

### Spacing (4px grid)

`--s-1` 4px, `--s-2` 8px, `--s-3` 12px, `--s-4` 16px, `--s-5` 20px, `--s-6` 24px, `--s-8` 32px, `--s-10` 40px, `--s-12` 48px, `--s-16` 64px.

### Radii

`--r-sm` 6px (badges, small inputs), `--r-md` 9px, `--r-lg` 12px (default), `--r-xl` 16px (cards), `--r-pill` 999px (chips).

### Shadows

`--sh-1` (1px), `--sh-2` (cards), `--sh-3` (large frames), `--sh-accent` (primary CTA only).

### Motion

`--t-fast` 120ms, `--t-med` 200ms.

### Layout

`--container` 1280px, `--header-h` 60px, `--side-w` 420px (editor panel width).
`--gallery-row-h` 180px, `--gallery-row-h-sm` 110px (phones ≤600px): row height of the gallery mosaic. `--gallery-row-max` 1.6: a row grows at most 1.6× that height (stops a lonely photo from filling the screen).

## Example: change the branding

For a blue accent:

```css
:root {
  --c-accent:   #2563eb;
  --c-accent-d: #1d4ed8;
  --c-accent-t: #eff4ff;
}
```

The primary CTA, focus states, and accent labels all pick up the new color. Note: `--sh-accent` has its own `rgba(...)` color, so update it too.

## Rules

1. **Never** use hex/rgb values in component styles: only `var(--token)`.
2. **Never** set fonts directly (`font-family: Inter` ❌, `font-family: var(--ff-text)` ✅).
3. **Spacing** only through `--s-*`. If you need 14px, add `--s-3-5: 14px` to the tokens.
4. One new color = one new variable. No duplicates.
5. The same rules apply to inline `style={{…}}` in JSX.
