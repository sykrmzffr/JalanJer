import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon/icon';
import { spacing, typography } from '@/theme';

import { formatManeuverDistance, maneuverTitle } from '../core/nav-core';
import { maneuverIcon } from '../maneuver-icon';
import type { NavigationView } from '../use-navigation';

// "and then" shows when the turn after next comes this soon after the next one.
const AND_THEN_WITHIN_M = 400;

// Waze-style banner colors (dark bar, light-blue street name). Same in light and dark mode.
export const BANNER = { bar: '#000000', subBar: '#1C1D21', text: '#FFFFFF', street: '#33C4F2' } as const;

type NavBannerProps = {
  nav: NavigationView;
  /** Tap the banner (opens the turn list). */
  onPress?: () => void;
};

/** Top banner: next turn arrow, distance and street; "and then" row for a quick follow-up turn. */
export function NavBanner({ nav, onPress }: NavBannerProps) {
  const insets = useSafeAreaInsets();
  const { maneuvers } = nav.prepared.route;
  const nextIndex = nav.progress.next;
  const next = nextIndex != null ? maneuvers[nextIndex] : null;
  const after = nextIndex != null ? maneuvers[nextIndex + 1] : null;
  const gap =
    nextIndex != null && after ? nav.prepared.maneuverAt[nextIndex + 1] - nav.prepared.maneuverAt[nextIndex] : Infinity;

  const title = nav.rerouting
    ? 'Finding a new route…'
    : nav.state.arrived
      ? 'You have arrived'
      : next
        ? maneuverTitle(next)
        : '';

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={styles.wrap}
      accessible
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityHint={onPress ? 'Shows the next turns and reports ahead' : undefined}
      accessibilityLiveRegion="polite"
      accessibilityLabel={
        next && !nav.state.arrived
          ? `In ${formatManeuverDistance(nav.progress.toNext ?? 0)}, ${next.instruction}`
          : title
      }
    >
      <View style={[styles.bar, { paddingTop: insets.top + spacing.sm }]}>
        {nav.rerouting ? (
          <View style={styles.iconBox}>
            <ActivityIndicator color={BANNER.text} size="large" />
          </View>
        ) : (
          <Icon
            name={
              nav.state.arrived ? { ios: 'flag.checkered', android: 'sports_score' } : maneuverIcon(next?.type ?? 8)
            }
            size={56}
            color={BANNER.text}
            weight="bold"
          />
        )}
        <View style={styles.text}>
          {!nav.state.arrived && !nav.rerouting && nav.progress.toNext != null ? (
            <Text style={[typography.headlineMedium, styles.distance]}>
              {formatManeuverDistance(nav.progress.toNext)}
            </Text>
          ) : null}
          <Text numberOfLines={2} style={[typography.headlineSmall, styles.street]}>
            {title}
          </Text>
        </View>
      </View>
      {after && gap <= AND_THEN_WITHIN_M && !nav.state.arrived ? (
        <View style={styles.subBar}>
          <Text style={[typography.titleMedium, { color: BANNER.street }]}>and then</Text>
          <Icon name={maneuverIcon(after.type)} size={28} color={BANNER.text} weight="bold" />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  bar: {
    backgroundColor: BANNER.bar,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  iconBox: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
  distance: { color: BANNER.text, fontWeight: '700' },
  street: { color: BANNER.street, fontWeight: '700' },
  subBar: {
    backgroundColor: BANNER.subBar,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
});
