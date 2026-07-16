#!/usr/bin/env python3
"""Curate 300 poems from the PoetryDB cache into data/corpus.json.

The selection is a curated artifact: ANCHORS are hand-picked canonical
poems (verified present in PoetryDB), quotas and caps below shape the
rest for coverage of the filter space — enough sonnets, enough free
verse, enough refrains, plus deliberate hard cases (Dickinson's slant
rhyme, Whitman's long free-verse line, Hopkins's sprung rhythm).

Usage: python3 scripts/curate.py [cache] [out]
"""
import json
import re
import sys
import unicodedata

TARGET = 300

# ------------------------------------------------------------------ eras

ERAS = {
    "renaissance": [
        "William Shakespeare", "Edmund Spenser", "Sir Philip Sidney",
        "Christopher Marlowe", "Michael Drayton", "Sir Thomas Wyatt",
        "Sir Walter Raleigh", "Ben Jonson", "Geoffrey Chaucer",
    ],
    "seventeenth": [
        "John Donne", "George Herbert", "Robert Herrick", "John Milton",
        "Andrew Marvell", "Henry Vaughan", "Richard Crashaw",
        "Katherine Philips", "Anne Bradstreet", "Edward Taylor",
        "Richard Lovelace", "Sir John Suckling", "John Wilmot",
        "John Dryden", "Thomas Flatman", "Lady Mary Chudleigh",
    ],
    "eighteenth": [
        "Alexander Pope", "Jonathan Swift", "Thomas Gray",
        "Oliver Goldsmith", "William Cowper", "Christopher Smart",
        "Anne Kingsmill Finch", "Anne Killigrew", "Phillis Wheatley",
        "Robert Burns", "Isaac Watts", "Matthew Prior", "James Thomson",
        "Thomas Chatterton", "Thomas Warton", "Joseph Warton",
        "Samuel Johnson", "Philip Freneau", "John Trumbull",
        "Jupiter Hammon", "Hugh Henry Brackenridge",
    ],
    "romantic": [
        "William Blake", "William Wordsworth", "Samuel Coleridge",
        "George Gordon, Lord Byron", "Percy Bysshe Shelley", "John Keats",
        "John Clare", "Robert Southey", "Walter Savage Landor",
        "Charlotte Smith", "Robinson", "William Lisle Bowles",
        "James Henry Leigh Hunt", "Thomas Campbell", "Thomas Moore",
        "Thomas Hood", "Jane Austen", "Sir Walter Scott", "Jane Taylor",
        "Ann Taylor", "Major Henry Livingston, Jr.",
    ],
    "victorian": [
        "Lord Alfred Tennyson", "Robert Browning",
        "Elizabeth Barrett Browning", "Christina Rossetti",
        "Matthew Arnold", "Gerard Manley Hopkins", "Emily Bronte",
        "Charlotte Bronte", "Anne Bronte", "Algernon Charles Swinburne",
        "George Meredith", "Coventry Patmore", "William Morris",
        "Oscar Wilde", "Amy Levy", "Lewis Carroll", "Edward Lear",
        "Edward Fitzgerald", "Charles Kingsley", "Eliza Cook",
        "George Eliot", "Arthur Hugh Clough", "William Allingham",
        "William Barnes", "Robert Louis Stevenson",
        "William Ernest Henley", "Francis Thompson", "Ernest Dowson",
        "Mary Elizabeth Coleridge", "Annie Louisa Walker",
        "Sarah Flower Adams", "William Topaz McGonagall",
    ],
    "american_19c": [
        "Emily Dickinson", "Walt Whitman", "Edgar Allan Poe",
        "Henry Wadsworth Longfellow", "Ralph Waldo Emerson",
        "Henry David Thoreau", "John Greenleaf Whittier",
        "Oliver Wendell Holmes", "William Cullen Bryant",
        "Julia Ward Howe", "Emma Lazarus", "Helen Hunt Jackson",
        "Sidney Lanier", "Paul Laurence Dunbar", "Stephen Crane",
        "Eugene Field", "James Whitcomb Riley", "Louisa May Alcott",
        "Mark Twain", "Ambrose Bierce",
    ],
    "modern": [
        "Edward Thomas", "Wilfred Owen", "Rupert Brooke", "Alan Seeger",
        "Charles Sorley", "John McCrae", "Joyce Kilmer",
        "William Vaughn Moody", "Adam Lindsay Gordon",
    ],
}
ERA_OF = {a: era for era, authors in ERAS.items() for a in authors}

# --------------------------------------------------------------- anchors
# (author substring, title substring) — canon verified present in the cache.

ANCHORS = [
    ("Shakespeare", "Sonnet 18:"), ("Shakespeare", "Sonnet 29:"),
    ("Shakespeare", "Sonnet 30:"), ("Shakespeare", "Sonnet 60:"),
    ("Shakespeare", "Sonnet 73:"), ("Shakespeare", "Sonnet 116:"),
    ("Shakespeare", "Sonnet 130:"), ("Shakespeare", "Sonnet 15:"),
    ("Shakespeare", "Blow, Blow, Thou Winter Wind"),
    ("Shakespeare", "Under the Greenwood Tree"),
    ("Shelley", "Ozymandias"),
    ("Blake", "The Tyger"), ("Blake", "POISON TREE"),
    ("Blake", "The Sick Rose"), ("Blake", "London"),
    ("Blake", "The Lamb"), ("Blake", "The Garden of Love"),
    ("Donne", "Death Be Not Proud"),
    ("Donne", "Go And Catch A Falling Star"),
    ("Shelley", "Ode to the West Wind"),
    ("Shelley", "Love's Philosophy"),
    ("Byron", "So We'll Go No More a-Roving"),
    ("Byron", "When We Two Parted"),
    ("Byron", "Darkness"),
    ("Blake", "The Chimney Sweeper"),
    ("Keats", "To Autumn"), ("Keats", "Grecian Urn"),
    ("Keats", "Bright Star"), ("Keats", "Chapman's Homer"),
    ("Wordsworth", "I Wandered Lonely"),
    ("Wordsworth", "Lines Written In Early Spring"),
    ("Byron", "She Walks in Beauty"), ("Byron", "Sennacherib"),
    ("Burns", "A Red, Red Rose"),
    ("Herrick", "Virgins, to Make Much"),
    ("Poe", "The Raven"), ("Poe", "Annabel Lee"), ("Poe", "Eldorado"),
    ("Browning", "My Last Duchess"),
    ("Dunbar", "Sympathy"),
    ("Hopkins", "Pied Beauty"), ("Hopkins", "Spring"),
    ("Hopkins", "The Starlight Night"),
    ("Hopkins", "I Wake And Feel"),
    ("Dickinson", '"Hope" is the thing with feathers'),
    ("Dickinson", "Success is counted sweetest"),
    ("Whitman", "Miracles"),
    ("Whitman", "On the Beach at Night, Alone"),
    ("Whitman", "There was a Child went Forth"),
    ("Whitman", "O Me! O Life!"),
    ("Whitman", "I Dream’d in a Dream"),
    ("Whitman", "Look Down, Fair Moon"),
    ("Whitman", "Full of Life, Now"),
    ("Whitman", "Gods"),
    ("Whitman", "Out of the Rolling Ocean"),
    ("Whitman", "When I heard at the Close of the Day"),
    ("Whitman", "Whispers of Heavenly Death"),
    ("Whitman", "This Moment, Yearning and Thoughtful"),
    ("Whitman", "Come up from the Fields, Father"),
    ("Whitman", "Native Moments"),
    ("Whitman", "As the Time Draws Nigh"),
    ("Longfellow", "A Psalm of Life"),
    ("Carroll", "You Are Old, Father William"),
    ("Marlowe", "Passionate Shepherd"),
    ("Owen", "Disabled"), ("Owen", "Winter Song"),
    ("Brooke", "The Soldier"),
    ("McCrae", "The Hope Of My Heart"),
    ("Tennyson", "Dark house, by which once more"),
    ("Tennyson", "Home They Brought Her Warrior Dead"),
    ("Tennyson", "Move Eastward, Happy Earth"),
    ("Tennyson", "The Revenge"),
    ("Rossetti", "A Birthday"),
    ("Rossetti", "Winter: My Secret"),
    ("Rossetti", "From Sunset to Star Rise"),
    ("Stevenson", "Bed in Summer"),
    ("Stevenson", "Autumn Fires"),
    ("Crane", "Do not weep, maiden"),
    ("Crane", "The trees in the garden rained flowers"),
    ("Milton", "How Soon Hath Time"),
    ("Milton", "On His Deceased Wife"),
]

# ------------------------------------------------------------ author caps
# Deliberate shape: hard cases get depth, everyone else gets breadth.

CAPS = {
    "Emily Dickinson": 20,
    "William Shakespeare": 18,
    "Walt Whitman": 15,
    "Gerard Manley Hopkins": 13,
    "William Blake": 12,
    "Percy Bysshe Shelley": 9,
    "George Gordon, Lord Byron": 8,
    "John Keats": 10,
    "John Donne": 8,
    "Edgar Allan Poe": 8,
    "Lord Alfred Tennyson": 8,
    "Robert Browning": 6,
    "Robert Burns": 6,
    "Robert Herrick": 6,
    "Stephen Crane": 6,
    "Edward Thomas": 6,
    "John Clare": 6,
    "Emily Bronte": 5,
    "Christina Rossetti": 6,
    "Elizabeth Barrett Browning": 5,
    "Samuel Coleridge": 5,
    "Alexander Pope": 3,
    "Geoffrey Chaucer": 0,          # only epic-length works in the DB
    "William Topaz McGonagall": 1,  # the control: famously bad meter
}
DEFAULT_CAP = 4

MAX_LINES = 64
# canon that earns a length exception
LONG_OK = {
    "The Raven", "There was a Child went Forth.",
    "When We Two Parted", "Darkness", "Ode to the West Wind",
}
MAX_LINES_LONG = 130


def norm(s):
    s = unicodedata.normalize("NFKD", s.lower())
    return re.sub(r"[^a-z0-9 ]", "", s).strip()


def display_title(t):
    t = re.sub(r"\s+", " ", t).strip().rstrip(".")
    if t.isupper():
        t = t.title()
    return t


def poem_id(author, title):
    slug = re.sub(r"[^a-z0-9]+", "-", norm(author + " " + title)).strip("-")
    return slug[:80]


def clean_lines(lines):
    out = [re.sub(r"[ \t]+$", "", l.replace("\r", "")) for l in lines]
    while out and not out[0].strip():
        out.pop(0)
    while out and not out[-1].strip():
        out.pop()
    return out


def main():
    cache = sys.argv[1] if len(sys.argv) > 1 else "data/cache/poetrydb.json"
    out_path = sys.argv[2] if len(sys.argv) > 2 else "data/corpus.json"
    raw = json.load(open(cache))

    # dedupe (PoetryDB carries duplicates under variant titles)
    seen, poems = set(), []
    for p in raw:
        lines = clean_lines(p["lines"])
        if not lines:
            continue
        key = (norm(p["author"]), norm(p["title"])[:40])
        first = (norm(p["author"]), norm(" ".join(lines[:2]))[:60])
        if key in seen or first in seen:
            continue
        seen.add(key)
        seen.add(first)
        poems.append({**p, "lines": lines, "linecount": len(lines)})

    def ok_length(p):
        cap = MAX_LINES_LONG if p["title"] in LONG_OK else MAX_LINES
        return 3 <= p["linecount"] <= cap

    universe = [p for p in poems if ok_length(p) and p["author"] in ERA_OF]

    picked, picked_ids = [], set()

    def pick(p):
        pid = poem_id(p["author"], p["title"])
        if pid in picked_ids:
            return
        picked_ids.add(pid)
        picked.append(p)

    # 1. anchors
    missing = []
    for auth_sub, title_sub in ANCHORS:
        hit = next(
            (p for p in universe
             if auth_sub.split(",")[0].lower() in p["author"].lower()
             and title_sub.lower() in p["title"].lower()),
            None,
        )
        if hit:
            pick(hit)
        else:
            missing.append((auth_sub, title_sub))

    # 2. fill under caps, preferring lyric lengths
    from collections import Counter
    by_author = Counter(p["author"] for p in picked)

    # Fill in rounds across length bands so the corpus isn't wall-to-wall
    # sonnets: PoetryDB skews hard toward 14-line poems.
    BANDS = [(3, 9), (10, 13), (14, 14), (15, 20), (21, 32), (33, 64)]
    BAND_SHARE = [0.14, 0.16, 0.22, 0.20, 0.18, 0.10]

    def band_of(n):
        for b, (lo, hi) in enumerate(BANDS):
            if lo <= n <= hi:
                return b
        return len(BANDS) - 1

    def fill_score(p):
        return abs(p["linecount"] - 16)

    band_count = Counter(band_of(p["linecount"]) for p in picked)
    band_target = {b: round(share * TARGET) for b, share in enumerate(BAND_SHARE)}

    def try_pick(p, respect_bands):
        if len(picked) >= TARGET:
            return
        cap = CAPS.get(p["author"], DEFAULT_CAP)
        if by_author[p["author"]] >= cap:
            return
        b = band_of(p["linecount"])
        if respect_bands and band_count[b] >= band_target[b]:
            return
        before = len(picked)
        pick(p)
        if len(picked) > before:
            by_author[p["author"]] += 1
            band_count[b] += 1

    ordered = sorted(universe, key=fill_score)
    for p in ordered:
        try_pick(p, respect_bands=True)
    for p in ordered:  # top up if bands ran dry
        try_pick(p, respect_bands=False)

    # 3. emit
    corpus = []
    for p in picked[:TARGET]:
        corpus.append({
            "id": poem_id(p["author"], p["title"]),
            "title": display_title(p["title"]),
            "author": p["author"],
            "era": ERA_OF[p["author"]],
            "lines": p["lines"],
        })
    corpus.sort(key=lambda c: (c["author"], c["title"]))
    with open(out_path, "w") as f:
        json.dump(corpus, f, indent=1, ensure_ascii=False)

    print(f"{len(corpus)} poems -> {out_path}")
    if missing:
        print("\nanchors not found:")
        for m in missing:
            print("  ", m)
    print("\nselection by author:")
    by = Counter(c["author"] for c in corpus)
    for a, n in by.most_common():
        print(f"{n:4}  {a}")


if __name__ == "__main__":
    main()
