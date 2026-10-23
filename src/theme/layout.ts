import { Platform } from 'react-native';

/** Spacing scale in points (iOS) / dp (Android). 4-point grid. */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Corner radii. `full` makes pills and round map buttons. */
export const radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  /** Bottom sheet top corners. */
  sheet: 28,
  full: 9999,
} as const;

/**
 * Minimum touch target. Apple HIG asks for 44 pt; Material Design 3 asks for
 * 48 dp. Map buttons are bigger than this on purpose (drivers tap them).
 */
export const minTouchTarget = Platform.select({ ios: 44, default: 48 });

/** Sizes for the floating map buttons (Milestone 1). */
export const mapButton = {
  size: 56,
  reportSize: 64,
  /** Gap between a floating button and the screen edge. */
  edgeInset: spacing.lg,
} as const;
