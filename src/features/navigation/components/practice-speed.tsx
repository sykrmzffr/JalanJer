import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon/icon';
import { useSettingsStore } from '@/stores/settings-store';
import { radius, spacing, typography, useColors } from '@/theme';

import { PRACTICE_SPEED_MAX_KMH, PRACTICE_SPEED_MIN_KMH, stepPracticeSpeed } from '../core/nav-core';

/** − 50 km/h + : practice drive speed. Same setting in Settings → Navigation and in the trip panel. */
export function PracticeSpeed({ compact }: { compact?: boolean }) {
  const colors = useColors();
  const kmh = useSettingsStore((s) => s.practiceSpeedKmh);
  const setSpeed = useSettingsStore((s) => s.setPracticeSpeed);
  const change = (direction: 1 | -1) => {
    Haptics.selectionAsync();
    setSpeed(stepPracticeSpeed(kmh, direction));
  };
  const size = compact ? 32 : 40;
  const button = (direction: 1 | -1, disabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={direction === 1 ? 'Faster' : 'Slower'}
      disabled={disabled}
      hitSlop={8}
      onPress={() => change(direction)}
      style={({ pressed }) => [
        styles.button,
        {
          width: size,
          height: size,
          backgroundColor: colors.surfaceContainerHigh,
          opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <Icon
        name={direction === 1 ? { ios: 'plus', android: 'add' } : { ios: 'minus', android: 'remove' }}
        size={compact ? 16 : 20}
        color={colors.onSurface}
        weight="bold"
      />
    </Pressable>
  );
  return (
    <View style={styles.row} accessibilityLabel={`Practice speed ${kmh} kilometres per hour`}>
      {button(-1, kmh <= PRACTICE_SPEED_MIN_KMH)}
      <Text
        style={[
          compact ? typography.labelLarge : typography.titleMedium,
          styles.value,
          { color: colors.warning, minWidth: compact ? 64 : 80 },
        ]}
      >
        {kmh} km/h
      </Text>
      {button(1, kmh >= PRACTICE_SPEED_MAX_KMH)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  button: { borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  value: { textAlign: 'center', fontVariant: ['tabular-nums'] },
});
