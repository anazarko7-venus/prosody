#!/usr/bin/env python3
"""Fetch the full PoetryDB corpus into a local cache.

Run once before curate.py. The cache is gitignored; only the curated
selection (data/corpus.json) and the annotated output (data/poems.json)
are committed.

Usage: python3 scripts/fetch.py [cache_path]
"""
import json
import sys
import time
import urllib.request

BASE = "https://poetrydb.org"


def get(path):
    req = urllib.request.Request(BASE + path, headers={"User-Agent": "prosody-corpus/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def main():
    cache_path = sys.argv[1] if len(sys.argv) > 1 else "data/cache/poetrydb.json"
    authors = get("/author")["authors"]
    print(f"{len(authors)} authors")
    corpus = []
    for i, author in enumerate(authors):
        poems = get("/author/" + urllib.request.quote(author))
        if isinstance(poems, list):
            corpus.extend(poems)
        print(f"[{i + 1}/{len(authors)}] {author}: {len(poems) if isinstance(poems, list) else 0}")
        time.sleep(0.3)
    with open(cache_path, "w") as f:
        json.dump(corpus, f)
    print(f"{len(corpus)} poems -> {cache_path}")


if __name__ == "__main__":
    main()
