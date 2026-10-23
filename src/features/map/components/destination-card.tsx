import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';

import { Icon } from '@/components/icon/icon';
import type { Place } from '@/stores/places-store';
import { minTouchTarget, radius, spacing, typography, useColors } from '@/theme';

type DestinationCardProps = {
  place: Place;
  /** Distance from the top of the screen (below the top map buttons). */
  top: number;
  onClose: () => void;
};

/**
 * Card for the place picked in search. Route preview (Milestone 3) will
 * replace the note with route options and a Go button.
 */
export function DestinationCard({ place, top, onClose }: DestinationCardProps) {
  const colors = useColors();
  return (
    <Animated.View
      entering={FadeInUp.duration(180)}
      exiting={FadeOutUp.duration(150)}
      style={[
        styles.card,
        {
          top,
          backgroundColor: colors.surfaceContainerHigh,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <View style={styles.text}>
        <Text numberOfLines={1} style={[typography.titleMedium, { color: colors.onSurface }]}>
          {place.name}
        </Text>
        {place.address ? (
          <Text numberOfLines={1} style={[typography.bodyMedium, { color: colors.onSurfaceVariant }]}>
            {place.address}
          </Text>
        ) : null}
        <Text style={[typography.labelMedium, { color: colors.onSurfaceVariant }]}>
          Routes are coming in the next update.
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    padding: spacing.md,
    paddingRight: spacing.xs,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  text: { flex: 1, gap: 2 },
  close: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
