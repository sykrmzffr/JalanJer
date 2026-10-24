import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon/icon';
import { Speedometer } from '@/features/map/components/speedometer';
import { formatDistance } from '@/features/search/core/search-core';
import { formatArrival, formatDuration } from '@/features/route/core/valhalla-core';
import { useSettingsStore } from '@/stores/settings-store';
import { minTouchTarget, radius, spacing, typography, useColors } from '@/theme';

import { useAccountStore } from '@/features/account/account-store';
import { useNow } from '@/lib/use-now';
import { ReportCard } from '@/features/reports/components/report-card';
import { stillTherePrompt } from '@/features/reports/core/reports-core';
import { useReportsStore } from '@/features/reports/reports-store';

import type { NavigationView } from '../use-navigation';
import { NavBanner } from './nav-banner';
import { TurnList } from './turn-list';

/** Fraction of the screen (from the top) where the car arrow sits; the camera centers there. */
export const PUCK_SCREEN_FRACTION = 0.68;

type NavigationOverlayProps = {
  nav: NavigationView;
  onEnd: () => void;
};

// A "Still there?" prompt hides itself after this long.
const PROMPT_MS = 12_000;

/** Everything drawn over the map while navigating: banner, car arrow, street pill, trip panel. */
export function NavigationOverlay({ nav, onEnd }: NavigationOverlayProps) {
  const router = useRouter();
  const reports = useReportsStore((s) => s.reports);
  const answered = useReportsStore((s) => s.answered);
  const mine = useReportsStore((s) => s.mine);
  const signedIn = useAccountStore((s) => s.session != null);
  const now = useNow(30_000);
  // Prompts dismissed (or timed out) on this trip.
  const [dismissed, setDismissed] = useState<Record<string, true>>({});
  const prompt = signedIn
    ? stillTherePrompt(reports, nav.state.snapped, {
        answered: new Set([...Object.keys(answered), ...Object.keys(dismissed)]),
        mine: new Set(Object.keys(mine)),
        now,
      })
    : null;
  const promptId = prompt?.id;
  useEffect(() => {
    if (!promptId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const timer = setTimeout(() => setDismissed((d) => ({ ...d, [promptId]: true })), PROMPT_MS);
    return () => clearTimeout(timer);
  }, [promptId]);

  const [listOpen, setListOpen] = useState(false);
  const closeList = useCallback(() => setListOpen(false), []);

  const colors = useColors();
  const insets = useSafeAreaInsets();
  const practice = nav.practice;
  const showSpeedometer = useSettingsStore((s) => s.showSpeedometer);
  const soundMuted = useSettingsStore((s) => s.soundMuted);
  const toggleSound = useSettingsStore((s) => s.toggleSound);

  const { maneuvers } = nav.prepared.route;
  const current = maneuvers[nav.state.step];
  const street = current?.streetNames[0] ?? current?.beginStreetNames[0] ?? '';
  const arrival = formatArrival(new Date(), nav.progress.remainingDuration);

  const confirmEnd = () =>
    nav.state.arrived
      ? onEnd()
      : Alert.alert('End navigation?', undefined, [
          { text: 'Keep going', style: 'cancel' },
          { text: 'End', style: 'destructive', onPress: onEnd },
        ]);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <NavBanner nav={nav} onPress={() => setListOpen(true)} />

      {/* Car arrow: fixed on screen; the map moves and turns under it. */}
      <View pointerEvents="none" style={[styles.puckWrap, { top: `${PUCK_SCREEN_FRACTION * 100}%` }]}>
        <View style={[styles.puckHalo, { backgroundColor: colors.puck }]} />
        <Icon name={{ ios: 'location.north.fill', android: 'navigation' }} size={40} color={colors.puck} />
      </View>

      <View pointerEvents="box-none" style={[styles.bottom, { paddingBottom: insets.bottom + spacing.md }]}>
        <View pointerEvents="box-none" style={styles.row}>
          {showSpeedometer ? <Speedometer speedKmh={nav.speedKmh} /> : <View />}
          {street ? (
            <View style={[styles.pill, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
              <Text numberOfLines={2} style={[typography.titleMedium, styles.pillText, { color: colors.onSurface }]}>
                {street}
              </Text>
            </View>
          ) : (
            <View />
          )}
          <View style={styles.rightColumn}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={soundMuted ? 'Turn sound on' : 'Mute voice'}
              onPress={toggleSound}
              style={[styles.round, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}
            >
              <Icon
                name={
                  soundMuted
                    ? { ios: 'speaker.slash.fill', android: 'volume_off' }
                    : { ios: 'speaker.wave.2.fill', android: 'volume_up' }
                }
                size={22}
                color={colors.onSurface}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Report"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/report');
              }}
              style={[styles.report, { backgroundColor: colors.report, shadowColor: colors.shadow }]}
            >
              <Icon name={{ ios: 'plus', android: 'add' }} size={30} color={colors.onReport} weight="heavy" />
            </Pressable>
          </View>
        </View>

        <View style={[styles.panel, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={nav.state.arrived ? 'Done' : 'End navigation'}
            onPress={confirmEnd}
            style={[styles.end, { backgroundColor: nav.state.arrived ? colors.primary : colors.errorContainer }]}
          >
            <Icon
              name={nav.state.arrived ? { ios: 'checkmark', android: 'check' } : { ios: 'xmark', android: 'close' }}
              size={22}
              color={nav.state.arrived ? colors.onPrimary : colors.onErrorContainer}
              weight="bold"
            />
          </Pressable>
          <View
            style={styles.eta}
            accessible
            accessibilityLabel={`Arrive at ${arrival}, ${formatDuration(nav.progress.remainingDuration)}, ${formatDistance(nav.progress.remainingDistance)}`}
          >
            {nav.state.arrived ? (
              <Text style={[typography.headlineSmall, { color: colors.onSurface }]}>You have arrived</Text>
            ) : (
              <>
                <Text style={[typography.headlineMedium, { color: colors.onSurface }]}>{arrival}</Text>
                <Text style={[typography.bodyLarge, { color: colors.onSurfaceVariant }]}>
                  {formatDuration(nav.progress.remainingDuration)} · {formatDistance(nav.progress.remainingDistance)}
                </Text>
              </>
            )}
            {practice ? (
              <Text style={[typography.labelMedium, { color: colors.warning }]}>Practice drive (simulated GPS)</Text>
            ) : null}
          </View>
          {/* Keeps the ETA centred against the End button. */}
          <View style={styles.endSpacer} />
        </View>
      </View>

      {prompt ? (
        <ReportCard
          report={prompt}
          bottom={insets.bottom + PROMPT_BOTTOM}
          onClose={() => setDismissed((d) => ({ ...d, [prompt.id]: true }))}
        />
      ) : null}

      {listOpen ? <TurnList nav={nav} onClose={closeList} /> : null}
    </View>
  );
}

const PUCK = 40;
// Above the trip panel and the bottom row of buttons.
const PROMPT_BOTTOM = 200;

const styles = StyleSheet.create({
  puckWrap: {
    position: 'absolute',
    left: '50%',
    width: PUCK * 2,
    height: PUCK * 2,
    marginLeft: -PUCK,
    marginTop: -PUCK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  puckHalo: { position: 'absolute', width: PUCK * 2, height: PUCK * 2, borderRadius: PUCK, opacity: 0.15 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  pill: {
    flexShrink: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  pillText: { textAlign: 'center' },
  rightColumn: { gap: spacing.md, alignItems: 'flex-end' },
  report: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  round: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  panel: {
    marginHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sheet,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 12,
  },
  end: {
    width: Math.max(minTouchTarget, 52),
    height: Math.max(minTouchTarget, 52),
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eta: { flex: 1, alignItems: 'center' },
  endSpacer: { width: Math.max(minTouchTarget, 52) },
});
