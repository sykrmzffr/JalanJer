import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Icon } from '@/components/icon/icon';
import { radius, spacing, typography, useColors } from '@/theme';

import { CATEGORIES, type Category } from '../categories';

type CategoryChipsProps = {
  selected: string | null;
  onSelect: (category: Category | null) => void;
};

/** Square chips with the icon over the label (Waze search screen). Tap again to clear. */
export function CategoryChips({ selected, onSelect }: CategoryChipsProps) {
  const colors = useColors();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.row}
    >
      {CATEGORIES.map((category) => {
        const active = category.id === selected;
        return (
          <Pressable
            key={category.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={category.label}
            onPress={() => onSelect(active ? null : category)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: active
                  ? colors.primaryContainer
                  : pressed
                    ? colors.surfaceContainerHigh
                    : colors.surfaceContainer,
              },
            ]}
          >
            <Icon name={category.icon} size={26} color={colors[category.tint]} />
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                {
                  color: active ? colors.onPrimaryContainer : colors.onSurface,
                },
              ]}
            >
              {category.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  chip: {
    width: 88,
    height: 76,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  label: { ...typography.labelLarge },
});
