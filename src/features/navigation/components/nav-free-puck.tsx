import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { useMemo } from 'react';

import { useColors } from '@/theme';

import { useNavUi, useNavView } from '../navigation-session';

/**
 * Your position drawn on the map while you look around (camera not following).
 * When following, the car arrow is a fixed overlay instead, so this hides.
 * Must be rendered inside <Map>.
 */
export function NavFreePuck() {
  const colors = useColors();
  const follow = useNavUi((s) => s.follow);
  const at = useNavView((s) => s.view?.state.snapped ?? null);
  const data = useMemo<GeoJSON.Feature | null>(
    () => (at ? { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: at } } : null),
    [at],
  );
  if (follow || !data) return null;
  return (
    <GeoJSONSource id="nav-free-puck" data={data}>
      <Layer
        type="circle"
        id="nav-free-puck-halo"
        source="nav-free-puck"
        paint={{ 'circle-radius': 22, 'circle-color': colors.puck, 'circle-opacity': 0.18 }}
      />
      <Layer
        type="circle"
        id="nav-free-puck-dot"
        source="nav-free-puck"
        paint={{
          'circle-radius': 9,
          'circle-color': colors.puck,
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': 3,
        }}
      />
    </GeoJSONSource>
  );
}
