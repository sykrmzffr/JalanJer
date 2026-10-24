import { FlashList } from '@shopify/flash-list';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon/icon';
import { SwipeToDelete } from '@/features/search/components/place-row';
import { type Place, usePlacesStore } from '@/stores/places-store';
import { spacing, typography, useColors } from '@/theme';

const ROW_HEIGHT = 72;

type RecentsListProps = {
  onPlacePress: (place: Place) => void;
  bottomInset: number;
};

/** "Recent" destinations under the sheet header. Fixed-height rows for smooth scrolling. */
export function RecentsList({ onPlacePress, bottomInset }: RecentsListProps) {
  const colors = useColors();
  const recents = usePlacesStore((s) => s.recents);
  const removeRecent = usePlacesStore((s) => s.removeRecent);

  return (
    <FlashList
      data={recents}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingBottom: bottomInset }}
      ListHeaderComponent={<Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Recent</Text>}
      ListEmptyComponent={
        <Text style={[styles.empty, { color: colors.onSurfaceVariant }]}>Places you drive to will show up here.</Text>
      }
      renderItem={({ item }) => (
        <SwipeToDelete onDelete={() => removeRecent(item.id)}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, ${item.address}`}
            onPress={() => onPlacePress(item)}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: pressed ? colors.surfaceContainer : colors.surface,
              },
            ]}
          >
            <Icon name={{ ios: 'clock.arrow.circlepath', android: 'history' }} size={22} color={colors.onSurface} />
            <View style={styles.rowText}>
              <Text numberOfLines={1} style={[typography.titleMedium, { color: colors.onSurface }]}>
                {item.name}
              </Text>
              <Text numberOfLines={1} style={[typography.bodyMedium, { color: colors.onSurfaceVariant }]}>
                {item.address}
              </Text>
            </View>
          </Pressable>
        </SwipeToDelete>
      )}
    />
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    ...typography.labelLarge,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  empty: {
    ...typography.bodyMedium,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  row: {
    height: ROW_HEIGHT,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  rowText: { flex: 1, gap: 2 },
});
