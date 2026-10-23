import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon/icon';
import { useColors } from '@/theme';

/** Pin for the picked place. Static view (no animation), so it costs nothing while the map moves. */
export function DestinationPin() {
  const colors = useColors();
  return (
    <View style={styles.wrap} accessibilityLabel="Destination">
      <Icon name={{ ios: 'mappin.circle.fill', android: 'location_on' }} size={40} color={colors.primary} />
      <View style={[styles.dot, { backgroundColor: colors.primary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: -2 },
});
