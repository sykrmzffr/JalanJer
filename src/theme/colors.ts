// Color tokens, named after Material Design 3 color roles so iOS and Android
// share one vocabulary. iOS uses the same roles; only the components differ.
//
// Where a value says "sampled", it was read from the pixels of the Waze
// reference screens in `IMAGE REFERENCES/`. Everything else is a starting
// choice for JalanJer! and can be changed freely.
//
// After editing this file run `npm run tokens` so the Uniwind/beUI CSS
// variables in `src/styles/theme.css` stay in sync.

export type ColorRoles = {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  background: string;
  onBackground: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  inverseSurface: string;
  inverseOnSurface: string;
  outline: string;
  outlineVariant: string;
  scrim: string;
  shadow: string;

  // Brand accents (not M3 roles; map-specific)
  /** Yellow "+" report button background. Sampled. */
  report: string;
  /** Icon/text on the report button. Sampled. */
  onReport: string;
  /** Selected route line and the "Best" bubble. Sampled. */
  route: string;
  onRoute: string;
  /** Alternative (not selected) route lines. */
  routeAlternative: string;
  /** Speedometer bubble background. Sampled. */
  speedometer: string;
  onSpeedometer: string;
  /** Speedometer when over the speed limit. */
  speeding: string;
  /** User location puck. Sampled. */
  puck: string;
  /** Notification dot on the menu button. Sampled. */
  badge: string;
  success: string;
  warning: string;
};

export const lightColors: ColorRoles = {
  primary: '#0099FF', // sampled: "Go now" button
  onPrimary: '#FFFFFF',
  primaryContainer: '#D6ECFF',
  onPrimaryContainer: '#002E4F',
  secondary: '#4F03AD', // sampled: selected route
  onSecondary: '#FFFFFF',
  secondaryContainer: '#EADDFF',
  onSecondaryContainer: '#21005D',
  tertiary: '#02B3D4', // sampled: puck triangle
  onTertiary: '#FFFFFF',
  error: '#D32F2F',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',
  background: '#FFFFFF',
  onBackground: '#1A1C1E',
  surface: '#FFFFFF', // sampled: bottom sheet
  onSurface: '#1A1C1E',
  surfaceVariant: '#E1E3EA',
  onSurfaceVariant: '#5C5F66',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F8F9FC',
  surfaceContainer: '#F3F4F9', // sampled: search field, "Leave later"
  surfaceContainerHigh: '#ECEEF3',
  surfaceContainerHighest: '#E6E8EE',
  inverseSurface: '#2E3033',
  inverseOnSurface: '#F0F0F4',
  outline: '#C4C7CF',
  outlineVariant: '#E3E5EA',
  scrim: '#000000',
  shadow: '#000000',

  report: '#FCE353', // sampled
  onReport: '#040402', // sampled
  route: '#4F03AD', // sampled
  onRoute: '#FFFFFF',
  routeAlternative: '#B79AE6',
  speedometer: '#45484D', // sampled
  onSpeedometer: '#FFFFFF',
  speeding: '#E53935',
  puck: '#0099FF', // sampled: route preview puck
  badge: '#FE5252', // sampled
  success: '#0E9F6E',
  warning: '#F59E0B',
};

export const darkColors: ColorRoles = {
  primary: '#33ADFF',
  onPrimary: '#00213A',
  primaryContainer: '#004A7A',
  onPrimaryContainer: '#D6ECFF',
  secondary: '#B79AE6',
  onSecondary: '#2A0066',
  secondaryContainer: '#3D0A8A',
  onSecondaryContainer: '#EADDFF',
  tertiary: '#4FD3EA',
  onTertiary: '#00363F',
  error: '#FFB4AB',
  onError: '#690005',
  errorContainer: '#93000A',
  onErrorContainer: '#FFDAD6',
  background: '#111315',
  onBackground: '#E3E3E6',
  surface: '#111315',
  onSurface: '#E3E3E6',
  surfaceVariant: '#43464C',
  onSurfaceVariant: '#C4C6CD',
  surfaceContainerLowest: '#0C0E10',
  surfaceContainerLow: '#191B1E',
  surfaceContainer: '#1D2023',
  surfaceContainerHigh: '#282A2D',
  surfaceContainerHighest: '#333538',
  inverseSurface: '#E3E3E6',
  inverseOnSurface: '#2E3033',
  outline: '#8E9098',
  outlineVariant: '#43464C',
  scrim: '#000000',
  shadow: '#000000',

  report: '#FCE353',
  onReport: '#040402',
  route: '#8E5CF0',
  onRoute: '#FFFFFF',
  routeAlternative: '#5B4A80',
  speedometer: '#2B2D31',
  onSpeedometer: '#FFFFFF',
  speeding: '#FF5A52',
  puck: '#33ADFF',
  badge: '#FF6B6B',
  success: '#34D399',
  warning: '#FBBF24',
};
