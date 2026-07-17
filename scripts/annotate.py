#!/usr/bin/env python3
"""Annotate the curated corpus into data/poems.json.

Two passes:
  1. Deterministic (prosody_lib): scansion, meter + deviations, rhyme
     scheme, form, line-level devices.
  2. Claude (`claude -p`, one batched call per few poems): volta and
     themes against a fixed vocabulary. Results cached in
     data/cache/claude_annotations.json so reruns are cheap.

Run once, read the output, fix what's wrong by hand, commit. This is a
curated artifact, not a pipeline.

Usage: python3 scripts/annotate.py [--skip-claude]
"""
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import prosody_lib as P

CORPUS = "data/corpus.json"
OUT = "data/poems.json"
CLAUDE_CACHE = "data/cache/claude_annotations.json"
BATCH = 6

THEME_VOCABULARY = [
    "love", "eros", "loss", "grief", "mortality", "death", "immortality",
    "time", "memory", "youth", "age", "childhood", "nature", "seasons",
    "spring", "winter", "night", "sea", "birds", "god", "faith", "doubt",
    "beauty", "art", "poetry", "war", "freedom", "solitude", "joy",
    "melancholy", "hope", "despair", "home", "sleep", "dreams", "labor",
]

# Hand corrections, applied after the deterministic pass. The classifier
# reads these poems as free verse because their dominant foot is loose,
# but a human scans them without hesitating — so we say so, and let the
# per-line deviations show the looseness honestly.
HAND_METER = {
    "edgar-allan-poe-annabel-lee": "anapestic_tetrameter",
    "lewis-carroll-you-are-old-father-william": "anapestic_tetrameter",
    "robert-louis-stevenson-autumn-fires": "iambic_trimeter",
}

CLAUDE_PROMPT = """You are annotating poems for a prosody index. For each poem below, identify:

1. "volta" — the line where the poem's argument or attention turns, if there is a clear turn. Give the 1-indexed line number (counting every line shown, including blank ones exactly as numbered) and a single terse sentence for "why" describing what turns (e.g. "Turns from cataloguing decay to direct address."). Many poems have no clear volta: use null. Be conservative — only mark a volta you would defend.

2. "themes" — 2 to 4 tags from this fixed vocabulary, no other words allowed:
{vocab}

Reply with ONLY a JSON object mapping poem id to annotation, no prose, no code fences:
{{"<id>": {{"volta": {{"line": N, "why": "..."}} or null, "themes": ["...", "..."]}}}}

Poems:

{poems}"""


def poem_block(p):
    numbered = "\n".join(f"{i + 1}. {l}" for i, l in enumerate(p["lines"]))
    return f'id: {p["id"]}\ntitle: {p["title"]} — {p["author"]}\n{numbered}'


def call_claude(batch):
    prompt = CLAUDE_PROMPT.format(
        vocab=", ".join(THEME_VOCABULARY),
        poems="\n\n---\n\n".join(poem_block(p) for p in batch),
    )
    r = subprocess.run(
        ["claude", "-p", prompt], capture_output=True, text=True, timeout=600
    )
    if r.returncode != 0:
        raise RuntimeError(r.stderr[:500])
    text = r.stdout.strip()
    text = re.sub(r"^```(?:json)?|```$", "", text, flags=re.M).strip()
    start, end = text.find("{"), text.rfind("}")
    return json.loads(text[start:end + 1])


def claude_pass(poems):
    cache = {}
    if os.path.exists(CLAUDE_CACHE):
        cache = json.load(open(CLAUDE_CACHE))
    todo = [p for p in poems if p["id"] not in cache]
    print(f"claude pass: {len(todo)} to annotate, {len(cache)} cached")
    for i in range(0, len(todo), BATCH):
        batch = todo[i:i + BATCH]
        try:
            result = call_claude(batch)
        except Exception as e:  # retry once
            print(f"  batch {i // BATCH}: retrying ({e})")
            try:
                result = call_claude(batch)
            except Exception as e2:
                print(f"  batch {i // BATCH}: FAILED ({e2}) — left for hand pass")
                result = {}
        for p in batch:
            if p["id"] in result:
                cache[p["id"]] = result[p["id"]]
        with open(CLAUDE_CACHE, "w") as f:
            json.dump(cache, f, indent=1)
        done = min(i + BATCH, len(todo))
        print(f"  {done}/{len(todo)}")
    return cache


def validate_claude(ann, poem):
    """Clamp Claude output to the schema; drop anything malformed."""
    out = {"volta": None, "themes": []}
    if not isinstance(ann, dict):
        return out
    v = ann.get("volta")
    if isinstance(v, dict) and isinstance(v.get("line"), int) \
            and 1 <= v["line"] <= len(poem["lines"]) and isinstance(v.get("why"), str):
        out["volta"] = {"line": v["line"], "why": v["why"].strip()}
    themes = ann.get("themes")
    if isinstance(themes, list):
        out["themes"] = [t for t in themes if t in THEME_VOCABULARY][:4]
    return out


def annotate_poem(p, claude_ann):
    lines = p["lines"]
    scansion = [P.scan_line(l) if l.strip() else [] for l in lines]
    stress = [P.line_stress(s) for s in scansion]
    nonblank = [i for i, l in enumerate(lines) if l.strip()]
    meter, devmap, score = P.classify_meter([stress[i] for i in nonblank])
    if p["id"] in HAND_METER:
        meter = HAND_METER[p["id"]]
        devmap, total = {}, 0.0
        for k, i in enumerate(nonblank):
            fit, devs = P.line_fit(stress[i], meter)
            total += fit
            if devs:
                devmap[k] = devs
        score = total / max(len(nonblank), 1)
    # devmap is keyed by non-blank index; re-key to real line index
    deviations = [[] for _ in lines]
    for nb_idx, syls in devmap.items():
        deviations[nonblank[nb_idx]] = syls
    scheme = P.rhyme_scheme(lines)
    form = P.classify_form(lines, scheme, meter)

    # `salient` marks a device doing real work in the poem, not merely
    # present — the filter panel indexes salient devices only, while the
    # reader shows every instance.
    n_lines = len(nonblank)
    devices = []
    enj = P.find_enjambment(lines)
    if enj:
        devices.append({"name": "enjambment", "lines": enj,
                        "salient": len(enj) >= max(3, round(0.25 * n_lines))})
    cae = P.find_caesura(lines)
    if cae:
        devices.append({"name": "caesura", "lines": cae,
                        "salient": len(cae) >= max(3, round(0.25 * n_lines))})
    for a in P.find_anaphora(lines):
        devices.append({"name": "anaphora", **a, "salient": True})
    for r in P.find_refrain(lines):
        devices.append({"name": "refrain", **r, "salient": True})
    alit = P.find_alliteration(lines)
    if alit:
        devices.append({"name": "alliteration", "lines": alit,
                        "salient": len(alit) >= max(3, round(0.3 * n_lines))})

    ann = validate_claude(claude_ann, p)
    if ann["volta"]:
        devices.append({"name": "volta", "line": ann["volta"]["line"],
                        "why": ann["volta"]["why"], "salient": True})

    return {
        "id": p["id"],
        "title": p["title"],
        "author": p["author"],
        "era": p["era"],
        "lines": lines,
        "meter": meter,
        "meter_confidence": round(score, 2),
        "stress": stress,
        "scansion": scansion,
        "deviations": deviations,
        "rhyme_scheme": scheme,
        "form": form,
        "devices": devices,
        "themes": ann["themes"],
    }


def main():
    poems = json.load(open(CORPUS))
    if "--skip-claude" in sys.argv:
        claude = {}
    elif "--cache-only" in sys.argv:
        claude = json.load(open(CLAUDE_CACHE)) if os.path.exists(CLAUDE_CACHE) else {}
    else:
        claude = claude_pass(poems)
    out = [annotate_poem(p, claude.get(p["id"], {})) for p in poems]
    with open(OUT, "w") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
    from collections import Counter
    print(f"\n{len(out)} poems -> {OUT}")
    print("meter:", dict(Counter(p["meter"] for p in out)))
    print("form:", dict(Counter(p["form"] for p in out)))
    no_theme = [p["id"] for p in out if not p["themes"]]
    if no_theme:
        print(f"missing themes ({len(no_theme)}):", no_theme[:10])


if __name__ == "__main__":
    main()
