import { Camera, type CameraRef, Map, Marker, NativeUserLocation } from '@maplibre/maplibre-react-native';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, useColorScheme, useWindowDimensions, View } from 'react-native';
import { useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { BottomSheet } from '@/components/sheet/bottom-sheet';
import { HomeSheetHeader } from '@/features/home-sheet/home-sheet-header';
import { RecentsList } from '@/features/home-sheet/recents-list';
import { RouteLines } from '@/features/route/components/route-lines';
import { RoutePreviewPanel } from '@/features/route/components/route-preview-panel';
import { useRoutes } from '@/features/route/use-routes';
import { useDestinationStore } from '@/stores/destination-store';
import { type Place, usePlacesStore } from '@/stores/places-store';
import { mapButton, radius, spacing, typography, useColors } from '@/theme';

import { DESTINATION_CARD_HEIGHT, DestinationCard } from './components/destination-card';
import { DestinationPin } from './components/destination-pin';
import { MapControls } from './components/map-controls';
import { DEFAULT_ZOOM, MAP_STYLE_URL, SHAH_ALAM } from './constants';
import { useLocationPermission } from './use-location-permission';
import { useSpeedKmh } from './use-speed';

// If the style can't load (no network), don't leave the splash up forever.
const SPLASH_TIMEOUT_MS = 3000;
// Handle + "Where to?" row + chips row (see HomeSheetHeader), without the safe-area inset.
const SHEET_HEADER_HEIGHT = 153;
const SHEET_SPRING = { stiffness: 420, damping: 42, mass: 0.7 } as const;
// Street level, so the pin's surroundings are recognisable.
const DESTINATION_ZOOM = 15.5;

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

  const router = useRouter();
  const cameraRef = useRef<CameraRef>(null);
  const destination = useDestinationStore((s) => s.destination);
  const pickedAt = useDestinationStore((s) => s.pickedAt);
  const setDestination = useDestinationStore((s) => s.setDestination);
  const addRecent = usePlacesStore((s) => s.addRecent);

  const routesState = useRoutes(destination, pickedAt);
  const { routes } = routesState;
  // Selection belongs to one set of routes; a new set selects its first (main) route.
  const [selection, setSelection] = useState<{ routes: typeof routes; id: string } | null>(null);
  const selectedId = selection?.routes === routes ? selection.id : (routes[0]?.id ?? null);
  const selectRoute = (id: string) => setSelection({ routes, id });

  // Route preview panel height, so map buttons and the camera keep clear of it.
  const [panelHeight, setPanelHeight] = useState(0);
  const cardTop = insets.top + mapButton.size + spacing.xxxl;

  // While previewing routes the home sheet is hidden; the map controls ride the route panel instead.
  useEffect(() => {
    sheetHeight.set(withSpring(destination ? Math.max(panelHeight, collapsed) : collapsed, SHEET_SPRING));
  }, [destination, panelHeight, collapsed, sheetHeight]);

  // Routes arrived: zoom out to show all of them between the header card and the panel.
  useEffect(() => {
    if (routes.length === 0 || panelHeight === 0) return;
    const west = Math.min(...routes.map((r) => r.bounds.minLon));
    const south = Math.min(...routes.map((r) => r.bounds.minLat));
    const east = Math.max(...routes.map((r) => r.bounds.maxLon));
    const north = Math.max(...routes.map((r) => r.bounds.maxLat));
    cameraRef.current?.fitBounds([west, south, east, north], {
      padding: {
        top: cardTop + DESTINATION_CARD_HEIGHT + spacing.xl,
        bottom: panelHeight + spacing.xl,
        left: spacing.xxl,
        right: spacing.xxl,
      },
      duration: 700,
    });
  }, [routes, panelHeight, cardTop]);

  // A place was picked (in search or from the sheet): stop following and fly to it.
  useEffect(() => {
    if (!destination) return;
    // Wait a frame so the camera has left follow mode before it moves.
    const frame = requestAnimationFrame(() =>
      cameraRef.current?.flyTo({
        center: destination.coordinate,
        zoom: DESTINATION_ZOOM,
        duration: 900,
      }),
    );
    return () => cancelAnimationFrame(frame);
  }, [destination, pickedAt]);

  const openSearch = () => router.push('/search');
  const goTo = (place: Place) => {
    addRecent(place);
    setDestination(place);
  };
  const onChipPress = (place: Place | null, kind: 'home' | 'work' | 'saved') => {
    if (place) goTo(place);
    else if (kind === 'home' || kind === 'work') router.push({ pathname: '/search', params: { mode: kind } });
  };
  const clearDestination = () => {
    setDestination(null);
    setFollowing(true);
    setPanelHeight(0);
  };
  // Showing a picked place pauses "follow me" until you tap recenter.
  const [recenteredAt, setRecenteredAt] = useState(0);
  const followActive = following && (!destination || recenteredAt > pickedAt);
  const recenter = () => {
    setFollowing(true);
    setRecenteredAt(Date.now());
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
        attributionPosition={{
          top: mapButton.size + spacing.md,
          right: spacing.lg,
        }}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{ center: SHAH_ALAM, zoom: DEFAULT_ZOOM }}
          trackUserLocation={granted && followActive ? 'heading' : undefined}
          onTrackUserLocationChange={(event) =>
            // MapLibre stops following when you pan the map yourself.
            setFollowing(event.nativeEvent.trackUserLocation != null)
          }
        />
        {granted && <NativeUserLocation mode="heading" />}
        <RouteLines routes={routes} selectedId={selectedId} onSelect={selectRoute} />
        {destination && (
          <Marker id="destination" lngLat={destination.coordinate} anchor="bottom">
            <DestinationPin />
          </Marker>
        )}
      </Map>

      <MapControls
        sheetHeight={sheetHeight}
        collapsedSheetHeight={collapsed}
        following={!granted || followActive}
        onRecenter={recenter}
        speedKmh={speedKmh}
        hideBottomRow={destination != null}
      />

      {blocked && !destination && (
        <View
          style={[
            styles.notice,
            {
              top: insets.top + mapButton.size + spacing.lg,
              backgroundColor: colors.surfaceContainerHigh,
            },
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

      {destination && (
        <DestinationCard
          place={destination}
          // Below the OpenStreetMap attribution, which must stay visible.
          top={cardTop}
          onClose={clearDestination}
        />
      )}

      {destination ? (
        <RoutePreviewPanel
          state={routesState}
          selectedId={selectedId}
          onSelect={selectRoute}
          onLayout={(event) => setPanelHeight(Math.round(event.nativeEvent.layout.height))}
        />
      ) : (
        <BottomSheet
          height={sheetHeight}
          detents={detents}
          header={
            <HomeSheetHeader
              onSearchPress={openSearch}
              onVoicePress={() => router.push({ pathname: '/search', params: { voice: '1' } })}
              onPlacePress={onChipPress}
            />
          }
        >
          <RecentsList onPlacePress={goTo} bottomInset={insets.bottom + spacing.lg} />
        </BottomSheet>
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
