export type ScanToken = { w: string; s: string };

export type Device = {
  name: string;
  lines?: number[];
  line?: number;
  phrase?: string;
  why?: string;
  salient?: boolean;
};

export type Poem = {
  id: string;
  title: string;
  author: string;
  era: string;
  lines: string[];
  meter: string;
  meter_confidence: number;
  stress: string[];
  scansion: ScanToken[][];
  deviations: number[][];
  rhyme_scheme: string;
  form: string;
  devices: Device[];
  themes: string[];
};

/** Slim shape sent to the browser for the finder. */
export type PoemMeta = {
  id: string;
  title: string;
  author: string;
  era: string;
  meter: string;
  form: string;
  devices: string[];
  themes: string[];
  lineCount: number;
  /** First few non-blank lines, for the drawn-card preview. */
  opening: string[];
};

/* ----------------------------- display labels ----------------------------- */

export const LABELS: Record<string, string> = {
  // meters
  iambic_pentameter: "iambic pentameter",
  iambic_tetrameter: "iambic tetrameter",
  iambic_trimeter: "iambic trimeter",
  iambic_hexameter: "iambic hexameter",
  trochaic_tetrameter: "trochaic tetrameter",
  trochaic_octameter: "trochaic octameter",
  anapestic_tetrameter: "anapestic tetrameter",
  anapestic_trimeter: "anapestic trimeter",
  common_meter: "common meter",
  free_verse: "free verse",
  // forms
  sonnet_shakespearean: "sonnet, Shakespearean",
  sonnet_petrarchan: "sonnet, Petrarchan",
  sonnet_other: "sonnet, other",
  blank_verse: "blank verse",
  couplets: "couplets",
  quatrains: "quatrains",
  common_meter_stanzas: "hymn stanzas",
  rhymed_stanzas: "rhymed stanzas",
  villanelle: "villanelle",
  limerick: "limerick",
  irregular: "irregular",
  // eras
  renaissance: "Renaissance",
  seventeenth: "17th century",
  eighteenth: "18th century",
  romantic: "Romantic",
  victorian: "Victorian",
  american_19c: "American 19th c.",
  modern: "Modern",
  // devices
  enjambment: "enjambment",
  caesura: "caesura",
  anaphora: "anaphora",
  refrain: "refrain",
  alliteration: "alliteration",
  volta: "volta",
};

export function label(key: string): string {
  return LABELS[key] ?? key.replace(/_/g, " ");
}

/** Foot pattern per meter, for resolving flexible syllables against the template. */
export const FEET: Record<string, string> = {
  iambic_pentameter: "01",
  iambic_tetrameter: "01",
  iambic_trimeter: "01",
  iambic_hexameter: "01",
  common_meter: "01",
  trochaic_tetrameter: "10",
  trochaic_octameter: "10",
  anapestic_tetrameter: "001",
  anapestic_trimeter: "001",
};
