import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon/icon';
import { useSettingsStore } from '@/stores/settings-store';
import { mapButton, spacing, useColors } from '@/theme';

import { MapButton } from './map-button';
import { Speedometer } from './speedometer';

type MapControlsProps = {
  /** Visible height of the bottom sheet; the bottom row rides on top of it. */
  sheetHeight: SharedValue<number>;
  collapsedSheetHeight: number;
  following: boolean;
  onRecenter: () => void;
  speedKmh: number;
  /**
   * Don't render the bottom row (route preview). When faded out it is invisible
   * but would still catch taps meant for the map.
   */
  hideBottomRow?: boolean;
};

// The bottom row fades out once the sheet is dragged this far above its collapsed height.
const BOTTOM_ROW_FADE_DISTANCE = 120;

/** Floating buttons over the map, laid out like Waze's home screen. */
export function MapControls({
  sheetHeight,
  collapsedSheetHeight,
  following,
  onRecenter,
  speedKmh,
  hideBottomRow = false,
}: MapControlsProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const soundMuted = useSettingsStore((s) => s.soundMuted);
  const toggleSound = useSettingsStore((s) => s.toggleSound);
  const showSpeedometer = useSettingsStore((s) => s.showSpeedometer);
  const router = useRouter();

  // Runs on the UI thread: follows the sheet every frame while it is dragged.
  const bottomRowStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      sheetHeight.get(),
      [collapsedSheetHeight, collapsedSheetHeight + BOTTOM_ROW_FADE_DISTANCE],
      [1, 0],
      Extrapolation.CLAMP,
    );
    return {
      opacity,
      transform: [{ translateY: -(sheetHeight.get() + spacing.lg) }],
    };
  });

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {/* Top-left: menu, and recenter when the camera stopped following you. */}
      <View pointerEvents="box-none" style={[styles.column, { top: insets.top + spacing.sm, left: spacing.lg }]}>
        <MapButton
          shape="square"
          accessibilityLabel="Menu"
          onPress={() => {
            Haptics.selectionAsync();
            router.push('/settings');
          }}
        >
          <Icon
            name={{ ios: 'line.3.horizontal', android: 'menu' }}
            size={24}
            color={colors.onSurface}
            weight="semibold"
          />
        </MapButton>
        {!following && (
          <Animated.View entering={ZoomIn.springify()} exiting={ZoomOut.duration(150)}>
            <MapButton accessibilityLabel="Recenter on my location" onPress={onRecenter}>
              <Icon name={{ ios: 'location.fill', android: 'my_location' }} size={22} color={colors.primary} />
            </MapButton>
          </Animated.View>
        )}
      </View>

      {/* Top-right: sound on/off. */}
      <View pointerEvents="box-none" style={[styles.column, { top: insets.top + spacing.sm, right: spacing.lg }]}>
        <MapButton
          accessibilityLabel={soundMuted ? 'Sound off. Turn sound on' : 'Sound on. Turn sound off'}
          onPress={() => {
            Haptics.selectionAsync();
            toggleSound();
          }}
        >
          <Icon
            name={
              soundMuted
                ? { ios: 'speaker.slash.fill', android: 'volume_off' }
                : { ios: 'speaker.wave.2.fill', android: 'volume_up' }
            }
            size={22}
            color={colors.onSurface}
          />
        </MapButton>
      </View>

      {/* Bottom row: speedometer and report button, riding on top of the sheet. */}
      {!hideBottomRow && (
        <Animated.View pointerEvents="box-none" style={[styles.bottomRow, bottomRowStyle]}>
          {/* Empty spacer keeps the report button on the right when the speedometer is off. */}
          {showSpeedometer ? <Speedometer speedKmh={speedKmh} /> : <View />}
          <MapButton
            shape="square"
            size={mapButton.reportSize}
            backgroundColor={colors.report}
            accessibilityLabel="Report"
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)} // Reports: Milestone 6.
          >
            <Icon name={{ ios: 'plus', android: 'add' }} size={30} color={colors.onReport} weight="heavy" />
          </MapButton>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  column: { position: 'absolute', gap: spacing.md },
  bottomRow: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
});
