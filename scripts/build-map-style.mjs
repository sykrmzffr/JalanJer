// Builds our flat, Waze-like light map style from OpenFreeMap's "liberty" style.
//
//   npm run map-style
//
// Writes src/features/map/styles/light.json (checked in, bundled with the app, so the
// map doesn't wait for a style download). Run again to pick up OpenFreeMap changes.
//
// What it changes (see docs/MAP_STYLE.md):
// - no 3D buildings, no shaded-relief layer, no footpaths, no POI icons, no route shields
// - few colours: grey land, white roads, soft green parks, soft blue water
// Colours marked "sampled" were read from the Waze screens in IMAGE REFERENCES/;
// the rest are starting choices.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE = 'https://tiles.openfreemap.org/styles/liberty';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'features', 'map', 'styles', 'light.json');

const C = {
  land: '#E1E5E6', // sampled: map background
  building: '#D6DADC',
  buildingEdge: '#CBD0D3',
  green: '#D8EFDF', // sampled: parks (route selection screen)
  water: '#A4DCF4', // sampled: water (route selection screen)
  waterLabel: '#4F8FB3',
  road: '#FCFCFC', // sampled: roads
  roadEdge: '#BAC6D2', // sampled: road outline
  majorEdge: '#A9B6C2',
  tunnel: '#F1F3F4',
  rail: '#C5CBD0',
  airport: '#D9DDDF',
  roadLabel: '#7C8288',
  placeLabel: '#3E4247',
  halo: '#FFFFFF',
};

// Layers dropped entirely.
const REMOVE = new Set([
  'natural_earth',
  'building-3d',
  'park_outline',
  'road_area_pattern',
  'landuse_residential',
  'landuse_hospital',
  'landuse_school',
  'landuse_track',
  'landcover_ice',
  'landcover_sand',
  'tunnel_path_pedestrian',
  'road_path_pedestrian',
  'bridge_path_pedestrian',
  'bridge_path_pedestrian_casing',
  'highway-name-path',
  'poi_r1',
  'poi_r7',
  'poi_r20',
  'poi_transit',
  'highway-shield-non-us',
  'highway-shield-us-interstate',
  'road_shield_us',
]);

const GREEN = new Set([
  'park',
  'landcover_wood',
  'landcover_grass',
  'landcover_wetland',
  'landuse_pitch',
  'landuse_cemetery',
]);

function restyle(layer) {
  const { id, type } = layer;
  const paint = { ...layer.paint };
  const set = (values) => Object.assign(paint, values);

  if (type === 'background') set({ 'background-color': C.land });
  else if (GREEN.has(id)) {
    delete paint['fill-pattern'];
    delete paint['fill-outline-color'];
    set({ 'fill-color': C.green, 'fill-opacity': 1 });
  } else if (id === 'water') set({ 'fill-color': C.water });
  else if (id.startsWith('waterway_') && type === 'line') set({ 'line-color': C.water });
  else if (id === 'aeroway_fill') set({ 'fill-color': C.airport, 'fill-opacity': 1 });
  else if (id.startsWith('aeroway_')) set({ 'line-color': C.road });
  else if (id === 'building') set({ 'fill-color': C.building, 'fill-outline-color': C.buildingEdge });
  else if (/rail/.test(id)) set({ 'line-color': C.rail });
  else if (/(motorway|trunk_primary).*_casing$/.test(id)) set({ 'line-color': C.majorEdge });
  else if (id.endsWith('_casing')) set({ 'line-color': C.roadEdge });
  else if (id.startsWith('tunnel_') && type === 'line') set({ 'line-color': C.tunnel });
  else if (/^(road|bridge)_/.test(id) && type === 'line') set({ 'line-color': C.road });
  else if (type === 'symbol' && /water/.test(id)) set({ 'text-color': C.waterLabel, 'text-halo-color': C.halo });
  else if (type === 'symbol' && id.startsWith('highway-name'))
    set({ 'text-color': C.roadLabel, 'text-halo-color': C.halo, 'text-halo-width': 1.5 });
  else if (type === 'symbol' && (id.startsWith('label_') || id === 'airport'))
    set({ 'text-color': C.placeLabel, 'text-halo-color': C.halo, 'text-halo-width': 1.5 });

  return Object.keys(paint).length ? { ...layer, paint } : layer;
}

const response = await fetch(SOURCE);
if (!response.ok) throw new Error(`${SOURCE}: HTTP ${response.status}`);
const style = await response.json();

const kept = style.layers.filter((l) => !REMOVE.has(l.id));
const missing = [...REMOVE].filter((id) => !style.layers.some((l) => l.id === id));
if (missing.length) console.warn(`Not in the source style any more (check the list): ${missing.join(', ')}`);

const out = {
  ...style,
  name: 'JalanJer light (from OpenFreeMap Liberty)',
  sources: Object.fromEntries(Object.entries(style.sources).filter(([key]) => key !== 'ne2_shaded')),
  layers: kept.map(restyle),
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(`Wrote ${OUT}: ${out.layers.length} layers (was ${style.layers.length}).`);
