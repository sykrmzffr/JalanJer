// Pure merge logic for syncing places with Supabase. No React Native imports,
// so it runs in Node for the unit tests (`npm test`).
//
// Model: every Home/Work/Saved/Recent place is one "entry" with a key
// (`kind:slot`) and the time it last changed. Deleting keeps the entry as a
// tombstone (place = null) so other phones learn about the deletion. When two
// phones disagree, the newer change wins (phone clocks; good enough here).

export type PlaceKind = 'home' | 'work' | 'saved' | 'recent';

export type SyncPlace = {
  id: string;
  name: string;
  address: string;
  /** [longitude, latitude] */
  coordinate: [number, number];
};

export type Entry = {
  kind: PlaceKind;
  /** 'home' / 'work', or the place id for saved and recent places. */
  slot: string;
  /** null = deleted (tombstone). */
  place: SyncPlace | null;
  /** Milliseconds since 1970. */
  changedAt: number;
};

/** One row of `public.places` (see supabase/migrations/0001_places.sql). */
export type PlaceRow = {
  kind: PlaceKind;
  slot: string;
  place_id: string;
  name: string;
  address: string;
  lng: number;
  lat: number;
  changed_at: number;
  deleted: boolean;
};

/** What the places store keeps (plus `changes`, the change times by key). */
export type PlacesSnapshot = {
  home: SyncPlace | null;
  work: SyncPlace | null;
  saved: SyncPlace[];
  recents: SyncPlace[];
  /** Change time per entry key, including deleted ones. */
  changes: Record<string, number>;
};

export const MAX_RECENTS = 20;

export const entryKey = (kind: PlaceKind, slot: string) => `${kind}:${slot}`;

/** Splits "kind:slot" back up. Slots may contain ':' (e.g. "osm:W123"). */
function parseKey(key: string): { kind: PlaceKind; slot: string } | null {
  const i = key.indexOf(':');
  const kind = key.slice(0, i);
  if (i < 0 || !['home', 'work', 'saved', 'recent'].includes(kind)) return null;
  return { kind: kind as PlaceKind, slot: key.slice(i + 1) };
}

/** All entries in the local snapshot, including tombstones from `changes`. */
export function entriesFromSnapshot(s: PlacesSnapshot): Map<string, Entry> {
  const out = new Map<string, Entry>();
  const add = (kind: PlaceKind, slot: string, place: SyncPlace) => {
    const key = entryKey(kind, slot);
    out.set(key, { kind, slot, place, changedAt: s.changes[key] ?? 0 });
  };
  if (s.home) add('home', 'home', s.home);
  if (s.work) add('work', 'work', s.work);
  for (const p of s.saved) add('saved', p.id, p);
  for (const p of s.recents) add('recent', p.id, p);
  for (const [key, changedAt] of Object.entries(s.changes)) {
    if (out.has(key)) continue;
    const parsed = parseKey(key);
    if (parsed) out.set(key, { ...parsed, place: null, changedAt });
  }
  return out;
}

/** Rebuilds the store's shape from entries: newest first, recents capped. */
export function snapshotFromEntries(entries: Iterable<Entry>): PlacesSnapshot {
  const all = [...entries].sort((a, b) => b.changedAt - a.changedAt);
  const changes: Record<string, number> = {};
  let home: SyncPlace | null = null;
  let work: SyncPlace | null = null;
  const saved: SyncPlace[] = [];
  const recents: SyncPlace[] = [];
  for (const e of all) {
    changes[entryKey(e.kind, e.slot)] = e.changedAt;
    if (!e.place) continue;
    if (e.kind === 'home') home = e.place;
    else if (e.kind === 'work') work = e.place;
    else if (e.kind === 'saved') saved.push(e.place);
    else recents.push(e.place);
  }
  return { home, work, saved, recents: recents.slice(0, MAX_RECENTS), changes };
}

export function entryToRow(e: Entry): PlaceRow {
  return {
    kind: e.kind,
    slot: e.slot,
    place_id: e.place?.id ?? e.slot,
    name: e.place?.name ?? '',
    address: e.place?.address ?? '',
    lng: e.place?.coordinate[0] ?? 0,
    lat: e.place?.coordinate[1] ?? 0,
    changed_at: e.changedAt,
    deleted: e.place == null,
  };
}

export function rowToEntry(r: PlaceRow): Entry {
  return {
    kind: r.kind,
    slot: r.slot,
    changedAt: Number(r.changed_at),
    place: r.deleted ? null : { id: r.place_id, name: r.name, address: r.address, coordinate: [r.lng, r.lat] },
  };
}

export type MergeResult = {
  /** New local state. */
  snapshot: PlacesSnapshot;
  /** Rows the server needs (local is newer or the server doesn't have them). */
  toPush: PlaceRow[];
};

/**
 * Merges local places with the server's rows: per entry, the newer change
 * wins. Recents beyond the limit become tombstones so the server stays small.
 */
export function mergePlaces(local: PlacesSnapshot, remoteRows: readonly PlaceRow[]): MergeResult {
  const localEntries = entriesFromSnapshot(local);
  const remote = new Map(remoteRows.map((r) => [entryKey(r.kind, r.slot), rowToEntry(r)]));

  const merged = new Map<string, Entry>();
  for (const key of new Set([...localEntries.keys(), ...remote.keys()])) {
    const l = localEntries.get(key);
    const r = remote.get(key);
    merged.set(key, !r || (l && l.changedAt > r.changedAt) ? l! : r);
  }

  // Keep only the newest recents; older ones are deleted everywhere.
  const recents = [...merged.values()]
    .filter((e) => e.kind === 'recent' && e.place)
    .sort((a, b) => b.changedAt - a.changedAt);
  for (const old of recents.slice(MAX_RECENTS)) {
    merged.set(entryKey(old.kind, old.slot), { ...old, place: null });
  }

  const toPush: PlaceRow[] = [];
  for (const [key, e] of merged) {
    const r = remote.get(key);
    const same = r && r.changedAt === e.changedAt && (r.place == null) === (e.place == null);
    if (!same) toPush.push(entryToRow(e));
  }
  return { snapshot: snapshotFromEntries(merged.values()), toPush };
}
