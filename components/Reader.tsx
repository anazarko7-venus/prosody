"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FEET, label, type Device, type Poem, type ScanToken } from "@/lib/poems";
import styles from "./Reader.module.css";

const WORD_RE = /[A-Za-z]+(?:['’][A-Za-z]+)*/g;
const STRONG_PUNCT = /[;:.!?—]/;

type Mark = { ch: string; cls: "firm" | "soft" | "dev" };

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
function segmentLine(line: string, scan: ScanToken[]) {
  const segments: Array<
    | { kind: "text"; text: string }
    | { kind: "word"; text: string; token: ScanToken; startSyl: number }
  > = [];
  let last = 0;
  let wordIdx = 0;
  let syl = 0;
  for (const m of line.matchAll(WORD_RE)) {
    const token = scan[wordIdx];
    if (!token || token.w !== m[0]) return null;
    if (m.index! > last) segments.push({ kind: "text", text: line.slice(last, m.index) });
    segments.push({ kind: "word", text: m[0], token, startSyl: syl });
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

export default function Reader({ poem }: { poem: Poem }) {
  const [machinery, setMachinery] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "m" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const t = e.target as HTMLElement;
        if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
        setMachinery((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const foot = FEET[poem.meter];
  const enjambed = useMemo(() => deviceLines(poem.devices, "enjambment"), [poem]);
  const caesura = useMemo(() => deviceLines(poem.devices, "caesura"), [poem]);
  const refrain = useMemo(() => deviceLines(poem.devices, "refrain"), [poem]);
  const anaphora = useMemo(() => anaphoraSpans(poem.devices), [poem]);
  const volta = poem.devices.find((d) => d.name === "volta");

  // rhyme letters, faded when the letter never recurs
  const letterCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const ch of poem.rhyme_scheme) if (ch !== "-") c[ch] = (c[ch] ?? 0) + 1;
    return c;
  }, [poem]);

  let visIdx = 0; // stagger counter for non-blank lines

  return (
    <main className={`${styles.page} ${machinery ? styles.on : ""}`}>
      <nav className={styles.crumbs}>
        <Link href="/" className="tag">
          ← ask again
        </Link>
        <button
          className={`${styles.toggle} tag`}
          onClick={() => setMachinery((v) => !v)}
          aria-pressed={machinery}
        >
          machinery
          <span className={styles.switch} aria-hidden />
          <kbd className={styles.kbd}>m</kbd>
        </button>
      </nav>

      <article className={styles.poem}>
        <header className={styles.head}>
          <h1 className={styles.title}>{poem.title}</h1>
          <p className={styles.byline}>
            {poem.author} · {label(poem.era)}
          </p>
          <p className={`${styles.meta} tag`}>
            {label(poem.form)} · {label(poem.meter)}
            {poem.meter !== "free_verse" && (
              <span className={styles.fit}> · fit {poem.meter_confidence.toFixed(2)}</span>
            )}
            {machinery && poem.rhyme_scheme.replace(/-/g, "").length > 0 && (
              <span className={styles.scheme}>
                {" "}
                · {poem.rhyme_scheme.replace(/-/g, " ").slice(0, 28)}
              </span>
            )}
          </p>
        </header>

        <div className={styles.body}>
          {poem.lines.map((line, i) => {
            if (!line.trim()) return <div key={i} className={styles.stanzaBreak} />;
            const n = i + 1;
            const segments = segmentLine(line, poem.scansion[i] ?? []);
            const devs = new Set(poem.deviations[i] ?? []);
            const anaphSpan = anaphora.get(n);
            const stagger = Math.min(visIdx++, 24); // steps of --stagger-xs (tokens.css)
            const letter = poem.rhyme_scheme[i];

            return (
              <div
                key={i}
                className={`${styles.line} ${volta?.line === n ? styles.voltaLine : ""}`}
                style={{ "--li": stagger } as React.CSSProperties}
              >
                {volta?.line === n && (
                  <span className={styles.voltaNote}>
                    <span className={styles.voltaWord}>volta</span> {volta.why}
                  </span>
                )}
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
                        const wordNo = segments.slice(0, j).filter((x) => x.kind === "word").length;
                        const underline =
                          (anaphSpan !== undefined && wordNo < anaphSpan) || refrain.has(n);
                        return (
                          <span
                            key={j}
                            className={`${styles.w} ${underline ? styles.echo : ""}`}
                          >
                            {machinery && (
                              <span className={styles.marks} aria-hidden>
                                {marksForWord(seg.token, seg.startSyl, foot, devs).map(
                                  (mk, k) => (
                                    <span key={k} className={styles[mk.cls]}>
                                      {mk.ch}
                                    </span>
                                  )
                                )}
                              </span>
                            )}
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
                {machinery && letter && letter !== "-" && (
                  <span
                    className={`${styles.rhyme} ${
                      letterCounts[letter] > 1 ? "" : styles.rhymeLone
                    }`}
                    aria-hidden
                  >
                    {letter}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {machinery && (
          <footer className={styles.legend}>
            <span className="tag">
              / stressed&ensp;× unstressed&ensp;<span className={styles.legendSoft}>faint
              = read from the meter</span>&ensp;
              <span className={styles.legendDev}>marked = against the meter</span>
            </span>
            {poem.themes.length > 0 && (
              <span className={`${styles.themes} tag`}>
                themes: {poem.themes.join(", ")}
              </span>
            )}
          </footer>
        )}
      </article>
    </main>
  );
}
