import { Camera, type CameraRef, Map, Marker, NativeUserLocation } from '@maplibre/maplibre-react-native';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Linking, StyleSheet, Text, useColorScheme, useWindowDimensions, View } from 'react-native';
import { useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { BottomSheet } from '@/components/sheet/bottom-sheet';
import { HomeSheetHeader } from '@/features/home-sheet/home-sheet-header';
import { RecentsList } from '@/features/home-sheet/recents-list';
import { NavManeuverArrow } from '@/features/navigation/components/nav-maneuver-arrow';
import { NavRouteLine } from '@/features/navigation/components/nav-route-line';
import { NavigationOverlay, PUCK_SCREEN_FRACTION } from '@/features/navigation/components/navigation-overlay';
import { NavigationSession, useNavView } from '@/features/navigation/navigation-session';
import { ReportCard } from '@/features/reports/components/report-card';
import { ReportPins } from '@/features/reports/components/report-pins';
import type { Report } from '@/features/reports/core/reports-core';
import { useReportsRefresh } from '@/features/reports/reports-store';
import { RouteLines } from '@/features/route/components/route-lines';
import { RoutePreviewPanel } from '@/features/route/components/route-preview-panel';
import { useRoutes } from '@/features/route/use-routes';
import { useDestinationStore } from '@/stores/destination-store';
import { useNavigationStore } from '@/stores/navigation-store';
import { type Place, usePlacesStore } from '@/stores/places-store';
import { useSettingsStore } from '@/stores/settings-store';
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
// Camera tilt while navigating (degrees).
const NAV_PITCH = 50;

/** Closer at town speeds, further out on highways (MapLibre zoom levels). */
function navZoom(speedKmh: number): number {
  return Math.max(15, Math.min(17.5, 17.5 - speedKmh / 40));
}

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
  // Android back button closes the route preview instead of leaving the app.
  useEffect(() => {
    if (!destination) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setDestination(null);
      setFollowing(true);
      setPanelHeight(0);
      return true;
    });
    return () => subscription.remove();
  }, [destination, setDestination]);

  // ── Reports ──
  useReportsRefresh();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // ── Turn-by-turn ──
  const navRoute = useNavigationStore((s) => s.route);
  const startNavigation = useNavigationStore((s) => s.start);
  const stopNavigation = useNavigationStore((s) => s.stop);
  const practiceDrive = useSettingsStore((s) => s.practiceDrive);
  const navigating = navRoute != null;
  const navView = useNavView((s) => s.view);

  const goNow = () => {
    const route = routes.find((r) => r.id === selectedId);
    if (route && destination) startNavigation(route, destination, practiceDrive);
  };
  const endNavigation = () => {
    stopNavigation();
    clearDestination();
  };

  // While navigating, the camera glides (native, linear) to each new position once a
  // second, turned to the road's direction and tilted. The car arrow is a fixed overlay
  // at PUCK_SCREEN_FRACTION, so the top padding puts the camera's center right there.
  useEffect(() => {
    if (!navigating) return;
    return useNavView.subscribe(({ view }) => {
      if (!view) return;
      cameraRef.current?.easeTo({
        center: view.state.snapped,
        bearing: view.bearing,
        pitch: NAV_PITCH,
        zoom: navZoom(view.speedKmh),
        padding: { top: Math.round((2 * PUCK_SCREEN_FRACTION - 1) * windowHeight), bottom: 0, left: 0, right: 0 },
        duration: 1000,
        easing: 'linear',
      });
    });
  }, [navigating, windowHeight]);

  // Leaving navigation: level the map again and go back to following you.
  useEffect(() => {
    if (navigating) return;
    cameraRef.current?.zoomTo(DEFAULT_ZOOM + 2, {
      pitch: 0,
      bearing: 0,
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
      duration: 500,
    });
  }, [navigating]);

  // Android back button while navigating asks before ending.
  useEffect(() => {
    if (!navigating) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert('End navigation?', undefined, [
        { text: 'Keep going', style: 'cancel' },
        { text: 'End', style: 'destructive', onPress: endNavigation },
      ]);
      return true;
    });
    return () => subscription.remove();
  });

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
        // (Not while navigating: the camera's padding places you at the car arrow instead.)
        contentInset={{ bottom: navigating ? 0 : collapsed }}
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
          // Follow position only, map stays north-up. 'heading' rotated the map with the
          // compass, which jitters constantly. The puck still shows which way you face.
          trackUserLocation={granted && followActive && !navigating ? 'default' : undefined}
          onTrackUserLocationChange={(event) =>
            // MapLibre stops following when you pan the map yourself.
            setFollowing(event.nativeEvent.trackUserLocation != null)
          }
        />
        {granted && !navigating && <NativeUserLocation mode="heading" />}
        {navRoute ? (
          <>
            <NavRouteLine route={navRoute} />
            <NavManeuverArrow />
          </>
        ) : (
          <RouteLines routes={routes} selectedId={selectedId} onSelect={selectRoute} />
        )}
        <ReportPins onPress={setSelectedReport} />
        {destination && (
          <Marker id="destination" lngLat={destination.coordinate} anchor="bottom">
            <DestinationPin />
          </Marker>
        )}
      </Map>

      {navigating ? (
        <>
          <NavigationSession />
          {navView ? <NavigationOverlay nav={navView} onEnd={endNavigation} /> : null}
        </>
      ) : (
        // Everything on the home screen and in route preview (hidden while navigating).
        <>
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
              onGo={goNow}
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
        </>
      )}
      {selectedReport ? (
        <ReportCard
          report={selectedReport}
          // Above whatever is at the bottom: home sheet, route panel or navigation panel.
          bottom={navigating ? insets.bottom + 200 : Math.max(panelHeight, collapsed) + spacing.md}
          onClose={() => setSelectedReport(null)}
        />
      ) : null}
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
