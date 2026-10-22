import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandStorage } from '@/lib/storage';

type SettingsState = {
  /** Spoken directions and alert sounds off. */
  soundMuted: boolean;
  toggleSound: () => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      soundMuted: false,
      toggleSound: () => set((state) => ({ soundMuted: !state.soundMuted })),
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => zustandStorage),
      partialize: ({ soundMuted }) => ({ soundMuted }),
    },
  ),
);
