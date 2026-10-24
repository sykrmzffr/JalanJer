import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon/icon';
import { motion } from '@/styles/motion';
import { minTouchTarget, radius, spacing, typography, useColors } from '@/theme';

import { BANNER } from './nav-banner';

/**
 * Shown from "Go" until the first position arrives (a GPS fix can take a few seconds),
 * so the screen never sits empty. Same shapes as the real banner and trip panel, so the
 * swap is a quiet cross-fade.
 */
export function NavigationStarting({ practice, onCancel }: { practice: boolean; onCancel: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Animated.View
      pointerEvents="box-none"
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(200)}
      style={StyleSheet.absoluteFill}
    >
      <Animated.View
        entering={SlideInUp.springify()
          .stiffness(motion.layout.stiffness)
          .damping(motion.layout.damping)
          .mass(motion.layout.mass)}
        style={[styles.banner, { paddingTop: insets.top + spacing.lg }]}
        accessibilityLiveRegion="polite"
      >
        <ActivityIndicator color={BANNER.text} size="large" />
        <Text style={[typography.headlineSmall, styles.bannerText]}>
          {practice ? 'Starting practice drive…' : 'Finding your location…'}
        </Text>
      </Animated.View>

      <Animated.View
        entering={SlideInDown.springify()
          .stiffness(motion.layout.stiffness)
          .damping(motion.layout.damping)
          .mass(motion.layout.mass)}
        style={[
          styles.panel,
          {
            backgroundColor: colors.surface,
            shadowColor: colors.shadow,
            marginBottom: insets.bottom + spacing.md,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          onPress={onCancel}
          style={[styles.end, { backgroundColor: colors.errorContainer }]}
        >
          <Icon name={{ ios: 'xmark', android: 'close' }} size={22} color={colors.onErrorContainer} weight="bold" />
        </Pressable>
        <View style={styles.middle}>
          <View style={[styles.skeleton, styles.skeletonWide, { backgroundColor: colors.surfaceContainerHigh }]} />
          <View style={[styles.skeleton, { backgroundColor: colors.surfaceContainerHigh }]} />
        </View>
        <View style={styles.end} />
      </Animated.View>
    </Animated.View>
  );
}

const END = Math.max(minTouchTarget, 52);

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: BANNER.bar,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  bannerText: { color: BANNER.text, fontWeight: '700', flex: 1 },
  panel: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: 0,
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
  end: { width: END, height: END, borderRadius: END / 2, alignItems: 'center', justifyContent: 'center' },
  middle: { flex: 1, alignItems: 'center', gap: spacing.sm },
  skeleton: { height: 14, width: 120, borderRadius: radius.full },
  skeletonWide: { height: 26, width: 110 },
});
