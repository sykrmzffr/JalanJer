import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { entryKey, MAX_RECENTS, type PlacesSnapshot } from '@/features/account/core/places-sync';
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
  /**
   * When each place last changed (key `kind:slot`), including deleted ones.
   * Used to sync with your account: the newest change wins. See
   * src/features/account/core/places-sync.ts.
   */
  changes: Record<string, number>;
  addRecent: (place: Place) => void;
  removeRecent: (id: string) => void;
  clearRecents: () => void;
  setHome: (place: Place | null) => void;
  setWork: (place: Place | null) => void;
  /** Adds the place to Saved, or removes it if it's already there. */
  toggleSaved: (place: Place) => void;
  /** Replaces everything with a synced result. */
  replaceAll: (snapshot: PlacesSnapshot) => void;
};

/** Strips extra fields (e.g. search result metadata) so only the Place shape is stored. */
export function toPlace({ id, name, address, coordinate }: Place): Place {
  return { id, name, address, coordinate };
}

const stamp = (changes: Record<string, number>, ...keys: string[]) => {
  const now = Date.now();
  const next = { ...changes };
  for (const key of keys) next[key] = now;
  return next;
};

/** Home, Work, saved places and recent destinations. Kept on the device; synced when signed in. */
export const usePlacesStore = create<PlacesState>()(
  persist(
    (set) => ({
      home: null,
      work: null,
      saved: [],
      recents: [],
      changes: {},
      addRecent: (place) =>
        set((state) => {
          const all = [toPlace(place), ...state.recents.filter((p) => p.id !== place.id)];
          const dropped = all.slice(MAX_RECENTS).map((p) => entryKey('recent', p.id));
          return {
            recents: all.slice(0, MAX_RECENTS),
            changes: stamp(state.changes, entryKey('recent', place.id), ...dropped),
          };
        }),
      removeRecent: (id) =>
        set((state) => ({
          recents: state.recents.filter((p) => p.id !== id),
          changes: stamp(state.changes, entryKey('recent', id)),
        })),
      clearRecents: () =>
        set((state) => ({
          recents: [],
          changes: stamp(state.changes, ...state.recents.map((p) => entryKey('recent', p.id))),
        })),
      setHome: (place) =>
        set((state) => ({ home: place ? toPlace(place) : null, changes: stamp(state.changes, 'home:home') })),
      setWork: (place) =>
        set((state) => ({ work: place ? toPlace(place) : null, changes: stamp(state.changes, 'work:work') })),
      toggleSaved: (place) =>
        set((state) => ({
          saved: state.saved.some((p) => p.id === place.id)
            ? state.saved.filter((p) => p.id !== place.id)
            : [toPlace(place), ...state.saved],
          changes: stamp(state.changes, entryKey('saved', place.id)),
        })),
      replaceAll: ({ home, work, saved, recents, changes }) => set({ home, work, saved, recents, changes }),
    }),
    {
      name: 'places',
      storage: createJSONStorage(() => zustandStorage),
      partialize: ({ home, work, saved, recents, changes }) => ({ home, work, saved, recents, changes }),
    },
  ),
);
