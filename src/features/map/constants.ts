import type { LngLat } from '@maplibre/maplibre-react-native';

/** OpenFreeMap styles. Free, no API key. Light by day, dark by night (follows the phone). */
export const MAP_STYLE_URL = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const;

/** Shah Alam city centre, as [longitude, latitude]. */
export const SHAH_ALAM: LngLat = [101.5183, 3.0733];

export const DEFAULT_ZOOM = 14;
/** Closer zoom while the camera follows you. */
export const FOLLOW_ZOOM = 16;
