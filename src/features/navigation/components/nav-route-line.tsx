import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { useMemo } from 'react';

import type { Route } from '@/features/route/core/valhalla-core';
import { useColors } from '@/theme';

/** The route being driven, as one thick line. Must be rendered inside <Map>. */
export function NavRouteLine({ route }: { route: Route }) {
  const colors = useColors();
  const data = useMemo<GeoJSON.Feature>(
    () => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route.coordinates } }),
    [route],
  );
  const layout = { 'line-cap': 'round', 'line-join': 'round' } as const;
  return (
    <GeoJSONSource id="nav-route" data={data}>
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
        paint={{ 'line-color': colors.route, 'line-width': 10 }}
      />
    </GeoJSONSource>
  );
}
