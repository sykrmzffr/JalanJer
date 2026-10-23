import { Camera, Map, NativeUserLocation } from '@maplibre/maplibre-react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { radius, spacing, typography, useColors } from '@/theme';

import { DEFAULT_ZOOM, MAP_STYLE_URL, SHAH_ALAM } from './constants';
import { useLocationPermission } from './use-location-permission';

// If the style can't load (no network), don't leave the splash up forever.
const SPLASH_TIMEOUT_MS = 3000;

/**
 * Milestone 0 proof-of-smoothness screen: a full-screen native map and the
 * native location puck. Gestures are handled entirely by MapLibre on the
 * native side; no JS runs while panning, zooming or rotating.
 */
export function HomeMap() {
  const { granted, blocked } = useLocationPermission();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const hideSplash = useCallback(() => SplashScreen.hide(), []);

  useEffect(() => {
    const timer = setTimeout(hideSplash, SPLASH_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [hideSplash]);

  return (
    <View style={styles.root}>
      <Map
        style={StyleSheet.absoluteFill}
        mapStyle={MAP_STYLE_URL}
        onDidFinishLoadingMap={hideSplash}
        onDidFailLoadingMap={hideSplash}
        compass={false}
      >
        <Camera initialViewState={{ center: SHAH_ALAM, zoom: DEFAULT_ZOOM }} />
        {granted && <NativeUserLocation mode="heading" />}
      </Map>

      {blocked && (
        <View
          style={[
            styles.notice,
            { top: insets.top + spacing.sm, backgroundColor: colors.surfaceContainerHigh },
          ]}
        >
          <Text style={[typography.bodyMedium, { color: colors.onSurface }]}>
            Location is off for JalanJer!. Turn it on to see where you are.
          </Text>
          <Button size="sm" onPress={() => Linking.openSettings()}>
            Open Settings
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  notice: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: radius.lg,
    alignItems: 'flex-start',
  },
});
