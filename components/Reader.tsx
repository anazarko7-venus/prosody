"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FEET, label, type Device, type Poem, type ScanToken } from "@/lib/poems";
import { Band, Row, shellColumn, shellPage } from "./PageShell";
import styles from "./Reader.module.css";
import shared from "./shared.module.css";

const WORD_RE = /[A-Za-z]+(?:['’][A-Za-z]+)*/g;
const STRONG_PUNCT = /[;:.!?—]/;
/** The rhyme pill is an overview, not a transcript: past this the rail carries
 *  the rest. The corpus runs to 113 letters (The Raven). */
const SCHEME_MAX = 32;

type Mark = { ch: string; cls: "firm" | "soft" | "dev" };

type WordSeg = {
  kind: "word";
  text: string;
  token: ScanToken;
  startSyl: number;
  /** Position of this word in its line — the key the staff and the verse
   *  share, so a beat can find the syllable it describes. */
  wordNo: number;
};
type Segment = { kind: "text"; text: string } | WordSeg;

function marksForWord(
  token: ScanToken,
  startSyl: number,
  foot: string | undefined,
  deviations: Set<number>
): Mark[] {
  return token.s.split("").map((s, k) => {
    const syl = startSyl + k;
    const templ = foot ? (foot[syl % foot.length] === "1" ? "/" : "×") : null;
    if (s === "1" || s === "0") {
      const ch = s === "1" ? "/" : "×";
      return { ch, cls: deviations.has(syl) ? "dev" : "firm" } as Mark;
    }
    // flexible syllable: read it the way the meter asks
    return { ch: templ ?? "·", cls: "soft" } as Mark;
  });
}

/** Split a raw line into text segments and word segments, pairing words
 *  with their scansion tokens. Falls back to plain text on any mismatch. */
function segmentLine(line: string, scan: ScanToken[]): Segment[] | null {
  const segments: Segment[] = [];
  let last = 0;
  let wordIdx = 0;
  let syl = 0;
  for (const m of line.matchAll(WORD_RE)) {
    const token = scan[wordIdx];
    if (!token || token.w !== m[0]) return null;
    if (m.index! > last) segments.push({ kind: "text", text: line.slice(last, m.index) });
    segments.push({
      kind: "word",
      text: m[0],
      token,
      startSyl: syl,
      wordNo: wordIdx,
    });
    syl += token.s.length;
    last = m.index! + m[0].length;
    wordIdx += 1;
  }
  if (wordIdx !== scan.length) return null;
  if (last < line.length) segments.push({ kind: "text", text: line.slice(last) });
  return segments;
}

function deviceLines(devices: Device[], name: string): Set<number> {
  const out = new Set<number>();
  for (const d of devices) {
    if (d.name !== name) continue;
    for (const l of d.lines ?? []) out.add(l);
    if (d.line) out.add(d.line);
  }
  return out;
}

/** Word-count of the repeated opening for anaphora lines. */
function anaphoraSpans(devices: Device[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const d of devices) {
    if (d.name !== "anaphora" || !d.phrase) continue;
    const n = d.phrase.split(" ").length;
    for (const l of d.lines ?? []) map.set(l, n);
  }
  return map;
}

/* The machinery's lifecycle. `on` and `off` are the two resting states;
   `closing` holds the staff in the DOM just long enough for the exit to
   play (Reader.module.css), then unmounts it. The budget for the whole
   exit is --dur-slow, read from the tokens so no duration lives here. */
type Phase = "on" | "closing" | "off";

/** The correspondence between a beat and the syllable it describes, and
 *  between a rhyme letter in the header pill and the lines that share it.
 *  Both are hover-only decoration over an already-complete display, so this
 *  runs imperatively: the poem never re-renders on a pointer move. */
function useHoverLink(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let lit: Element[] = [];

    const clear = () => {
      for (const n of lit) n.classList.remove(styles.linked);
      lit = [];
    };

    const light = (scope: Element, selector: string) => {
      clear();
      lit = Array.from(scope.querySelectorAll(selector));
      for (const n of lit) n.classList.add(styles.linked);
    };

    const onOver = (e: Event) => {
      const t = e.target;
      if (!(t instanceof Element)) return clear();

      const word = t.closest<HTMLElement>("[data-w]");
      if (word) {
        const line = word.closest("[data-line]");
        const w = word.dataset.w;
        if (line && w && /^\d+$/.test(w)) return light(line, `[data-w="${w}"]`);
      }

      const letter = t.closest<HTMLElement>("[data-rhyme]");
      const r = letter?.dataset.rhyme;
      if (r && /^[A-Za-z]$/.test(r)) return light(el, `[data-rhyme="${r}"]`);

      clear();
    };

    el.addEventListener("pointerover", onOver);
    el.addEventListener("pointerleave", clear);
    return () => {
      el.removeEventListener("pointerover", onOver);
      el.removeEventListener("pointerleave", clear);
      clear();
    };
  }, [root]);
}

export default function Reader({ poem }: { poem: Poem }) {
  const [phase, setPhase] = useState<Phase>("off");
  const closeTimer = useRef<number | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);

  useHoverLink(cardRef);

  const toggleMachinery = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    if (phase !== "on") {
      setPhase("on");
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("off");
      return;
    }
    // computed custom properties serialize as "480ms" or ".48s" by browser
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue("--dur-slow")
      .trim();
    const budget = (parseFloat(raw) || 0) * (raw.endsWith("ms") ? 1 : 1000);
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      setPhase("off");
    }, budget);
    setPhase("closing");
  }, [phase]);

  useEffect(
    () => () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    },
    []
  );

  const machinery = phase === "on"; // the poem's annotations follow the intent
  const mounted = phase !== "off"; // …but stay mounted while the exit plays

  const foot = FEET[poem.meter];
  const enjambed = useMemo(() => deviceLines(poem.devices, "enjambment"), [poem]);
  const caesura = useMemo(() => deviceLines(poem.devices, "caesura"), [poem]);
  const refrain = useMemo(() => deviceLines(poem.devices, "refrain"), [poem]);
  const anaphora = useMemo(() => anaphoraSpans(poem.devices), [poem]);
  const volta = poem.devices.find((d) => d.name === "volta");

  // rhyme letters, faded when the letter never recurs
  const scheme = useMemo(
    () => poem.rhyme_scheme.split("").filter((c) => c !== "-"),
    [poem]
  );
  const letterCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const ch of scheme) c[ch] = (c[ch] ?? 0) + 1;
    return c;
  }, [scheme]);

  let visIdx = 0; // stagger counter for non-blank lines

  return (
    <main
      className={`${shellPage} ${machinery ? styles.on : ""} ${
        phase === "closing" ? styles.closing : ""
      }`}
    >
      <Band />

      <Row>
        <article ref={cardRef} className={`${shellColumn} ${styles.card}`}>
        <nav className={styles.crumbs}>
          <Link href="/" className={styles.home}>
            prosody
          </Link>
          <button
            className={styles.toggle}
            onClick={toggleMachinery}
            aria-pressed={machinery}
          >
            <span className={styles.switch} aria-hidden>
              <span className={styles.switchThumb} />
            </span>
            machinery
          </button>
        </nav>

        <hr className={shared.rule} />

        <header className={styles.head}>
          <hgroup className={styles.titles}>
            <h1 className={styles.title}>{poem.title}</h1>
            <p className={styles.byline}>
              {poem.author} · {label(poem.era)}
            </p>
          </hgroup>
          <div className={shared.tags}>
            <span className={shared.tag}>{label(poem.form)}</span>
            {/* free verse is both the form and the meter for some poems;
                one pill can say that once. */}
            {poem.meter !== poem.form && (
              <span className={shared.tag}>{label(poem.meter)}</span>
            )}
            {poem.meter !== "free_verse" && (
              <span className={shared.tag}>
                fit {poem.meter_confidence.toFixed(2)}
              </span>
            )}
            {mounted && scheme.length > 0 && (
              <span
                className={`${shared.tag} ${shared.tagWide} ${styles.scheme}`}
                aria-label={`rhyme scheme ${scheme.join("")}`}
              >
                {scheme.slice(0, SCHEME_MAX).map((c, k) => (
                  <span
                    key={k}
                    className={styles.schemeLetter}
                    data-rhyme={c}
                    aria-hidden
                  >
                    {c}
                  </span>
                ))}
                {scheme.length > SCHEME_MAX && (
                  <span className={styles.schemeMore} aria-hidden>
                    …
                  </span>
                )}
              </span>
            )}
          </div>
        </header>

        <hr className={shared.rule} />

        <div className={styles.body}>
          {poem.lines.map((line, i) => {
            if (!line.trim()) return <div key={i} className={styles.stanzaBreak} />;
            const n = i + 1;
            const segments = segmentLine(line, poem.scansion[i] ?? []);
            const devs = new Set(poem.deviations[i] ?? []);
            const anaphSpan = anaphora.get(n);
            const stagger = Math.min(visIdx++, 24); // steps of --stagger-xs (tokens.css)
            const letter = poem.rhyme_scheme[i];
            const words = segments?.filter((s): s is WordSeg => s.kind === "word") ?? [];

            const isVolta = volta?.line === n;

            const row = (
              <div
                key={i}
                className={styles.line}
                data-line={n}
                style={{ "--li": stagger } as React.CSSProperties}
              >
                {/* The line and everything the machine says about it. On the
                    volta this is also the callout: same box, one more thing
                    inside it. */}
                <div className={`${styles.lineMain} ${isVolta ? styles.volta : ""}`}>
                {isVolta && (
                  <div className={styles.voltaNoteWrap}>
                    {mounted && (
                      <div className={styles.voltaNote}>
                        <span className={styles.voltaLabel}>volta</span>
                        <p className={styles.voltaWhy}>{volta.why}</p>
                      </div>
                    )}
                  </div>
                )}
                {/* The band stays in the DOM even when it is empty: a grid row
                    can only animate from 0fr to 1fr if the element it belongs
                    to was already there to have a from-value. */}
                <span className={styles.staffWrap} aria-hidden>
                  {mounted && words.length > 0 && (
                    <span className={styles.staff}>
                      {words.map((seg) => (
                        <span
                          key={seg.wordNo}
                          className={styles.beatGroup}
                          data-w={seg.wordNo}
                        >
                          {marksForWord(seg.token, seg.startSyl, foot, devs).map(
                            (mk, k) => (
                              <span
                                key={k}
                                className={`${styles.beat} ${styles[mk.cls]}`}
                              >
                                {mk.ch}
                              </span>
                            )
                          )}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
                <span className={styles.lineText}>
                  {segments === null
                    ? line
                    : segments.map((seg, j) => {
                        if (seg.kind === "text") {
                          if (
                            machinery &&
                            caesura.has(n) &&
                            j > 0 &&
                            j < segments.length - 1 &&
                            STRONG_PUNCT.test(seg.text) &&
                            !segments
                              .slice(0, j)
                              .some(
                                (x) => x.kind === "text" && STRONG_PUNCT.test(x.text)
                              )
                          ) {
                            return (
                              <span key={j}>
                                {seg.text}
                                <span className={styles.caesura} title="caesura">
                                  ‖
                                </span>
                              </span>
                            );
                          }
                          return <span key={j}>{seg.text}</span>;
                        }
                        const underline =
                          (anaphSpan !== undefined && seg.wordNo < anaphSpan) ||
                          refrain.has(n);
                        return (
                          <span
                            key={j}
                            className={`${styles.w} ${underline ? styles.echo : ""}`}
                            data-w={seg.wordNo}
                          >
                            {seg.text}
                          </span>
                        );
                      })}
                  {machinery && enjambed.has(n) && (
                    <span className={styles.enj} title="enjambment">
                      ↴
                    </span>
                  )}
                </span>
                </div>
                {/* The tile keeps its slot whether or not it is holding a
                    letter, so toggling the machinery never re-wraps the
                    verse. It stretches to the line block beside it, which is
                    why the volta's tile is as tall as the volta's box. */}
                <div
                  className={`${styles.rhymeCell} ${
                    mounted && letter && letter !== "-" ? styles.rhymeFilled : ""
                  }`}
                  data-rhyme={mounted && letter !== "-" ? letter : undefined}
                  aria-hidden
                >
                  {mounted && letter && letter !== "-" && (
                    <span
                      className={`${styles.rhyme} ${
                        letterCounts[letter] > 1 ? "" : styles.rhymeLone
                      }`}
                    >
                      {letter}
                    </span>
                  )}
                </div>
              </div>
            );

            return row;
          })}
        </div>

        {mounted && (
          <>
            <hr className={`${shared.rule} ${styles.legendRule}`} />
            <footer className={styles.legend}>
              <span className={styles.finePrint}>
                / stressed&ensp;× unstressed&ensp;
                <span className={styles.legendSoft}>
                  faint = read from the meter
                </span>
                &ensp;
                <span className={styles.legendDev}>
                  marked = against the meter
                </span>
              </span>
              <span className={styles.finePrint}>
                <span className={styles.legendSoft}>
                  Point at a word and its beats light with it; point at a letter
                  in the rhyme scheme to find the lines that share it.
                </span>
              </span>
              {poem.themes.length > 0 && (
                <span className={`${styles.finePrint} ${styles.themes}`}>
                  themes: {poem.themes.join(", ")}
                </span>
              )}
            </footer>
          </>
        )}
        </article>
      </Row>

      <Band />
    </main>
  );
}
