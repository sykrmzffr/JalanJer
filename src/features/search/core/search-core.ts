// Pure search helpers: text matching, distance and ranking.
//
// No React Native imports here, so these run in plain Node for the unit tests
// (`npm test`). Only type imports are allowed (Node strips them).

/** [longitude, latitude] */
export type LngLatTuple = [number, number];

/**
 * Common Malaysian address abbreviations -> full words, so "jln ss2" finds
 * "Jalan SS 2" and "tmn melawati" finds "Taman Melawati". OpenStreetMap
 * names in Malaysia are usually written out in full.
 */
const ABBREVIATIONS: Record<string, string> = {
  jln: 'jalan',
  jl: 'jalan',
  tmn: 'taman',
  kg: 'kampung',
  kpg: 'kampung',
  bdr: 'bandar',
  lrg: 'lorong',
  sg: 'sungai',
  bkt: 'bukit',
  ppr: 'projek perumahan rakyat',
  kl: 'kuala lumpur',
  pj: 'petaling jaya',
  jb: 'johor bahru',
  hosp: 'hospital',
  stn: 'stesen',
};

/** Lowercase, strip accents and punctuation, collapse spaces. */
export function normalize(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Splits letters from digits ("ss2" -> "ss 2") so both spellings match. */
function splitAlphaNum(text: string): string {
  return text.replace(/(\p{L})(\p{N})/gu, '$1 $2').replace(/(\p{N})(\p{L})/gu, '$1 $2');
}

/** Normalized words with Malaysian abbreviations expanded. */
export function tokens(text: string): string[] {
  return splitAlphaNum(normalize(text))
    .split(' ')
    .filter(Boolean)
    .flatMap((word) => (ABBREVIATIONS[word] ?? word).split(' '));
}

/**
 * Query to send to the server: abbreviations expanded, original spacing kept
 * for everything else. Returns '' for a blank query.
 */
export function expandQuery(query: string): string {
  return normalize(query)
    .split(' ')
    .filter(Boolean)
    .map((word) => ABBREVIATIONS[word] ?? word)
    .join(' ');
}

/**
 * How well `text` matches `query`, from 0 (no match) to 1 (exact).
 * Every query word must be the start of some word in the text; the last query
 * word may be unfinished (search as you type).
 */
export function matchScore(query: string, text: string): number {
  const q = tokens(query);
  if (q.length === 0) return 0;
  const t = tokens(text);
  if (t.length === 0) return 0;

  let score = 0;
  for (const word of q) {
    let best = 0;
    for (const candidate of t) {
      if (candidate === word) best = Math.max(best, 1);
      else if (candidate.startsWith(word)) best = Math.max(best, 0.6 + 0.4 * (word.length / candidate.length));
    }
    if (best === 0) return 0;
    score += best;
  }
  score /= q.length;
  // Matching the start of the name is a strong signal ("KL" -> "KL Eco City").
  if (t[0].startsWith(q[0])) score = Math.min(1, score + 0.1);
  // Penalise long names that only match a small part of the query.
  return score * (0.85 + 0.15 * Math.min(1, q.length / t.length));
}

const EARTH_RADIUS_M = 6_371_000;

/** Great-circle distance in metres. */
export function distanceMeters(a: LngLatTuple, b: LngLatTuple): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "350 m", "4.2 km", "38 km". */
export function formatDistance(meters: number): string {
  if (meters < 950) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  const km = meters / 1000;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

/**
 * 1 for "right here", falling towards 0 with distance. Halves about every
 * 8 km, so nearby places win but a strong text match across town still shows.
 */
export function proximityScore(meters: number): number {
  return 1 / (1 + meters / 8000);
}

export type Rankable = {
  /** Text match from `matchScore` (0..1). Server results without a local score use 0.5. */
  textScore: number;
  /** Metres from the user, or null when we don't know where the user is. */
  distance: number | null;
  /** Small boost for places the user has been to or saved (0..1). */
  personal?: number;
};

/** Higher is better. Text match counts most, then distance, then personal history. */
export function rankScore({ textScore, distance, personal = 0 }: Rankable): number {
  const near = distance == null ? 0.5 : proximityScore(distance);
  return textScore * 0.55 + near * 0.35 + personal * 0.1;
}

/** Sorts best first without mutating the input. Stable for equal scores. */
export function rank<T extends Rankable>(items: readonly T[]): T[] {
  return items
    .map((item, index) => ({ item, index, score: rankScore(item) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ item }) => item);
}

/** Two results closer than this with the same name are the same place. */
const DUPLICATE_RADIUS_M = 75;

/** Drops later items that are the same place as an earlier one (same name, very close). */
export function dedupe<T extends { name: string; coordinate: LngLatTuple }>(items: readonly T[]): T[] {
  const kept: T[] = [];
  for (const item of items) {
    const key = normalize(item.name);
    const duplicate = kept.some(
      (other) =>
        normalize(other.name) === key && distanceMeters(other.coordinate, item.coordinate) < DUPLICATE_RADIUS_M,
    );
    if (!duplicate) kept.push(item);
  }
  return kept;
}

export type PlaceSource = 'home' | 'work' | 'saved' | 'recent' | 'remote';

export type Candidate = {
  id: string;
  name: string;
  address: string;
  coordinate: LngLatTuple;
  /** OSM "key:value" for the icon; on-device places use their source instead. */
  kind: string;
  source: PlaceSource;
};

export type RankedResult = Candidate & Rankable & { distance: number | null };

// Remote results already matched the text on the server (with typo tolerance),
// so even when our stricter word check fails they keep a middling text score.
const REMOTE_FLOOR = 0.4;
const PERSONAL: Record<PlaceSource, number> = {
  home: 1,
  work: 1,
  saved: 0.8,
  recent: 0.6,
  remote: 0,
};

/**
 * Merges on-device places (instant) and server results into one ranked list.
 * On-device places only appear when they match the query. With an empty query
 * (category search) every remote result counts as an equal text match, so
 * distance decides.
 */
export function combineResults(
  query: string,
  local: readonly Candidate[],
  remote: readonly Candidate[],
  near: LngLatTuple | null,
): RankedResult[] {
  const hasQuery = normalize(query).length > 0;
  const scored: RankedResult[] = [];
  for (const place of local) {
    const textScore = Math.max(matchScore(query, place.name), matchScore(query, place.address) * 0.8);
    if (!hasQuery || textScore === 0) continue;
    scored.push({
      ...place,
      textScore,
      personal: PERSONAL[place.source],
      distance: near ? distanceMeters(near, place.coordinate) : null,
    });
  }
  for (const place of remote) {
    const textScore = hasQuery ? Math.max(REMOTE_FLOOR, matchScore(query, `${place.name} ${place.address}`)) : 0.5;
    scored.push({
      ...place,
      textScore,
      personal: 0,
      distance: near ? distanceMeters(near, place.coordinate) : null,
    });
  }
  // Rank first so that, among duplicates, the best-placed copy (usually the saved one) survives.
  return dedupe(rank(scored));
}
