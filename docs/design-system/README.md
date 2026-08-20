# The Prosody design system — rules for staying inside it

Read this before touching any `*.css` or component file. The full derivations
and the contrast table are in [`02-tokens.md`](02-tokens.md); tokens live in
[`app/tokens.css`](../../app/tokens.css).

The system is the one drawn in Figma, file `GbaOppKpsNi6ZL4VrVCVOO`
("Portfolio"), page "Template":

- [`85:7138` — Prosody](https://www.figma.com/design/GbaOppKpsNi6ZL4VrVCVOO/Portfolio?node-id=85-7138), the finder at rest
- [`86:7476` — Prosody List](https://www.figma.com/design/GbaOppKpsNi6ZL4VrVCVOO/Portfolio?node-id=86-7476), the finder after search

Where the two disagree, the later frame wins: `86:7476` moved the field
labels, the tagline and the titles from Gulax and Satoshi to EB Garamond,
lowercased the wordmark and the actions, added the `clear` action, and split
the results into their own card. Where this document and Figma disagree, Figma
is right and this document is stale — fix it here.

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
- **Breakpoints: 480 / 640 / 960** — the only raw px values allowed in
  components, because CSS can't tokenize `@media`. 480 hides the rhyme rail
  and steps the verse down; 640 is the compact layout; 960 (≈ the 912px
  column plus its hairlines) loosens the finder's field grid to two-up and
  drops the card insets a step.

## <a id="the-faces"></a>The three faces

Each face has a job, and the jobs are about *who is speaking*.

| Face | Token | What it is allowed to say |
|---|---|---|
| **Gulax** | `--font-display` | The application speaking: the wordmark, the two actions, the results heading, the reader's home link. Nothing else. One weight — do not ask for a second. Set lowercase, as the design sets it. |
| **EB Garamond** | `--font-serif` | The poetry speaking: the verse itself, and everything that names a property of a poem — field labels (`Form:`, `Era:`), poem titles, authors. Self-hosted variable, 400–800. |
| **Satoshi** | `--font-sans` | The apparatus: control values, chips, result-row tags, metadata *about* a poem — and the stress marks, which are the machine annotating the verse. Three shipped masters {400, 500, 700}; `font-synthesis` is off, so those three are all there is. |

Monofett was a fourth face, setting counts as stamped slabs. It lost its last
job when the chip count moved inline (`Victorian (72)`, one Satoshi run) and
the result-row index moved to Gulax, and was retired — token, `@font-face` and
woff2 together. Gulax now carries the index, which keeps the ordinal in the
application's own voice rather than in a face of its own.

The line to hold: **Garamond labels the material, Satoshi labels the machine.**
"Form:" is Garamond because it names something the poem has. "rhymed stanzas"
on a result-row tag is Satoshi because it is the index reporting. When you add
a string, ask which of the two it is.

## The page

Every screen is the same picture: a **912px column** on a stone ground, ruled
by hairlines, holding one or more white cards. The finder is two cards — the
upper asks, the lower answers — and the reader is one card with a poem in it.
There is no site header: the wordmark is inside the card, and the reader
repeats it as the link home.

The column sits between two **two-cell flanks**, so at 1440 the verticals fall
at 132 / 264 / 1176 / 1308. Below 912px the flanks collapse to zero on their
own — no media query — and the column becomes the page.

The whole shell lives in [`components/PageShell.tsx`](../../components/PageShell.tsx)
and its stylesheet. **Screens must not re-implement it.** `<Band />` is empty
ruled ground, `<Row>` is a card row, and `shellColumn` is the class that makes
an element the card. Each hairline is drawn exactly once — only the inner cell
of each flank pair rules, because the column's own border draws the boundary
beside it — and that invariant only survives if there is one copy of it.

## The cascade

Two named layers, declared once at the top of `tokens.css`: `base` (the reset
and element defaults, in `globals.css`) and `screens` (every component
module). Later beats earlier by declaration, so no rule's fate depends on
stylesheet link order. Two invariants stay **unlayered** in `globals.css` —
`:focus-visible` and the `prefers-reduced-motion` block — because unlayered
styles beat every layered one: no component rule can swallow the focus ring
or reintroduce motion, by construction. New global rules go inside
`@layer base`; new module files wrap their rules in `@layer screens`.

Fragments both screens draw — the section rule, the sr-only clip, the Gulax
base — live once, in `components/shared.module.css`.

## The rules

1. **No magic numbers in components.** Every value in a `*.module.css` or
   component file is a `var(--…)` from the semantic or component layer.
   No hex, no raw px/rem/ms/deg, no raw `cubic-bezier`.
2. **Never reference primitives** (`--stone-900`, `--blue-600`, `--curve-*`)
   outside `tokens.css`. If a role you need doesn't exist, that's a
   token-layer change, reviewed as one.
3. **No new tokens without a derivation.** A spatial token must be n × 4px;
   a type size must be a rounded power of 1.25; a duration must come from the
   five-step set. If your value doesn't derive, the value is wrong — or the
   system is, in which case flag it rather than smuggling it in. One size sits
   off the type scale on purpose — `--text-sm` (14px) — and
   [`02-tokens.md`](02-tokens.md#off-scale-sizes) shows why. There is one, and
   a second needs the same standard of argument.
4. **Half-steps** exist only at stroke level (1 / 1.5 / 2px borders, the switch
   inset) and at `--space-2-5`. Justify any new member of those classes in
   writing, here.
5. **Color licensing.** Text may only use tokens proven ≥4.5:1 on every
   background they sit on. `--color-text-tertiary` (stone-500) is licensed on
   `--color-surface` (white, 4.80:1) and **not** on `--color-bg` (stone-100,
   4.40:1) — use `--color-text-secondary` there. `--color-grid`,
   `--color-rule`, `--color-border-tag` and `--color-border-ghost` are
   structurally non-text. `--color-text-index` (stone-400, 2.52:1 on white) is
   the one text token below the floor: it sets the result-row ordinal, which is
   `aria-hidden` decoration duplicating the row's position, so it is exempt
   rather than licensed. It may not be used for anything a reader must read. Adding a color pair means adding
   its computed ratio to [`02-tokens.md`](02-tokens.md).
6. **Accessibility is load-bearing.** Every interactive element keeps the
   `--focus-ring` (enforced structurally: the ring is unlayered, see *The
   cascade*); every control is `--target-min` (40px) tall and separated
   from its neighbours by at least `--space-2`, so nothing goes near the
   24px WCAG 2.2 AA floor; `prefers-reduced-motion` zeroes durations *and
   delays*; semantic HTML before ARIA — the three dropdowns are native
   `<select>`s and the chip fields are `<fieldset>`s of `aria-pressed`
   buttons.
7. **State lives in the URL.** A search is a link. Anything a filter changes
   goes through `setParam`, never into component state.

## Known, deliberately open items

- **Control borders are below 3:1.** `--color-border-input` is stone-200
  (1.26:1 on white), `--color-grid` is stone-300 (1.49:1), `--color-border-tag`
  is stone-200 (1.26:1), and `--color-border-ghost` — the `clear` action's
  outline — is stone-100 (1.09:1), effectively invisible. All four are the
  design's own values. WCAG 1.4.11 asks for 3:1 on the parts that identify a
  control, so the dropdowns rely on their shadow, radius and caret, and the
  ghost action relies on its word. Raising `--color-border-input` and
  `--color-border-ghost` to about `#949494` would clear 3:1 and is a two-token
  change; it visibly hardens the design. **Decided August 2026: the borders
  stay soft.** The item stays recorded so the trade-off stays a decision.
- Light scheme only; a dark palette would need its own contrast table.
