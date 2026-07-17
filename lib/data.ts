// Server-only data access. The full annotated corpus is 3 MB; only the
// slim index (buildIndex) or a single poem ever crosses to the client.
import { readFileSync } from "fs";
import { join } from "path";
import type { Poem, PoemMeta } from "./poems";

let cache: Poem[] | null = null;

export function allPoems(): Poem[] {
  if (!cache) {
    cache = JSON.parse(
      readFileSync(join(process.cwd(), "data", "poems.json"), "utf-8")
    ) as Poem[];
  }
  return cache;
}

export function poemById(id: string): Poem | undefined {
  return allPoems().find((p) => p.id === id);
}

export function buildIndex(): PoemMeta[] {
  return allPoems().map((p) => ({
    id: p.id,
    title: p.title,
    author: p.author,
    era: p.era,
    meter: p.meter,
    form: p.form,
    devices: [
      ...new Set(p.devices.filter((d) => d.salient !== false).map((d) => d.name)),
    ],
    themes: p.themes,
    lineCount: p.lines.filter((l) => l.trim()).length,
    opening: p.lines.filter((l) => l.trim()).slice(0, 3),
  }));
}
