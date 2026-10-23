import { Redirect, useLocalSearchParams } from 'expo-router';

import { SettingsPage, type SettingsPageId } from '@/features/settings/settings-pages';

const PAGES: SettingsPageId[] = ['general', 'map-display', 'voice', 'navigation', 'vehicle', 'tolls', 'speedometer'];

export default function SettingsDetail() {
  const { page } = useLocalSearchParams<{ page: string }>();
  const known = PAGES.find((p) => p === page);
  return known ? <SettingsPage page={known} /> : <Redirect href="/settings" />;
}
