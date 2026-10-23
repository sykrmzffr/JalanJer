import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon/icon';
import { formatDistance } from '@/features/search/core/search-core';
import { useSettingsStore } from '@/stores/settings-store';
import { minTouchTarget, radius, spacing, typography, useColors } from '@/theme';

import { type AvoidOptions, formatArrival, formatDuration, type Route } from '../core/valhalla-core';
import type { RoutesState } from '../use-routes';

type RoutePreviewPanelProps = {
  state: RoutesState;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onLayout: (event: LayoutChangeEvent) => void;
};

const AVOID_LABELS: { key: keyof AvoidOptions; label: string }[] = [
  { key: 'tolls', label: 'Tolls' },
  { key: 'highways', label: 'Highways' },
  { key: 'ferries', label: 'Ferries' },
];

/** Bottom panel of the route preview: Avoid toggles, up to 3 routes, and Go. */
export function RoutePreviewPanel({ state, selectedId, onSelect, onLayout }: RoutePreviewPanelProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const avoid = useSettingsStore((s) => s.avoid);
  const toggleAvoid = useSettingsStore((s) => s.toggleAvoid);

  const fastestId = state.routes.reduce<Route | null>(
    (best, r) => (!best || r.duration < best.duration ? r : best),
    null,
  )?.id;
  const now = new Date();

  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      exiting={FadeOutDown.duration(150)}
      onLayout={onLayout}
      style={[
        styles.panel,
        { backgroundColor: colors.surface, paddingBottom: insets.bottom + spacing.md, shadowColor: colors.shadow },
      ]}
    >
      <View style={styles.avoidRow}>
        <Text style={[typography.labelLarge, { color: colors.onSurfaceVariant }]}>Avoid</Text>
        {AVOID_LABELS.map(({ key, label }) => {
          const on = avoid[key];
          return (
            <Pressable
              key={key}
              accessibilityRole="switch"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`Avoid ${label.toLowerCase()}`}
              onPress={() => {
                Haptics.selectionAsync();
                toggleAvoid(key);
              }}
              style={[
                styles.avoidChip,
                {
                  backgroundColor: on ? colors.secondaryContainer : colors.surface,
                  borderColor: on ? colors.secondaryContainer : colors.outlineVariant,
                },
              ]}
            >
              {on && (
                <Icon name={{ ios: 'checkmark', android: 'check' }} size={14} color={colors.onSecondaryContainer} />
              )}
              <Text style={[typography.labelLarge, { color: on ? colors.onSecondaryContainer : colors.onSurface }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {state.status === 'loading' && (
        <View style={styles.message}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant }]}>Finding routes…</Text>
        </View>
      )}

      {state.status === 'error' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${state.error}. Try again`}
          onPress={state.retry}
          style={[styles.message, styles.error, { backgroundColor: colors.errorContainer }]}
        >
          <Text style={[typography.bodyMedium, styles.flex, { color: colors.onErrorContainer }]}>{state.error}</Text>
          <Text style={[typography.labelLarge, { color: colors.onErrorContainer }]}>Try again</Text>
        </Pressable>
      )}

      {state.routes.map((route) => {
        const selected = route.id === selectedId;
        return (
          <Pressable
            key={route.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={[
              formatDuration(route.duration),
              formatDistance(route.distance),
              route.via.length ? `via ${route.via.join(', ')}` : '',
              route.hasToll ? 'has tolls' : '',
            ]
              .filter(Boolean)
              .join(', ')}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(route.id);
            }}
            style={[
              styles.routeRow,
              {
                borderColor: selected ? colors.route : colors.outlineVariant,
                backgroundColor: selected ? colors.surfaceContainerLow : colors.surface,
              },
            ]}
          >
            <View style={styles.flex}>
              <View style={styles.titleRow}>
                <Text style={[typography.titleLarge, { color: colors.onSurface }]}>
                  {formatDuration(route.duration)}
                </Text>
                {route.id === fastestId && state.routes.length > 1 && (
                  <Text
                    style={[
                      typography.labelMedium,
                      styles.tag,
                      { backgroundColor: colors.route, color: colors.onRoute },
                    ]}
                  >
                    Best
                  </Text>
                )}
                {route.hasToll && (
                  <Text
                    style={[
                      typography.labelMedium,
                      styles.tag,
                      { backgroundColor: colors.report, color: colors.onReport },
                    ]}
                  >
                    Toll
                  </Text>
                )}
                {route.hasFerry && (
                  <Text
                    style={[
                      typography.labelMedium,
                      styles.tag,
                      { backgroundColor: colors.secondaryContainer, color: colors.onSecondaryContainer },
                    ]}
                  >
                    Ferry
                  </Text>
                )}
              </View>
              <Text numberOfLines={1} style={[typography.bodyMedium, { color: colors.onSurfaceVariant }]}>
                {formatDistance(route.distance)}
                {route.via.length ? ` · via ${route.via.join(', ')}` : ''}
              </Text>
            </View>
            <Text style={[typography.labelLarge, { color: colors.onSurfaceVariant }]}>
              {formatArrival(now, route.duration)}
            </Text>
          </Pressable>
        );
      })}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go now"
        disabled={state.status !== 'done'}
        onPress={() =>
          Alert.alert('Coming soon', 'Turn-by-turn navigation is the next milestone. For now you can preview routes.')
        }
        style={({ pressed }) => [
          styles.go,
          {
            backgroundColor: colors.primary,
            opacity: state.status !== 'done' ? 0.4 : pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text style={[typography.titleMedium, { color: colors.onPrimary }]}>Go now</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 12,
  },
  avoidRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  avoidChip: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  message: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  error: { paddingHorizontal: spacing.md, borderRadius: radius.md },
  flex: { flex: 1 },
  routeRow: {
    minHeight: 68,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tag: { paddingHorizontal: spacing.xs + 2, paddingVertical: 1, borderRadius: radius.xs, overflow: 'hidden' },
  go: {
    minHeight: Math.max(minTouchTarget, 52),
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
});
