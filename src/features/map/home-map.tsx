import { Camera, Map, NativeUserLocation } from '@maplibre/maplibre-react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, useColorScheme, useWindowDimensions, View } from 'react-native';
import { useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { BottomSheet } from '@/components/sheet/bottom-sheet';
import { HomeSheetHeader } from '@/features/home-sheet/home-sheet-header';
import { RecentsList } from '@/features/home-sheet/recents-list';
import { mapButton, radius, spacing, typography, useColors } from '@/theme';

import { MapControls } from './components/map-controls';
import { DEFAULT_ZOOM, MAP_STYLE_URL, SHAH_ALAM } from './constants';
import { useLocationPermission } from './use-location-permission';
import { useSpeedKmh } from './use-speed';

// If the style can't load (no network), don't leave the splash up forever.
const SPLASH_TIMEOUT_MS = 3000;
// Handle + "Where to?" row + chips row (see HomeSheetHeader), without the safe-area inset.
const SHEET_HEADER_HEIGHT = 153;

/**
 * Home screen: full-screen native map, floating controls and the "Where to?"
 * sheet. Map gestures are handled entirely by MapLibre on the native side, and
 * the sheet/buttons animate on the UI thread, so no JS runs while you drag.
 */
export function HomeMap() {
  const { granted, blocked } = useLocationPermission();
  const colors = useColors();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const collapsed = SHEET_HEADER_HEIGHT + insets.bottom;
  const detents = [collapsed, Math.round(windowHeight * 0.5), windowHeight - insets.top - spacing.xl];
  const sheetHeight = useSharedValue(collapsed);

  const [following, setFollowing] = useState(true);
  const speedKmh = useSpeedKmh(granted);

  const hideSplash = useCallback(() => SplashScreen.hide(), []);
  useEffect(() => {
    const timer = setTimeout(hideSplash, SPLASH_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [hideSplash]);

  const expandSheet = () => {
    sheetHeight.set(withSpring(detents[detents.length - 1], { stiffness: 420, damping: 42, mass: 0.7 }));
  };

  return (
    <View style={styles.root}>
      <Map
        style={StyleSheet.absoluteFill}
        mapStyle={scheme === 'dark' ? MAP_STYLE_URL.dark : MAP_STYLE_URL.light}
        onDidFinishLoadingMap={hideSplash}
        onDidFailLoadingMap={hideSplash}
        // Keeps the followed location centred in the part of the map above the sheet.
        contentInset={{ bottom: collapsed }}
        compass={false}
        logo={false}
        // OpenStreetMap attribution must stay visible: put it under the sound button,
        // where the sheet never covers it. Measured from the safe area on iOS.
        attributionPosition={{ top: mapButton.size + spacing.md, right: spacing.lg }}
      >
        <Camera
          initialViewState={{ center: SHAH_ALAM, zoom: DEFAULT_ZOOM }}
          trackUserLocation={granted && following ? 'heading' : undefined}
          onTrackUserLocationChange={(event) =>
            // MapLibre stops following when you pan the map yourself.
            setFollowing(event.nativeEvent.trackUserLocation != null)
          }
        />
        {granted && <NativeUserLocation mode="heading" />}
      </Map>

      <MapControls
        sheetHeight={sheetHeight}
        collapsedSheetHeight={collapsed}
        following={!granted || following}
        onRecenter={() => setFollowing(true)}
        speedKmh={speedKmh}
      />

      {blocked && (
        <View
          style={[
            styles.notice,
            { top: insets.top + mapButton.size + spacing.lg, backgroundColor: colors.surfaceContainerHigh },
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

      <BottomSheet
        height={sheetHeight}
        detents={detents}
        header={<HomeSheetHeader onSearchPress={expandSheet} onPlacePress={expandSheet} />}
      >
        <RecentsList onPlacePress={expandSheet} bottomInset={insets.bottom + spacing.lg} />
      </BottomSheet>
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
