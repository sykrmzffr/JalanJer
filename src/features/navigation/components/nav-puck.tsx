import Svg, { Path } from 'react-native-svg';

// Arrow shape in a 52×52 box, pointing up (the map turns under it).
const ARROW = 'M26 5 L44 45 L26 36 L8 45 Z';

/** Solid car arrow (Waze-like): filled colour, thick white edge and a soft shadow. */
export function NavPuck({ size = 52, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 52 52">
      {/* Shadow: the same shape, a little lower and see-through. */}
      <Path
        d={ARROW}
        fill="#000000"
        opacity={0.22}
        stroke="#000000"
        strokeWidth={4}
        strokeLinejoin="round"
        transform="translate(0 2)"
      />
      <Path d={ARROW} fill={color} stroke="#FFFFFF" strokeWidth={4} strokeLinejoin="round" />
    </Svg>
  );
}
