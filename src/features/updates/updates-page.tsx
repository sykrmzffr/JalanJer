import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { InfoRow, Section, SettingsScreen } from '@/features/settings/components';
import { minTouchTarget, radius, spacing, typography, useColors } from '@/theme';

import { formatProgress, shortSha } from './core/update-core';
import { checkForUpdate, CURRENT_BUILD, installUpdate, useUpdateStore } from './update-store';

const dateFormat = new Intl.DateTimeFormat('en-MY', { dateStyle: 'medium', timeStyle: 'short' });

/** Settings → App updates: this build, the newest test build on GitHub, one button to install it. */
export function UpdatesPage() {
  const colors = useColors();
  const { status, latest, progress, error } = useUpdateStore();

  // Fresh check every time you open the page.
  useEffect(() => {
    checkForUpdate();
  }, []);

  const busy = status === 'checking' || status === 'downloading' || status === 'installing';
  const fraction = progress.total > 0 ? progress.bytes / progress.total : 0;
  const bar = useAnimatedStyle(() => ({ width: withTiming(`${Math.round(fraction * 100)}%`, { duration: 200 }) }));

  const message =
    status === 'checking'
      ? 'Checking GitHub…'
      : status === 'up-to-date'
        ? 'You have the newest build.'
        : status === 'available'
          ? `New build ready: ${latest ? shortSha(latest.sha) : ''}`
          : status === 'downloading'
            ? `Downloading… ${formatProgress(progress.bytes, progress.total)}`
            : status === 'installing'
              ? 'Opening the installer… tap Install.'
              : status === 'error'
                ? (error ?? 'Something went wrong.')
                : '';

  const action =
    status === 'available'
      ? { label: 'Download and install', onPress: installUpdate }
      : { label: 'Check again', onPress: checkForUpdate };

  return (
    <SettingsScreen title="App updates">
      <Section title="This phone">
        <InfoRow label="Build" value={CURRENT_BUILD ? shortSha(CURRENT_BUILD.sha) : 'Local build'} />
        {CURRENT_BUILD?.builtAt ? <InfoRow label="Made" value={dateFormat.format(CURRENT_BUILD.builtAt)} /> : null}
      </Section>

      <Section
        title="Newest test build"
        footer="Builds come from GitHub (Actions → Android build). After downloading, Android asks you to confirm with Install. The first time it also asks you to allow installing apps from JalanJer!: turn that on, go back, and tap the button again."
      >
        {latest ? (
          <>
            <InfoRow label="Build" value={shortSha(latest.sha)} />
            <InfoRow label="Made" value={dateFormat.format(latest.builtAt)} />
            {latest.branch ? <InfoRow label="Branch" value={latest.branch} /> : null}
          </>
        ) : null}

        <View style={styles.status} accessibilityLiveRegion="polite">
          {busy ? <ActivityIndicator color={colors.primary} /> : null}
          <Animated.Text
            key={status}
            entering={FadeIn.duration(150)}
            style={[
              typography.bodyMedium,
              styles.flex,
              { color: status === 'error' ? colors.error : colors.onSurfaceVariant },
            ]}
          >
            {message}
          </Animated.Text>
        </View>

        {status === 'downloading' ? (
          <View style={[styles.track, { backgroundColor: colors.surfaceContainerHigh }]}>
            <Animated.View style={[styles.fill, { backgroundColor: colors.primary }, bar]} />
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={action.onPress}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: status === 'available' ? colors.primary : colors.surfaceContainerHigh,
              opacity: busy ? 0.5 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
        >
          <Text
            style={[typography.titleMedium, { color: status === 'available' ? colors.onPrimary : colors.onSurface }]}
          >
            {action.label}
          </Text>
        </Pressable>
      </Section>
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: minTouchTarget,
  },
  flex: { flex: 1 },
  track: { height: 6, borderRadius: 3, marginHorizontal: spacing.lg, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  button: {
    minHeight: Math.max(minTouchTarget, 52),
    margin: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
