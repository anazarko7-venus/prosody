# Token definitions — Phase 2, every derivation shown

*Companion to [`app/tokens.css`](../../app/tokens.css). The audit that motivated
each decision is [`01-audit.md`](01-audit.md).*

## Layering

| Layer | Contents | Who may reference it |
|---|---|---|
| **Primitives** | palette hexes, alpha primitives, `--unit`, raw easing curves | `tokens.css` only |
| **Semantic** | the named bounded scales (`--space-*`, `--text-*`, `--dur-*`, `--z-*`, `--radius-*`, `--tilt-*`, `--stroke-*`, `--opacity-*`, tracking/leading/weights) and role tokens (`--color-*`, `--focus-ring`, `--shadow-*`, containers, targets) | components |
| **Component** | single-owner dimensions (`--menu-w`, `--deck-sheet-h`, …) | the owning component |

Interpretation note, stated rather than hidden: the named scales (`--space-4`,
`--text-lg`) are treated as the **semantic vocabulary** — the primitive beneath
them is the base unit and the ratio. "Components reference semantic tokens only"
therefore means: **no hex, no raw px/rem/ms/deg, no raw cubic-bezier in any
`*.module.css` or component file.** The one deliberate exception is breakpoint
constants, which CSS cannot tokenize (custom properties are invalid in `@media`);
they are fixed at 480 / 640 / 720 and documented in `tokens.css`.

## Spatial system

- **Base unit: 4px** (`0.25rem`). Every spacing, sizing, and layout value is an
  integer multiple.
- **Scale** (named, bounded): 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96
  → `--space-1…24` (name = multiple of the unit).
- **Em contexts** (inside the verse body, where geometry must ride with the type):
  the unit is **0.25em**. All verse-relative offsets are quarter-em multiples.
- **Half-steps**: exactly one class is justified in writing — *stroke-level*
  values: border widths (1 / 1.5 / 2px) and the switch knob inset (2px). At
  16px-control scale, a 4px inset leaves no travel and a 4px-equivalent border
  overwhelms 11px caps. Nothing else may use sub-unit values.

**Layout grid.** This is a single-column reading instrument; inventing a 12-column
grid nothing uses would be fiction, so the grid is declared as what it is:

| Token | Value | ÷4 |
|---|---|---|
| Column count | 1 content column + annotation rail (rhyme letters) | — |
| Internal label grid | `--label-col-w` 64px + 1fr, gap `--space-4` 16px | ✓ |
| Gutter | `--gutter` 32px, 20px compact | ✓ |
| `--container-sheet` | 544px (34rem) | 136 |
| `--container-prose` | 704px (44rem) | 176 |
| `--container-stage` | 736px (46rem) | 184 |
| Breakpoints | 480 / 640 / 720 | 120 / 160 / 180 |

Three breakpoints survive review: 480 hides the rhyme rail, 640 is the compact
layout switch, and 720 exists because between 640–720px the rail
(`right: -2.5rem`) would overflow the viewport. Previously Finder and Reader
disagreed silently; now each is named and justified.

## Type scale — base 16px, ratio 1.2 (minor third)

Chosen over 1.25 because the existing UI voice lives at the small end: 1.2
reproduces the current 11/13/16 metadata–UI trio exactly, and lands one step
(19px) in the middle of the five-way serif cluster (17.28–18.56px) it replaces.

| Token | Raw (16 × 1.2ⁿ) | Rounded | rem | Replaces (audit sizes) |
|---|---|---|---|---|
| `--text-2xs` | 11.11 | **11** | 0.6875 | 9.44, 10, 10.56, 10.88, 11, 11.52 |
| `--text-xs` | 13.33 | **13** | 0.8125 | 13, 13.44 |
| `--text-md` | 16.00 | **16** | 1 | 16 |
| `--text-lg` | 19.20 | **19** | 1.1875 | 17.28, 17.6, 17.92, 18.4, 18.56, 20.48 |
| `--text-xl` | 23.04 | **23** | 1.4375 | 22.4, 25.6 |
| `--text-2xl` | 27.65 | **28** | 1.75 | clamp min 28 |
| `--text-3xl` | 33.18 | **33** | 2.0625 | clamp max 36.8 |

Annotation sizes (scansion marks, rhyme letters, sub-glyphs) are **negative
powers of the same ratio**, em-relative to the verse line so they scale with it:

| Token | Raw | Rounded |
|---|---|---|
| `--annot-lg` | 1/1.2 = 0.8333em | 0.83em |
| `--annot-md` | 1/1.2² = 0.6944em | 0.69em |
| `--annot-sm` | 1/1.2³ = 0.5787em | 0.58em |

**Notable remaps** (visible, intentional): the reader body 20.48 → 19px (−1.5px;
measure and leading absorb it), card title 25.6 → 23px, display max 36.8 → 33px.
25 sizes become 7 + 3 annotation steps.

**Per-step rules** (not per-component):

| Step | Face | Weight | Tracking | Leading |
|---|---|---|---|---|
| 2xl–3xl display | serif | 500 `--weight-display` | −0.01em | 1.2 |
| xl headings | serif | 540 `--weight-heading` (+40 optical bump below 28px) | −0.01em | 1.2 |
| lg verse | serif | 420 `--weight-verse` | 0 | 1.75 verse / 1.6 excerpt / 1.45 as UI |
| md/xs sans UI | sans | 400 | 0 | 1.45 |
| 2xs metadata | mono | 400 (700 for deviation marks) | 0.08em (0.16em emphasized) | 1.45 |

The root is `font-size: 100%` (was `16px`) — the scale now respects the user's
browser font-size setting; 4px-grid alignment holds at the default setting.

## Color — roles, and the proofs

Palette change is minimal and surgical: two tones that were illegal as text get
darker replacements on the same warm axis (interpolated toward `--ink-900`);
everything else is untouched.

| Primitive | Hex | on paper-200 | on paper-100 | on paper-300 | Licensed for |
|---|---|---|---|---|---|
| `--ink-900` | #211e1a | **14.84** | 15.62 | 13.78 | any text — AAA |
| `--ink-700` *(new; was #5c574d @ 6.42)* | #565148 | **7.04** | 7.41 | 6.54 | secondary text — AAA on bg/surface, AA on recessed |
| `--ink-500` *(new; replaces #8d8779 as text)* | #6d685d | **4.95** | 5.22 | 4.60 | tertiary + placeholder text — AA everywhere incl. hover rows |
| `--ink-400` | #8d8779 | 3.20 | 3.36 | 2.97 | **non-text only**: input boundaries, hover borders (≥3:1 on bg/surface ✓) |
| `--ink-250` | #bab4a6 | 1.85 | — | — | decorative strokes, disabled borders only — never text |
| `--rust-600` | #9c3b1e | **6.14** | 6.46 | 5.70 | accent text/borders — AA at any size (5.39–5.64 on its own soft fill ✓) |

Fixes this licensing forces (Phase 3): all fifteen former `--ink-40`-as-text
sites → `--color-text-tertiary`; placeholder, list numbers, kbd → tertiary; the
keyword input's boundary hairline (1.33:1) → `--color-border-input` (3.20:1);
soft scansion marks stop using `opacity: 0.38` as their channel and use
`--color-text-tertiary` at full opacity (4.60:1+) instead — the faint/firm/dev
hierarchy survives as tertiary/secondary/accent-bold. Disabled controls keep
low contrast under WCAG's inactive-component exemption, tokenized as
`--opacity-disabled`.

AAA where feasible, honestly scored: primary text AAA everywhere; secondary AAA
on bg and surface (6.54 on recessed hover rows — AA); accent and tertiary are AA.
Pushing accent to 7:1 (#8f361c) was tried and rejected — it visibly deadens the
brand rust for a gain no body copy needs (accent never sets long-form text).

## Radii, strokes, elevation, z-index, opacity

| Scale | Values | Mapping notes |
|---|---|---|
| `--radius-*` | 2, 4, 999 | focus ring 1→2; cardNo plate 3→2 (stamp voice is crisp) |
| `--stroke-*` | 1, 1.5, 2 | the justified half-step class, see above |
| `--shadow-*` | paper (0 1px 2px @5%), sheet (paper + 0 6px 18px @7%) | the raw `.sheet` shadow (@6%) folds into `--shadow-paper` |
| `--z-*` | behind −1, raised 1, popover 10, texture 20 | grain deliberately above popovers; card 2→raised, menu 40→popover, grain 60→texture |
| `--opacity-*` | 0.3 texture, 0.4 disabled, 0.65 muted, 0.85 strong | 0.32/0.35→disabled; 0.38 soft-marks retired (color channel now); 0.7→0.65; grain 0.3 ✓ |

## Motion

- **Durations** (bounded, six): 120 / 160 / 240 / 320 / 480 / 640ms.
  Mapping: 100→120, 140·180→160, 200·220·260→240, 300·380·400→320, 460·560→480,
  620→640. Eighteen durations become six.
- **Staggers**: multiples of 20ms — `--stagger-xs` 20 (marks; was 22),
  `--stagger-sm` 60 (riffle), `--stagger-md` 80 (card reveal cadence; was 70).
  Card children enter at n × 80ms, n = 2…6; the thump lands at 4 × 80.
- **Easings**: `--ease-out` (the existing signature curve) and `--ease-std`;
  the four raw `cubic-bezier` duplicates in Reader die.
- **Tilt** (the desk's signature, now lawful): `--tilt-1…4` = 0.4 / 0.8 / 1.6 /
  4deg, static uses multiplied by `--tilt-factor` (1 desktop, 0.5 compact —
  which reproduces the previous hand-tuned mobile softening). Keyframe poses may
  negate or **sum two steps**: riffle −2.4 = −(1.6+0.8), cardNo rest 4.8 = 4+0.8,
  thump pose −5.6 = −(4+1.6) (was −7). Twelve rotations become four steps + one rule.
- **Cross-language couplings named**: `--dur-deal` ↔ `DEAL_MS = 640` in
  `Finder.tsx`; the reader's stagger cap (24) ↔ `--stagger-xs`. Each side
  carries a comment pointing at the other.

## Accessibility constraints carried by tokens

- `--focus-ring` on **every** interactive element; no component may zero it
  (the search input's `box-shadow: none` reset is removed).
- `--target-min` 44px on **every** interactive control, on any pointer: the
  stamp, pills, menu options, slot buttons, the keyword field, and result rows.
  The `--space-2` gaps in `.pills` and the result list keep adjacent hit areas
  from touching. `--target-dense` 24px remains only as the reader toggle's
  baseline height (the toggle sits inline in prose where 44px would break the
  line box; it reaches 44px on coarse pointers).
- Reader `m` shortcut, WCAG 2.1.4 — resolved by "active only on focus" scoped
  to the reading context: the global keydown handler fires only when
  `document.activeElement` is the document body (the plain reading state) and
  returns early once any interactive control holds focus, so it can't hijack a
  keystroke meant for a link, button, or field. No `tabindex`/auto-focus is
  used (an earlier region-focus variant was dropped: focus rarely stays on a
  container, and programmatic focus painted an unwanted focus ring).
- Reduced motion: durations **and delays** zeroed (delays were the audit's gap 8).
- `color-scheme: light` retained; the palette has no dark variant yet.
