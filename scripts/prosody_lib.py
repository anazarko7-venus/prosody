"""Deterministic prosody analysis: scansion, meter, rhyme, form, devices.

Everything in this module is rule-based and reproducible. The only
non-deterministic annotation (volta, themes) lives in annotate.py's
Claude pass. CMU dict via `pronouncing`.

Stress code per syllable:
  '1' stressed / '0' unstressed — from CMU, polysyllabic words only;
      these are the syllables that can contradict a metrical template.
  'w' weak monosyllable (function words) — unstressed by nature but
      promotable to a strong position, so never a deviation.
  'x' flexible — stressed monosyllables, secondary stress, unknown
      words. Fits any position.
"""
import re

import pronouncing

# ---------------------------------------------------------------- tokenizing

WORD_RE = re.compile(r"[A-Za-z]+(?:['’][A-Za-z]+)*")

# Monosyllabic function words that lean unstressed in the metrical line.
# Everything else monosyllabic is fully flexible.
LIGHT_WORDS = {
    "a", "an", "the", "and", "or", "but", "of", "to", "in", "on", "at",
    "by", "for", "with", "from", "as", "is", "am", "are", "was", "were",
    "be", "been", "it", "its", "his", "her", "my", "thy", "your", "our",
    "their", "that", "this", "these", "those", "he", "she", "we", "they",
    "you", "i", "me", "him", "them", "us", "do", "did", "does", "has",
    "had", "have", "will", "would", "shall", "should", "can", "could",
    "may", "might", "must", "if", "so", "than", "then", "when", "while",
    "who", "whom", "which", "what", "there", "here", "not", "nor", "o",
    "oh", "up", "out", "into", "unto", "upon", "over", "under", "through",
}

VOWEL_GROUP_RE = re.compile(r"[aeiouy]+", re.I)


def words_of(line):
    return WORD_RE.findall(line)


def _fallback_syllables(word):
    """Vowel-group count for words the CMU dict doesn't know."""
    w = word.lower().replace("’", "'")
    n = len(VOWEL_GROUP_RE.findall(w))
    if w.endswith("e") and not w.endswith(("le", "ee", "ye")) and n > 1:
        n -= 1
    if w.endswith("ed") and n > 1 and not re.search(r"[td]ed$", w):
        n -= 1
    return max(1, n)


def word_stress(word):
    """Stress string for one word, in '1'/'0'/'x' code."""
    w = word.lower().replace("’", "'")
    # archaic elisions: o'er, e'er, 'tis...
    phones = pronouncing.phones_for_word(w)
    if not phones and "'" in w:
        phones = pronouncing.phones_for_word(w.replace("'", ""))
    if not phones:
        return "x" * _fallback_syllables(word)
    raw = pronouncing.stresses(phones[0])
    if len(raw) == 1:
        return "w" if w in LIGHT_WORDS else "x"
    return raw.replace("2", "x")


def scan_line(line):
    """[{'w': word, 's': stress}] for one line."""
    return [{"w": w, "s": word_stress(w)} for w in words_of(line)]


def line_stress(scan):
    return "".join(tok["s"] for tok in scan)


# ------------------------------------------------------------------- meter

METERS = {
    "iambic_pentameter": ("01", 10),
    "iambic_tetrameter": ("01", 8),
    "iambic_trimeter": ("01", 6),
    "iambic_hexameter": ("01", 12),
    "trochaic_tetrameter": ("10", 8),
    "trochaic_octameter": ("10", 16),
    "anapestic_tetrameter": ("001", 12),
    "anapestic_trimeter": ("001", 9),
}


def template_for(meter, n_syllables):
    """Expected stress template stretched/trimmed to a line's length."""
    foot, length = METERS[meter]
    reps = (max(n_syllables, length) // len(foot)) + 1
    return (foot * reps)[:n_syllables]


def line_fit(stress, meter):
    """(score 0..1, deviation syllable indexes) for one line vs a meter.

    Flexible syllables always fit. A feminine ending (one trailing
    unstressed syllable beyond the template) is not a deviation.
    """
    foot, length = METERS[meter]
    n = len(stress)
    if n == 0:
        return 0.0, []
    template = template_for(meter, n)
    devs = []
    for i, s in enumerate(stress):
        if s in "xw":
            continue  # flexible; weak monosyllables promote freely
        if s != template[i]:
            # feminine ending: extra unstressed syllable past the expected length
            if i >= length and s == "0":
                continue
            devs.append(i)
    # length penalty: how far off the canonical syllable count.
    # catalexis (one syllable short, e.g. trochaic 7s) is cheap.
    diff = abs(n - length)
    len_penalty = min(diff * 0.12, 0.6)
    if diff == 1:
        len_penalty = 0.04
    # a feminine ending is free
    if n == length + 1 and stress[-1] in "0wx":
        len_penalty = 0.0
    score = max(0.0, 1.0 - len(devs) / max(n, 1) * 2.0 - len_penalty)
    return score, devs


def classify_meter(stresses):
    """(meter, per-line deviations, score) for a whole poem.

    stresses: list of per-line stress strings, blank lines excluded.
    Returns ('free_verse', [], 0) when nothing clears the bar.
    """
    lines = [s for s in stresses if s]
    if not lines:
        return "free_verse", {}, 0.0
    best = ("free_verse", {}, 0.0)
    candidates = list(METERS)
    for meter in candidates:
        total, devmap = 0.0, {}
        for i, s in enumerate(lines):
            score, devs = line_fit(s, meter)
            total += score
            if devs:
                devmap[i] = devs
        avg = total / len(lines)
        if avg > best[2]:
            best = (meter, devmap, avg)
    # common meter: alternating 8/6 iambic quatrains
    cm_score = _common_meter_score(lines)
    if cm_score > best[2]:
        devmap = {}
        for i, s in enumerate(lines):
            meter = "iambic_tetrameter" if len(s) >= 7 else "iambic_trimeter"
            _, devs = line_fit(s, meter)
            if devs:
                devmap[i] = devs
        best = ("common_meter", devmap, cm_score)
    if best[2] < 0.62:
        return "free_verse", {}, best[2]
    return best


def _common_meter_score(lines):
    if len(lines) < 4:
        return 0.0
    total = 0.0
    for i, s in enumerate(lines):
        meter = "iambic_tetrameter" if i % 2 == 0 else "iambic_trimeter"
        score, _ = line_fit(s, meter)
        total += score
    return total / len(lines)


# ------------------------------------------------------------------- rhyme

def rhyming_part(word):
    w = word.lower().replace("’", "'")
    phones = pronouncing.phones_for_word(w)
    if not phones and "'" in w:
        phones = pronouncing.phones_for_word(w.replace("'", ""))
    if phones:
        return pronouncing.rhyming_part(phones[0])
    # spelling fallback: crude, but honest for archaic words
    return "~" + re.sub(r"[^a-z]", "", w)[-3:]


def line_endings(lines):
    return [rhyming_part(words_of(l)[-1]) if words_of(l) else None for l in lines]


def rhyme_scheme(lines):
    """Uppercase letters per non-blank line; '-' for blank lines.

    Letters are assigned in order of first appearance; after Z the
    second cycle is lowercase. Rhyme groups only merge when they recur
    within a 6-line window, so a chance repeat 40 lines later doesn't
    get the same letter.
    """
    endings = line_endings(lines)
    scheme = []
    last_seen = {}  # rhyming part -> (letter, line index of last use)
    n_letters = 0
    for i, e in enumerate(endings):
        if e is None:
            scheme.append("-")
            continue
        if e in last_seen and i - last_seen[e][1] <= 6:
            letter = last_seen[e][0]
        else:
            letter = _letter(n_letters)
            n_letters += 1
        last_seen[e] = (letter, i)
        scheme.append(letter)
    return "".join(scheme)


def _letter(i):
    alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    return alpha[i % 26] if i < 26 else alpha[i % 26].lower()


def is_rhymed(lines):
    """True if a meaningful share of lines rhyme with a nearby line."""
    endings = [e for e in line_endings(lines) if e is not None]
    if len(endings) < 2:
        return False
    rhymed = 0
    for i, e in enumerate(endings):
        lo, hi = max(0, i - 4), min(len(endings), i + 5)
        if any(endings[j] == e for j in range(lo, hi) if j != i):
            rhymed += 1
    return rhymed / len(endings) >= 0.4


# -------------------------------------------------------------------- form

def classify_form(lines, scheme, meter):
    """One tag from a small fixed vocabulary."""
    nonblank = [l for l in lines if l.strip()]
    n = len(nonblank)
    s = scheme.replace("-", "")
    if n == 14 and meter in ("iambic_pentameter", "free_verse"):
        if _matches(s, "ABABCDCDEFEFGG", tolerance=2):
            return "sonnet_shakespearean"
        if s[:8] in ("ABBAABBA",) or _matches(s[:8], "ABBAABBA", tolerance=1):
            return "sonnet_petrarchan"
        if meter == "iambic_pentameter":
            return "sonnet_other"
    if n == 5 and _matches(s, "AABBA", tolerance=0):
        return "limerick"
    if n == 19 and find_refrain(lines):
        return "villanelle"
    if meter == "common_meter":
        return "common_meter_stanzas"
    if _couplet_share(s) >= 0.7:
        return "couplets"
    if meter == "iambic_pentameter" and not is_rhymed(lines):
        return "blank_verse"
    if _quatrain_like(lines, s):
        return "quatrains"
    if meter == "free_verse" and not is_rhymed(lines):
        return "free_verse"
    if is_rhymed(lines):
        return "rhymed_stanzas"
    return "irregular"


def _matches(s, target, tolerance=0):
    if len(s) != len(target):
        return False
    # compare pair-structure, not letter identity
    diffs = 0
    for i in range(len(s)):
        for j in range(i + 1, len(s)):
            if (s[i] == s[j]) != (target[i] == target[j]):
                diffs += 1
                break
    return diffs <= tolerance


def _couplet_share(s):
    if len(s) < 4:
        return 0.0
    pairs = 0
    total = 0
    for i in range(0, len(s) - 1, 2):
        total += 1
        if s[i] == s[i + 1]:
            pairs += 1
    return pairs / total if total else 0.0


def _quatrain_like(lines, s):
    stanzas = stanza_sizes(lines)
    quats = [z for z in stanzas if z == 4]
    return len(stanzas) >= 2 and len(quats) / len(stanzas) >= 0.7


def stanza_sizes(lines):
    sizes, cur = [], 0
    for line in lines:
        if line.strip():
            cur += 1
        elif cur:
            sizes.append(cur)
            cur = 0
    if cur:
        sizes.append(cur)
    return sizes


# ------------------------------------------------------------------ devices

END_PUNCT = re.compile(r"[.,;:!?—–\-\)\]\"”’]\s*$")
STRONG_MID = re.compile(r"[;:.!?—]")


def find_enjambment(lines):
    """1-indexed lines that run over into the next line."""
    out = []
    nonblank_idx = [i for i, l in enumerate(lines) if l.strip()]
    for k, i in enumerate(nonblank_idx[:-1]):
        nxt = nonblank_idx[k + 1]
        if nxt != i + 1:  # stanza break: not enjambment
            continue
        if not END_PUNCT.search(lines[i].rstrip()):
            out.append(i + 1)
    return out


def find_caesura(lines):
    """1-indexed lines with a strong mid-line pause."""
    out = []
    for i, line in enumerate(lines):
        core = line.strip()
        if len(words_of(core)) < 4:
            continue
        inner = core[2:-2]
        if STRONG_MID.search(inner):
            out.append(i + 1)
    return out


def _norm_words(line, k):
    ws = [w.lower() for w in words_of(line)]
    return " ".join(ws[:k]) if len(ws) >= k else None


def find_anaphora(lines):
    """[{'lines': [...], 'phrase': str}] — repeated line-openings.

    A run counts when >=3 consecutive non-blank lines share their first
    word, or >=2 share their first two words.
    """
    out = []
    idx = [i for i, l in enumerate(lines) if l.strip()]
    used = set()
    for k in (3, 2, 1):
        min_run = 2 if k >= 2 else 3
        run = []
        prev = None
        for i in idx:
            key = _norm_words(lines[i], k)
            if key is not None and key == prev:
                run.append(i)
            else:
                if len(run) >= min_run and not set(run) & used:
                    out.append({"lines": [r + 1 for r in run], "phrase": prev})
                    used.update(run)
                run = [i] if key else []
            prev = key
        if len(run) >= min_run and not set(run) & used:
            out.append({"lines": [r + 1 for r in run], "phrase": prev})
            used.update(run)
    out.sort(key=lambda d: d["lines"][0])
    return out


def find_refrain(lines):
    """[{'lines': [...], 'phrase': str}] — whole lines repeated verbatim."""
    seen = {}
    for i, line in enumerate(lines):
        key = re.sub(r"[^a-z' ]", "", line.lower()).strip()
        if len(key.split()) < 3:
            continue
        seen.setdefault(key, []).append(i)
    out = []
    for key, idxs in seen.items():
        if len(idxs) >= 2 and idxs[-1] - idxs[0] > 1:
            out.append({"lines": [i + 1 for i in idxs],
                        "phrase": lines[idxs[0]].strip()})
    out.sort(key=lambda d: d["lines"][0])
    return out


def find_alliteration(lines):
    """1-indexed lines where >=3 nearby words share an initial consonant."""
    out = []
    for i, line in enumerate(lines):
        ws = [w.lower() for w in words_of(line)]
        initials = [w[0] for w in ws if w[0] not in "aeiou" and len(w) > 1]
        from collections import Counter
        if initials and Counter(initials).most_common(1)[0][1] >= 3:
            out.append(i + 1)
    return out
