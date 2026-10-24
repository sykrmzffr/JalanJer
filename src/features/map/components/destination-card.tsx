import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';

import { Icon } from '@/components/icon/icon';
import type { Place } from '@/stores/places-store';
import { minTouchTarget, radius, spacing, typography, useColors } from '@/theme';

type DestinationCardProps = {
  place: Place;
  /** Distance from the top of the screen. */
  top: number;
  onClose: () => void;
};

/** Height of the card, used to keep routes clear of it when zooming the camera. */
export const DESTINATION_CARD_HEIGHT = 76;

/** Route preview header: "Your location ↓ Destination", with a back button that closes the preview. */
export function DestinationCard({ place, top, onClose }: DestinationCardProps) {
  const colors = useColors();
  return (
    <Animated.View
      entering={FadeInUp.duration(180)}
      exiting={FadeOutUp.duration(150)}
      style={[styles.card, { top, backgroundColor: colors.surface, shadowColor: colors.shadow }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close route preview"
        onPress={onClose}
        hitSlop={8}
        style={styles.close}
      >
        <Icon name={{ ios: 'chevron.left', android: 'arrow_back' }} size={20} color={colors.onSurface} />
      </Pressable>
      <View style={styles.text}>
        <Text numberOfLines={1} style={[typography.bodyMedium, { color: colors.onSurfaceVariant }]}>
          Your location
        </Text>
        <View style={styles.toRow}>
          <Icon name={{ ios: 'arrow.down', android: 'arrow_downward' }} size={14} color={colors.onSurfaceVariant} />
          <Text numberOfLines={1} style={[typography.titleMedium, styles.name, { color: colors.onSurface }]}>
            {place.name}
          </Text>
        </View>
        {place.address ? (
          <Text numberOfLines={1} style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>
            {place.address}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    minHeight: DESTINATION_CARD_HEIGHT,
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  text: { flex: 1, gap: 1 },
  toRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: { flex: 1 },
  close: { width: minTouchTarget, height: minTouchTarget, alignItems: 'center', justifyContent: 'center' },
});
