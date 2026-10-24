import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { LngLatTuple } from './core/search-core';

/**
 * Where the user is, for "nearest first" ranking. Uses the last known position
 * (instant, no GPS wait), then one fresh fix if the old one is stale.
 * Null when location is off or unknown.
 */
export function useUserCoordinate(): LngLatTuple | null {
  const [coordinate, setCoordinate] = useState<LngLatTuple | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted || cancelled) return;
      const last = await Location.getLastKnownPositionAsync({
        maxAge: 5 * 60_000,
      });
      if (last && !cancelled) setCoordinate([last.coords.longitude, last.coords.latitude]);
      if (last && Date.now() - last.timestamp < 60_000) return;
      const fresh = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (!cancelled) setCoordinate([fresh.coords.longitude, fresh.coords.latitude]);
    })().catch(() => {
      // No fix (e.g. indoors, location services off): rank without distance.
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return coordinate;
}
