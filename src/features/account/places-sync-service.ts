import { useEffect } from 'react';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase';
import { usePlacesStore } from '@/stores/places-store';

import { useAccountStore } from './account-store';
import { mergePlaces, type PlaceRow } from './core/places-sync';

const COLUMNS = 'kind,slot,place_id,name,address,lng,lat,changed_at,deleted';
// Wait this long after the last change before syncing, so a burst of edits is one sync.
const CHANGE_DEBOUNCE_MS = 3000;

let running: Promise<void> | null = null;
let again = false;
// True while sync writes its result into the store, so that write doesn't trigger another sync.
let applyingSync = false;

async function syncOnce(): Promise<void> {
  const session = useAccountStore.getState().session;
  if (!session) return;
  useAccountStore.setState({ sync: 'syncing', syncError: null });

  const { data, error } = await supabase.from('places').select(COLUMNS);
  if (error) throw error;

  // Merge with the places as they are *now* (they may have changed during the download).
  const local = usePlacesStore.getState();
  const { snapshot, toPush } = mergePlaces(local, (data ?? []) as PlaceRow[]);
  const { home, work, saved, recents, changes } = local;
  if (JSON.stringify(snapshot) !== JSON.stringify({ home, work, saved, recents, changes })) {
    applyingSync = true;
    try {
      local.replaceAll(snapshot);
    } finally {
      applyingSync = false;
    }
  }

  if (toPush.length > 0) {
    const rows = toPush.map((r) => ({ ...r, user_id: session.user.id }));
    const { error: pushError } = await supabase.from('places').upsert(rows, { onConflict: 'user_id,kind,slot' });
    // Local state is already merged; a failed push is retried on the next sync.
    if (pushError) throw pushError;
  }
  useAccountStore.setState({ sync: 'idle', lastSyncedAt: Date.now() });
}

/**
 * Syncs places with the signed-in account. Only one sync runs at a time; a
 * request during a sync runs one more sync right after.
 */
export function syncPlaces(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        again = false;
        await syncOnce();
      } while (again);
    } catch (e) {
      // Supabase returns network failures as error objects whose message mentions the fetch failure.
      const message = e instanceof Error ? e.message : String((e as { message?: unknown })?.message ?? '');
      const offline = e instanceof TypeError || /network|fetch/i.test(message);
      useAccountStore.setState({
        sync: 'error',
        syncError: offline ? "Can't reach your account. Check your internet." : 'Sync failed. It will try again.',
      });
    } finally {
      running = null;
    }
  })();
  return running;
}

/**
 * Keeps the login state and places sync running for the whole app.
 * Mount once, in the root layout.
 */
export function useAccountSync() {
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      useAccountStore.setState({ session: data.session, ready: true });
      if (data.session) syncPlaces();
    });

    const { data: auth } = supabase.auth.onAuthStateChange((event, session) => {
      useAccountStore.setState({ session, ready: true });
      if (event === 'SIGNED_IN') syncPlaces();
      if (event === 'SIGNED_OUT') useAccountStore.setState({ sync: 'idle', syncError: null, lastSyncedAt: null });
    });

    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncPlaces();
    });

    // Sync a moment after any change to places (only the change times matter).
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = usePlacesStore.subscribe((state, prev) => {
      if (applyingSync || state.changes === prev.changes) return;
      clearTimeout(timer);
      timer = setTimeout(syncPlaces, CHANGE_DEBOUNCE_MS);
    });

    return () => {
      auth.subscription.unsubscribe();
      appState.remove();
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);
}
