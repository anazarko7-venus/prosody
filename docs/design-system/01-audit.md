# Design-system audit — Phase 1

*2026-07-21. Scope: `app/globals.css` (187 lines), `components/Finder.module.css` (715),
`components/Reader.module.css` (304), and the four TSX files that consume them.
Nothing is changed by this document; it is the inventory the rebuild is judged against.*

---

## 1. Existing tokens and how consistently they're used

`:root` in `globals.css` defines **14 custom properties** — 11 color, 3 font stacks,
1 easing (`--ease-out`). That is the entire token vocabulary.

**Where they hold up:** color usage is genuinely disciplined. Almost every color in
both modules goes through `var(--…)`; the palette reads as intentional.

**Where they leak:**

| # | Leak | Location |
|---|------|----------|
| 1 | Raw shadow `0 1px 2px rgba(33,30,26,0.06)` — a near-duplicate of the first layer of `--sheet-shadow` (which uses 0.05) | `Finder.module.css:424` |
| 2 | `cubic-bezier(0.16, 1, 0.3, 1)` written out raw **4×**, duplicating `--ease-out` exactly | `Reader.module.css:53,118,151,204` |
| 3 | Bare `ease` used as a second, undeclared easing in ~10 transitions | both modules |
| 4 | Paper-grain SVG data-URI bakes color values (0.55/0.53/0.47) into a filter matrix | `globals.css:109` |

**What has no tokens at all:** spacing, sizing, type sizes, weights, tracking,
line-height, radii, border widths, z-index, durations, delays, breakpoints,
container widths, rotations, opacities. Every one of those is a literal.

---

## 2. Hardcoded values by category

### 2.1 Spacing & sizing

**≈45 distinct spacing/size values** across the two modules. None reference a scale;
sub-pixel rem fractions are common. The full set (px at 16px root):

- Micro paddings/gaps: `0.08, 0.1, 0.16, 0.2, 0.22, 0.3, 0.32, 0.35, 0.4, 0.45, 0.5, 0.55, 0.62 rem` (1.3–9.9px)
- Mid: `0.7, 0.9, 1, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3, 1.4, 1.5, 1.6, 1.7, 1.9 rem` (11.2–30.4px)
- Large: `2, 2.2, 2.4, 2.5, 2.6, 3, 3.2, 4, 6 rem`
- Component dims: `4.2rem` label column, `2.4rem` number column, `12.5×4.6rem` deck, `3.3rem` sheet height, `26×14px` switch, `16/13/15/18rem` menu + input widths, `34rem` card, `44rem` reader, `46rem` stage

Notable **magic couplings** (values that silently depend on other values):

| Coupling | Files | Risk |
|----------|-------|------|
| `.desk { min-height: calc(100dvh - 4.3rem) }` hardcodes the site-header's rendered height | `Finder.module.css:9` ← `globals.css:148` | Header padding changes at the 640px breakpoint; `4.3rem` doesn't follow. Any header edit breaks it invisibly. |
| `.deckLabel { top: calc(100% - 3.3rem + 1.05rem) }` re-states `.sheet { height: 3.3rem }` | `Finder.module.css:446,421` | Same number in two places, no link. |
| JS `setTimeout(…, 620)` in the draw must equal the `dealt` animation's `620ms` | `Finder.tsx:310` ← `Finder.module.css:465` | Cross-language duplicate; nothing enforces it. |
| Reader stagger cap `Math.min(visIdx, 24)` pairs with `22ms` CSS delay step | `Reader.tsx:151` ← `Reader.module.css:153` | Same. |

Also: `body { font-size: 16px }` (`globals.css:93`) pins the root size in px, overriding
the user's browser font-size preference — an accessibility defect as much as a token one.

### 2.2 Type

**25 distinct font sizes.** In px at the 16px root:

> 9.28ᵉᵐ, 9.44, 9.92ᵉᵐ, 10, 10.56, 10.56ᵉᵐ, 10.88, 11, 11.2ᵉᵐ, 11.52, 11.52ᵉᵐ, 13, 13.12ᵉᵐ, 13.44, 16, 17.28, 17.6, 17.92, 18.4, 18.56, 20.48, 22.4, 25.6, clamp(28 → 36.8)

(ᵉᵐ = em-relative annotation sizes in the Reader, resolved against the 20.48px verse line.)

- **No ratio.** Adjacent steps differ by factors between 1.006 (`1.15` vs `1.16rem`) and 1.14. Five sizes live between 17.28 and 18.56px — visually "the same size," specified five ways.
- **Line-heights:** `1, 1.2, 1.45, 1.5, 1.6, 1.75` — actually close to a coherent set already; `1.5` (incant) and `1.45` (base) is the only redundant pair.
- **Weights:** `420, 500, 540, 600, 700`, assigned per component: `.title` is 500 but `.cardTitle` is 540; the reader body is 420. Plausibly intentional optical choices on variable fonts, but recorded nowhere — a future contributor cannot tell 540 from a typo.
- **Tracking:** 7 values (`-0.01, 0.08, 0.09, 0.1, 0.14, 0.16, 0.22em`). The `.tag` class sets `0.08em` but is overridden to `0.22em` in the slip head and `0.14em` on the deck label — same role, three trackings.

### 2.3 Color — contrast (WCAG 2.x, computed, not eyeballed)

Backgrounds in play: `--paper #f5f2ea`, `--paper-card #faf8f1`, `--paper-deep #edeadf`.

| Foreground | on paper | on card | on deep | Verdict for how it's actually used |
|---|---|---|---|---|
| `--ink #211e1a` | 14.84 | 15.62 | 13.78 | AAA everywhere ✓ |
| `--ink-60 #5c574d` | 6.42 | 6.76 | 5.96 | AA ✓, misses AAA (7:1) |
| `--accent #9c3b1e` | 6.14 | 6.46 | 5.70 | AA ✓ (incl. on `--accent-soft` fills: 5.39–5.64) |
| `--ink-40 #8d8779` | **3.20** | **3.36** | **2.97** | **FAILS AA (4.5:1)** — yet used as *text* at 11–13px in ≈15 places: row labels, `.cardMeta`, `.cardBy` era, `.tally`, `.allAuthor`, `.allMeta`, `.deckLabel`, `.fit`/`.scheme`, `.themes`, legend tags, `pillN`/`optN` counts, `.allBtn`. On the `.allRow` hover (paper-deep) it drops below even the 3:1 large-text line. |
| `--ink-25 #bab4a6` | **1.85** | **1.94** | — | **FAILS everything** — used as real text: `.keyword::placeholder`, `.allNum`, `.kbd`, `.rhymeLone` |

Non-text contrast (WCAG 1.4.11, 3:1):

- The keyword input's only boundary is `--hairline` = **1.33:1** — fails; the field edge is essentially invisible to low-vision users.
- Disabled pills at `opacity: 0.32` compute to ~1.5:1 — *exempt* (inactive controls), noted for the record.

**One color, many roles** (semantic overloading — the thing a semantic layer exists to fix):

- `--ink-40`: secondary-ish text **and** hover border-color (`.pill:hover`) **and** disabled text (`.stamp:disabled`)
- `--ink-25`: placeholder text **and** disabled border **and** decorative caret **and** dimmed rhyme letters
- `--accent`: brand text, active borders, focus ring, selection background, volta marker, relaxation affordance
- `--paper-deep`: page-gradient edge **and** hover background **and** stray-sheet fill
- Raw `opacity` as an unnamed state channel: `0.32, 0.35, 0.38, 0.65, 0.7, 0.85, 0.3`

### 2.4 Radii, borders, elevation, z-index, breakpoints

| Category | Values found | Notes |
|---|---|---|
| Radius | `1px` (focus), `2px` (switch, kbd), `3px` (cardNo), `999px` (pill, stamp) | four one-offs, no scale |
| Border width | `1px`, `1.5px` (stamp, cardNo), `2px` (volta, focus ring) | 1.5px is a half-step, unjustified in writing |
| Shadow | `--sheet-shadow` token + 1 raw near-duplicate | see §1 |
| Z-index | `-1` (stray sheets), `2` (card), `40` (menu), `60` (grain) | no scale; grain intentionally sits above menus (texture-over-everything) — nowhere documented |
| Breakpoints | `640px` (globals, Finder), `720px` (Reader), `480px` (Reader) | Finder and Reader disagree about where "mobile" begins. 720 exists specifically so the rhyme-letter rail (`right: -2.6rem`) doesn't overflow the viewport between 640–720 — a real constraint, recorded nowhere. |

### 2.5 Motion

- **18 distinct durations**: 100, 120, 140, 160, 180, 200, 220, 240, 260, 300, 320, 380, 400, 460, 480, 560, 620, 640ms.
- Delay cadences: 70ms card stagger (140/210/290/360/430), 22ms mark stagger, 60ms riffle stagger, 340ms thump delay.
- **12 distinct rotations** (the "editorial tilt" signature): 0.35, 0.4, 0.5, 0.6, 0.7, 0.8, 1.1, 1.6, 2.4, 4, 5, 7deg.
- Good news: no `transition: all` anywhere; transitions list explicit properties; keyframes are reserved for one-shot sequences — the motion *architecture* is right, only the values are lawless.

---

## 3. Accessibility gaps

1. **Keyboard focus destroyed on the search input.** `.keyword:focus { outline: none; box-shadow: none }` (`Finder.module.css:286-290`) out-specifies the global `:focus-visible` ring; keyboard users get only a 1px border-color change on a 1.33:1 hairline. Fails 2.4.7.
2. **ARIA pattern conflict in the dropdowns.** `<details>` + `role="listbox"` + `<button role="option">` (`Finder.tsx:148-168`) mixes the disclosure and listbox patterns: no arrow-key model, no `aria-activedescendant`, no Escape-to-close, no focus return. The native disclosure semantics were fine; the bolted-on listbox roles make it *less* correct. ARIA where semantics already sufficed.
3. **No `<h1>` on the home page.** First heading is the drawn card's `<h2>`; the wordmark is a link, not a heading.
4. **Target sizes.** Pills ≈24px tall, menu options ≈24px, slot buttons ≈26px, stamp ≈31px, machinery toggle ≈18px, kbd-hinted toggle and `.allBtn` are 11px-text buttons. Nothing reaches 44×44; several miss even WCAG 2.2 AA's 24px floor.
5. **Single-key shortcut** `m` (`Reader.tsx:80-87`) with no disable/remap — 2.1.4. (Input fields are guarded, which is necessary but not sufficient.)
6. **Poem excerpt hidden from screen readers.** `.cardLines` has `aria-hidden` (`Finder.tsx:523`) — that's content, not decoration; SR users get a card with no preview.
7. **Label association.** The visible row label "words" is not a `<label for>`; the input relies on `aria-label` duplicating it.
8. **Reduced motion is 90% right** — global duration zeroing + JS checks for the draw timeout and smooth-scroll — but `animation-delay` is not zeroed, so with `backwards` fill the card's children still *appear* in a 430ms drip-feed, and reader marks in a 24×22ms cascade.
9. `title`-attribute-only tooltips on caesura/enjambment glyphs — invisible to keyboard and touch. (Mitigated by the legend; recorded.)
10. Placeholder-and-number text below any legal contrast (see §2.3).

**Working well, for the record:** semantic landmarks (`main/header/nav/article/figure`),
`aria-pressed` on toggles, `aria-live` on the incantation and card, the sr-only tally
duplicate, `tabular-nums` on all counters, `text-wrap: balance` on headings,
`prefers-reduced-motion` honored in JS, `font-synthesis: none`.

---

## 4. Score

| Layer | State |
|---|---|
| Color primitives | Exists, disciplined, but 2 of 7 tones illegal as text |
| Semantic color roles | Absent — primitives used directly, overloaded |
| Space / type / motion / z / radius tokens | Absent entirely |
| Accessibility | Strong instincts, four hard failures (focus, contrast, targets, ARIA misuse) |

The design itself — the manila-paper desk, the tilts, the mono metadata voice — is
coherent and worth preserving exactly. The rebuild's job is to give it a constitution,
not a new face.
