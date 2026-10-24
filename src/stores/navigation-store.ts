import { create } from 'zustand';

import type { Route } from '@/features/route/core/valhalla-core';

import type { Place } from './places-store';

type NavigationState = {
  /** The route being driven, or null when not navigating. */
  route: Route | null;
  destination: Place | null;
  /** Fake GPS moving along the route (Settings → Navigation → Practice drive). */
  practice: boolean;
  /** Changes whenever a new route is set (start or reroute), so the engine restarts. */
  routeVersion: number;
  start: (route: Route, destination: Place, practice: boolean) => void;
  /** Swap in a new route after leaving the old one (reroute). */
  replaceRoute: (route: Route) => void;
  stop: () => void;
};

/** The active trip. Not persisted: an app restart ends navigation. */
export const useNavigationStore = create<NavigationState>()((set) => ({
  route: null,
  destination: null,
  practice: false,
  routeVersion: 0,
  start: (route, destination, practice) =>
    set((s) => ({ route, destination, practice, routeVersion: s.routeVersion + 1 })),
  replaceRoute: (route) => set((s) => ({ route, routeVersion: s.routeVersion + 1 })),
  stop: () => set({ route: null, destination: null, practice: false }),
}));
