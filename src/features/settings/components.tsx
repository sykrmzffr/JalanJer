import * as Haptics from 'expo-haptics';
import type { SymbolViewProps } from 'expo-symbols';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon/icon';
import { minTouchTarget, radius, spacing, typography, useColors } from '@/theme';

/** Screen frame: back button, centred title, close (X) back to the map, scrolling grouped list. */
export function SettingsScreen({ title, children }: { title: string; children: ReactNode }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[styles.root, { backgroundColor: colors.surfaceContainerLow }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top, backgroundColor: colors.surface, borderBottomColor: colors.outlineVariant },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Icon name={{ ios: 'chevron.left', android: 'arrow_back' }} size={22} color={colors.onSurface} />
        </Pressable>
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={[typography.titleLarge, styles.title, { color: colors.onSurface }]}
        >
          {title}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close settings"
          onPress={() => router.dismissAll()}
          style={styles.headerButton}
        >
          <Icon name={{ ios: 'xmark', android: 'close' }} size={20} color={colors.onSurface} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl, paddingTop: spacing.md }}>
        {children}
      </ScrollView>
    </View>
  );
}

/** A titled group of rows with a white background (grouped list). */
export function Section({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      {title ? (
        <Text style={[typography.titleSmall, styles.sectionTitle, { color: colors.onSurfaceVariant }]}>{title}</Text>
      ) : null}
      <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
        {children}
      </View>
      {footer ? (
        <Text style={[typography.bodySmall, styles.footer, { color: colors.onSurfaceVariant }]}>{footer}</Text>
      ) : null}
    </View>
  );
}

type RowBaseProps = {
  label: string;
  /** Second line, e.g. the current value or an explanation. */
  detail?: string;
  icon?: SymbolViewProps['name'];
  /** Background of the round icon badge. */
  iconColor?: string;
};

function RowContent({ label, detail, icon, iconColor, trailing }: RowBaseProps & { trailing?: ReactNode }) {
  const colors = useColors();
  return (
    <>
      {icon ? (
        <View style={[styles.badge, { backgroundColor: iconColor ?? colors.primary }]}>
          <Icon name={icon} size={20} color="#FFFFFF" />
        </View>
      ) : null}
      <View style={styles.rowText}>
        <Text style={[typography.bodyLarge, { color: colors.onSurface }]}>{label}</Text>
        {detail ? <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>{detail}</Text> : null}
      </View>
      {trailing}
    </>
  );
}

/** Row that opens another page (chevron on the right). */
export function NavRow({ onPress, value, ...props }: RowBaseProps & { onPress: () => void; value?: string }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[props.label, value].filter(Boolean).join(', ')}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceContainer }]}
    >
      <RowContent
        {...props}
        trailing={
          <View style={styles.trailing}>
            {value ? <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant }]}>{value}</Text> : null}
            <Icon name={{ ios: 'chevron.right', android: 'chevron_right' }} size={16} color={colors.onSurfaceVariant} />
          </View>
        }
      />
    </Pressable>
  );
}

/** On/off row with the platform's native switch. */
export function SwitchRow({ value, onToggle, ...props }: RowBaseProps & { value: boolean; onToggle: () => void }) {
  const colors = useColors();
  const toggle = () => {
    Haptics.selectionAsync();
    onToggle();
  };
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={props.label}
      accessibilityHint={props.detail}
      onPress={toggle}
      style={styles.row}
    >
      <RowContent
        {...props}
        trailing={
          <Switch
            value={value}
            onValueChange={toggle}
            trackColor={{ true: colors.primary }}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
          />
        }
      />
    </Pressable>
  );
}

/** One option of a single-choice list (checkmark on the chosen one). */
export function ChoiceRow({
  selected,
  onSelect,
  ...props
}: RowBaseProps & { selected: boolean; onSelect: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={props.label}
      onPress={() => {
        Haptics.selectionAsync();
        onSelect();
      }}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceContainer }]}
    >
      <RowContent
        {...props}
        trailing={
          selected ? <Icon name={{ ios: 'checkmark', android: 'check' }} size={20} color={colors.primary} /> : null
        }
      />
    </Pressable>
  );
}

/** Plain text row (e.g. version number). */
export function InfoRow({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}, ${value}`}>
      <Text style={[typography.bodyLarge, styles.rowText, { color: colors.onSurface }]}>{label}</Text>
      <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    width: minTouchTarget + 4,
    height: minTouchTarget + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, textAlign: 'center' },
  section: { marginBottom: spacing.xl },
  sectionTitle: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  group: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  row: {
    minHeight: Math.max(minTouchTarget, 56),
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  badge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 2 },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
