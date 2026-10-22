import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

/**
 * Current GPS speed in km/h (rounded), or 0 when unknown.
 * GPS gives about one fix per second, so this re-renders at most ~1x/second.
 */
export function useSpeedKmh(enabled: boolean): number {
  const [speed, setSpeed] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let subscription: Location.LocationSubscription | undefined;
    let cancelled = false;

    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 0, timeInterval: 1000 },
      ({ coords }) => {
        // iOS reports -1 (and some devices null) when speed is unknown.
        const metersPerSecond = coords.speed != null && coords.speed > 0 ? coords.speed : 0;
        setSpeed(Math.round(metersPerSecond * 3.6));
      },
    ).then((sub) => {
      if (cancelled) sub.remove();
      else subscription = sub;
    });

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [enabled]);

  return speed;
}
