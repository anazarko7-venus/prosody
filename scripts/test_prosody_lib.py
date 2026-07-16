"""Unit tests for the deterministic analysis. Run: python3 -m pytest scripts/ -q"""
import prosody_lib as P

SONNET_18 = [
    "Shall I compare thee to a summer's day?",
    "Thou art more lovely and more temperate:",
    "Rough winds do shake the darling buds of May,",
    "And summer's lease hath all too short a date:",
    "Sometime too hot the eye of heaven shines,",
    "And often is his gold complexion dimm'd;",
    "And every fair from fair sometime declines,",
    "By chance or nature's changing course untrimm'd;",
    "But thy eternal summer shall not fade",
    "Nor lose possession of that fair thou owest;",
    "Nor shalt thou wander in his shade,",
    "When in eternal lines to time thou growest:",
    "So long as men can breathe or eyes can see,",
    "So long lives this and this gives life to thee.",
]

TYGER = [
    "Tyger Tyger, burning bright,",
    "In the forests of the night;",
    "What immortal hand or eye,",
    "Could frame thy fearful symmetry?",
]

DICKINSON = [
    "Because I could not stop for Death –",
    "He kindly stopped for me –",
    "The Carriage held but just Ourselves –",
    "And Immortality.",
]


def stresses(lines):
    return [P.line_stress(P.scan_line(l)) for l in lines]


def test_scan_line_basic():
    scan = P.scan_line("Shall I compare thee to a summer's day?")
    assert [t["w"] for t in scan] == ["Shall", "I", "compare", "thee", "to", "a", "summer's", "day"]
    compare = scan[2]["s"]
    assert compare == "01"  # kum-PARE


def test_syllable_fallback():
    assert len(P.word_stress("Tyger")) == 2
    assert len(P.word_stress("darkling")) == 2


def test_meter_sonnet_is_iambic_pentameter():
    meter, devs, score = P.classify_meter(stresses(SONNET_18))
    assert meter == "iambic_pentameter"
    assert score > 0.7


def test_meter_dickinson_is_common_meter():
    meter, _, _ = P.classify_meter(stresses(DICKINSON))
    assert meter in ("common_meter", "iambic_tetrameter", "iambic_trimeter")


def test_free_verse():
    whitman = [
        "I celebrate myself, and sing myself,",
        "And what I assume you shall assume,",
        "For every atom belonging to me as good belongs to you.",
        "I loafe and invite my soul,",
        "I lean and loafe at my ease observing a spear of summer grass.",
    ]
    meter, _, _ = P.classify_meter(stresses(whitman))
    assert meter == "free_verse"


def test_rhyme_scheme_quatrain():
    s = P.rhyme_scheme(TYGER)
    assert s[0] == "A" and s[1] == "A"  # bright / night


def test_rhyme_scheme_sonnet_couplet():
    s = P.rhyme_scheme(SONNET_18)
    assert s[-1] == s[-2]  # see / thee


def test_form_sonnet():
    scheme = P.rhyme_scheme(SONNET_18)
    meter, _, _ = P.classify_meter(stresses(SONNET_18))
    form = P.classify_form(SONNET_18, scheme, meter)
    assert form.startswith("sonnet")


def test_enjambment():
    lines = [
        "The curfew tolls the knell of parting day,",
        "The lowing herd wind slowly o'er the lea",
        "The plowman homeward plods his weary way,",
    ]
    assert P.find_enjambment(lines) == [2]


def test_enjambment_stanza_break_excluded():
    lines = ["A line that runs on", "", "into a new stanza."]
    assert P.find_enjambment(lines) == []


def test_caesura():
    lines = ["To be, or not to be: that is the question:"]
    assert P.find_caesura(lines) == [1]


def test_anaphora():
    lines = [
        "And every fair from fair sometime declines,",
        "And often is his gold complexion dimmed,",
        "And summer's lease hath all too short a date,",
    ]
    found = P.find_anaphora(lines)
    assert found and found[0]["lines"] == [1, 2, 3]
    assert found[0]["phrase"] == "and"


def test_anaphora_two_word():
    lines = [
        "So long as men can breathe or eyes can see,",
        "So long lives this and this gives life to thee.",
    ]
    found = P.find_anaphora(lines)
    assert found and found[0]["phrase"] == "so long"


def test_refrain():
    lines = [
        "Do not go gentle into that good night,",
        "Old age should burn and rave at close of day;",
        "Rage, rage against the dying of the light.",
        "Wise men at their end know dark is right,",
        "Do not go gentle into that good night,",
    ]
    found = P.find_refrain(lines)
    assert found and found[0]["lines"] == [1, 5]


def test_alliteration():
    assert P.find_alliteration(["Full fathom five thy father lies"]) == [1]


def test_stanza_sizes():
    lines = ["a", "b", "", "c", "d", "e"]
    assert P.stanza_sizes(lines) == [2, 3]
