import { useEffect } from 'react';
import { create } from 'zustand';

import { type NavigationView, useNavigation } from './use-navigation';

/** Latest navigation view, for the map layers and overlays (about one update per second). */
export const useNavView = create<{ view: NavigationView | null }>()(() => ({ view: null }));

/**
 * Runs the navigation engine while mounted (mount only during navigation).
 * Renders nothing; the map and overlays read `useNavView`.
 */
export function NavigationSession() {
  const view = useNavigation();
  useEffect(() => {
    // After a reroute there's no view until the next fix; keep showing the last one meanwhile.
    if (view) useNavView.setState({ view });
  }, [view]);
  useEffect(() => () => useNavView.setState({ view: null }), []);
  return null;
}
