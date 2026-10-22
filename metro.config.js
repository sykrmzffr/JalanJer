const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withUniwindConfig } = require('uniwind/metro');

// Expo's default Metro config plus Sentry's (adds debug IDs so crash stack
// traces can be matched to source maps).
const config = getSentryExpoConfig(__dirname);

// Uniwind compiles Tailwind classes at build time. It must be the outermost wrapper.
module.exports = withUniwindConfig(config, {
  cssEntryFile: './src/global.css',
  dtsFile: './src/uniwind-types.d.ts',
});
