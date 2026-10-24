import { buildRouteRequest, parseRouteResponse, type Route, type RouteRequest } from './core/valhalla-core';

/**
 * Valhalla routing server. Defaults to the free public server run by FOSSGIS
 * (fair use, rate limited, no uptime promise): fine for testing on our own
 * phones. Switch to our own server before sharing the app by setting
 * EXPO_PUBLIC_VALHALLA_URL. See docs/ROUTING.md.
 */
export const VALHALLA_URL = process.env.EXPO_PUBLIC_VALHALLA_URL || 'https://valhalla1.openstreetmap.de';

// Valhalla's README asks apps using the public server to identify themselves with this header.
const CLIENT_ID = 'JalanJer';
const TIMEOUT_MS = 10_000;

export class RouteError extends Error {
  constructor(
    message: string,
    readonly kind: 'offline' | 'server' | 'timeout' | 'no-route',
  ) {
    super(message);
  }
}

/** Fetches the main route plus alternates. Pass the AbortSignal so a newer request cancels this one. */
export async function fetchRoutes(request: RouteRequest, signal: AbortSignal): Promise<Route[]> {
  // Plain timer instead of AbortSignal.any/timeout, which React Native may lack.
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal.addEventListener('abort', onAbort);

  try {
    const response = await fetch(`${VALHALLA_URL.replace(/\/+$/, '')}/route`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Client-Id': CLIENT_ID },
      body: JSON.stringify(buildRouteRequest(request)),
    });
    // Valhalla answers 400 with an error_code when no route exists (e.g. across the sea).
    if (response.status === 400) throw new RouteError("Couldn't find a driving route there.", 'no-route');
    if (!response.ok) throw new RouteError(`Routing server error (${response.status})`, 'server');
    const routes = parseRouteResponse(await response.json());
    if (routes.length === 0) throw new RouteError("Couldn't find a driving route there.", 'no-route');
    return routes;
  } catch (error) {
    if (error instanceof RouteError) throw error;
    if (signal.aborted) throw error; // Superseded: not an error to show.
    if (timedOut) throw new RouteError('Routing took too long. Try again.', 'timeout');
    throw new RouteError("Can't reach the routing server. Check your internet.", 'offline');
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', onAbort);
  }
}
