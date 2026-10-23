import type { SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { Icon } from '@/components/icon/icon';
import { minTouchTarget, spacing, typography, useColors } from '@/theme';

export const PLACE_ROW_HEIGHT = 76;

type PlaceRowProps = {
  icon: SymbolViewProps['name'];
  iconColor?: string;
  title: string;
  subtitle: string;
  /** Shows the subtitle as a link-colored call to action ("Set once and go"). */
  subtitleIsAction?: boolean;
  /** Right-aligned text, e.g. "4.2 km". */
  trailingText?: string;
  /** Extra button on the right (e.g. save). */
  trailing?: ReactNode;
  onPress: () => void;
  accessibilityHint?: string;
};

/** One line in search: icon, bold name, grey address, optional distance. Fixed height for fast lists. */
export function PlaceRow({
  icon,
  iconColor,
  title,
  subtitle,
  subtitleIsAction,
  trailingText,
  trailing,
  onPress,
  accessibilityHint,
}: PlaceRowProps) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, trailingText].filter(Boolean).join(', ')}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? colors.surfaceContainer : colors.surface,
          borderBottomColor: colors.outlineVariant,
        },
      ]}
    >
      <Icon name={icon} size={24} color={iconColor ?? colors.onSurface} />
      <View style={styles.text}>
        <Text numberOfLines={1} style={[typography.titleMedium, { color: colors.onSurface }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={[
              typography.bodyMedium,
              {
                color: subtitleIsAction ? colors.primary : colors.onSurfaceVariant,
              },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailingText ? (
        <Text style={[typography.labelMedium, styles.trailingText, { color: colors.onSurfaceVariant }]}>
          {trailingText}
        </Text>
      ) : null}
      {trailing}
    </Pressable>
  );
}

type SwipeToDeleteProps = {
  children: ReactNode;
  onDelete: () => void;
  label?: string;
};

/** Swipe a row left to reveal a red Delete button (iOS Mail style). Gesture runs on the UI thread. */
export function SwipeToDelete({ children, onDelete, label = 'Delete' }: SwipeToDeleteProps) {
  const colors = useColors();
  return (
    <ReanimatedSwipeable
      friction={1.5}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={(_progress, _translation, methods) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={() => {
            methods.close();
            onDelete();
          }}
          style={[styles.deleteAction, { backgroundColor: colors.error }]}
        >
          <Text style={[typography.labelLarge, { color: colors.onError }]}>{label}</Text>
        </Pressable>
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  row: {
    height: PLACE_ROW_HEIGHT,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1, gap: 2 },
  trailingText: {
    minWidth: minTouchTarget,
    textAlign: 'right',
    paddingRight: spacing.sm,
  },
  deleteAction: { width: 96, alignItems: 'center', justifyContent: 'center' },
});
