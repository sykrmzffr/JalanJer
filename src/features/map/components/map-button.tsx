import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { GestureDetector, useTapGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { SPRING_PRESS } from '@/styles/motion';
import { mapButton, radius, useColors } from '@/theme';

type MapButtonProps = {
  /** Read by VoiceOver/TalkBack. */
  accessibilityLabel: string;
  onPress: () => void;
  children: ReactNode;
  /** "circle" (default) or "square" (rounded square, like the menu and report buttons). */
  shape?: 'circle' | 'square';
  size?: number;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
};

const PRESSED_SCALE = 0.9;

/**
 * Floating button that sits on top of the map. The press animation runs on the
 * UI thread (gesture worklets + Reanimated spring), so it reacts on the next
 * frame even while JavaScript is busy. Only the final tap hops to JS.
 */
export function MapButton({
  accessibilityLabel,
  onPress,
  children,
  shape = 'circle',
  size = mapButton.size,
  backgroundColor,
  style,
}: MapButtonProps) {
  const colors = useColors();
  const scale = useSharedValue(1);

  const tap = useTapGesture({
    onBegin: () => {
      'worklet';
      scale.set(withSpring(PRESSED_SCALE, SPRING_PRESS));
    },
    onDeactivate: (event) => {
      'worklet';
      if (!event.canceled) scheduleOnRN(onPress);
    },
    onFinalize: () => {
      'worklet';
      scale.set(withSpring(1, SPRING_PRESS));
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <GestureDetector gesture={tap}>
      <Animated.View
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'activate') onPress();
        }}
        style={[
          styles.base,
          {
            width: size,
            height: size,
            borderRadius: shape === 'circle' ? radius.full : radius.lg,
            backgroundColor: backgroundColor ?? colors.surface,
            shadowColor: colors.shadow,
          },
          style,
          animatedStyle,
        ]}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    // iOS shadow; Android uses elevation.
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
});
