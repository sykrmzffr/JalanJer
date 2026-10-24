import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { createMMKV } from 'react-native-mmkv';

// Our Supabase project (accounts and synced places). The publishable key is
// meant to ship inside apps: what it can do is limited by the database's Row
// Level Security rules (supabase/migrations/). Never put the secret /
// service_role key here. Override both with EXPO_PUBLIC_SUPABASE_URL /
// EXPO_PUBLIC_SUPABASE_KEY (e.g. for a separate test project).
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://cxugmbtnmxqwlyuulfkj.supabase.co';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY || 'sb_publishable_nmKVQvIjf1hQAZ6qlVN84g_BrzLNRjv';

// Login session kept on the phone, in its own storage so it's separate from places/settings.
// It's inside the app's private storage (other apps can't read it), like Supabase's own
// React Native guide does with AsyncStorage.
const sessionStorage = createMMKV({ id: 'jalanjer-auth' });

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: {
      getItem: (key) => sessionStorage.getString(key) ?? null,
      setItem: (key, value) => sessionStorage.set(key, value),
      removeItem: (key) => {
        sessionStorage.remove(key);
      },
    },
    persistSession: true,
    autoRefreshToken: true,
    // No web redirects in the app: sign-in uses a 6-digit email code.
    detectSessionInUrl: false,
  },
});

// Keep the login fresh only while the app is open (Supabase's advice for React Native).
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
