import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type ColorRoles } from './colors';

export { darkColors, lightColors, type ColorRoles } from './colors';
export { mapButton, minTouchTarget, radius, spacing } from './layout';
export { typography, type TypographyRole } from './typography';

/** Colors for the current light/dark setting. */
export function useColors(): ColorRoles {
  return useColorScheme() === 'dark' ? darkColors : lightColors;
}
