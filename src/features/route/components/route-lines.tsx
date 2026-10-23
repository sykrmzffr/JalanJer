import { type FilterSpecification, GeoJSONSource, Layer, Marker } from '@maplibre/maplibre-react-native';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography, useColors } from '@/theme';

import { bubblePositions, formatDuration, type Route } from '../core/valhalla-core';

type RouteLinesProps = {
  routes: Route[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const SOURCE_ID = 'routes';

/**
 * Route lines and time bubbles, drawn by MapLibre on the GPU. The selected
 * route is drawn last so it sits on top. Tap a line or a bubble to select it.
 * Must be rendered inside <Map>.
 */
export function RouteLines({ routes, selectedId, onSelect }: RouteLinesProps) {
  const colors = useColors();

  // Geometry only changes when new routes arrive. Selecting a route just swaps the
  // layer filters below, so the route shapes aren't sent to the map again.
  const data = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: routes.map((route) => ({
        type: 'Feature',
        id: route.id,
        properties: { routeId: route.id },
        geometry: { type: 'LineString', coordinates: route.coordinates },
      })),
    }),
    [routes],
  );
  const isSelected: FilterSpecification = ['==', ['get', 'routeId'], selectedId ?? ''];
  const isAlternative: FilterSpecification = ['!=', ['get', 'routeId'], selectedId ?? ''];

  const bubbles = useMemo(() => bubblePositions(routes), [routes]);
  const fastest = useMemo(
    () => routes.reduce<Route | null>((best, r) => (!best || r.duration < best.duration ? r : best), null),
    [routes],
  );

  if (routes.length === 0) return null;

  const lineLayout = { 'line-cap': 'round', 'line-join': 'round' } as const;

  return (
    <>
      <GeoJSONSource
        id={SOURCE_ID}
        data={data}
        hitbox={{ top: 12, right: 12, bottom: 12, left: 12 }}
        onPress={(event) => {
          const id = event.nativeEvent.features[0]?.properties?.routeId;
          if (typeof id === 'string') onSelect(id);
        }}
      >
        <Layer
          type="line"
          id="routes-alt-casing"
          source={SOURCE_ID}
          filter={isAlternative}
          layout={lineLayout}
          paint={{ 'line-color': colors.routeAlternative, 'line-width': 10, 'line-opacity': 0.5 }}
        />
        <Layer
          type="line"
          id="routes-alt"
          source={SOURCE_ID}
          filter={isAlternative}
          layout={lineLayout}
          paint={{ 'line-color': colors.routeAlternative, 'line-width': 6 }}
        />
        <Layer
          type="line"
          id="routes-selected-casing"
          source={SOURCE_ID}
          filter={isSelected}
          layout={lineLayout}
          paint={{ 'line-color': colors.onRoute, 'line-width': 11 }}
        />
        <Layer
          type="line"
          id="routes-selected"
          source={SOURCE_ID}
          filter={isSelected}
          layout={lineLayout}
          paint={{ 'line-color': colors.route, 'line-width': 7 }}
        />
      </GeoJSONSource>

      {routes.map((route, i) => {
        const selected = route.id === selectedId;
        return (
          <Marker
            key={route.id}
            id={`bubble-${route.id}`}
            lngLat={bubbles[i]}
            anchor="bottom"
            // MapLibre's own marker tap (a button inside a marker view may not get touches on every platform).
            onPress={() => onSelect(route.id)}
          >
            <View
              accessible
              accessibilityRole="button"
              accessibilityLabel={`Route ${i + 1}, ${formatDuration(route.duration)}`}
              style={[
                styles.bubble,
                {
                  backgroundColor: selected ? colors.route : colors.surface,
                  borderColor: selected ? colors.route : colors.outlineVariant,
                },
              ]}
            >
              <Text style={[typography.labelLarge, { color: selected ? colors.onRoute : colors.onSurface }]}>
                {formatDuration(route.duration)}
              </Text>
              {route === fastest && routes.length > 1 ? (
                <View style={[styles.best, { backgroundColor: selected ? colors.onRoute : colors.route }]}>
                  <Text style={[typography.labelSmall, { color: selected ? colors.route : colors.onRoute }]}>Best</Text>
                </View>
              ) : null}
            </View>
          </Marker>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  best: { paddingHorizontal: spacing.xs + 2, paddingVertical: 1, borderRadius: radius.sm },
});
