import {
  type FilterSpecification,
  GeoJSONSource,
  Layer,
  type LineLayerSpecification,
} from '@maplibre/maplibre-react-native';
import { useMemo } from 'react';

import { maneuverArrow } from '../core/nav-core';
import { useNavView } from '../navigation-session';

// Only show the arrow once the turn is this close (m), so it doesn't sit far up the road.
const SHOW_WITHIN_M = 600;
// Arrow sizes in metres on the ground, so the head (a map shape) and the shaft (a line)
// grow and shrink together with the zoom.
const SHAFT_M = 4;
const OUTLINE_M = 1.2;
// White arrow with a dark edge, like Waze. Same in light and dark mode.
const ARROW = { fill: '#FFFFFF', edge: '#1C1D21' } as const;

/**
 * Line width in screen points that equals `meters` on the ground at any zoom.
 * MapLibre's world is 512 points wide at zoom 0 and doubles each zoom level.
 */
function metersWidth(meters: number, lat: number): NonNullable<LineLayerSpecification['paint']>['line-width'] {
  const perPoint = (zoom: number) => (40_075_016.686 * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** zoom);
  return ['interpolate', ['exponential', 2], ['zoom'], 12, meters / perPoint(12), 22, meters / perPoint(22)];
}

/** Turn arrow drawn on the road at the next maneuver. Must be rendered inside <Map>, after the route line. */
export function NavManeuverArrow() {
  const prepared = useNavView((s) => s.view?.prepared ?? null);
  const next = useNavView((s) => {
    const p = s.view?.progress;
    return p && p.next != null && p.toNext != null && p.toNext <= SHOW_WITHIN_M && !s.view?.state.arrived
      ? p.next
      : null;
  });

  // Geometry only changes when the next maneuver does, not on every GPS fix.
  const arrow = useMemo(() => (prepared && next != null ? maneuverArrow(prepared, next) : null), [prepared, next]);
  const data = useMemo<GeoJSON.FeatureCollection | null>(
    () =>
      arrow && {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { part: 'shaft' },
            geometry: { type: 'LineString', coordinates: arrow.shaft },
          },
          { type: 'Feature', properties: { part: 'head' }, geometry: { type: 'Polygon', coordinates: [arrow.head] } },
        ],
      },
    [arrow],
  );
  if (!arrow || !data) return null;

  const lat = arrow.shaft[0][1];
  const isShaft: FilterSpecification = ['==', ['get', 'part'], 'shaft'];
  const isHead: FilterSpecification = ['==', ['get', 'part'], 'head'];
  const layout = { 'line-cap': 'round', 'line-join': 'round' } as const;

  // Each layer is placed right above the previous one, all above the route line.
  return (
    <GeoJSONSource id="nav-arrow" data={data}>
      <Layer
        type="line"
        id="nav-arrow-shaft-edge"
        source="nav-arrow"
        afterId="nav-route-line"
        filter={isShaft}
        layout={layout}
        paint={{ 'line-color': ARROW.edge, 'line-width': metersWidth(SHAFT_M + 2 * OUTLINE_M, lat) }}
      />
      <Layer
        type="line"
        id="nav-arrow-head-edge"
        source="nav-arrow"
        afterId="nav-arrow-shaft-edge"
        filter={isHead}
        layout={{ 'line-join': 'round' }}
        paint={{ 'line-color': ARROW.edge, 'line-width': metersWidth(2 * OUTLINE_M, lat) }}
      />
      <Layer
        type="line"
        id="nav-arrow-shaft"
        source="nav-arrow"
        afterId="nav-arrow-head-edge"
        filter={isShaft}
        layout={layout}
        paint={{ 'line-color': ARROW.fill, 'line-width': metersWidth(SHAFT_M, lat) }}
      />
      <Layer
        type="fill"
        id="nav-arrow-head"
        source="nav-arrow"
        afterId="nav-arrow-shaft"
        filter={isHead}
        paint={{ 'fill-color': ARROW.fill, 'fill-antialias': true }}
      />
    </GeoJSONSource>
  );
}
