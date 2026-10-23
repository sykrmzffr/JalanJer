import { Platform, type TextStyle } from 'react-native';

// iOS: leaving fontFamily undefined uses the system font, which is SF Pro
// (and switches between SF Pro Text and Display by size automatically).
// Android: the system font is Roboto on most devices; we name it explicitly.
const family = Platform.select({ ios: undefined, default: 'Roboto' });

// The scale follows Material Design 3 type roles. Sizes sit close to Apple's
// Dynamic Type defaults (body 17 on iOS vs 16 on Android) so each platform
// feels native. React Native scales these with the user's text-size setting
// unless `allowFontScaling={false}` is set.
const ios = Platform.OS === 'ios';

function role(size: number, lineHeight: number, weight: TextStyle['fontWeight'], letterSpacing = 0): TextStyle {
  return { fontFamily: family, fontSize: size, lineHeight, fontWeight: weight, letterSpacing };
}

export const typography = {
  displayLarge: role(57, 64, '400'),
  displayMedium: role(45, 52, '400'),
  displaySmall: role(36, 44, '400'),
  headlineLarge: role(32, 40, '700'),
  headlineMedium: role(28, 36, '700'),
  headlineSmall: role(24, 32, '700'),
  titleLarge: role(ios ? 20 : 22, 28, '700'),
  titleMedium: role(ios ? 17 : 16, 24, '600'),
  titleSmall: role(ios ? 15 : 14, 20, '600'),
  bodyLarge: role(ios ? 17 : 16, ios ? 22 : 24, '400'),
  bodyMedium: role(ios ? 15 : 14, 20, '400'),
  bodySmall: role(ios ? 13 : 12, 16, '400'),
  labelLarge: role(ios ? 15 : 14, 20, '600'),
  labelMedium: role(ios ? 13 : 12, 16, '600'),
  labelSmall: role(11, 16, '600'),
  /** Big bold numbers: speedometer, ETA minutes. Tabular so digits don't jump. */
  numeric: { ...role(34, 38, '800'), fontVariant: ['tabular-nums'] } as TextStyle,
} as const;

export type TypographyRole = keyof typeof typography;
