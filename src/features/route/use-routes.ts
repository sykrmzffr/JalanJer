import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { Place } from '@/stores/places-store';
import { useSettingsStore } from '@/stores/settings-store';

import type { LngLatTuple, Route } from './core/valhalla-core';
import { RouteError, fetchRoutes } from './valhalla-client';

export type RoutesState = {
  routes: Route[];
  status: 'idle' | 'loading' | 'done' | 'error';
  error: string | null;
  retry: () => void;
};

type Answer = { key: string; routes: Route[]; error: string | null };

/** Where the drive starts: a fresh-ish GPS fix with the direction you're facing. */
async function currentStart(): Promise<{ from: LngLatTuple; heading: number | null } | null> {
  const permission = await Location.getForegroundPermissionsAsync();
  if (!permission.granted) return null;
  const position =
    (await Location.getLastKnownPositionAsync({ maxAge: 30_000 })) ??
    (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }));
  // Heading from GPS is only meaningful while moving; otherwise let Valhalla choose.
  const moving = (position.coords.speed ?? 0) > 2;
  return {
    from: [position.coords.longitude, position.coords.latitude],
    heading: moving ? position.coords.heading : null,
  };
}

/**
 * Routes from where you are to `destination`, with the Avoid settings. Asks
 * again when the destination or Avoid choices change; an answer for an older
 * request is ignored.
 */
export function useRoutes(destination: Place | null, pickedAt: number): RoutesState {
  const avoid = useSettingsStore((s) => s.avoid);
  const vehicle = useSettingsStore((s) => s.vehicle);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [attempt, setAttempt] = useState(0);

  const key = destination
    ? `${destination.id}|${pickedAt}|${avoid.tolls}${avoid.highways}${avoid.ferries}|${vehicle}|${attempt}`
    : '';

  useEffect(() => {
    if (!destination) return;
    const controller = new AbortController();
    (async () => {
      const start = await currentStart();
      if (controller.signal.aborted) return;
      if (!start) throw new RouteError('Turn on location to get routes from where you are.', 'no-route');
      const routes = await fetchRoutes(
        { from: start.from, to: destination.coordinate, heading: start.heading, avoid, vehicle },
        controller.signal,
      );
      if (!controller.signal.aborted) setAnswer({ key, routes, error: null });
    })().catch((e: unknown) => {
      if (controller.signal.aborted) return;
      setAnswer({ key, routes: [], error: e instanceof RouteError ? e.message : "Couldn't get routes. Try again." });
    });
    return () => controller.abort();
  }, [key, destination, avoid, vehicle]);

  const retry = () => setAttempt((n) => n + 1);

  if (!destination) return { routes: [], status: 'idle', error: null, retry };
  if (answer?.key !== key) return { routes: [], status: 'loading', error: null, retry };
  if (answer.error) return { routes: [], status: 'error', error: answer.error, retry };
  return { routes: answer.routes, status: 'done', error: null, retry };
}
