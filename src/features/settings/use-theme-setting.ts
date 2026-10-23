import { useEffect } from 'react';
import { Appearance } from 'react-native';

import { useSettingsStore } from '@/stores/settings-store';

/**
 * Applies Settings → Map display → Appearance to the whole app (and the map
 * style, which follows the app's colour scheme). "unspecified" hands control
 * back to the phone's own light/dark setting.
 */
export function useThemeSetting() {
  const theme = useSettingsStore((s) => s.theme);
  useEffect(() => {
    Appearance.setColorScheme(theme === 'system' ? 'unspecified' : theme);
  }, [theme]);
}
