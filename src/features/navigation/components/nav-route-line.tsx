import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { useMemo } from 'react';

import type { Route } from '@/features/route/core/valhalla-core';
import { useColors } from '@/theme';

import { useNavView } from '../navigation-session';

/**
 * The route being driven, as one thick line. The part already driven is greyed out
 * with a gradient along the line (`lineMetrics`), so only one paint value changes per
 * GPS fix and the geometry is never re-sent. Must be rendered inside <Map>.
 */
export function NavRouteLine({ route }: { route: Route }) {
  const colors = useColors();
  const data = useMemo<GeoJSON.Feature>(
    () => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route.coordinates } }),
    [route],
  );
  // Fraction of the line already driven (rounded so tiny changes don't re-render).
  const driven = useNavView((s) => {
    const view = s.view;
    if (!view || view.prepared.route !== route || view.prepared.total <= 0) return 0;
    return Math.round(Math.min(1, view.trailAlong / view.prepared.total) * 10_000) / 10_000;
  });
  const layout = { 'line-cap': 'round', 'line-join': 'round' } as const;
  return (
    <GeoJSONSource id="nav-route" data={data} lineMetrics>
      <Layer
        type="line"
        id="nav-route-casing"
        source="nav-route"
        layout={layout}
        paint={{ 'line-color': colors.onRoute, 'line-width': 14 }}
      />
      <Layer
        type="line"
        id="nav-route-line"
        source="nav-route"
        layout={layout}
        paint={{
          'line-width': 10,
          'line-gradient':
            driven > 0
              ? ['step', ['line-progress'], colors.routeTraveled, driven, colors.route]
              : ['step', ['line-progress'], colors.route, 1, colors.route],
        }}
      />
    </GeoJSONSource>
  );
}
