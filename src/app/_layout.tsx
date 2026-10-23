import '../global.css';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { FpsOverlay } from '@/dev/fps-overlay';

// Keep the splash up until the map has drawn, so the splash fades straight into
// the real map instead of an empty screen. The home screen hides it.
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true, duration: 250 });

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
      {__DEV__ && <FpsOverlay />}
    </GestureHandlerRootView>
  );
}
