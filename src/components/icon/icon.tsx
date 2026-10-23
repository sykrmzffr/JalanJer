import { SymbolView, type SymbolViewProps } from 'expo-symbols';

type IconProps = {
  /** SF Symbol name on iOS, Material Symbol name on Android. */
  name: SymbolViewProps['name'];
  size?: number;
  color: string;
  weight?: SymbolViewProps['weight'];
};

/** Platform-native icons: SF Symbols on iOS (Apple HIG), Material Symbols on Android. */
export function Icon({ name, size = 24, color, weight }: IconProps) {
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={color}
      weight={weight}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
