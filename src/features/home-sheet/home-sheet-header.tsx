import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon/icon';
import { type Place, usePlacesStore } from '@/stores/places-store';
import { minTouchTarget, radius, spacing, typography, useColors } from '@/theme';

type HomeSheetHeaderProps = {
  /** Opens the search screen. */
  onSearchPress: () => void;
  /** Opens search and starts listening. */
  onVoicePress: () => void;
  onPlacePress: (place: Place | null, kind: 'home' | 'work' | 'saved') => void;
};

/** Always-visible part of the home sheet: "Where to?" field and place chips. */
export function HomeSheetHeader({ onSearchPress, onVoicePress, onPlacePress }: HomeSheetHeaderProps) {
  const colors = useColors();
  const home = usePlacesStore((s) => s.home);
  const work = usePlacesStore((s) => s.work);
  const saved = usePlacesStore((s) => s.saved);

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="search"
        accessibilityLabel="Where to?"
        onPress={onSearchPress}
        style={[styles.search, { backgroundColor: colors.surfaceContainer }]}
      >
        <Icon name={{ ios: 'magnifyingglass', android: 'search' }} size={20} color={colors.onSurfaceVariant} />
        <Text style={[styles.searchText, { color: colors.onSurfaceVariant }]}>Where to?</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search by voice"
          onPress={onVoicePress}
          hitSlop={12}
          style={styles.mic}
        >
          <Icon name={{ ios: 'mic', android: 'mic' }} size={20} color={colors.onSurface} />
        </Pressable>
      </Pressable>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip
          label="Home"
          icon={{ ios: 'house.fill', android: 'home' }}
          iconColor={colors.warning}
          onPress={() => onPlacePress(home, 'home')}
        />
        <Chip
          label="Work"
          icon={{ ios: 'briefcase.fill', android: 'work' }}
          iconColor={colors.warning}
          onPress={() => onPlacePress(work, 'work')}
        />
        {saved.map((place) => (
          <Chip
            key={place.id}
            label={place.name}
            icon={{ ios: 'bookmark.fill', android: 'bookmark' }}
            iconColor={colors.warning}
            onPress={() => onPlacePress(place, 'saved')}
          />
        ))}
      </ScrollView>
    </View>
  );
}

type ChipProps = {
  label: string;
  icon: React.ComponentProps<typeof Icon>['name'];
  iconColor: string;
  onPress: () => void;
};

function Chip({ label, icon, iconColor, onPress }: ChipProps) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: colors.outlineVariant, backgroundColor: pressed ? colors.surfaceContainer : colors.surface },
      ]}
    >
      <Icon name={icon} size={20} color={iconColor} />
      <Text numberOfLines={1} style={[styles.chipText, { color: colors.onSurface }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md, paddingBottom: spacing.md },
  search: {
    marginHorizontal: spacing.lg,
    minHeight: 52,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  searchText: { ...typography.bodyLarge, flex: 1 },
  mic: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -spacing.md,
  },
  chips: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  chip: {
    minHeight: Math.max(minTouchTarget, 52),
    maxWidth: 200,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chipText: { ...typography.titleMedium, flexShrink: 1 },
});
