import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandStorage } from '@/lib/storage';

export type Place = {
  id: string;
  name: string;
  address: string;
  /** [longitude, latitude] */
  coordinate: [number, number];
};

type PlacesState = {
  home: Place | null;
  work: Place | null;
  saved: Place[];
  recents: Place[];
  addRecent: (place: Place) => void;
  removeRecent: (id: string) => void;
  clearRecents: () => void;
  setHome: (place: Place | null) => void;
  setWork: (place: Place | null) => void;
  /** Adds the place to Saved, or removes it if it's already there. */
  toggleSaved: (place: Place) => void;
};

const MAX_RECENTS = 20;

/** Strips extra fields (e.g. search result metadata) so only the Place shape is stored. */
export function toPlace({ id, name, address, coordinate }: Place): Place {
  return { id, name, address, coordinate };
}

/** Home, Work, saved places and recent destinations. Kept on the device. */
export const usePlacesStore = create<PlacesState>()(
  persist(
    (set) => ({
      home: null,
      work: null,
      saved: [],
      recents: [],
      addRecent: (place) =>
        set((state) => ({
          recents: [toPlace(place), ...state.recents.filter((p) => p.id !== place.id)].slice(0, MAX_RECENTS),
        })),
      removeRecent: (id) => set((state) => ({ recents: state.recents.filter((p) => p.id !== id) })),
      clearRecents: () => set({ recents: [] }),
      setHome: (place) => set({ home: place ? toPlace(place) : null }),
      setWork: (place) => set({ work: place ? toPlace(place) : null }),
      toggleSaved: (place) =>
        set((state) =>
          state.saved.some((p) => p.id === place.id)
            ? { saved: state.saved.filter((p) => p.id !== place.id) }
            : { saved: [toPlace(place), ...state.saved] },
        ),
    }),
    {
      name: 'places',
      storage: createJSONStorage(() => zustandStorage),
      partialize: ({ home, work, saved, recents }) => ({
        home,
        work,
        saved,
        recents,
      }),
    },
  ),
);
