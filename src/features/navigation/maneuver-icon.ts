import type { SymbolViewProps } from 'expo-symbols';

type IconName = SymbolViewProps['name'];

// Valhalla maneuver types (route API reference, "maneuver types").
const STRAIGHT: IconName = { ios: 'arrow.up', android: 'straight' };
const ICONS: Record<number, IconName> = {
  1: STRAIGHT, // start
  2: { ios: 'arrow.turn.up.right', android: 'turn_right' }, // start right
  3: { ios: 'arrow.turn.up.left', android: 'turn_left' }, // start left
  4: { ios: 'flag.checkered', android: 'sports_score' }, // destination
  5: { ios: 'flag.checkered', android: 'sports_score' },
  6: { ios: 'flag.checkered', android: 'sports_score' },
  7: STRAIGHT, // becomes
  8: STRAIGHT, // continue
  9: { ios: 'arrow.up.right', android: 'turn_slight_right' },
  10: { ios: 'arrow.turn.up.right', android: 'turn_right' },
  11: { ios: 'arrow.turn.up.right', android: 'turn_sharp_right' },
  12: { ios: 'arrow.uturn.right', android: 'u_turn_right' },
  13: { ios: 'arrow.uturn.left', android: 'u_turn_left' },
  14: { ios: 'arrow.turn.up.left', android: 'turn_sharp_left' },
  15: { ios: 'arrow.turn.up.left', android: 'turn_left' },
  16: { ios: 'arrow.up.left', android: 'turn_slight_left' },
  17: STRAIGHT, // ramp straight
  18: { ios: 'arrow.up.right', android: 'ramp_right' },
  19: { ios: 'arrow.up.left', android: 'ramp_left' },
  20: { ios: 'arrow.up.right', android: 'ramp_right' }, // exit right
  21: { ios: 'arrow.up.left', android: 'ramp_left' }, // exit left
  22: STRAIGHT, // stay straight
  23: { ios: 'arrow.up.right', android: 'fork_right' },
  24: { ios: 'arrow.up.left', android: 'fork_left' },
  25: { ios: 'arrow.triangle.merge', android: 'merge' },
  // Malaysia drives on the left: roundabouts go clockwise.
  26: { ios: 'arrow.clockwise', android: 'roundabout_left' },
  27: { ios: 'arrow.clockwise', android: 'roundabout_left' },
  28: { ios: 'ferry.fill', android: 'directions_boat' },
  29: { ios: 'ferry.fill', android: 'directions_boat' },
  37: { ios: 'arrow.triangle.merge', android: 'merge' },
  38: { ios: 'arrow.triangle.merge', android: 'merge' },
};

/** Arrow for a Valhalla maneuver type; straight ahead for anything unknown. */
export function maneuverIcon(type: number): IconName {
  return ICONS[type] ?? STRAIGHT;
}
