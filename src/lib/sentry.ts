import * as Sentry from '@sentry/react-native';

// Crash and performance monitoring (Sentry free plan).
//
// The DSN comes from EXPO_PUBLIC_SENTRY_DSN and is baked into the JS bundle at
// build time. With no DSN set, Sentry stays off, so builds work before a
// Sentry account exists. See docs/SENTRY.md.
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry() {
  Sentry.init({
    dsn,
    enabled: Boolean(dsn),
    environment: __DEV__ ? 'development' : 'production',
    // Only two test phones for now, so record every session's performance
    // data. Lower this before sharing the app widely (free plan has quotas).
    tracesSampleRate: 1.0,
    // Slow/frozen frame counts and app start time: our performance budget.
    enableNativeFramesTracking: true,
    enableAppStartTracking: true,
    enableStallTracking: true,
    // Never send IP addresses or other personal data by default.
    sendDefaultPii: false,
    integrations: [Sentry.expoRouterIntegration()],
  });
}

export const wrapRoot = Sentry.wrap;
