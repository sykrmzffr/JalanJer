import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AvoidOptions } from '@/features/route/core/valhalla-core';
import { zustandStorage } from '@/lib/storage';

type SettingsState = {
  /** Spoken directions and alert sounds off. */
  soundMuted: boolean;
  toggleSound: () => void;
  /** Route preferences from the Avoid menu. Remembered between drives, like Waze. */
  avoid: AvoidOptions;
  toggleAvoid: (key: keyof AvoidOptions) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      soundMuted: false,
      toggleSound: () => set((state) => ({ soundMuted: !state.soundMuted })),
      avoid: { tolls: false, highways: false, ferries: false },
      toggleAvoid: (key) => set((state) => ({ avoid: { ...state.avoid, [key]: !state.avoid[key] } })),
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => zustandStorage),
      partialize: ({ soundMuted, avoid }) => ({ soundMuted, avoid }),
    },
  ),
);
