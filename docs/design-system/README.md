# The Prosody design system — rules for staying inside it

Read this before touching any `*.css` or component file. The full derivations
and the contrast table are in [`02-tokens.md`](02-tokens.md); tokens live in
[`app/tokens.css`](../../app/tokens.css).

The system is the one drawn in Figma
([Portfolio → Prosody, node 85:7138](https://www.figma.com/design/GbaOppKpsNi6ZL4VrVCVOO/Portfolio?node-id=85-7138)).
Where this document and that file disagree, the file is right and this
document is stale — fix it here.

> **History.** [`01-audit.md`](01-audit.md) is the audit of the *paper* system
> that ran until August 2026 (warm ink on aged paper, EB Garamond + General
> Sans, a deck of cards you cut). It is kept because its findings — the
> licensing rule, the "no magic numbers" rule, the reduced-motion rule — are
> what this system inherited. Its token names are gone. The analog-tech
> proposal that briefly lived at `/lab` is gone with it.

## The three numbers

- **Base unit: 4px** (`0.25rem`). Inside em contexts (the verse body), 0.25em.
  Exactly one half-step exists in the spatial scale: `--space-2-5` (10px), the
  horizontal inset of a control, taken from the design.
- **Type ratio: 1.25** from a 16px base, rounded to whole pixels:
  **16 · 20 · 25 · 31 · 39 · 49**.
- **Breakpoints: 480 / 640** — the only raw px values allowed in components,
  because CSS can't tokenize `@media`.

## The three faces

| Face | Token | What it is allowed to say |
|---|---|---|
| **Gulax** | `--font-display` | The wordmark, the field labels, the action, and the reader's home link. Nothing else. One weight — do not ask for a second. |
| **Satoshi** | `--font-sans` | Everything the application actually says: values, chips, titles, verse, metadata. Five masters {300, 400, 500, 700, 900}; `font-synthesis` is off, so those five are all there is. |
| **Monofett** | `--font-count` | Counts. Digits only. A word set in Monofett is a bug. |

## The page

Every screen is the same picture: a **912px column** on a stone ground, with
hairlines ruling a 3 × 3 grid around a white card. The finder is one card; the
reader is the same card with a poem in it. There is no site header — the
wordmark is inside the card, and the reader repeats it as the link home.

Each hairline is drawn exactly once: the top and bottom cells own the
verticals, the flanks own the horizontals, the card owns its own box. Two
elements never paint the same boundary.

## The rules

1. **No magic numbers in components.** Every value in a `*.module.css` or
   component file is a `var(--…)` from the semantic or component layer.
   No hex, no raw px/rem/ms/deg, no raw `cubic-bezier`.
2. **Never reference primitives** (`--stone-900`, `--blue-600`, `--unit`,
   `--curve-*`) outside `tokens.css`. If a role you need doesn't exist,
   that's a token-layer change, reviewed as one.
3. **No new tokens without a derivation.** A spatial token must be n × 4px;
   a type size must be a rounded power of 1.25; a duration must come from the
   five-step set. If your value doesn't derive, the value is wrong — or the
   system is, in which case flag it rather than smuggling it in.
   `--count-size` (26px) is the one size off the scale, and
   [`02-tokens.md`](02-tokens.md#the-count-size) shows why.
4. **Half-steps** exist only at stroke level (1 / 1.5 / 2px borders, the switch
   inset) and at `--space-2-5`. Justify any new member of those classes in
   writing, here.
5. **Color licensing.** Text may only use tokens proven ≥4.5:1 on every
   background they sit on. `--color-text-tertiary` (stone-500) is licensed on
   `--color-surface` (white, 4.83:1) and **not** on `--color-bg` (stone-100,
   4.43:1) — use `--color-text-secondary` there. `--color-grid` and
   `--color-rule` are structurally non-text. Adding a color pair means adding
   its computed ratio to [`02-tokens.md`](02-tokens.md).
6. **Accessibility is load-bearing.** Every interactive element keeps the
   `--focus-ring`; every control is `--target-min` (40px) tall and separated
   from its neighbours by at least `--space-2`, so nothing goes near the
   `--target-dense` (24px) WCAG 2.2 floor; `prefers-reduced-motion` zeroes
   durations *and delays*; semantic HTML before ARIA — the three dropdowns are
   native `<select>`s and the chip fields are `<fieldset>`s of `aria-pressed`
   buttons.
7. **State lives in the URL.** A search is a link. Anything a filter changes
   goes through `setParam`, never into component state.

## Known, deliberately open items

- **Control borders are below 3:1.** `--color-border-input` is `#e5e5e5`
  (1.26:1 on white) and `--color-grid` is stone-300 (1.49:1), both taken
  straight from the design. WCAG 1.4.11 asks for 3:1 on the parts that
  identify a control, so the dropdowns currently rely on their shadow, their
  radius and their caret to read as controls rather than on their stroke.
  Raising `--color-border-input` to about `#949494` would clear 3:1 and is a
  one-token change; it visibly hardens the design, so it is the designer's
  call, not a silent fix.
- Light scheme only; a dark palette would need its own contrast table.
