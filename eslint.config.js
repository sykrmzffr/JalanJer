// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Files copied in by `npx beui-native add` (see CLAUDE.md). They write
// Reanimated shared values with `.value = ...` and read refs during render,
// which the React Compiler lint rules flag. They work at runtime (the compiler
// simply skips those components), so we keep them as upstream ships them.
const beuiFiles = [
  'src/components/button/**',
  'src/hooks/use-presence.ts',
  'src/hooks/use-reduced-motion.ts',
  'src/primitives/**',
  'src/styles/motion.ts',
];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'src/uniwind-types.d.ts'],
  },
  {
    files: beuiFiles,
    rules: {
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/exhaustive-deps': 'off',
    },
  },
]);
