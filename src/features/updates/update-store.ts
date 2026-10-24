import { File, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { type BuildInfo, isUpdate, type LatestBuild, parseCurrent, parseLatest } from './core/update-core';

// Published by the Android build workflow after every test build (docs/UPDATES.md).
const LATEST_URL = 'https://github.com/sykrmzffr/JalanJer/releases/download/android-latest/latest.json';
// Android's flag that lets the installer read our downloaded file.
const FLAG_GRANT_READ_URI_PERMISSION = 1;
// Progress shows at most this often, so the download doesn't re-render the screen constantly.
const PROGRESS_EVERY_MS = 250;

/** This build, as baked in by the build workflow (EXPO_PUBLIC_BUILD_SHA / _TIME). */
export const CURRENT_BUILD: BuildInfo | null = parseCurrent(
  process.env.EXPO_PUBLIC_BUILD_SHA,
  process.env.EXPO_PUBLIC_BUILD_TIME,
);

/** In-app updates only exist on Android (iPhone apps can't install themselves). */
export const UPDATES_SUPPORTED = Platform.OS === 'android';

type UpdateState = {
  status: 'idle' | 'checking' | 'up-to-date' | 'available' | 'downloading' | 'installing' | 'error';
  latest: LatestBuild | null;
  progress: { bytes: number; total: number };
  error: string | null;
};

export const useUpdateStore = create<UpdateState>()(() => ({
  status: 'idle',
  latest: null,
  progress: { bytes: 0, total: 0 },
  error: null,
}));

/** Asks GitHub for the newest test build. */
export async function checkForUpdate(): Promise<void> {
  if (!UPDATES_SUPPORTED) return;
  const { status } = useUpdateStore.getState();
  if (status === 'checking' || status === 'downloading' || status === 'installing') return;
  useUpdateStore.setState({ status: 'checking', error: null });
  try {
    // The time in the URL skips any cached copy.
    const response = await fetch(`${LATEST_URL}?t=${Date.now()}`);
    if (response.status === 404) throw new Error('No test build has been published yet.');
    if (!response.ok) throw new Error(`GitHub answered ${response.status}.`);
    const latest = parseLatest(await response.json());
    if (!latest) throw new Error('The build information on GitHub looks broken.');
    useUpdateStore.setState({ latest, status: isUpdate(CURRENT_BUILD, latest) ? 'available' : 'up-to-date' });
  } catch (e) {
    useUpdateStore.setState({ status: 'error', error: friendly(e) });
  }
}

/** Downloads the newest APK and opens Android's installer (you confirm with "Install"). */
export async function installUpdate(): Promise<void> {
  const { latest, status } = useUpdateStore.getState();
  if (!UPDATES_SUPPORTED || !latest || status === 'downloading' || status === 'installing') return;
  useUpdateStore.setState({ status: 'downloading', progress: { bytes: 0, total: 0 }, error: null });
  try {
    const destination = new File(Paths.cache, 'JalanJer-update.apk');
    if (destination.exists) destination.delete();
    let lastShown = 0;
    const apk = await File.downloadFileAsync(latest.apk, destination, {
      idempotent: true,
      onProgress: ({ bytesWritten, totalBytes }) => {
        const now = Date.now();
        if (now - lastShown < PROGRESS_EVERY_MS) return;
        lastShown = now;
        useUpdateStore.setState({ progress: { bytes: bytesWritten, total: totalBytes } });
      },
    });
    useUpdateStore.setState({ status: 'installing' });
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: apk.contentUri,
      type: 'application/vnd.android.package-archive',
      flags: FLAG_GRANT_READ_URI_PERMISSION,
    });
    // Back here: the installer was closed without installing (installing restarts the app).
    useUpdateStore.setState({ status: 'available' });
  } catch (e) {
    useUpdateStore.setState({ status: 'error', error: friendly(e) });
  }
}

function friendly(e: unknown): string {
  const message = e instanceof Error ? e.message : String(e);
  if (/network|fetch|internet|timeout|unable to resolve/i.test(message)) {
    return "Can't reach GitHub. Check your internet.";
  }
  return message;
}

/** Checks once, a few seconds after the app opens (Android test builds only). */
export function useUpdateCheckOnStart() {
  useEffect(() => {
    if (!UPDATES_SUPPORTED || __DEV__) return;
    const timer = setTimeout(checkForUpdate, 4000);
    return () => clearTimeout(timer);
  }, []);
}
