import {
  buildReverseUrl,
  buildSearchUrl,
  type GeocodedPlace,
  parsePhotonResponse,
  type PhotonResponse,
  type SearchParams,
} from './core/photon-core';

/**
 * Photon server. Defaults to Komoot's free public server, which asks for
 * "reasonable" use and may throttle heavy users. Fine for development on two
 * phones; switch to our own server (Oracle Always Free) before sharing the app
 * by setting EXPO_PUBLIC_PHOTON_URL. See docs/SEARCH.md.
 */
export const PHOTON_URL = process.env.EXPO_PUBLIC_PHOTON_URL || 'https://photon.komoot.io';

// Search must feel instant; a slow server should fail fast and let local results stand.
const TIMEOUT_MS = 6000;

export class SearchError extends Error {
  constructor(
    message: string,
    readonly kind: 'offline' | 'server' | 'timeout',
  ) {
    super(message);
  }
}

async function getJson(url: string, signal: AbortSignal): Promise<PhotonResponse> {
  // One controller for both "superseded by a newer query" and "too slow".
  // (Plain timer instead of AbortSignal.any/timeout, which React Native may lack.)
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal.addEventListener('abort', onAbort);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new SearchError(`Search server error (${response.status})`, 'server');
    return (await response.json()) as PhotonResponse;
  } catch (error) {
    if (error instanceof SearchError) throw error;
    if (signal.aborted) throw error; // Superseded by a newer query: not an error to show.
    if (timedOut) throw new SearchError('Search took too long. Try again.', 'timeout');
    throw new SearchError("Can't reach search. Check your internet.", 'offline');
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', onAbort);
  }
}

/** Forward search (text and/or category). Pass the AbortSignal so stale requests are cancelled. */
export async function searchPlaces(params: SearchParams, signal: AbortSignal): Promise<GeocodedPlace[]> {
  return parsePhotonResponse(await getJson(buildSearchUrl(PHOTON_URL, params), signal));
}

/** Coordinate -> nearest address (for dropped pins later). */
export async function reverseGeocode(at: [number, number], signal: AbortSignal): Promise<GeocodedPlace | null> {
  return parsePhotonResponse(await getJson(buildReverseUrl(PHOTON_URL, at), signal))[0] ?? null;
}
