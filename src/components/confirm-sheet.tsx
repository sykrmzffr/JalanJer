import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { motion } from '@/styles/motion';
import { minTouchTarget, radius, spacing, typography, useColors } from '@/theme';

type ConfirmSheetProps = {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Red confirm button (for actions like ending a trip). */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Our own "Are you sure?" card that slides up from the bottom, instead of the plain
 * system alert. Big buttons (usable while driving at a red light); tap outside to cancel.
 * Render it only while open; it animates in and out by itself.
 */
export function ConfirmSheet({
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(160)} style={StyleSheet.absoluteFill}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={cancelLabel}
          onPress={onCancel}
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim, opacity: 0.4 }]}
        />
      </Animated.View>
      <Animated.View
        entering={SlideInDown.springify()
          .stiffness(motion.layout.stiffness)
          .damping(motion.layout.damping)
          .mass(motion.layout.mass)}
        exiting={SlideOutDown.duration(180)}
        accessibilityViewIsModal
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            shadowColor: colors.shadow,
            paddingBottom: insets.bottom + spacing.lg,
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.outlineVariant }]} />
        <Text accessibilityRole="header" style={[typography.headlineSmall, styles.center, { color: colors.onSurface }]}>
          {title}
        </Text>
        {message ? (
          <Text style={[typography.bodyLarge, styles.center, { color: colors.onSurfaceVariant }]}>{message}</Text>
        ) : null}
        <View style={styles.buttons}>
          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.surfaceContainerHigh, transform: [{ scale: pressed ? 0.97 : 1 }] },
            ]}
          >
            <Text style={[typography.titleMedium, { color: colors.onSurface }]}>{cancelLabel}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onConfirm();
            }}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: destructive ? colors.error : colors.primary,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <Text style={[typography.titleMedium, { color: destructive ? colors.onError : colors.onPrimary }]}>
              {confirmLabel}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
  },
  handle: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, marginBottom: spacing.sm },
  center: { textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  button: {
    flex: 1,
    minHeight: Math.max(minTouchTarget, 56),
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
