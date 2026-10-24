import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { Icon } from '@/components/icon/icon';
import { useAccountStore } from '@/features/account/account-store';
import { useNow } from '@/lib/use-now';
import { minTouchTarget, radius, spacing, typography, useColors } from '@/theme';

import { type Report, reportAge } from '../core/reports-core';
import { REPORT_KIND_INFO } from '../report-kinds';
import { ReportError, useReportsStore, voteReport } from '../reports-store';

type ReportCardProps = {
  report: Report;
  /** Distance from the bottom of the screen. */
  bottom: number;
  onClose: () => void;
};

/** Details of one report with "Still there?" Yes / No. Used for tapped pins and while driving past one. */
export function ReportCard({ report, bottom, onClose }: ReportCardProps) {
  const colors = useColors();
  const info = REPORT_KIND_INFO[report.kind];
  const signedIn = useAccountStore((s) => s.session != null);
  const mine = useReportsStore((s) => report.id in s.mine);
  const answered = useReportsStore((s) => report.id in s.answered);
  const [message, setMessage] = useState<string | null>(null);
  const now = useNow(30_000);

  const vote = async (stillThere: boolean) => {
    Haptics.selectionAsync();
    try {
      await voteReport(report.id, stillThere);
      onClose();
    } catch (e) {
      setMessage(e instanceof ReportError ? e.message : "Couldn't send. Try again.");
    }
  };

  const canVote = signedIn && !mine && !answered;
  const confirmations = report.stillThere > 0 ? ` · ${report.stillThere} confirmed` : '';

  return (
    <Animated.View
      entering={FadeInDown.duration(180)}
      exiting={FadeOutDown.duration(150)}
      style={[styles.card, { bottom, backgroundColor: colors.surface, shadowColor: colors.shadow }]}
    >
      <View style={styles.top}>
        <View style={[styles.badge, { backgroundColor: info.color }]}>
          <Icon name={info.icon} size={22} color="#FFFFFF" />
        </View>
        <View style={styles.text}>
          <Text style={[typography.titleMedium, { color: colors.onSurface }]}>
            {canVote ? info.question : info.label}
          </Text>
          <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>
            {reportAge(report.createdAt, now)}
            {confirmations}
            {mine ? ' · your report' : ''}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          hitSlop={8}
          style={styles.close}
        >
          <Icon name={{ ios: 'xmark', android: 'close' }} size={18} color={colors.onSurfaceVariant} />
        </Pressable>
      </View>

      {canVote ? (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Not there"
            onPress={() => vote(false)}
            style={[styles.action, { backgroundColor: colors.surfaceContainerHigh }]}
          >
            <Text style={[typography.titleMedium, { color: colors.onSurface }]}>Not there</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Still there"
            onPress={() => vote(true)}
            style={[styles.action, { backgroundColor: colors.primary }]}
          >
            <Text style={[typography.titleMedium, { color: colors.onPrimary }]}>Still there</Text>
          </Pressable>
        </View>
      ) : !signedIn && !mine ? (
        <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>
          Sign in to say if it&apos;s still there.
        </Text>
      ) : null}

      {message ? <Text style={[typography.bodySmall, { color: colors.error }]}>{message}</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderRadius: radius.lg,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
  close: { width: minTouchTarget, height: minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: {
    flex: 1,
    minHeight: Math.max(minTouchTarget, 52),
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
