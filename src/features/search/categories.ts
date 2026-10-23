import type { SymbolViewProps } from 'expo-symbols';

export type Category = {
  id: string;
  label: string;
  icon: SymbolViewProps['name'];
  /** Key into the color roles for the icon tint. */
  tint: 'warning' | 'success' | 'primary' | 'error' | 'speeding' | 'onSurface';
  /**
   * Photon category filter (comma = any of). `null` for chips that list
   * on-device places instead of searching (Saved).
   */
  include: string | null;
};

/** Chips under the search field, in Waze's order: Saved, Gas, Food, Parking, then more. */
export const CATEGORIES: Category[] = [
  {
    id: 'saved',
    label: 'Saved',
    icon: { ios: 'bookmark.fill', android: 'bookmark' },
    tint: 'warning',
    include: null,
  },
  {
    id: 'gas',
    label: 'Gas',
    icon: { ios: 'fuelpump.fill', android: 'local_gas_station' },
    tint: 'success',
    include: 'osm.amenity.fuel',
  },
  {
    id: 'food',
    label: 'Food',
    icon: { ios: 'fork.knife', android: 'restaurant' },
    tint: 'primary',
    include: 'osm.amenity.restaurant,osm.amenity.fast_food,osm.amenity.food_court',
  },
  {
    id: 'parking',
    label: 'Parking',
    icon: { ios: 'parkingsign.circle.fill', android: 'local_parking' },
    tint: 'primary',
    include: 'osm.amenity.parking',
  },
  {
    id: 'ev',
    label: 'EV charging',
    icon: { ios: 'bolt.car.fill', android: 'ev_station' },
    tint: 'success',
    include: 'osm.amenity.charging_station',
  },
  {
    id: 'coffee',
    label: 'Coffee',
    icon: { ios: 'cup.and.saucer.fill', android: 'local_cafe' },
    tint: 'warning',
    include: 'osm.amenity.cafe',
  },
  {
    id: 'hospital',
    label: 'Hospital',
    icon: { ios: 'cross.case.fill', android: 'local_hospital' },
    tint: 'error',
    include: 'osm.amenity.hospital,osm.amenity.clinic',
  },
  {
    id: 'atm',
    label: 'ATM',
    icon: { ios: 'banknote.fill', android: 'local_atm' },
    tint: 'success',
    include: 'osm.amenity.atm,osm.amenity.bank',
  },
];

/** Icon for a search result row, from its OSM "key:value". */
export function iconForKind(kind: string): SymbolViewProps['name'] {
  const [key, value] = kind.split(':');
  if (key === 'amenity') {
    if (value === 'fuel') return { ios: 'fuelpump.fill', android: 'local_gas_station' };
    if (value === 'parking') return { ios: 'parkingsign.circle.fill', android: 'local_parking' };
    if (value === 'charging_station') return { ios: 'bolt.car.fill', android: 'ev_station' };
    if (value === 'cafe') return { ios: 'cup.and.saucer.fill', android: 'local_cafe' };
    if (value === 'restaurant' || value === 'fast_food' || value === 'food_court')
      return { ios: 'fork.knife', android: 'restaurant' };
    if (value === 'hospital' || value === 'clinic') return { ios: 'cross.case.fill', android: 'local_hospital' };
    if (value === 'atm' || value === 'bank') return { ios: 'banknote.fill', android: 'local_atm' };
    if (value === 'place_of_worship') return { ios: 'building.columns.fill', android: 'account_balance' };
  }
  if (key === 'shop') return { ios: 'bag.fill', android: 'shopping_bag' };
  if (key === 'highway') return { ios: 'road.lanes', android: 'add_road' };
  if (key === 'place' || key === 'boundary') return { ios: 'building.2.fill', android: 'location_city' };
  if (key === 'railway' || key === 'public_transport') return { ios: 'tram.fill', android: 'train' };
  return { ios: 'mappin.circle.fill', android: 'location_on' };
}
