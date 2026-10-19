# Design tokens

All raw colors, fonts, font sizes, spacing, radii, shadows, and timings live in **one file**: `src/styles/tokens.css` (the `:root` block).

To change the palette or branding, edit **only that file**. Component styles must reference tokens with `var(--token)`.

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

Fonts are **system font stacks**: no web fonts, so nothing is loaded from the network.

| Token | Stack starts with |
|---|---|
| `--ff-display` | `ui-sans-serif, -apple-system, …` (headings) |
| `--ff-text` | `-apple-system, BlinkMacSystemFont, …` (body text) |
| `--ff-mono` | `ui-monospace, "SF Mono", "JetBrains Mono", …` (numbers, cue data) |

Sizes: `--fs-xs` 11px, `--fs-sm` 12.5px, `--fs-md` 14px, `--fs-lg` 15px, `--fs-xl` 18px, `--fs-2xl` 22px, `--fs-3xl` 30px, `--fs-4xl` 40px.
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
