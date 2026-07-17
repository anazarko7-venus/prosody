"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { label, type PoemMeta } from "@/lib/poems";
import styles from "./Finder.module.css";

const SINGLE = ["form", "meter", "era"] as const;
const MULTI = ["devices", "themes"] as const;
type SingleFacet = (typeof SINGLE)[number];
type MultiFacet = (typeof MULTI)[number];

type Filters = {
  form?: string;
  meter?: string;
  era?: string;
  devices: string[];
  themes: string[];
  q?: string;
};

function matches(p: PoemMeta, f: Filters): boolean {
  if (f.form && p.form !== f.form) return false;
  if (f.meter && p.meter !== f.meter) return false;
  if (f.era && p.era !== f.era) return false;
  if (!f.devices.every((d) => p.devices.includes(d))) return false;
  if (!f.themes.every((t) => p.themes.includes(t))) return false;
  if (f.q) {
    const q = f.q.toLowerCase();
    if (!p.title.toLowerCase().includes(q) && !p.author.toLowerCase().includes(q))
      return false;
  }
  return true;
}

/** Filters with one constraint removed, for relaxation + hold-out counts. */
function without(f: Filters, facet: SingleFacet | MultiFacet | "q"): Filters {
  const g = { ...f, devices: [...f.devices], themes: [...f.themes] };
  if (facet === "devices" || facet === "themes") g[facet] = [];
  else delete g[facet];
  return g;
}

/* ------------------------- the composed sentence ------------------------- */

const FORM_PHRASE: Record<string, string> = {
  sonnet_shakespearean: "a Shakespearean sonnet",
  sonnet_petrarchan: "a Petrarchan sonnet",
  sonnet_other: "a sonnet of an odd stripe",
  blank_verse: "a poem in blank verse",
  couplets: "a poem in couplets",
  quatrains: "a poem in quatrains",
  common_meter_stanzas: "a poem in hymn stanzas",
  rhymed_stanzas: "a poem in rhymed stanzas",
  villanelle: "a villanelle",
  limerick: "a limerick",
  irregular: "a poem of irregular build",
};

const ERA_PHRASE: Record<string, string> = {
  renaissance: "from the Renaissance",
  seventeenth: "from the seventeenth century",
  eighteenth: "from the eighteenth century",
  romantic: "from the Romantic era",
  victorian: "from the Victorians",
  american_19c: "from nineteenth-century America",
  modern: "from the moderns",
};

function joinAnd(xs: string[]): string {
  if (xs.length <= 1) return xs[0] ?? "";
  return `${xs.slice(0, -1).join(", ")} & ${xs[xs.length - 1]}`;
}

function sentence(f: Filters): string {
  const bits: string[] = [];
  bits.push(f.form ? FORM_PHRASE[f.form] ?? `a ${label(f.form)}` : "a poem");
  if (f.meter) bits.push(`in ${label(f.meter)}`);
  if (f.era) bits.push(ERA_PHRASE[f.era] ?? `from the ${label(f.era)}`);
  if (f.devices.length) bits.push(`using ${joinAnd(f.devices.map(label))}`);
  if (f.themes.length) bits.push(`about ${joinAnd(f.themes.map(label))}`);
  if (f.q) bits.push(`answering “${f.q}”`);
  if (bits.length === 1 && !f.form) return "any poem at all, cut from the whole deck";
  return bits.join(", ");
}

/* ------------------------------- odometer ------------------------------- */

function Odometer({ value }: { value: number }) {
  const digits = String(value).split("");
  return (
    <span className={styles.odo} aria-hidden>
      {digits.map((d, i) => (
        <span key={digits.length - i} className={styles.odoDigit}>
          <span
            className={styles.odoReel}
            style={{ transform: `translateY(-${Number(d)}em)` }}
          >
            {[..."0123456789"].map((n) => (
              <span key={n}>{n}</span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}

/* ------------------------------ slot (menu) ------------------------------ */

type Opt = { v: string; text: string; n: number; on: boolean };

function Slot({
  placeholder,
  display,
  options,
  onPick,
  multi,
}: {
  placeholder: string;
  display: string | null;
  options: Opt[];
  onPick: (v: string) => void;
  multi?: boolean;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const close = (e: PointerEvent) => {
      const el = ref.current;
      if (el?.open && !el.contains(e.target as Node)) el.open = false;
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  return (
    <details className={styles.slot} ref={ref}>
      <summary
        className={`${styles.slotBtn} ${display ? styles.slotFilled : ""}`}
      >
        {display ?? placeholder}
        <span className={styles.slotCaret} aria-hidden>
          ▾
        </span>
      </summary>
      <div className={styles.menu} role="listbox" aria-multiselectable={multi}>
        {options.map((o) => (
          <button
            key={o.v}
            role="option"
            aria-selected={o.on}
            disabled={o.n === 0 && !o.on}
            className={`${styles.opt} ${o.on ? styles.optOn : ""} ${
              o.n === 0 && !o.on ? styles.optZero : ""
            }`}
            onClick={() => {
              onPick(o.v);
              if (!multi && ref.current) ref.current.open = false;
            }}
          >
            <span>
              {o.on && <span className={styles.tick}>✓ </span>}
              {o.text}
            </span>
            <span className={styles.optN}>{o.n}</span>
          </button>
        ))}
      </div>
    </details>
  );
}

/* -------------------------------- finder -------------------------------- */

type Phase = "idle" | "drawing" | "revealed";

export default function Finder({ index }: { index: PoemMeta[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const filters: Filters = useMemo(() => {
    const list = (k: string) =>
      params.get(k)?.split(",").filter(Boolean) ?? [];
    const f: Filters = { devices: list("devices"), themes: list("themes") };
    for (const k of SINGLE) {
      const v = params.get(k);
      if (v) f[k] = v;
    }
    const q = params.get("q");
    if (q) f.q = q;
    return f;
  }, [params]);

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.replace(next.size ? `${pathname}?${next}` : pathname, {
        scroll: false,
      });
    },
    [params, pathname, router]
  );

  const toggleSingle = (facet: SingleFacet, v: string) =>
    setParam(facet, filters[facet] === v ? null : v);

  const toggleMulti = (facet: MultiFacet, v: string) => {
    const cur = filters[facet];
    const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
    setParam(facet, next.length ? next.join(",") : null);
  };

  const results = useMemo(
    () => index.filter((p) => matches(p, filters)),
    [index, filters]
  );

  // zero-result relaxation: name the weakest constraint
  const relaxed = useMemo(() => {
    if (results.length > 0) return null;
    const active: Array<SingleFacet | MultiFacet | "q"> = [
      ...SINGLE.filter((f) => filters[f]),
      ...MULTI.filter((f) => filters[f].length > 0),
      ...(filters.q ? (["q"] as const) : []),
    ];
    if (active.length < 2) return null;
    let best: { facet: (typeof active)[number]; rows: PoemMeta[] } | null = null;
    for (const facet of active) {
      const rows = index.filter((p) => matches(p, without(filters, facet)));
      if (!best || rows.length > best.rows.length) best = { facet, rows };
    }
    return best && best.rows.length > 0 ? best : null;
  }, [results, filters, index]);

  /* counts. single facets: hold the facet out, count per value.
     multi facets: count what adding each value would leave. */
  const counts = useMemo(() => {
    const single = {} as Record<SingleFacet, Map<string, number>>;
    for (const facet of SINGLE) {
      const held = without(filters, facet);
      const map = new Map<string, number>();
      for (const p of index) {
        if (!matches(p, held)) continue;
        map.set(p[facet], (map.get(p[facet]) ?? 0) + 1);
      }
      single[facet] = map;
    }
    const multi = {} as Record<MultiFacet, Map<string, number>>;
    for (const facet of MULTI) {
      const key = facet === "devices" ? "devices" : "themes";
      const map = new Map<string, number>();
      for (const p of index) {
        if (!matches(p, without(filters, facet))) continue;
        // p already satisfies everything else; each value it carries is a
        // candidate — but the count must respect the values already chosen
        if (!filters[facet].every((v) => p[key].includes(v))) continue;
        for (const v of p[key]) map.set(v, (map.get(v) ?? 0) + 1);
      }
      multi[facet] = map;
    }
    return { ...single, ...multi };
  }, [index, filters]);

  const corpusNumber = useMemo(() => {
    const m = new Map<string, number>();
    index.forEach((p, i) => m.set(p.id, i + 1));
    return m;
  }, [index]);

  /* ------------------------------ the draw ------------------------------ */

  const [phase, setPhase] = useState<Phase>("idle");
  const [drawnId, setDrawnId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const historyRef = useRef<string[]>([]);
  const timerRef = useRef<number | undefined>(undefined);

  const filtersKey = JSON.stringify(filters);
  useEffect(() => {
    // a changed ask reassembles the deck
    setPhase("idle");
    setDrawnId(null);
    setShowAll(false);
    historyRef.current = [];
    return () => clearTimeout(timerRef.current);
  }, [filtersKey]);

  const draw = useCallback(() => {
    if (results.length === 0 || phase === "drawing") return;
    let pool = results.filter((p) => !historyRef.current.includes(p.id));
    if (pool.length === 0) {
      historyRef.current = [];
      pool = results.length > 1 ? results.filter((p) => p.id !== drawnId) : results;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    historyRef.current.push(pick.id);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPhase("drawing");
    clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(
      () => {
        setDrawnId(pick.id);
        setPhase("revealed");
      },
      reduced ? 0 : 620
    );
  }, [results, phase, drawnId]);

  const drawn = drawnId ? index.find((p) => p.id === drawnId) ?? null : null;

  const cardRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (phase !== "revealed" || !cardRef.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    cardRef.current.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "center",
    });
  }, [phase, drawnId]);

  /* ------------------------------- options ------------------------------ */

  // a chosen value must stay visible even when nothing else matches it,
  // or there would be no way to let it go
  const opts = (facet: SingleFacet): Opt[] => {
    const map = new Map(counts[facet]);
    const sel = filters[facet];
    if (sel && !map.has(sel)) map.set(sel, 0);
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([v, n]) => ({ v, text: label(v), n, on: sel === v }));
  };

  const multiOpts = (facet: MultiFacet): Opt[] => {
    const map = new Map(counts[facet]);
    for (const sel of filters[facet]) if (!map.has(sel)) map.set(sel, 0);
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([v, n]) => ({ v, text: label(v), n, on: filters[facet].includes(v) }));
  };

  const deviceOpts = multiOpts("devices");
  const eraOpts = opts("era");
  const sheets = results.length === 0 ? 1 : Math.max(1, Math.round((6 * results.length) / index.length));

  return (
    <main className={styles.desk}>
      <div className={styles.stage}>
        {/* ------------------------- the request slip ------------------------- */}
        <section className={styles.slip} aria-label="Compose a request">
          <header className={styles.slipHead}>
            <span className={styles.rule} aria-hidden />
            <span className="tag">request slip</span>
            <span className={styles.rule} aria-hidden />
          </header>

          <div className={styles.rows}>
            <div className={styles.row}>
              <span className={`${styles.rowLabel} tag`}>form</span>
              <Slot
                placeholder="any form"
                display={filters.form ? label(filters.form) : null}
                options={opts("form")}
                onPick={(v) => toggleSingle("form", v)}
              />
            </div>

            <div className={styles.row}>
              <span className={`${styles.rowLabel} tag`}>meter</span>
              <Slot
                placeholder="any meter"
                display={filters.meter ? label(filters.meter) : null}
                options={opts("meter")}
                onPick={(v) => toggleSingle("meter", v)}
              />
            </div>

            <div className={styles.row}>
              <span className={`${styles.rowLabel} tag`}>era</span>
              <div className={styles.pills}>
                {eraOpts.map((o) => (
                  <button
                    key={o.v}
                    className={`${styles.pill} ${o.on ? styles.pillOn : ""}`}
                    disabled={o.n === 0 && !o.on}
                    aria-pressed={o.on}
                    onClick={() => toggleSingle("era", o.v)}
                  >
                    {o.text}
                    <span className={styles.pillN}>{o.n}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.row}>
              <span className={`${styles.rowLabel} tag`}>using</span>
              <div className={styles.pills}>
                {deviceOpts.map((o) => (
                  <button
                    key={o.v}
                    className={`${styles.pill} ${o.on ? styles.pillOn : ""}`}
                    disabled={o.n === 0 && !o.on}
                    aria-pressed={o.on}
                    onClick={() => toggleMulti("devices", o.v)}
                  >
                    {o.text}
                    <span className={styles.pillN}>{o.n}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.row}>
              <span className={`${styles.rowLabel} tag`}>about</span>
              <div className={styles.slotWrap}>
                <Slot
                  placeholder="any theme"
                  display={
                    filters.themes.length
                      ? joinAnd(filters.themes.map(label))
                      : null
                  }
                  options={multiOpts("themes")}
                  onPick={(v) => toggleMulti("themes", v)}
                  multi
                />
              </div>
            </div>

            <div className={styles.row}>
              <span className={`${styles.rowLabel} tag`}>words</span>
              <input
                type="search"
                className={styles.keyword}
                placeholder="a title, an author…"
                aria-label="Filter by title or author"
                value={filters.q ?? ""}
                onChange={(e) => setParam("q", e.target.value || null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") draw();
                }}
                spellCheck={false}
              />
            </div>
          </div>

          <p className={styles.incant} aria-live="polite">
            {relaxed ? (
              <>
                nothing answers all of that — set aside{" "}
                <button
                  className={styles.relaxChip}
                  onClick={() =>
                    relaxed.facet === "q"
                      ? setParam("q", null)
                      : setParam(relaxed.facet, null)
                  }
                  title="Remove this constraint"
                >
                  {relaxed.facet === "q"
                    ? `“${filters.q}”`
                    : relaxed.facet === "devices" || relaxed.facet === "themes"
                    ? joinAnd(filters[relaxed.facet].map(label))
                    : label(filters[relaxed.facet]!)}
                </button>
                , the weakest constraint, and {relaxed.rows.length} remain
              </>
            ) : (
              <>{sentence(filters)} —</>
            )}
          </p>

          <footer className={styles.slipFoot}>
            <span className={`${styles.tally} tag`}>
              <Odometer value={results.length} />
              <span aria-hidden>
                {" "}of {index.length} answer
                {results.length === 1 ? "s" : ""}
              </span>
              <span className={styles.srOnly}>
                {results.length} of {index.length} poems answer
              </span>
            </span>
            <button
              className={styles.stamp}
              onClick={draw}
              disabled={results.length === 0 || phase === "drawing"}
            >
              {phase === "drawing"
                ? "drawing…"
                : phase === "revealed"
                ? "draw again"
                : "find a poem"}
            </button>
          </footer>
        </section>

        {/* ----------------------------- the table ---------------------------- */}
        <div
          className={`${styles.table} ${phase === "drawing" ? styles.tableDrawing : ""}`}
        >
          {phase === "revealed" && drawn && (
            <article
              className={styles.card}
              key={drawn.id}
              ref={cardRef}
              aria-live="polite"
            >
              <span className={styles.cardNo} aria-hidden>
                N<span className={styles.cardNoSup}>o</span>{" "}
                {String(corpusNumber.get(drawn.id)).padStart(3, "0")}
              </span>
              <h2 className={styles.cardTitle}>{drawn.title}</h2>
              <p className={styles.cardBy}>
                {drawn.author} · {label(drawn.era)}
              </p>
              <div className={styles.cardLines} aria-hidden>
                {drawn.opening.map((l, i) => (
                  <p key={i}>{l}</p>
                ))}
              </div>
              <p className={`${styles.cardMeta} tag`}>
                {label(drawn.form)} · {label(drawn.meter)} · {drawn.lineCount} ll
              </p>
              <div className={styles.cardActs}>
                <Link href={`/poem/${drawn.id}/`} className={styles.readLink}>
                  read this poem <span className={styles.arrow}>→</span>
                </Link>
                {results.length > 1 && (
                  <button
                    className={`${styles.allBtn} tag`}
                    onClick={() => setShowAll((v) => !v)}
                    aria-expanded={showAll}
                  >
                    {showAll ? "hide" : "see"} the other {results.length - 1}
                  </button>
                )}
              </div>
            </article>
          )}

          {showAll && phase === "revealed" && (
            <ol className={styles.all}>
              {results
                .filter((p) => p.id !== drawnId)
                .map((p) => (
                  <li key={p.id}>
                    <Link href={`/poem/${p.id}/`} className={styles.allRow}>
                      <span className={styles.allNum}>
                        {String(corpusNumber.get(p.id)).padStart(3, "0")}
                      </span>
                      <span className={styles.allMain}>
                        <span className={styles.allTitle}>{p.title}</span>
                        <span className={styles.allAuthor}>{p.author}</span>
                      </span>
                      <span className={`${styles.allMeta} tag`}>
                        {label(p.meter)}
                      </span>
                    </Link>
                  </li>
                ))}
            </ol>
          )}

          <figure className={styles.deck} aria-hidden>
            {Array.from({ length: sheets }).map((_, i) => (
              <span
                key={i}
                className={styles.sheet}
                style={{ "--si": sheets - 1 - i } as React.CSSProperties}
              />
            ))}
            <figcaption className={`${styles.deckLabel} tag`}>
              the deck · {index.length} poems
            </figcaption>
          </figure>
        </div>
      </div>
    </main>
  );
}
