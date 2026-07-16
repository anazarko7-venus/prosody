# Prosody — design spec

*2026-07-16. Source: the user's brief, verbatim in intent; this doc adds only the
implementation decisions the brief left open. Where they conflict, the brief wins.*

## What it is

A poem finder that indexes how a poem is made, not just what it says. Search by
form, meter, device, theme. Read with the machinery visible. Not a generator,
not a production system — a designed instrument over a small, well-annotated
corpus. Portfolio piece: the repo must be legible in five minutes.

## Shape

Static Next.js site. One JSON file is the entire backend. Deploy to Vercel.

```
/data/poems.json      300 poems, fully annotated, committed
/scripts/annotate.py  run once, offline, never in prod
/app                  Next.js, client-side filter, reader view
```

No database. No API routes. No auth.

**Decisions:**
- Next.js 16 / React 19 / TypeScript, plain CSS — matches the anzr repo's stack.
- `output: 'export'` static export. Poem pages statically generated from the JSON
  at build time (`/poem/[id]`); the index (`/`) filters client-side.
- Own git repo at `projects/prosody/`.

## Corpus

300 poems from PoetryDB, public domain, curated for coverage of the filter
space: enough sonnets, enough free verse, enough anaphora, enough clear voltas,
plus deliberate hard cases (Dickinson, Whitman, Hopkins) — the tool being
visibly wrong about Hopkins is more interesting than the tool being safe.

**Decisions:**
- Curation is scripted-shortlist + editorial pass: a script proposes candidates
  under explicit criteria (author spread, line-count caps of ~4–60 lines with
  Whitman exceptions, form diversity via cheap pre-checks), then the shortlist
  is read and pruned by hand. Criteria live in `scripts/curate.py` so the
  choices are inspectable.
- Era comes from a hand-maintained author→era map (~40 authors) in the scripts;
  PoetryDB has no dates. Buckets: renaissance, seventeenth, eighteenth,
  romantic, victorian, american_19c, modern.

## Annotation (`annotate.py`, run once)

Per poem: id, title, author, lines, meter, per-line stress, rhyme scheme, form,
devices, themes. See the brief for the JSON shape.

**Decisions:**
- **Stress / meter / rhyme** — `pronouncing` (CMU dict), deterministic. Output
  includes per-word syllable/stress alignment per line (not just a stress
  string) so the reader can set marks above the right syllables:
  `scansion: [[{w, s}, …], …]` where `s` is a stress string like `"01"`.
  Meter classified by scoring line stress against templates (iambic pentameter
  / tetrameter / trimeter, trochaic tetrameter, common meter, blank verse via
  rhyme absence, free verse when no template clears threshold). Per-line
  deviations from the winning template are recorded, not smoothed over.
- **Enjambment, anaphora, caesura, refrain** — line-level heuristics:
  terminal-punctuation absence, line-initial n-gram repetition, mid-line
  strong punctuation, whole-line repetition.
- **Volta, themes** — one batched Claude call per poem via `claude -p`
  (headless CLI, uses local auth; no API key to manage), structured JSON out,
  fixed ~30-tag theme vocabulary defined in the script. Several poems per
  invocation to keep run count sane.
- Then the output is read and hand-corrected before commit. This is a curated
  artifact, not a pipeline — the case study says so explicitly.

## Interface

**Search** — filter panel with live counts: form, meter, device, theme, era.
Client-side over the JSON. Zero-result states relax the weakest filter (the one
whose removal restores the most results) and name it.

**Reader** — the actual product. Poem set in serif, whitespace preserved
exactly. One toggle: show the machinery. Off: just the poem. On: stress marks
above each line, deviations from the metrical template flagged, enjambments
traced, the volta marked in the margin with its one-line reason. That toggle is
the portfolio moment; everything else is scaffolding for it.

Restrained throughout — no cards, no shadows, no hero gradient. The poem is the
interface.

## Error handling

- Words missing from the CMU dict: syllable-count fallback (vowel-group count),
  stress marked unknown (`?`) and rendered as unmarked rather than guessed.
- Claude annotation failures: retry once, then leave volta/themes empty and log
  the poem id for the hand pass.
- Zero-result filter states: relax weakest filter, name it in the UI.

## Testing

- `scripts/test_annotate.py`: unit tests for rhyme-scheme extraction, meter
  scoring, and each device heuristic against small fixtures.
- App: production build must pass; reader and filters verified in the browser.
  No JS test suite — the app is a thin view over committed data.

## Build order

1. Pull PoetryDB, curate 300.
2. `annotate.py`, run, hand-correct, commit `poems.json`.
3. Reader view + scansion toggle — beautiful before anything else.
4. Filter panel.
5. Ship.

Skip (v2, none of it photographs): NL query parsing, embeddings, similarity
search, confidence scores, Gutenberg.
