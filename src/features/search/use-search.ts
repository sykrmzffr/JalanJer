import { useEffect, useMemo, useState } from 'react';

import { usePlacesStore } from '@/stores/places-store';

import type { Category } from './categories';
import type { GeocodedPlace } from './core/photon-core';
import { type Candidate, combineResults, expandQuery, type LngLatTuple, type RankedResult } from './core/search-core';
import { SearchError, searchPlaces } from './photon-client';

/** Wait this long after the last keystroke before asking the server (docs/PLAN.md: ~120 ms). */
const DEBOUNCE_MS = 120;
/** Don't ask the server for one or two letters: too many useless results. */
const MIN_REMOTE_CHARS = 3;
/** Recent server answers kept in memory, so backspacing is instant. */
const CACHE_SIZE = 40;

export type SearchStatus = 'idle' | 'loading' | 'done' | 'error';

export type SearchResults = {
  results: RankedResult[];
  status: SearchStatus;
  error: string | null;
  /** Asks the server again after an error. */
  retry: () => void;
};

const cache = new Map<string, GeocodedPlace[]>();

function remember(key: string, value: GeocodedPlace[]) {
  cache.delete(key);
  cache.set(key, value);
  if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value!);
}

/** On-device places as search candidates (Home, Work, Saved, Recents). */
function useLocalCandidates(): Candidate[] {
  const home = usePlacesStore((s) => s.home);
  const work = usePlacesStore((s) => s.work);
  const saved = usePlacesStore((s) => s.saved);
  const recents = usePlacesStore((s) => s.recents);
  return useMemo(() => {
    const list: Candidate[] = [];
    if (home)
      list.push({
        ...home,
        name: 'Home',
        address: home.address || home.name,
        kind: 'home',
        source: 'home',
      });
    if (work)
      list.push({
        ...work,
        name: 'Work',
        address: work.address || work.name,
        kind: 'work',
        source: 'work',
      });
    for (const p of saved) list.push({ ...p, kind: 'saved', source: 'saved' });
    for (const p of recents) list.push({ ...p, kind: 'recent', source: 'recent' });
    return list;
  }, [home, work, saved, recents]);
}

/**
 * Search as you type. On-device matches show on the same frame; server results
 * follow after a short debounce. Typing again cancels the request in flight, so
 * an old, slow answer can never overwrite a newer one.
 *
 * Pass a `category` (Gas, Food…) to list places of that kind near `near`.
 */
export function useSearch(query: string, category: Category | null, near: LngLatTuple | null): SearchResults {
  const local = useLocalCandidates();
  // Last server answer (or failure), tagged with the request it belongs to.
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [attempt, setAttempt] = useState(0);

  const expanded = expandQuery(query);
  const include = category?.include ?? undefined;
  const wantsRemote = include != null || expanded.replace(/\s/g, '').length >= MIN_REMOTE_CHARS;
  // Round the bias point (~1 km) so small GPS jitter doesn't trigger new requests or miss the cache.
  const nearKey = near ? `${near[0].toFixed(2)},${near[1].toFixed(2)}` : '';
  const key = `${expanded}|${include ?? ''}|${nearKey}`;
  const cached = wantsRemote ? cache.get(key) : undefined;

  useEffect(() => {
    if (!wantsRemote || cache.has(key)) return;
    // `attempt` changes on retry, re-running this effect for the same query.
    void attempt;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const bias = nearKey ? (nearKey.split(',').map(Number) as LngLatTuple) : null;
      searchPlaces({ query: expanded, include, near: bias }, controller.signal)
        .then((places) => {
          remember(key, places);
          setAnswer({ key, places, error: null });
        })
        .catch((e: unknown) => {
          if (controller.signal.aborted) return;
          const message = e instanceof SearchError ? e.message : 'Search failed. Try again.';
          setAnswer((prev) => ({
            key,
            places: prev?.places ?? [],
            error: message,
          }));
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, wantsRemote, expanded, include, nearKey, attempt]);

  let status: SearchStatus = 'idle';
  let error: string | null = null;
  if (wantsRemote) {
    if (cached) status = 'done';
    else if (answer?.key === key && answer.error) {
      status = 'error';
      error = answer.error;
    } else status = 'loading';
  }

  // While the next answer loads, keep showing the previous one (no flicker).
  const remotePlaces = !wantsRemote ? EMPTY : (cached ?? answer?.places ?? EMPTY);

  const results = useMemo(() => {
    const remoteCandidates: Candidate[] = remotePlaces.map((p) => ({
      ...p,
      source: 'remote',
    }));
    return combineResults(category ? '' : query, category ? [] : local, remoteCandidates, near);
  }, [remotePlaces, local, category, query, near]);

  const retry = () => {
    setAnswer(null);
    setAttempt((n) => n + 1);
  };

  return { results, status, error, retry };
}

type Answer = { key: string; places: GeocodedPlace[]; error: string | null };
const EMPTY: GeocodedPlace[] = [];
