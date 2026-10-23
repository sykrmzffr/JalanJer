import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon/icon';
import { minTouchTarget, radius, spacing, typography, useColors } from '@/theme';

type SearchFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  placeholder: string;
  loading: boolean;
};

/** Waze-style pill: back chevron, text field, then a spinner or clear button. */
export function SearchField({ value, onChangeText, onBack, onSubmit, placeholder, loading }: SearchFieldProps) {
  const colors = useColors();
  return (
    <View style={[styles.pill, { backgroundColor: colors.surfaceContainer }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={onBack}
        hitSlop={8}
        style={styles.iconButton}
      >
        <Icon name={{ ios: 'chevron.left', android: 'arrow_back' }} size={20} color={colors.onSurfaceVariant} />
      </Pressable>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={colors.onSurfaceVariant}
        autoFocus
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="never"
        selectionColor={colors.primary}
        style={[styles.input, { color: colors.onSurface }]}
      />
      {loading ? (
        <ActivityIndicator style={styles.iconButton} color={colors.onSurfaceVariant} />
      ) : value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={() => onChangeText('')}
          hitSlop={8}
          style={styles.iconButton}
        >
          <Icon name={{ ios: 'xmark.circle.fill', android: 'cancel' }} size={20} color={colors.onSurfaceVariant} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 56,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: { ...typography.bodyLarge, flex: 1, paddingVertical: spacing.md },
});
