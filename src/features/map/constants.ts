import type { LngLat, StyleSpecification } from '@maplibre/maplibre-react-native';

import lightStyle from './styles/light.json';

/**
 * Map styles (OpenFreeMap tiles, free, no API key). Light follows the phone's theme.
 * Light is our own flat, Waze-like version of OpenFreeMap "liberty", bundled with the
 * app (`npm run map-style`, docs/MAP_STYLE.md). Dark is OpenFreeMap's own (already flat).
 */
export const MAP_STYLE: { light: StyleSpecification; dark: string } = {
  light: lightStyle as StyleSpecification,
  dark: 'https://tiles.openfreemap.org/styles/dark',
};

/** Shah Alam city centre, as [longitude, latitude]. */
export const SHAH_ALAM: LngLat = [101.5183, 3.0733];

export const DEFAULT_ZOOM = 14;
/** Closer zoom while the camera follows you. */
export const FOLLOW_ZOOM = 16;
