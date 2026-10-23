import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import Animated, { useAnimatedProps, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Development-only frame-rate meter. Rendered only when __DEV__ is true (see
// app/_layout.tsx), so it never ships in Release builds.
//
// JS:  frames the JavaScript thread manages per second (requestAnimationFrame).
//      Drops here mean JS work is slow; the map itself does not depend on it.
// UI:  frames the native UI thread draws per second (Reanimated frame callback,
//      runs on the UI thread). This is what scrolling and sheet drags feel like.
//      On iPhone 15 Pro Max it should read ~120, on iPhone 11 ~60.
//
// The UI number is written on the UI thread straight into the text field, so it
// stays correct even while the JS thread is frozen.

const SAMPLE_MS = 500;

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

function useJsFps() {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    let frames = 0;
    let start = performance.now();
    let id = requestAnimationFrame(function tick(now) {
      frames += 1;
      if (now - start >= SAMPLE_MS) {
        setFps(Math.round((frames * 1000) / (now - start)));
        frames = 0;
        start = now;
      }
      id = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, []);
  return fps;
}

export function FpsOverlay() {
  const insets = useSafeAreaInsets();
  const jsFps = useJsFps();

  const uiText = useSharedValue('UI --');
  const frames = useSharedValue(0);
  const elapsed = useSharedValue(0);

  useFrameCallback(({ timeSincePreviousFrame }) => {
    if (timeSincePreviousFrame == null) return;
    frames.value += 1;
    elapsed.value += timeSincePreviousFrame;
    if (elapsed.value >= SAMPLE_MS) {
      uiText.value = `UI ${Math.round((frames.value * 1000) / elapsed.value)}`;
      frames.value = 0;
      elapsed.value = 0;
    }
  });

  const uiProps = useAnimatedProps(() => ({ text: uiText.value }) as Partial<TextInputProps>);

  return (
    <View pointerEvents="none" style={[styles.box, { top: insets.top + 4 }]}>
      <Text style={styles.text}>JS {jsFps}</Text>
      <AnimatedTextInput
        editable={false}
        defaultValue="UI --"
        animatedProps={uiProps}
        style={[styles.text, styles.input]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  text: {
    color: '#7CFC00',
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: 'Menlo',
  },
  input: { padding: 0, margin: 0, minWidth: 48 },
});
