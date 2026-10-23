import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AvoidOptions, Vehicle } from '@/features/route/core/valhalla-core';
import { zustandStorage } from '@/lib/storage';

export type ThemeSetting = 'system' | 'light' | 'dark';

/** Toll payment methods the driver has. Informational for now; later used for toll prices. */
export type TollPasses = { touchNGo: boolean; rfid: boolean; smartTag: boolean };

type SettingsState = {
  /** Spoken directions and alert sounds off. */
  soundMuted: boolean;
  toggleSound: () => void;
  /** Route preferences from the Avoid menu. Remembered between drives, like Waze. */
  avoid: AvoidOptions;
  toggleAvoid: (key: keyof AvoidOptions) => void;
  /** Light/dark for the app and the map. "system" follows the phone. */
  theme: ThemeSetting;
  setTheme: (theme: ThemeSetting) => void;
  vehicle: Vehicle;
  setVehicle: (vehicle: Vehicle) => void;
  showSpeedometer: boolean;
  toggleSpeedometer: () => void;
  tollPasses: TollPasses;
  toggleTollPass: (key: keyof TollPasses) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      soundMuted: false,
      toggleSound: () => set((state) => ({ soundMuted: !state.soundMuted })),
      avoid: { tolls: false, highways: false, ferries: false },
      toggleAvoid: (key) => set((state) => ({ avoid: { ...state.avoid, [key]: !state.avoid[key] } })),
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      vehicle: 'car',
      setVehicle: (vehicle) => set({ vehicle }),
      showSpeedometer: true,
      toggleSpeedometer: () => set((state) => ({ showSpeedometer: !state.showSpeedometer })),
      tollPasses: { touchNGo: false, rfid: false, smartTag: false },
      toggleTollPass: (key) => set((state) => ({ tollPasses: { ...state.tollPasses, [key]: !state.tollPasses[key] } })),
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => zustandStorage),
      partialize: ({ soundMuted, avoid, theme, vehicle, showSpeedometer, tollPasses }) => ({
        soundMuted,
        avoid,
        theme,
        vehicle,
        showSpeedometer,
        tollPasses,
      }),
    },
  ),
);
