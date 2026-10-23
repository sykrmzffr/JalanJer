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
};

const MAX_RECENTS = 20;

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
          recents: [place, ...state.recents.filter((p) => p.id !== place.id)].slice(0, MAX_RECENTS),
        })),
      removeRecent: (id) => set((state) => ({ recents: state.recents.filter((p) => p.id !== id) })),
    }),
    {
      name: 'places',
      storage: createJSONStorage(() => zustandStorage),
      partialize: ({ home, work, saved, recents }) => ({ home, work, saved, recents }),
    },
  ),
);
