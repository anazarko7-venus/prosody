# The Prosody design system — rules for staying inside it

Read this before touching any `*.css` or component file. The full derivations
are in [`02-tokens.md`](02-tokens.md); the audit that made this necessary is
[`01-audit.md`](01-audit.md). Tokens live in [`app/tokens.css`](../../app/tokens.css).

## The three numbers

- **Base unit: 4px** (`0.25rem`). Inside em contexts (the verse body), 0.25em.
- **Type ratio: 1.2** (minor third) from a 16px base, rounded to whole pixels.
- **Breakpoints: 480 / 640 / 720** — the only raw px values allowed in
  components, because CSS can't tokenize `@media`.

## The rules

1. **No magic numbers in components.** Every value in a `*.module.css` or
   component file is a `var(--…)` from the semantic or component layer.
   No hex, no raw px/rem/ms/deg, no raw `cubic-bezier`.
2. **Never reference primitives** (`--ink-900`, `--paper-100`, `--unit`,
   `--curve-*`) outside `tokens.css`. If a role you need doesn't exist,
   that's a token-layer change, reviewed as one.
3. **No new tokens without a derivation.** A spatial token must be n × 4px;
   a type size must be a rounded power of 1.2; a duration must come from the
   six-step set. If your value doesn't derive, the value is wrong — or the
   system is, in which case flag it rather than smuggling it in.
4. **Half-steps** exist only for stroke-level values (1 / 1.5 / 2px borders,
   the switch inset). Justify any new member of that class in writing, here.
5. **Color licensing.** Text may only use tokens proven ≥4.5:1 on every
   background they sit on (`--color-text`, `-secondary`, `-tertiary`,
   `-placeholder`, `--color-accent`). `--ink-400` and `--ink-250` are
   structurally non-text; disabled text rides the WCAG inactive exemption.
   Adding a color pair means adding its computed ratio to `02-tokens.md`.
6. **Accessibility is load-bearing.** Every interactive element keeps the
   `--focus-ring`; coarse pointers get `--target-min` (44px) hit areas and
   nothing goes below `--target-dense` (24px); `prefers-reduced-motion`
   zeroes durations *and delays*; semantic HTML before ARIA — the dropdowns
   are native `<details>` disclosures on purpose.
7. **Tilts and staggers are tokens too.** Static tilt = step × `--tilt-factor`;
   keyframe poses may negate or sum two steps. Staggers are multiples of 20ms.
8. **Cross-language constants** (`DEAL_MS`, the stagger cap) exist in exactly
   two places, each side commented with a pointer to the other. Change both
   or neither.

## Known, deliberately open items

- Light scheme only; a dark palette would need its own contrast table.

## Resolved constraints (were open, now closed)

- **Every interactive control clears `--target-min` (44px) on any pointer** —
  pills, menu options, slot buttons, the keyword field, and result rows, not
  just coarse pointers. The `--space-2` gaps in the chip grid and result list
  keep adjacent hit areas from touching. `--target-dense` (24px) survives only
  as the reader toggle's baseline height.
- **The reader's `m` shortcut is WCAG 2.1.4-compliant** via "active only on
  focus": it fires only while reading — when the document body holds focus —
  and goes inactive the instant any control (link, button, field) is focused,
  so it can never intercept a keystroke meant for something else. The visible
  machinery toggle is the always-available, fully keyboard-operable path.
