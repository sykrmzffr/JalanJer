import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  type SharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import { radius, spacing, useColors } from '@/theme';

type BottomSheetProps = {
  /**
   * Visible height of the sheet, in points. Owned by the parent so other views
   * (map buttons) can follow the sheet on the UI thread.
   */
  height: SharedValue<number>;
  /** Snap heights from smallest to largest, e.g. [collapsed, half, full]. */
  detents: number[];
  /** Draggable top part: handle + search row. */
  header: ReactNode;
  /** Content under the header (lists). Scrolls on its own. */
  children: ReactNode;
};

// Spring for snapping: critically damped so the sheet never bounces past a detent.
const SNAP_SPRING = { stiffness: 420, damping: 42, mass: 0.7 } as const;
// How far a flick carries the sheet when choosing the detent (seconds of velocity).
const FLICK_PROJECTION = 0.12;

/**
 * Bottom sheet with detents. Dragging and snapping run entirely on the UI
 * thread (Gesture Handler worklets + Reanimated), so it tracks the finger
 * every frame, including at 120 Hz.
 */
export function BottomSheet({ height, detents, header, children }: BottomSheetProps) {
  const colors = useColors();
  const min = detents[0];
  const max = detents[detents.length - 1];

  const pan = usePanGesture({
    activeOffsetY: [-6, 6],
    onActivate: () => {
      'worklet';
      // Stop any running snap so the sheet sticks to the finger.
      cancelAnimation(height);
    },
    onUpdate: (event) => {
      'worklet';
      const next = height.get() - event.changeY;
      // Rubber-band past the ends instead of a hard stop.
      if (next > max) height.set(max + (next - max) * 0.3);
      else if (next < min) height.set(min - (min - next) * 0.3);
      else height.set(next);
    },
    onDeactivate: (event) => {
      'worklet';
      const projected = height.get() - event.velocityY * FLICK_PROJECTION;
      let target = detents[0];
      for (const detent of detents) {
        if (Math.abs(detent - projected) < Math.abs(target - projected)) target = detent;
      }
      height.set(withSpring(target, { ...SNAP_SPRING, velocity: -event.velocityY }));
    },
  });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: max - height.get() }],
  }));

  const snapTo = (direction: 1 | -1) => {
    const current = detents.findIndex((d) => d >= height.get() - 1);
    const index = Math.min(Math.max(current + direction, 0), detents.length - 1);
    height.set(withSpring(detents[index], SNAP_SPRING));
  };

  return (
    <Animated.View
      style={[
        styles.sheet,
        { height: max, backgroundColor: colors.surface, shadowColor: colors.shadow },
        sheetStyle,
      ]}
    >
      <GestureDetector gesture={pan}>
        <View>
          <View
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel="Sheet"
            accessibilityHint="Swipe up or down to resize"
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={(event) =>
              snapTo(event.nativeEvent.actionName === 'increment' ? 1 : -1)
            }
            style={styles.handleArea}
          >
            <View style={[styles.handle, { backgroundColor: colors.outline }]} />
          </View>
          {header}
        </View>
      </GestureDetector>
      <View style={styles.body}>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  handleArea: { alignItems: 'center', paddingTop: spacing.sm, paddingBottom: spacing.md },
  handle: { width: 40, height: 5, borderRadius: radius.full },
  body: { flex: 1 },
});
