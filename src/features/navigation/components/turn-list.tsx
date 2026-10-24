import { useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon/icon';
import { reportAge } from '@/features/reports/core/reports-core';
import { REPORT_KIND_INFO } from '@/features/reports/report-kinds';
import { useReportsStore } from '@/features/reports/reports-store';
import type { Maneuver } from '@/features/route/core/valhalla-core';
import { useNow } from '@/lib/use-now';
import { minTouchTarget, radius, spacing, typography } from '@/theme';

import { formatManeuverDistance } from '../core/nav-core';
import { maneuverIcon } from '../maneuver-icon';
import { reportsAhead } from '../route-reports';
import type { NavigationView } from '../use-navigation';
import { BANNER, NavBanner } from './nav-banner';

type Tab = 'turns' | 'reports';

// Rows alternate between these, like Waze's list. Same in light and dark mode.
const ROW = ['#1C1D21', '#000000'] as const;
const SEGMENT = { track: '#1C1D21', active: '#1A9BFC', text: '#FFFFFF', muted: '#8E8E93' } as const;

// Valhalla roundabout maneuver ("enter roundabout"): shown as a ring with the exit number.
const ROUNDABOUT_ENTER = 26;

/** Full-screen list over the map: every turn still to come, or reports on the route ahead. */
export function TurnList({ nav, onClose }: { nav: NavigationView; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('turns');
  const [bannerHeight, setBannerHeight] = useState(0);

  // Android Back closes the list (not navigation).
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [onClose]);

  return (
    <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(120)} style={styles.root}>
      <NavBanner nav={nav} onLayout={setBannerHeight} />
      <View style={[styles.body, { marginTop: bannerHeight }]}>
        <View style={styles.segmentWrap}>
          <View style={styles.segment} accessibilityRole="tablist">
            {(
              [
                ['turns', 'Next turns'],
                ['reports', 'Reports ahead'],
              ] as const
            ).map(([key, label]) => (
              <Pressable
                key={key}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === key }}
                onPress={() => setTab(key)}
                style={[styles.segmentButton, tab === key && { backgroundColor: SEGMENT.active }]}
              >
                <Text style={[typography.labelLarge, { color: tab === key ? SEGMENT.text : SEGMENT.muted }]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <ScrollView style={styles.list}>
          {tab === 'turns' ? <Turns nav={nav} /> : <ReportsAhead nav={nav} />}
        </ScrollView>

        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={[styles.close, { paddingBottom: insets.bottom + spacing.md }]}
        >
          <Text style={[typography.titleMedium, styles.closeText]}>CLOSE</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

/** Turns after the one in the banner. Each distance is from the turn before it, as in Waze. */
function Turns({ nav }: { nav: NavigationView }) {
  const { maneuvers } = nav.prepared.route;
  const { maneuverAt } = nav.prepared;
  const first = (nav.progress.next ?? maneuvers.length) + 1;
  const rows = [];
  for (let i = first; i < maneuvers.length; i++) {
    rows.push(
      <Row
        key={i}
        index={rows.length}
        icon={<ManeuverGlyph maneuver={maneuvers[i]} />}
        distance={formatManeuverDistance(maneuverAt[i] - maneuverAt[i - 1])}
        title={maneuvers[i].streetNames[0] || maneuvers[i].beginStreetNames[0] || maneuvers[i].instruction}
      />,
    );
  }
  if (rows.length === 0) return <Empty text="No more turns. Your destination is next." />;
  return rows;
}

function ReportsAhead({ nav }: { nav: NavigationView }) {
  const reports = useReportsStore((s) => s.reports);
  const now = useNow(30_000);
  const ahead = reportsAhead(nav.prepared, reports, nav.state.distanceAlong, now);
  if (ahead.length === 0) return <Empty text="No reports on your route ahead." />;
  return ahead.map(({ item, distance }, index) => {
    const info = REPORT_KIND_INFO[item.kind];
    const confirmed = item.stillThere > 0 ? ` · ${item.stillThere} confirmed` : '';
    return (
      <Row
        key={item.id}
        index={index}
        icon={
          <View style={[styles.badge, { backgroundColor: info.color }]}>
            <Icon name={info.icon} size={26} color="#FFFFFF" />
          </View>
        }
        distance={formatManeuverDistance(distance)}
        title={info.label}
        subtitle={`${reportAge(item.createdAt, now)}${confirmed}`}
      />
    );
  });
}

function ManeuverGlyph({ maneuver }: { maneuver: Maneuver }) {
  if (maneuver.type === ROUNDABOUT_ENTER && maneuver.roundaboutExitCount != null) {
    return (
      <View style={styles.ring} accessibilityLabel={`Roundabout, exit ${maneuver.roundaboutExitCount}`}>
        <Text style={[typography.titleMedium, { color: BANNER.text }]}>{maneuver.roundaboutExitCount}</Text>
      </View>
    );
  }
  return <Icon name={maneuverIcon(maneuver.type)} size={44} color={BANNER.text} weight="bold" />;
}

type RowProps = { index: number; icon: React.ReactNode; distance: string; title: string; subtitle?: string };

function Row({ index, icon, distance, title, subtitle }: RowProps) {
  return (
    <View
      style={[styles.row, { backgroundColor: ROW[index % 2] }]}
      accessible
      accessibilityLabel={`${distance}, ${title}${subtitle ? `, ${subtitle}` : ''}`}
    >
      <View style={styles.icon}>{icon}</View>
      <View style={styles.rowText}>
        <Text style={[typography.headlineSmall, styles.distance]}>{distance}</Text>
        <Text style={[typography.titleLarge, styles.title]}>{title}</Text>
        {subtitle ? <Text style={[typography.bodyMedium, { color: SEGMENT.muted }]}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return <Text style={[typography.bodyLarge, styles.empty]}>{text}</Text>;
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: BANNER.bar },
  body: { flex: 1 },
  segmentWrap: { alignItems: 'center', paddingBottom: spacing.md },
  segment: { flexDirection: 'row', backgroundColor: SEGMENT.track, borderRadius: radius.full, padding: 3 },
  segmentButton: {
    minHeight: 36,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  icon: { width: 52, alignItems: 'center' },
  rowText: { flex: 1 },
  distance: { color: BANNER.text, fontWeight: '700' },
  title: { color: BANNER.street, fontWeight: '700' },
  badge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  ring: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 4,
    borderColor: BANNER.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { color: SEGMENT.muted, textAlign: 'center', padding: spacing.xl },
  close: { alignItems: 'center', paddingTop: spacing.lg, minHeight: minTouchTarget },
  closeText: { color: BANNER.text, fontWeight: '700', letterSpacing: 1 },
});
