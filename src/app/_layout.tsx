import '../global.css';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { FpsOverlay } from '@/dev/fps-overlay';
import { useAccountSync } from '@/features/account/places-sync-service';
import { useThemeSetting } from '@/features/settings/use-theme-setting';
import { initSentry, wrapRoot } from '@/lib/sentry';

initSentry();

// Keep the splash up until the map has drawn, so the splash fades straight into
// the real map instead of an empty screen. The home screen hides it.
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true, duration: 250 });

function RootLayout() {
  useThemeSetting();
  useAccountSync();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        {/* Search slides up over the map, like Waze. */}
        <Stack.Screen name="search" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="settings/index" />
        <Stack.Screen name="settings/[page]" />
        <Stack.Screen name="account" />
        <Stack.Screen name="report" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
      {__DEV__ && <FpsOverlay />}
    </GestureHandlerRootView>
  );
}

export default wrapRoot(RootLayout);
