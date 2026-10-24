import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { useEffect, useMemo, useRef, useState } from 'react';

import { fetchRoutes } from '@/features/route/valhalla-client';
import { useNavigationStore } from '@/stores/navigation-store';
import { useSettingsStore } from '@/stores/settings-store';

import {
  type Fix,
  initialState,
  type NavEvent,
  type NavState,
  type PreparedRoute,
  prepareRoute,
  progress,
  segmentBearing,
  simulatedFix,
  update,
} from './core/nav-core';

// Practice drive speed: 50 km/h.
const PRACTICE_SPEED_MPS = 13.9;
const FIX_INTERVAL_MS = 1000;
// Don't ask for a new route more often than this.
const REROUTE_COOLDOWN_MS = 10_000;

export type NavigationView = {
  prepared: PreparedRoute;
  state: NavState;
  progress: ReturnType<typeof progress>;
  /** Direction of travel (degrees) for the camera. */
  bearing: number;
  /** Speed in km/h from the latest fix. */
  speedKmh: number;
  rerouting: boolean;
  /** Practice drive (simulated GPS). */
  practice: boolean;
};

/**
 * Runs turn-by-turn while a route is active: reads GPS (or practice fixes),
 * updates the navigation state, speaks instructions and reroutes when you
 * leave the route. Keeps the screen on.
 */
export function useNavigation(): NavigationView | null {
  useKeepAwake();
  const route = useNavigationStore((s) => s.route);
  const destination = useNavigationStore((s) => s.destination);
  const practice = useNavigationStore((s) => s.practice);
  const routeVersion = useNavigationStore((s) => s.routeVersion);
  const replaceRoute = useNavigationStore((s) => s.replaceRoute);

  const prepared = useMemo(() => (route ? prepareRoute(route) : null), [route]);
  const [view, setView] = useState<{ version: number; state: NavState; speedKmh: number } | null>(null);
  const [rerouting, setRerouting] = useState(false);
  const lastReroute = useRef(0);

  useEffect(() => {
    if (!prepared || !destination) return;
    let state = initialState(prepared);
    let cancelled = false;

    const speak = (text: string) => {
      if (useSettingsStore.getState().soundMuted) return;
      Speech.speak(text, { language: 'en-GB' });
    };

    const reroute = async (fix: Fix) => {
      const now = Date.now();
      if (now - lastReroute.current < REROUTE_COOLDOWN_MS) return;
      lastReroute.current = now;
      setRerouting(true);
      speak('Rerouting.');
      const { avoid, vehicle } = useSettingsStore.getState();
      try {
        const heading =
          fix.speed != null && fix.speed > 2 ? (await Location.getLastKnownPositionAsync())?.coords.heading : null;
        const [next] = await fetchRoutes(
          { from: fix.coordinate, to: destination.coordinate, heading, avoid, vehicle, alternates: 0 },
          new AbortController().signal,
        );
        if (!cancelled && next) replaceRoute(next);
      } catch {
        // Keep the old route; the next off-route fix (after the cooldown) tries again.
      } finally {
        if (!cancelled) setRerouting(false);
      }
    };

    const handle = (events: NavEvent[], fix: Fix) => {
      for (const event of events) {
        if (event.type === 'speak') speak(event.text);
        else if (event.type === 'step') Haptics.selectionAsync();
        else if (event.type === 'arrived') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        else if (event.type === 'offRoute' && !practice) reroute(fix);
      }
    };

    const onFix = (fix: Fix) => {
      if (cancelled) return;
      const result = update(prepared, state, fix);
      state = result.state;
      setView({ version: routeVersion, state, speedKmh: Math.round((fix.speed ?? 0) * 3.6) });
      handle(result.events, fix);
    };

    let stop: () => void;
    if (practice) {
      const start = Date.now();
      const timer = setInterval(
        () => onFix(simulatedFix(prepared, Date.now() - start, PRACTICE_SPEED_MPS, start)),
        FIX_INTERVAL_MS,
      );
      onFix(simulatedFix(prepared, 0, PRACTICE_SPEED_MPS, start));
      stop = () => clearInterval(timer);
    } else {
      let subscription: Location.LocationSubscription | undefined;
      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: FIX_INTERVAL_MS, distanceInterval: 0 },
        ({ coords, timestamp }) =>
          onFix({
            coordinate: [coords.longitude, coords.latitude],
            accuracy: coords.accuracy,
            // iOS reports -1 when unknown.
            speed: coords.speed != null && coords.speed >= 0 ? coords.speed : null,
            time: timestamp,
          }),
      ).then((sub) => {
        if (cancelled) sub.remove();
        else subscription = sub;
      });
      stop = () => subscription?.remove();
    }

    return () => {
      cancelled = true;
      stop();
      Speech.stop();
    };
  }, [prepared, destination, practice, routeVersion, replaceRoute]);

  // Memoized: a new object only when something changed, so storing it can't loop renders.
  return useMemo(() => {
    if (!prepared || !view || view.version !== routeVersion) return null;
    return {
      prepared,
      state: view.state,
      progress: progress(prepared, view.state),
      bearing: segmentBearing(prepared, view.state.segment),
      speedKmh: view.speedKmh,
      rerouting,
      practice,
    };
  }, [prepared, view, routeVersion, rerouting, practice]);
}
