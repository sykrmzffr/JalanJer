import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

export type SyncStatus = 'idle' | 'syncing' | 'error';

type AccountState = {
  /** Null when signed out. */
  session: Session | null;
  /** True once the saved login (if any) has been read at app start. */
  ready: boolean;
  sync: SyncStatus;
  syncError: string | null;
  /** Milliseconds since 1970, or null if never synced on this phone. */
  lastSyncedAt: number | null;
};

/** Login and sync state. Not persisted: Supabase keeps the session itself. */
export const useAccountStore = create<AccountState>()(() => ({
  session: null,
  ready: false,
  sync: 'idle',
  syncError: null,
  lastSyncedAt: null,
}));
