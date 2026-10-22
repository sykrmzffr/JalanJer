import { StyleSheet, Text, View } from 'react-native';

import { typography, useColors } from '@/theme';

type SpeedometerProps = {
  speedKmh: number;
  /** Posted limit for the current road, when known (from OSM `maxspeed`, later). */
  speedLimitKmh?: number | null;
};

const SIZE = 72;

/** Round speed bubble (bottom-left). Turns red when over the speed limit. */
export function Speedometer({ speedKmh, speedLimitKmh }: SpeedometerProps) {
  const colors = useColors();
  const speeding = speedLimitKmh != null && speedKmh > speedLimitKmh;

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Speed ${speedKmh} kilometres per hour${speeding ? ', over the limit' : ''}`}
      style={[
        styles.bubble,
        {
          backgroundColor: speeding ? colors.speeding : colors.speedometer,
          borderColor: colors.surface,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <Text style={[styles.value, { color: colors.onSpeedometer }]} allowFontScaling={false}>
        {speedKmh}
      </Text>
      <Text style={[styles.unit, { color: colors.onSpeedometer }]} allowFontScaling={false}>
        km/h
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  value: { ...typography.numeric, fontSize: 28, lineHeight: 30 },
  unit: { ...typography.labelSmall, lineHeight: 12 },
});
