# Token definitions — every derivation shown

*Companion to [`app/tokens.css`](../../app/tokens.css). The rules that govern
use are in [`README.md`](README.md). The source of the values is the Figma
file, [Portfolio → Prosody, node 85:7138](https://www.figma.com/design/GbaOppKpsNi6ZL4VrVCVOO/Portfolio?node-id=85-7138).*

## Layering

| Layer | Contents | Who may reference it |
|---|---|---|
| **Primitives** | palette hexes, alpha primitives, `--unit`, raw easing curves | `tokens.css` only |
| **Semantic** | the named bounded scales (`--space-*`, `--text-*`, `--dur-*`, `--radius-*`, `--stroke-*`, `--opacity-*`, tracking/leading/weights) and role tokens (`--color-*`, `--focus-ring`, `--shadow-control`, `--column`, `--band`, targets) | components |
| **Component** | single-owner dimensions (`--card-pad`, `--control-h`, `--rhyme-rail`, …) | the owning component |

Interpretation note, stated rather than hidden: the named scales (`--space-4`,
`--text-lg`) are the **semantic vocabulary** — the primitive beneath them is
the base unit and the ratio. "Components reference semantic tokens only"
therefore means: **no hex, no raw px/rem/ms/deg, no raw cubic-bezier in any
`*.module.css` or component file.** The one deliberate exception is breakpoint
constants, which CSS cannot tokenize (custom properties are invalid in
`@media`); they are fixed at 480 / 640 and documented in `tokens.css`.

## Spatial system

- **Base unit: 4px** (`0.25rem`). Every spacing, sizing, and layout value is an
  integer multiple, with one exception below.
- **Scale** (named, bounded): 4, 8, **10**, 12, 16, 20, 24, 32, 40, 48, 64
  → `--space-1`, `-2`, `-2-5`, `-3`, `-4`, `-5`, `-6`, `-8`, `-10`, `-12`, `-16`.
- **The half-step, `--space-2-5` (10px).** The design insets a dropdown's value
  and its caret by 10px, not 12. It is the only sub-unit value in the spatial
  scale and it appears in exactly three places: the dropdown's horizontal
  padding, the caret's right offset, and the gap between a chip's word and its
  count. Adding a second half-step needs an argument written here.
- **Em contexts** (inside the verse body, where geometry must ride with the
  type): the unit is **0.25em**. All verse-relative offsets are quarter-em
  multiples.
- **Stroke half-steps**: 1 / 1.5 / 2px borders and the 2px switch inset, as
  before. `--stroke-emphasis` (1.5px) was dropped when nothing used it.

### The page

| Token | Value | Where it comes from |
|---|---|---|
| `--column` | 912px | The Figma card width. 912 = 228 × 4. |
| `--band` | 177px | The Figma grid band above and below the card. Not ÷4 — it is a *remainder*, not a measure: 1024 − 670 (card) = 354, halved. It is a `minmax()` floor that a `1fr` track grows past, so it never sets anything else's rhythm. Under 640px it collapses to `--space-8`. |
| flank | `minmax(0, 1fr)` | 264px at the 1440 artboard; collapses to 0 below 912, at which point the card runs edge to edge and the vertical rules disappear on their own. |

## Type

- **Base 16px, ratio 1.25**, rounded to whole pixels.

| Step | Raw | Rounded | Token | Used for |
|---|---|---|---|---|
| 1.25⁰ | 16.00 | 16px | `--text-md` | chips, dropdown values, list metadata, verse annotations |
| 1.25¹ | 20.00 | 20px | `--text-lg` | field labels, the tagline, list titles, the verse |
| 1.25² | 25.00 | 25px | `--text-xl` | the action, the reader's home link |
| 1.25³ | 31.25 | 31px | `--text-2xl` | the reader title |
| 1.25⁴ | 39.06 | 39px | `--text-3xl` | the wordmark under 640px |
| 1.25⁵ | 48.83 | 49px | `--text-4xl` | the wordmark |

Every one of these is a size the Figma file actually uses (49 / 25 / 20 / 16),
plus the two intermediate rungs the reader needs. The old system's 1.2 ratio
from the paper era is gone; nothing derives from it any more.

### Annotation sizes

Negative powers of the same ratio, em-relative to the verse line so the
machinery scales with the type: 1/1.25 = 0.8 (`--annot-lg`), 1/1.25² = 0.64
(`--annot-md`), 1/1.25³ = 0.512 → 0.51 (`--annot-sm`).

### <a id="the-count-size"></a>The count size

`--count-size` is **26px**, and it is the one size off the scale. It is the
design's own value, and the reason it is not 25px is measurable:

| Face | units/em | cap (digit) height | at its size |
|---|---|---|---|
| Monofett | 2048 | 1370 → 0.669em | 26px → **17.4px** |
| Satoshi | 1000 | 723 → 0.723em | 16px → **11.6px** |

The count is set half again as tall as the caps of the word beside it. That
is what makes it read as a mark stamped onto the chip rather than as a second
word in the sentence. Set at 16px to "match", Monofett's digits come out at
10.7px and read as a footnote; set on the scale at 25px the difference from 26
is under a pixel and not worth a second exception. Measured with `fontTools`
from `public/fonts/`, not eyeballed.

### Weight

Satoshi ships five masters and has no variable axis, so the weight scale is
exactly `{300, 400, 500, 700, 900}` and `font-synthesis` is `none`. The design
sets everything at Medium (500); Regular (400) carries the verse, Bold (700)
the reader title, Black (900) the deviation marks. Gulax has one weight.

### Leading

| Token | Value | Bound to |
|---|---|---|
| `--leading-solid` | 1 | counts, stress marks |
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
| blue-600 | stone-100 | 6.06:1 | AA |
| white | blue-600 (active chip, hovered action) | 6.61:1 | AA |

**The one restriction that follows:** `--color-text-tertiary` and
`--color-text-placeholder` are stone-500 and are licensed **on white only**.
Everything drawn on the stone-100 page ground uses `--color-text-secondary`.
In practice this costs nothing, because all text in the product lives inside
the white card.

### Non-text pairs

| Token | Value | Ratio on white | Role |
|---|---|---|---|
| `--color-grid` | stone-300 `#d6d3d1` | 1.49:1 | the page rules — decorative, no information |
| `--color-rule` | stone-300 | 1.49:1 | section rules inside the card |
| `--color-border-input` | `#e5e5e5` | 1.26:1 | the dropdown stroke |
| `--color-surface-sunk` | stone-100 | 1.09:1 | chip ground |

**Open item — WCAG 1.4.11.** A control's boundary is supposed to reach 3:1
against its surround. `--color-border-input` (1.26:1) does not, and the
dropdowns are currently identified by their shadow, radius and caret instead.
Both values are the design's. Raising `--color-border-input` to roughly
`#949494` clears 3:1 and is a single-token change; it visibly hardens the
design, so it is a decision for the designer rather than a silent fix.
Recorded here so it stays a decision and not an oversight.

## Elevation

One shadow, `--shadow-control: 0 1px 2px rgba(0,0,0,0.10)`, on controls only —
the Figma `Box Shadow/shadow-xs` effect. The card is separated from the ground
by the grid, not by a shadow, which is why there is no `--shadow-sheet`.

## Motion

Durations are the bounded set 120 / 160 / 240 / 320 / 480ms; staggers are
multiples of `--stagger-xs` (20ms). The easing is
`--curve-out: cubic-bezier(0.2, 0, 0, 1)` — it arrives and stops, which is the
right character for a mechanism. `prefers-reduced-motion: reduce` zeroes
durations **and delays**, in `globals.css`, for every element.

## Targets

`--target-min` is **40px** — the height of every control in the design, and
the height every control in the code actually has. Chips and list rows are
separated by at least `--space-2` (8px), so adjacent hit areas never touch.
`--target-dense` (24px) is retained as the WCAG 2.2 AA floor that nothing in
the product may go below; nothing currently approaches it.

The previous system's self-imposed 44px minimum is gone. 40px clears the
WCAG 2.2 AA requirement by 16px; the 44px figure was a house rule, and the
design supersedes it.

## What is deliberately absent

- No dark palette. It would need its own table, above.
- No second radius. `--radius-md` (8px) is every control and chip;
  `--radius-full` is the action; `--radius-sm` is only the focus ring's corner
  and the `kbd` hint.
- No tilt, no paper grain, no `--serif`, no monospace. The paper system's
  metaphors were retired with it, and nothing in this system fakes a texture.
