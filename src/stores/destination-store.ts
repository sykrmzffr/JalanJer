import { create } from 'zustand';

import type { Place } from './places-store';

type DestinationState = {
  /** Place picked in search, shown on the map. Route preview (Milestone 3) starts from here. */
  destination: Place | null;
  /** Changes on every pick, even of the same place again (camera flies again). */
  pickedAt: number;
  setDestination: (place: Place | null) => void;
};

/** Not persisted: a fresh app start shows the plain home map. */
export const useDestinationStore = create<DestinationState>()((set) => ({
  destination: null,
  pickedAt: 0,
  setDestination: (destination) => set({ destination, pickedAt: Date.now() }),
}));
