import { createMMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

/** App-wide key-value storage on the device (MMKV: synchronous and fast). */
export const storage = createMMKV({ id: 'jalanjer' });

/** Adapter so Zustand stores can persist themselves into MMKV. */
export const zustandStorage: StateStorage = {
  getItem: (name) => storage.getString(name) ?? null,
  setItem: (name, value) => storage.set(name, value),
  removeItem: (name) => {
    storage.remove(name);
  },
};
