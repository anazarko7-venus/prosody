"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { label, type PoemMeta } from "@/lib/poems";
import styles from "./Finder.module.css";

/* ============================================================================
   The finder — one card on a ruled page.

   Five facets, in the order the design puts them: three that take one value
   each and read as dropdowns (form, meter, theme), two that read as chip
   fields (era, device). Every value carries a live count: how many poems
   would answer if you added it to what is already set. The counts are set in
   Monofett, so they read as stamped marks rather than as more words.

   State lives in the URL, so a search is a link.
   ========================================================================= */

const SINGLE = ["form", "meter", "era"] as const;
type SingleFacet = (typeof SINGLE)[number];

type Filters = {
  form?: string;
  meter?: string;
  era?: string;
  devices: string[];
  themes: string[];
};

function matches(p: PoemMeta, f: Filters): boolean {
  if (f.form && p.form !== f.form) return false;
  if (f.meter && p.meter !== f.meter) return false;
  if (f.era && p.era !== f.era) return false;
  if (!f.devices.every((d) => p.devices.includes(d))) return false;
  if (!f.themes.every((t) => p.themes.includes(t))) return false;
  return true;
}

/** Distinct values of a facet across the corpus, commonest first. */
function valuesOf(index: PoemMeta[], pick: (p: PoemMeta) => string | string[]) {
  const n = new Map<string, number>();
  for (const p of index) {
    const v = pick(p);
    for (const one of Array.isArray(v) ? v : [v]) {
      if (one) n.set(one, (n.get(one) ?? 0) + 1);
    }
  }
  return [...n.keys()].sort((a, b) => (n.get(b) ?? 0) - (n.get(a) ?? 0));
}

/* --------------------------------- screen -------------------------------- */

export default function Finder({ index }: { index: PoemMeta[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const filters: Filters = useMemo(() => {
    const list = (k: string) => params.get(k)?.split(",").filter(Boolean) ?? [];
    const f: Filters = { devices: list("devices"), themes: list("themes") };
    for (const k of SINGLE) {
      const v = params.get(k);
      if (v) f[k] = v;
    }
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

  const toggleDevice = (v: string) => {
    const next = filters.devices.includes(v)
      ? filters.devices.filter((x) => x !== v)
      : [...filters.devices, v];
    setParam("devices", next.length ? next.join(",") : null);
  };

  /* ------------------------------- the sets ------------------------------ */

  const forms = useMemo(() => valuesOf(index, (p) => p.form), [index]);
  const meters = useMemo(() => valuesOf(index, (p) => p.meter), [index]);
  const themes = useMemo(() => valuesOf(index, (p) => p.themes), [index]);
  const eras = useMemo(() => valuesOf(index, (p) => p.era), [index]);
  const devices = useMemo(() => valuesOf(index, (p) => p.devices), [index]);

  /** How many poems answer if this value were set on this facet. */
  const countWith = useCallback(
    (facet: keyof Filters, v: string) => {
      const probe: Filters = {
        ...filters,
        devices: [...filters.devices],
        themes: [...filters.themes],
      };
      if (facet === "devices") {
        if (!probe.devices.includes(v)) probe.devices = [...probe.devices, v];
      } else if (facet === "themes") {
        probe.themes = [v];
      } else {
        probe[facet] = v;
      }
      return index.filter((p) => matches(p, probe)).length;
    },
    [filters, index]
  );

  const results = useMemo(
    () => index.filter((p) => matches(p, filters)),
    [index, filters]
  );

  const corpusNumber = useMemo(() => {
    const m = new Map<string, number>();
    index.forEach((p, i) => m.set(p.id, i + 1));
    return m;
  }, [index]);

  const active =
    Boolean(filters.form || filters.meter || filters.era) ||
    filters.devices.length > 0 ||
    filters.themes.length > 0;

  /* ------------------------------ the search ----------------------------- */

  const [searched, setSearched] = useState(false);
  const resultsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!searched || !resultsRef.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultsRef.current.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "nearest",
    });
  }, [searched]);

  const reset = () => {
    router.replace(pathname, { scroll: false });
    setSearched(false);
  };

  /* ------------------------------- rendering ----------------------------- */

  const dropdown = (
    facet: "form" | "meter" | "themes",
    heading: string,
    options: string[]
  ) => {
    const current =
      facet === "themes" ? filters.themes[0] ?? "" : filters[facet] ?? "";
    return (
      <div className={styles.field}>
        <label className={styles.label} htmlFor={`f-${facet}`}>
          {heading}:
        </label>
        <select
          id={`f-${facet}`}
          className={`${styles.select} ${current ? styles.selectFilled : ""}`}
          value={current}
          onChange={(e) => setParam(facet, e.target.value || null)}
        >
          <option value="">Any</option>
          {options.map((v) => {
            const n = countWith(facet, v);
            return (
              <option key={v} value={v} disabled={n === 0 && v !== current}>
                {label(v)} ({n})
              </option>
            );
          })}
        </select>
      </div>
    );
  };

  const chipField = (
    heading: string,
    options: string[],
    isOn: (v: string) => boolean,
    onToggle: (v: string) => void,
    facet: keyof Filters
  ) => (
    <fieldset className={styles.field}>
      <legend className={styles.label}>{heading}:</legend>
      <div className={styles.chips}>
        {options.map((v) => {
          const on = isOn(v);
          const n = countWith(facet, v);
          return (
            <button
              key={v}
              type="button"
              aria-pressed={on}
              disabled={n === 0 && !on}
              className={`${styles.chip} ${on ? styles.chipOn : ""}`}
              onClick={() => onToggle(v)}
            >
              <span className={styles.chipText}>{label(v)}</span>
              <span className={styles.chipCount} aria-hidden>
                {n}
              </span>
              <span className={styles.srOnly}>{n} poems</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );

  return (
    <main className={styles.page}>
      <div className={styles.gridTop} aria-hidden />
      <div className={styles.gridLeft} aria-hidden />
      <div className={styles.gridRight} aria-hidden />
      <div className={styles.gridBottom} aria-hidden />

      <form
        className={styles.card}
        onSubmit={(e) => {
          e.preventDefault();
          setSearched(true);
        }}
      >
        <header className={styles.head}>
          <h1 className={styles.wordmark}>Prosody</h1>
          <p className={styles.tagline}>Find a poem by how it&rsquo;s made&hellip;</p>
        </header>

        <hr className={styles.rule} />

        <div className={styles.row}>
          {dropdown("form", "Form", forms)}
          {dropdown("meter", "Meter", meters)}
          {dropdown("themes", "Theme", themes)}
        </div>

        <hr className={styles.rule} />

        {chipField(
          "Era",
          eras,
          (v) => filters.era === v,
          (v) => toggleSingle("era", v),
          "era"
        )}

        <hr className={styles.rule} />

        {chipField(
          "Device",
          devices,
          (v) => filters.devices.includes(v),
          toggleDevice,
          "devices"
        )}

        <hr className={styles.rule} />

        <div className={styles.acts}>
          <button type="submit" className={styles.action}>
            Search
          </button>
          {active && (
            <button type="button" className={styles.reset} onClick={reset}>
              clear all
            </button>
          )}
        </div>

        {searched && (
          <>
            <hr className={styles.rule} />
            <section className={styles.results} ref={resultsRef} aria-live="polite">
              <h2 className={styles.label}>
                {results.length === 1 ? "One poem answers" : "Poems that answer"}:
                <span className={styles.resultCount} aria-hidden>
                  {results.length}
                </span>
                <span className={styles.srOnly}>{results.length}</span>
              </h2>

              {results.length === 0 ? (
                <p className={styles.empty}>
                  Nothing in the corpus is made that way. Drop a constraint and
                  ask again.
                </p>
              ) : (
                <ol className={styles.list}>
                  {results.map((p) => (
                    <li key={p.id}>
                      <Link href={`/poem/${p.id}/`} className={styles.listRow}>
                        <span className={styles.listNum}>
                          {String(corpusNumber.get(p.id)).padStart(3, "0")}
                        </span>
                        <span className={styles.listMain}>
                          <span className={styles.listTitle}>{p.title}</span>
                          <span className={styles.listBy}>{p.author}</span>
                        </span>
                        <span className={styles.listMeta}>
                          {label(p.form)} · {label(p.meter)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </>
        )}
      </form>
    </main>
  );
}
