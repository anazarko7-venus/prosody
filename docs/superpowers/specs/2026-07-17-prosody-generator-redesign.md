# Prosody — generator redesign

*2026-07-17. Amends the 2026-07-16 spec's Interface section. The user's brief:
shift the main view from an index to a generator — only the filtering
mechanisms visible at first, a Find action that produces the poem(s), gamified
and fun; layered, unique visual design with tactful, atypical motion; EB
Garamond in place of Zodiak.*

## The concept: a request slip and a deck

The main view is no longer a list. It is a **request slip** — a layered paper
card on a vignetted desk — where you compose an ask, and a **deck** of 300
poems below it. Pressing **find a poem** riffles the deck and deals one card:
the drawn poem, stamped with its corpus number, opening lines fading out,
with a link into the reader. The full result list exists but is tucked behind
"see the other *n*" on the drawn card. A generator first, an index only on
request.

## The slip

Catalog-request rows, one per facet, mixing control types deliberately:

- **form / meter** — single-select dropdown slots, set in EB Garamond italic
  like blanks in a form. Options carry live counts; zero-count options are
  dimmed and disabled.
- **era** — single-select pill row.
- **using** (devices) — multi-select pills, AND semantics. Selecting sweeps an
  ink fill through the pill.
- **about** (themes) — multi-select dropdown (30 tags is too many for pills);
  chosen themes join the slot label.
- **words** — free keyword entry over title/author. Enter triggers the draw.

Chosen values always stay visible even at zero count, or they could never be
unselected.

Beneath the rows, the ask is read back as a live italic sentence — "a
Shakespearean sonnet, from the Victorians, using anaphora, about death —" —
and the slip's footer holds a rolling **odometer** count ("8 of 300 answer")
and the **find a poem** stamp button. Zero results swap the sentence for the
relaxation line: name the weakest constraint (struck through, clickable to
remove) and how many remain without it. Find is disabled at zero.

## The deck and the draw

The deck's visual thickness tracks the live count — six sheets at 300, one
sheet when the ask is narrow. On find: the sheets riffle in stagger, then the
drawn card is dealt upward out of the deck (rise, settle, slight rotation),
its contents rising in stagger, the corpus-number stamp thumping in last. The
card scrolls itself into view. Draw again deals a different poem — no repeats
until the matching set is exhausted. Changing any filter clears the table and
reassembles the deck.

All motion is CSS-only, cut to near-zero under `prefers-reduced-motion`
(global override, plus the deal timeout collapses to 0ms and scroll becomes
instant).

## Layering

Paper-grain overlay (inline SVG turbulence, multiply) over the whole app;
radial desk vignette; the slip sits over two stray offset sheets, rotated a
third of a degree; card and menus share the same sheet shadow. Palette,
hairlines, and the editor's-pencil accent are unchanged.

## Type

EB Garamond variable (roman + italic, latin + latin-ext subsets,
self-hosted woff2) replaces Zodiak as `--serif` everywhere; General Sans and
the mono tags stay. Reader body bumped ~1.19rem → 1.28rem and weights nudged
for Garamond's smaller x-height.

## State

Filters live in the URL as before (multi facets comma-joined), so an ask is
shareable. The drawn poem is deliberately ephemeral component state — the
draw is a moment, not an address; poems keep their permanent `/poem/[id]`
pages.

## Files

- `components/Finder.tsx` + `Finder.module.css` — replaces `Browse.*`
- `lib/poems.ts` / `lib/data.ts` — `PoemMeta.opening` (first 3 lines) added
  for the card preview
- `app/globals.css` — EB Garamond faces, grain, shared tokens
- Reader crumb now reads "← ask again"
