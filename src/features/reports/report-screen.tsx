import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon/icon';
import { useAccountStore } from '@/features/account/account-store';
import { useNavView } from '@/features/navigation/navigation-session';
import { minTouchTarget, radius, spacing, typography, useColors } from '@/theme';

import { type LngLatTuple, REPORT_KINDS, type ReportKind } from './core/reports-core';
import { REPORT_KIND_INFO } from './report-kinds';
import { createReport, ReportError } from './reports-store';

/** Where you are now: the navigation position while navigating, otherwise GPS. */
async function reportPosition(): Promise<LngLatTuple | null> {
  const nav = useNavView.getState().view;
  if (nav) return nav.state.snapped;
  const permission = await Location.getForegroundPermissionsAsync();
  if (!permission.granted) return null;
  const last = await Location.getLastKnownPositionAsync({ maxAge: 60_000 });
  if (last) return [last.coords.longitude, last.coords.latitude];
  const fresh = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return [fresh.coords.longitude, fresh.coords.latitude];
}

/** Big, easy targets (usable at a red light): pick what you see, it's reported where you are. */
export function ReportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const signedIn = useAccountStore((s) => s.session != null);
  const [sending, setSending] = useState<ReportKind | null>(null);

  const send = async (kind: ReportKind) => {
    if (!signedIn) {
      Alert.alert('Sign in to report', 'Reports need an account so we can stop spam.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Sign in', onPress: () => router.replace('/account') },
      ]);
      return;
    }
    setSending(kind);
    try {
      const at = await reportPosition();
      if (!at) throw new ReportError('Turn on location so the report goes in the right place.');
      await createReport(kind, at);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Not sent', e instanceof ReportError ? e.message : "Couldn't send the report. Try again.");
      setSending(null);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.surface, paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={[typography.headlineSmall, { color: colors.onSurface }]}>
          Report
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => router.back()}
          style={styles.close}
        >
          <Icon name={{ ios: 'xmark', android: 'close' }} size={22} color={colors.onSurface} />
        </Pressable>
      </View>
      <Text style={[typography.bodyMedium, styles.hint, { color: colors.onSurfaceVariant }]}>
        It&apos;s reported where you are now. Please only report while stopped, or let a passenger do it.
      </Text>

      <View style={styles.grid}>
        {REPORT_KINDS.map((kind) => {
          const info = REPORT_KIND_INFO[kind];
          return (
            <Pressable
              key={kind}
              accessibilityRole="button"
              accessibilityLabel={`Report ${info.label}`}
              disabled={sending != null}
              onPress={() => send(kind)}
              style={({ pressed }) => [
                styles.tile,
                {
                  backgroundColor: colors.surfaceContainer,
                  opacity: sending != null && sending !== kind ? 0.4 : pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={[styles.badge, { backgroundColor: info.color }]}>
                {sending === kind ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Icon name={info.icon} size={34} color="#FFFFFF" />
                )}
              </View>
              <Text style={[typography.titleMedium, { color: colors.onSurface }]}>{info.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { width: minTouchTarget, height: minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  hint: { marginTop: spacing.xs, marginBottom: spacing.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: {
    width: '47%',
    flexGrow: 1,
    aspectRatio: 1.1,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  badge: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
});
