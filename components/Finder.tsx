"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { label, type PoemMeta } from "@/lib/poems";
import { Band, Row, shellColumn, shellPage } from "./PageShell";
import styles from "./Finder.module.css";
import shared from "./shared.module.css";

/* ============================================================================
   The finder — two cards on a ruled page.

   The upper card asks: five facets, in the order the design puts them. Three
   take one value each and read as dropdowns (form, meter, theme); two read as
   chip fields (era, device). Every value carries a live count — how many poems
   would answer if you added it to what is already set — parenthesised beside
   the value, in the value's own face.

   The lower card answers. It appears on search and stays live afterwards.
   While it is closed the asking card is the whole page and is padded evenly;
   once it opens the two lean together and the seam between them tightens.

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

/* -------------------------------- controls -------------------------------- */

/** A facet that takes one value and reads as a dropdown. The wrapper draws
 *  the caret in ink it controls, so the caret tracks the placeholder/filled
 *  state the way the value itself does. */
function Dropdown({
  facet,
  heading,
  options,
  current,
  countOf,
  onChange,
}: {
  facet: string;
  heading: string;
  options: string[];
  current: string;
  countOf: (v: string) => number;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={`f-${facet}`}>
        {heading}:
      </label>
      <div
        className={`${styles.selectWrap} ${
          current ? styles.selectWrapFilled : ""
        }`}
      >
        <select
          id={`f-${facet}`}
          className={`${styles.select} ${current ? styles.selectFilled : ""}`}
          value={current}
          onChange={(e) => onChange(e.target.value || null)}
        >
          <option value="">Any</option>
          {options.map((v) => {
            const n = countOf(v);
            return (
              <option key={v} value={v} disabled={n === 0 && v !== current}>
                {label(v)} ({n})
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
}

/** A facet whose values read as chips: several visible at once, each carrying
 *  its live count. */
function ChipField({
  heading,
  options,
  isOn,
  onToggle,
  countOf,
}: {
  heading: string;
  options: string[];
  isOn: (v: string) => boolean;
  onToggle: (v: string) => void;
  countOf: (v: string) => number;
}) {
  return (
    <fieldset className={styles.field}>
      <legend className={styles.label}>{heading}:</legend>
      <div className={styles.chips}>
        {options.map((v) => {
          const on = isOn(v);
          const n = countOf(v);
          return (
            <button
              key={v}
              type="button"
              aria-pressed={on}
              disabled={n === 0 && !on}
              className={`${styles.chip} ${on ? styles.chipOn : ""}`}
              onClick={() => onToggle(v)}
            >
              <span className={styles.chipText}>
                {label(v)} ({n})
              </span>
              <span className={shared.srOnly}>poems</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
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

  const dirty =
    Boolean(filters.form || filters.meter || filters.era) ||
    filters.devices.length > 0 ||
    filters.themes.length > 0;

  const reset = () => {
    router.replace(pathname, { scroll: false });
    setSearched(false);
  };

  /* ------------------------------- rendering ----------------------------- */

  return (
    <main className={shellPage}>
      <Band />

      {/* ----------------------------- the asking --------------------------- */}
      <Row>
        <form
          className={`${shellColumn} ${styles.card} ${
            searched ? "" : styles.cardAlone
          }`}
          onSubmit={(e) => {
            e.preventDefault();
            setSearched(true);
          }}
        >
          <header className={styles.head}>
            <h1 className={styles.wordmark}>prosody</h1>
            <p className={styles.tagline}>
              Find a poem by how it&rsquo;s made&hellip;
            </p>
          </header>

          <hr className={shared.rule} />

          <div className={styles.fields}>
            <Dropdown
              facet="form"
              heading="Form"
              options={forms}
              current={filters.form ?? ""}
              countOf={(v) => countWith("form", v)}
              onChange={(v) => setParam("form", v)}
            />
            <Dropdown
              facet="meter"
              heading="Meter"
              options={meters}
              current={filters.meter ?? ""}
              countOf={(v) => countWith("meter", v)}
              onChange={(v) => setParam("meter", v)}
            />
            <Dropdown
              facet="themes"
              heading="Theme"
              options={themes}
              current={filters.themes[0] ?? ""}
              countOf={(v) => countWith("themes", v)}
              onChange={(v) => setParam("themes", v)}
            />
          </div>

          <ChipField
            heading="Era"
            options={eras}
            isOn={(v) => filters.era === v}
            onToggle={(v) => toggleSingle("era", v)}
            countOf={(v) => countWith("era", v)}
          />

          <ChipField
            heading="Device"
            options={devices}
            isOn={(v) => filters.devices.includes(v)}
            onToggle={toggleDevice}
            countOf={(v) => countWith("devices", v)}
          />

          <div className={styles.acts}>
            <button type="submit" className={styles.action}>
              search
            </button>
            {(dirty || searched) && (
              <button
                type="button"
                className={styles.actionGhost}
                onClick={reset}
              >
                clear
              </button>
            )}
          </div>
        </form>
      </Row>

      {/* ---------------------------- the answering ------------------------- */}
      {searched && (
        <Row>
          <section
            className={`${shellColumn} ${styles.results}`}
            ref={resultsRef}
            aria-live="polite"
          >
            <h2 className={styles.resultsHead}>
              <span>
                {results.length === 1 ? "poem that answers:" : "poems that answer:"}
              </span>
              <span className={styles.resultCount}>
                {results.length} of {index.length}
              </span>
            </h2>

            {results.length === 0 ? (
              <p className={styles.empty}>
                Nothing in the corpus is made that way. Drop a constraint and ask
                again.
              </p>
            ) : (
              <ol className={styles.list}>
                {results.map((p, i) => (
                  <li key={p.id} className={styles.listItem}>
                    <Link href={`/poem/${p.id}/`} className={styles.listRow}>
                      <span className={styles.listNum} aria-hidden>
                        {String(i + 1).padStart(3, "0")}
                      </span>
                      <span className={styles.listTitle}>{p.title}</span>
                      <span className={styles.listBy}>{p.author}</span>
                      <span className={styles.listTags}>
                        <span className={shared.tag}>{label(p.form)}</span>
                        <span className={shared.tag}>{label(p.meter)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </Row>
      )}

      <Band />
    </main>
  );
}
