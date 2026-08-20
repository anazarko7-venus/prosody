# Token definitions — every derivation shown

*Companion to [`app/tokens.css`](../../app/tokens.css). The rules that govern
use are in [`README.md`](README.md). The source of the values is the Figma file
`GbaOppKpsNi6ZL4VrVCVOO` ("Portfolio"), frames
[`85:7138`](https://www.figma.com/design/GbaOppKpsNi6ZL4VrVCVOO/Portfolio?node-id=85-7138)
and [`86:7476`](https://www.figma.com/design/GbaOppKpsNi6ZL4VrVCVOO/Portfolio?node-id=86-7476);
where they differ, the later frame wins.*

## Layering

| Layer | Contents | Who may reference it |
|---|---|---|
| **Primitives** | palette hexes, alpha primitives, raw easing curves | `tokens.css` only |
| **Semantic** | the named bounded scales (`--space-*`, `--text-*`, `--dur-*`, `--radius-*`, `--stroke-*`, `--opacity-*`, tracking/leading/weights) and role tokens (`--color-*`, `--focus-ring`, `--shadow-control`, `--column`, `--band`, targets) | components |
| **Component** | single-owner dimensions (`--card-pad`, `--control-h`, `--rhyme-rail`, …) | the owning component |

Interpretation note, stated rather than hidden: the named scales (`--space-4`,
`--text-lg`) are the **semantic vocabulary** — the primitive beneath them is
the base unit and the ratio. "Components reference semantic tokens only"
therefore means: **no hex, no raw px/rem/ms/deg, no raw cubic-bezier in any
`*.module.css` or component file.** The one deliberate exception is breakpoint
constants, which CSS cannot tokenize (custom properties are invalid in
`@media`); they are fixed at 480 / 640 / 960 and documented in `tokens.css`.

### Cascade layers

The stylesheets themselves are ordered by CSS cascade layers, declared once
at the top of `tokens.css`: `@layer base, screens;`. `globals.css` wraps its
reset and element defaults in `base`; every `*.module.css` wraps its rules in
`screens`. Module styles therefore beat globals by *declared* order, never by
link order. Two rules in `globals.css` are deliberately unlayered so they
outrank everything layered: `:focus-visible` (the ring cannot be swallowed by
a component's `box-shadow`) and the `prefers-reduced-motion` block. The
alternative — moving the ring to `outline` — was considered; layers were
chosen because they fix global-versus-module ordering generally, not just for
the ring.

## Spatial system

- **Base unit: 4px** (`0.25rem`). Every spacing, sizing, and layout value is an
  integer multiple, with one exception below.
- **Scale** (named, bounded): 4, 8, **10**, 12, 16, 24, 32, 40, 64, 80
  → `--space-1`, `-2`, `-2-5`, `-3`, `-4`, `-6`, `-8`, `-10`, `-16`, `-20`.
  The scale is bounded *by use*: `--space-5` (20) and `--space-12` (48) were
  declared and never referenced, so they were retired; either re-derives
  (5 × 4, 12 × 4) the day something needs it.
- **The half-step, `--space-2-5` (10px).** The design insets a dropdown's value
  and its caret by 10px, not 12. It is the only sub-unit value in the spatial
  scale and it appears in exactly three places: the dropdown's horizontal
  padding, the caret's right offset, and the gap between a chip's word and its
  count. Adding a second half-step needs an argument written here.
- **Em contexts** (inside the verse body, where geometry must ride with the
  type): the unit is **0.25em**. All verse-relative offsets are quarter-em
  multiples. The scansion staff is the one thing inside the verse that is
  *not* em-based — see below.
- **The staff's two exceptions to that.** `--beat-pitch` (20px, 5 × 4) and
  `--staff-inset` (4px) are rem, not em, even though they live inside the
  verse. They have to be: a beat cell sets its own `font-size` to
  `--annot-md`, so an `em` width would resolve against the mark rather than
  against the verse line the mark describes, and the pitch would silently
  shrink. 20px is the verse's own em at `--text-lg`; under 480px, where the
  verse steps to `--text-md`, `--beat-pitch` steps to 12px (3 × 4) with it.
  Both values are on the 4px unit, so the exception costs the system nothing.
- **Stroke half-steps**: 1 / 1.5 / 2px borders and the 2px switch inset, as
  before. `--stroke-emphasis` (1.5px) was dropped when nothing used it.

### The page

| Token | Value | Where it comes from |
|---|---|---|
| `--column` | 912px | The Figma card width. 912 = 228 × 4. Both cards and the reader use it. |
| `--band` | 117px | The Figma grid band above and below the cards. Not ÷4 — it is a *remainder*, not a measure, and it is only the `min-height` of a `flex: 1` band, so it never sets anything else's rhythm. Under 640px it collapses to `--space-8`. |
| flank | `flex: 1 1 0`, ×2 per side | 132px each at the 1440 artboard. Below 912px they collapse to 0 and the column becomes the page — no media query involved. |

Verticals fall at 132 / 264 / 1176 / 1308. Only the **inner** cell of each
flank pair carries a rule; the boundary next to the column is the column's own
border, so no hairline is painted twice. The shell that enforces this is
[`components/PageShell.tsx`](../../components/PageShell.tsx) — one copy, used
by every screen.

### The cards

| Token | Value | Card |
|---|---|---|
| `--card-pad` | 64px | horizontal inset, both cards (40px under 960, 24px under 640) |
| `--card-pad-top` / `--card-pad-bottom` | 64 / 40px | the asking card, and the reader |
| `--results-pad-top` / `--results-pad-bottom` | 40 / 80px | the answering card |

The asymmetry is the design's: the upper card opens with air above the
wordmark and closes tight under the actions; the lower card mirrors it, tight
under the heading and open at the floor.

Both cards use `--space-10` (40px) between sections. The reader used to sit
at `--space-6` on the argument that a poem's card is one continuous document;
[`96:8637`](https://www.figma.com/design/GbaOppKpsNi6ZL4VrVCVOO/Portfolio?node-id=96-8637)
sets rule-to-head, head-to-rule and rule-to-verse all at 40, and the header
gained a third element (the pill row) that wanted the air. The two cards now
breathe the same.

## Type

- **Base 16px, ratio 1.25**, rounded to whole pixels.

| Step | Raw | Rounded | Token | Used for |
|---|---|---|---|---|
| 1.25⁰ | 16.00 | 16px | `--text-md` | chips, dropdown values, result authors, verse annotations |
| 1.25¹ | 20.00 | 20px | `--text-lg` | field labels, the tagline, result titles, row numbers, the verse |
| 1.25² | 25.00 | 25px | `--text-xl` | the two actions, the reader's home link |
| 1.25³ | 31.25 | 31px | `--text-2xl` | the results heading and its count, the reader title |
| 1.25⁴ | 39.06 | 39px | `--text-3xl` | the wordmark under 640px |
| 1.25⁵ | 48.83 | 49px | `--text-4xl` | the wordmark |

Every one of these is a size the Figma frames actually use (49 / 31 / 25 / 20
/ 16), plus the one intermediate rung the reader needs. The old system's 1.2
ratio from the paper era is gone; nothing derives from it any more.

### Annotation sizes

Negative powers of the same ratio, em-relative to the verse line so the
machinery scales with the type: 1/1.25 = 0.8 (`--annot-lg`), 1/1.25² = 0.64
(`--annot-md`), 1/1.25³ = 0.512 → 0.51 (`--annot-sm`). The stress marks sit
at `--annot-md`, one rung up from where they began — legible without shouting
— and the rhyme letters stay at `--annot-sm`.

### <a id="off-scale-sizes"></a>The off-scale size

One size is not a power of 1.25. It is the design's own value, and it has a
reason that survives being written down. There is one, and a second would want
the same standard of argument — or would mean the scale is wrong rather than
the value.

**`--text-sm` — 14px, the result-row tag.** The rung below 16 on a 1.25 scale
is 12.8 → 13px, which is too small to hold a two-word label inside a 28px
pill without the pill looking empty. 14px is the design's value and the only
place it is used. If a second element ever wants 14px, that is the signal to
re-derive the bottom of the scale rather than to spread the exception.

Two off-scale sizes have been retired rather than kept. `--count-size` (26px)
set the chip count in Monofett until the design moved the count inside the
chip's own text — `Victorian (72)`, one Satoshi run. `--text-row` (18px) set
the result-row title until the row was restyled to a 16px semibold Garamond
title against a Gulax index. Both went out with the elements that justified
them, which is the intended lifecycle for an exception.

### Faces, and who speaks in them

Three faces, each with a job. The rule that decides between the two text
faces is *who is speaking* — see [`README.md`](README.md#the-faces).

| Token | Face | Delivery | Speaks for |
|---|---|---|---|
| `--font-display` | Gulax | self-hosted woff2, 1 weight | the application: wordmark, `search`, `clear`, the results heading, the reader's home link — all lowercase |
| `--font-serif` | EB Garamond | self-hosted variable woff2, 400–800 + italic | the poetry: field labels, poem titles, authors, the tagline, the verse |
| `--font-sans` | Satoshi | self-hosted woff2, 3 masters | the apparatus: dropdown values, chips, result-row tags, metadata about a poem — and the stress marks, which are the machine annotating the verse |

No webfont request leaves the origin.

### Weight

The token set lists only weights a shipped face actually renders. Satoshi is
a static-master family with no variable axis; the shipped set is exactly
`{400, 500, 700}` and `font-synthesis` is `none`, so an unlisted weight would
silently clamp rather than render. Medium (500) is the default for both text
faces — Satoshi's controls and Garamond's labels alike. Regular (400) carries
the verse, the authors and the tagline. Bold (700) is the stressed beat: the
machinery's `/` marks and its deviations, fetched only when the machinery
opens. Gulax has one weight. Light (300) and Black (900) were retired with
their files — nothing spoke at 300, and 900 was being asked of EB Garamond
(which caps at 800) and silently clamping.

`--weight-semibold` (600) is the one weight outside Satoshi's set. EB Garamond
is a variable face spanning 400–800, so it can reach 600 honestly where Satoshi
would have to synthesise it; the result-row title is the only thing set there,
to separate it from the 400 author beside it at the same 16px. It is licensed
for `--font-serif` only — asking Satoshi for 600 is a bug, and with
`font-synthesis: none` it will simply render at 500.

### Leading

| Token | Value | Bound to |
|---|---|---|
| `--leading-solid` | 1 | stress marks |
| `--leading-tight` | 1.3 | the design's own leading — every display size and every control |
| `--leading-ui` | 1.5 | ≤20px running UI text |
| `--leading-verse` | 1.75 | the reader body |

## Color

Measured with the WCAG 2.x relative-luminance formula. **A pair not in this
table is not licensed.**

### Text pairs

| Foreground | Ground | Ratio | Verdict |
|---|---|---|---|
| stone-900 `#1c1917` | white | 17.49:1 | AAA |
| stone-900 | stone-100 `#f5f5f4` | 16.03:1 | AAA |
| stone-900 | stone-200 `#e7e5e4` (pressed chip) | 13.93:1 | AAA |
| stone-600 `#57534e` | white | 7.63:1 | AAA |
| stone-600 | stone-100 | 6.99:1 | AAA |
| stone-500 `#78716c` | white | 4.80:1 | AA |
| stone-500 | stone-100 | **4.40:1** | **fails AA** |
| blue-600 `#0040ff` | white | 6.61:1 | AA |
| stone-400 `#a8a29e` | white | **2.52:1** | **exempt, decorative only** |
| blue-600 | stone-100 | 6.06:1 | AA |
| white | blue-600 (active chip, hovered action) | 6.61:1 | AA |
| stone-900 | mint-100 `#d9fff2` (the staff) | 16.27:1 | AAA |
| stone-600 | mint-100 | 7.10:1 | AAA |
| stone-500 | mint-100 | **4.46:1** | **fails AA** |
| blue-600 | mint-100 | 6.15:1 | AA |
| stone-900 | callout ground `#e6ecff` | 14.83:1 | AAA |
| stone-600 | callout ground | 6.47:1 | AAA |
| stone-500 | callout ground | **4.07:1** | **fails AA** |
| blue-600 | callout ground | 5.60:1 | AA |

**The one restriction that follows:** `--color-text-tertiary` and
`--color-text-placeholder` are stone-500 and are licensed **on white only**.
Everything drawn on the stone-100 page ground uses `--color-text-secondary`,
and so does everything drawn on the two machinery grounds — stone-500 misses
AA on all three. This is why the staff's `.soft` beat (a syllable read from
the meter rather than heard in the word) is stone-600 set at
`--weight-regular` rather than stone-500 set at medium: on mint the hierarchy
has to be carried by weight, because the ink it used to be carried by is not
licensed there.

### <a id="the-third-hue"></a>The third hue

`--mint-100: #d9fff2` is the palette's only cool colour and its only addition
since the warm-grey-plus-blue system was set. It is the design's own value
([`96:8637`](https://www.figma.com/design/GbaOppKpsNi6ZL4VrVCVOO/Portfolio?node-id=96-8637))
and it earns a hue of its own because it names a *speaker*, the same way the
three faces do:

| Hue | Role token | What it says |
|---|---|---|
| warm grey | `--color-bg`, `--color-surface`, the rules | the page |
| blue-600 | `--color-action`, `--color-callout-ground` | the poem's own move — the search, the turn |
| mint-100 | `--color-machinery-ground` | the machine's annotation, laid over the poem |

`--color-callout-ground` is not a fourth colour: it is `--blue-alpha-10`,
blue-600 at 10% on the card, which composites to `#e6ecff`. Keeping the volta
in the action's family and the scansion out of it is the whole point — the
reader can tell at a glance which marks are the poem's and which are the
machine's.

Both grounds are non-text surfaces on white (mint 1.07:1, callout 1.18:1).
Neither identifies a control, so WCAG 1.4.11 does not apply; each is read as
a region, and each region's meaning is also carried by its text.

### Non-text pairs

| Token | Value | Ratio on white | Role |
|---|---|---|---|
| `--color-grid` | stone-300 `#d6d3d1` | 1.49:1 | the page rules — decorative, no information |
| `--color-rule` | stone-300 | 1.49:1 | section rules inside the card |
| `--color-border-input` | stone-200 `#e7e5e4` | 1.26:1 | the dropdown stroke (was `#e5e5e5`, a stray cool grey sub-JND from stone-200; collapsed into the stone ramp) |
| `--color-border-tag` | stone-200 `#e7e5e4` | 1.26:1 | the result-row form/meter tags |
| `--color-border-ghost` | stone-100 `#f5f5f4` | 1.09:1 | the `clear` action's outline |
| `--color-surface-sunk` | stone-100 | 1.09:1 | chip ground |
| `--color-machinery-ground` | mint-100 `#d9fff2` | 1.07:1 | the scansion staff's band |
| `--color-callout-ground` | `--blue-alpha-10` over white → `#e6ecff` | 1.18:1 | the volta callout's note |

**Open item — WCAG 1.4.11.** A control's boundary is supposed to reach 3:1
against its surround. None of the four strokes above do. The dropdowns are
identified by their shadow, radius and caret; the tags by their fill-free
pill shape; and the `clear` action — whose outline at 1.09:1 is effectively
invisible — by its word alone. Every value is the design's. Raising
`--color-border-input` and `--color-border-ghost` to roughly `#949494` clears
3:1 and is a two-token change; it visibly hardens the design, so it is a
decision for the designer rather than a silent fix. **Decided August 2026:
the borders stay soft.** Recorded here so it stays a decision and not an
oversight.

## Elevation

One shadow, `--shadow-control: 0 1px 2px rgba(0,0,0,0.10)`, on controls only —
the Figma `Box Shadow/shadow-xs` effect. The card is separated from the ground
by the grid, not by a shadow, which is why there is no `--shadow-sheet`.

## Motion

Two curves, each with a role:

- `--curve-out: cubic-bezier(0.2, 0, 0, 1)` → `--ease-out`. **Entrances** —
  things arriving: the marks, the results card. It arrives and stops, the
  right character for a mechanism.
- `--curve-std: cubic-bezier(0.2, 0, 0.2, 1)` → `--ease-std`. **Reversible
  state changes** — hover, press, border and color tints. It is `--curve-out`
  with its exit softened to mirror its entry, kin by construction, so the
  same motion reads well run in either direction. (It replaced the keyword
  `ease`, which encoded no decision.)

Durations are the bounded set 120 / 160 / 240 / 320 / 480ms, each with a job:

| Token | Value | Job |
|---|---|---|
| `--dur-fast` | 120ms | press feedback — the 1px settle every pressable element shares |
| `--dur-quick` | 160ms | color, border and background state changes |
| `--dur-base` | 240ms | entrances and exits: the marks, the results card |
| `--dur-gentle` | 320ms | the poem opening and closing; the volta rule |
| `--dur-slow` | 480ms | the machinery exit's total budget — `Reader.tsx` reads it for the unmount timer, so the choreography and the timer cannot drift apart |

Staggers are multiples of `--stagger-xs` (20ms); the machinery entrance
staggers per line, capped at 24 steps (480ms — the same budget as the exit).

The machinery's governing principle: **enter with character, exit with
efficiency.** Entering, the marks and rhyme letters stagger in line by line
while the poem opens. Leaving, everything fades together with no stagger over
`--dur-base` while the lines close over `--dur-gentle`; the marks stay
mounted through a `closing` phase and unmount when the `--dur-slow` budget
ends. Under `prefers-reduced-motion` the closing phase is skipped entirely.

Interaction states, uniformly: every `:hover` rule sits inside
`@media (hover: hover)` so touch never sticks in a hover; every pressable
element answers `:active` with the same 1px settle (`translate: 0
var(--stroke-hairline)`, `--dur-fast`); a visited result row's title dims to
`--color-text-secondary` — already read. `prefers-reduced-motion: reduce`
zeroes durations **and delays**, unlayered in `globals.css`, for every
element.

## Targets

`--target-min` is **40px** — the height of every control in the design, and
the height every control in the code actually has. Chips and list rows are
separated by at least `--space-2` (8px), so adjacent hit areas never touch.
The WCAG 2.2 AA floor of 24px is a rule of the system, not a token — nothing
referenced the old `--target-dense`, so the constant lives here and in the
README rather than in `var()` space. Nothing in the product approaches it.

The previous system's self-imposed 44px minimum is gone. 40px clears the
WCAG 2.2 AA requirement by 16px; the 44px figure was a house rule, and the
design supersedes it.

## What is deliberately absent

- No dark palette. It would need its own table, above.
- No second radius. `--radius-md` (8px) is every control and chip;
  `--radius-full` is the action; `--radius-sm` is only the focus ring's corner
  and the `kbd` hint.
- No tilt, no paper grain, no monospace. The paper system's metaphors were
  retired with it, and nothing in this system fakes a texture. EB Garamond
  returned, but as a working face with a defined job — not as nostalgia.
