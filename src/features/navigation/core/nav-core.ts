// Turn-by-turn "brain": pure logic, run once per GPS fix (about 1 per second).
// No React Native imports, so it's unit-tested in Node (`npm test`).
//
// It snaps the GPS position onto the route, works out the current and next
// maneuver, detects leaving the route and arriving, and decides when to speak.
// See docs/NAVIGATION_PLAN.md for why this is our own code (not Ferrostar yet).

import type { LngLatTuple, Route } from '../../route/core/valhalla-core';

export type Fix = {
  coordinate: LngLatTuple;
  /** Metres (GPS accuracy radius), if known. */
  accuracy: number | null;
  /** Metres per second, if known. */
  speed: number | null;
  /** Milliseconds since 1970. */
  time: number;
};

export type PreparedRoute = {
  route: Route;
  /** Distance along the route (m) at each shape point. */
  cumulative: number[];
  /** Total length along the shape (m). */
  total: number;
  /** Distance along the route (m) where each maneuver starts. */
  maneuverAt: number[];
};

export type NavState = {
  /** Index of the route segment we're on (between shape points i and i+1). */
  segment: number;
  /** Metres along the route. */
  distanceAlong: number;
  /** Metres between the GPS position and the route. */
  distanceFromRoute: number;
  /** Position on the route (what the puck and camera show). */
  snapped: LngLatTuple;
  /** Current maneuver index; the next one to do is `step + 1`. */
  step: number;
  /** Fixes in a row that were too far from the route. */
  offRouteCount: number;
  offRoute: boolean;
  arrived: boolean;
  /** Spoken cues already given, as "maneuverIndex:alert|pre". */
  spoken: string[];
  started: boolean;
};

export type NavEvent =
  | { type: 'speak'; text: string }
  | { type: 'offRoute' }
  | { type: 'arrived' }
  | { type: 'step'; index: number };

const EARTH_M_PER_DEG_LAT = 110_574;
const EARTH_M_PER_DEG_LNG_EQUATOR = 111_320;
// Leaving the route: this many fixes in a row further than the threshold.
const OFF_ROUTE_FIXES = 3;
// Small GPS backwards jumps are ignored so progress doesn't flicker.
const MAX_BACKWARDS_M = 30;
const ARRIVAL_M = 25;
// Assume town driving when the phone doesn't report speed.
const DEFAULT_SPEED_MPS = 13.9;

/** Flat-earth distance in metres; accurate enough over route segments. */
function planarDistance(a: LngLatTuple, b: LngLatTuple): number {
  const cosLat = Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180);
  const dx = (b[0] - a[0]) * EARTH_M_PER_DEG_LNG_EQUATOR * cosLat;
  const dy = (b[1] - a[1]) * EARTH_M_PER_DEG_LAT;
  return Math.hypot(dx, dy);
}

/** Compass bearing in degrees (0 = north, 90 = east) from a to b. */
export function bearing(a: LngLatTuple, b: LngLatTuple): number {
  const cosLat = Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180);
  const dx = (b[0] - a[0]) * cosLat;
  const dy = b[1] - a[1];
  return ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
}

export function prepareRoute(route: Route): PreparedRoute {
  const cumulative = [0];
  for (let i = 1; i < route.coordinates.length; i++) {
    cumulative.push(cumulative[i - 1] + planarDistance(route.coordinates[i - 1], route.coordinates[i]));
  }
  const total = cumulative[cumulative.length - 1] ?? 0;
  const maneuverAt = route.maneuvers.map((m) =>
    Math.min(total, cumulative[Math.min(m.beginShapeIndex, cumulative.length - 1)] ?? 0),
  );
  return { route, cumulative, total, maneuverAt };
}

type Projection = { segment: number; t: number; point: LngLatTuple; distance: number; along: number };

function projectOnSegment(p: PreparedRoute, i: number, point: LngLatTuple): Projection {
  const a = p.route.coordinates[i];
  const b = p.route.coordinates[i + 1];
  const cosLat = Math.cos((a[1] * Math.PI) / 180);
  const ax = 0;
  const ay = 0;
  const bx = (b[0] - a[0]) * EARTH_M_PER_DEG_LNG_EQUATOR * cosLat;
  const by = (b[1] - a[1]) * EARTH_M_PER_DEG_LAT;
  const px = (point[0] - a[0]) * EARTH_M_PER_DEG_LNG_EQUATOR * cosLat;
  const py = (point[1] - a[1]) * EARTH_M_PER_DEG_LAT;
  const len2 = bx * bx + by * by;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * bx + (py - ay) * by) / len2));
  const qx = bx * t;
  const qy = by * t;
  const snapped: LngLatTuple = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const segLen = p.cumulative[i + 1] - p.cumulative[i];
  return { segment: i, t, point: snapped, distance: Math.hypot(px - qx, py - qy), along: p.cumulative[i] + segLen * t };
}

/**
 * Nearest point on the route. With a `from` segment it looks mostly ahead
 * (and a little behind), so a road running parallel further back can't steal
 * the position; without one it searches the whole route.
 */
export function snapToRoute(p: PreparedRoute, point: LngLatTuple, from = -1): Projection {
  const last = p.route.coordinates.length - 2;
  const start = from < 0 ? 0 : Math.max(0, from - 3);
  const end = from < 0 ? last : Math.min(last, from + 60);
  let best = projectOnSegment(p, start, point);
  for (let i = start + 1; i <= end; i++) {
    const candidate = projectOnSegment(p, i, point);
    if (candidate.distance < best.distance) best = candidate;
  }
  return best;
}

/** The point `distance` metres along the route (clamped to the ends). */
export function pointAtDistance(p: PreparedRoute, distance: number): { point: LngLatTuple; segment: number } {
  const d = Math.max(0, Math.min(p.total, distance));
  let lo = 0;
  let hi = p.cumulative.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (p.cumulative[mid] <= d) lo = mid;
    else hi = mid;
  }
  const segLen = p.cumulative[hi] - p.cumulative[lo];
  const t = segLen === 0 ? 0 : (d - p.cumulative[lo]) / segLen;
  const a = p.route.coordinates[lo];
  const b = p.route.coordinates[hi] ?? a;
  return { point: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], segment: lo };
}

/** Direction of travel at a segment, for the camera and the puck. */
export function segmentBearing(p: PreparedRoute, segment: number): number {
  const c = p.route.coordinates;
  const i = Math.max(0, Math.min(c.length - 2, segment));
  return bearing(c[i], c[i + 1] ?? c[i]);
}

export function initialState(p: PreparedRoute): NavState {
  return {
    segment: 0,
    distanceAlong: 0,
    distanceFromRoute: 0,
    snapped: p.route.coordinates[0],
    step: 0,
    offRouteCount: 0,
    offRoute: false,
    arrived: false,
    spoken: [],
    started: false,
  };
}

/** Index of the maneuver we're on: the last one whose start we've passed. */
export function stepAt(p: PreparedRoute, distanceAlong: number): number {
  let step = 0;
  for (let i = 0; i < p.maneuverAt.length; i++) {
    if (p.maneuverAt[i] <= distanceAlong + 5) step = i;
    else break;
  }
  return step;
}

/** "300 meters", "1.5 kilometers": for speaking. */
export function spokenDistance(meters: number): string {
  if (meters < 1000) return `${Math.max(50, Math.round(meters / 50) * 50)} meters`;
  const km = Math.round(meters / 100) / 10;
  return `${km % 1 === 0 ? km.toFixed(0) : km.toFixed(1)} kilometers`;
}

/** "80 m", "350 m", "1.2 km", "14 km": for the banner. */
export function formatManeuverDistance(meters: number): string {
  if (meters < 100) return `${Math.max(0, Math.round(meters / 10) * 10)} m`;
  if (meters < 1000) return `${Math.round(meters / 50) * 50} m`;
  const km = meters / 1000;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

/** How far ahead to give the early warning, by speed. */
function alertDistance(speed: number): number {
  if (speed > 22) return 1500; // > ~80 km/h: highway
  if (speed > 13) return 800;
  return 400;
}

/** How far ahead to say the turn itself (about 8 seconds of driving). */
function preDistance(speed: number): number {
  return Math.max(40, Math.min(200, speed * 8));
}

/** Processes one GPS fix. Returns the new state and what the screen/voice should do. */
export function update(p: PreparedRoute, state: NavState, fix: Fix): { state: NavState; events: NavEvent[] } {
  const events: NavEvent[] = [];
  if (state.arrived) return { state, events };

  const snap = snapToRoute(p, fix.coordinate, state.started ? state.segment : -1);
  const threshold = Math.max(35, Math.min(80, (fix.accuracy ?? 20) * 1.5));
  const far = snap.distance > threshold;
  const offRouteCount = far ? state.offRouteCount + 1 : 0;
  const offRoute = offRouteCount >= OFF_ROUTE_FIXES;
  if (offRoute && !state.offRoute) events.push({ type: 'offRoute' });

  // Progress only moves forward: small backwards GPS jumps are ignored, and
  // while far from the route the last good position is kept.
  const usable = !far && (!state.started || snap.along >= state.distanceAlong - MAX_BACKWARDS_M);
  let distanceAlong = state.distanceAlong;
  let segment = state.segment;
  let snapped = state.snapped;
  if (usable && (!state.started || snap.along >= state.distanceAlong)) {
    distanceAlong = snap.along;
    segment = snap.segment;
    snapped = snap.point;
  }

  const step = stepAt(p, distanceAlong);
  if (state.started && step !== state.step) events.push({ type: 'step', index: step });

  const spoken = [...state.spoken];
  const say = (key: string, text: string) => {
    if (!text || spoken.includes(key)) return;
    spoken.push(key);
    events.push({ type: 'speak', text });
  };

  if (!state.started) say('0:pre', p.route.maneuvers[0]?.verbalPre ?? '');

  const arrived = p.total - distanceAlong <= ARRIVAL_M && !far;
  if (arrived) {
    const lastIndex = p.route.maneuvers.length - 1;
    say(`${lastIndex}:pre`, p.route.maneuvers[lastIndex]?.verbalPre || 'You have arrived.');
    events.push({ type: 'arrived' });
  } else if (!offRoute) {
    const next = step + 1;
    const maneuver = p.route.maneuvers[next];
    if (maneuver) {
      const toNext = p.maneuverAt[next] - distanceAlong;
      const speed = fix.speed != null && fix.speed > 0 ? fix.speed : DEFAULT_SPEED_MPS;
      const pre = preDistance(speed);
      const alert = alertDistance(speed);
      if (toNext <= pre) {
        say(`${next}:pre`, maneuver.verbalPre);
        // Close enough that a separate early warning would only repeat it.
        if (!spoken.includes(`${next}:alert`)) spoken.push(`${next}:alert`);
      } else if (toNext <= alert && toNext > pre + 100) {
        const text = maneuver.verbalAlert || maneuver.verbalPre;
        say(`${next}:alert`, text ? `In ${spokenDistance(toNext)}, ${lowerFirst(text)}` : '');
      }
    }
  }

  return {
    state: {
      segment,
      distanceAlong,
      distanceFromRoute: snap.distance,
      snapped,
      step,
      offRouteCount,
      offRoute,
      arrived,
      spoken,
      started: true,
    },
    events,
  };
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

export type Progress = {
  /** Metres to the end. */
  remainingDistance: number;
  /** Seconds to the end, from Valhalla's per-maneuver times. */
  remainingDuration: number;
  /** Metres to the next maneuver, or null at the last one. */
  toNext: number | null;
  next: number | null;
};

export function progress(p: PreparedRoute, state: NavState): Progress {
  const { maneuvers } = p.route;
  const step = state.step;
  const next = step + 1 < maneuvers.length ? step + 1 : null;
  const stepStart = p.maneuverAt[step] ?? 0;
  const stepEnd = next != null ? p.maneuverAt[next] : p.total;
  const stepLength = Math.max(1, stepEnd - stepStart);
  const fractionLeft = Math.max(0, Math.min(1, (stepEnd - state.distanceAlong) / stepLength));
  let remainingDuration = (maneuvers[step]?.time ?? 0) * fractionLeft;
  for (let i = step + 1; i < maneuvers.length; i++) remainingDuration += maneuvers[i].time;
  return {
    remainingDistance: Math.max(0, p.total - state.distanceAlong),
    remainingDuration,
    toNext: next != null ? Math.max(0, p.maneuverAt[next] - state.distanceAlong) : null,
    next,
  };
}

// ── Names ──

type Named = Pick<Route['maneuvers'][number], 'streetNames' | 'beginStreetNames' | 'instruction'>;

/** The maneuver's street name, skipping bare route numbers like "2" (Federal Highway). Null if none. */
export function namedStreet(m: Named): string | null {
  return [...m.streetNames, ...m.beginStreetNames].find((name) => /\p{L}{2,}/u.test(name)) ?? null;
}

/**
 * What to call a maneuver on screen: its street name, or (when the road only has a
 * number) the full instruction, which is clearer, e.g. "Take the ramp on the left toward 2".
 */
export function maneuverTitle(m: Named): string {
  return namedStreet(m) ?? m.instruction;
}

// ── Things on the route (reports) ──

/** Something placed on the route: `along` is its distance from the route start (m). */
export type OnRoute<T> = { item: T; along: number };

/**
 * Places points (e.g. reports) on the route: those within `maxDistance` metres of
 * the route line, sorted by distance along it. Points near a road that crosses or
 * runs beside the route also count; we don't know which direction a report was for.
 */
export function placeOnRoute<T extends { coordinate: LngLatTuple }>(
  p: PreparedRoute,
  items: readonly T[],
  maxDistance = 40,
): OnRoute<T>[] {
  if (p.route.coordinates.length < 2) return [];
  // Cheap box check first (about 1 km margin) so far-away points skip the full search.
  const { minLon, minLat, maxLon, maxLat } = p.route.bounds;
  const margin = 0.01;
  const out: OnRoute<T>[] = [];
  for (const item of items) {
    const [lng, lat] = item.coordinate;
    if (lng < minLon - margin || lng > maxLon + margin || lat < minLat - margin || lat > maxLat + margin) continue;
    const snap = snapToRoute(p, item.coordinate);
    if (snap.distance <= maxDistance) out.push({ item, along: snap.along });
  }
  return out.sort((a, b) => a.along - b.along);
}

/** Placed items still ahead of you, with their distance from you (m). */
export function aheadOnRoute<T>(placed: readonly OnRoute<T>[], distanceAlong: number): { item: T; distance: number }[] {
  return placed
    .filter((x) => x.along > distanceAlong)
    .map((x) => ({ item: x.item, distance: x.along - distanceAlong }));
}

/** How far ahead to warn about a report, by speed (m). Chosen values, not from a study. */
export function reportWarningDistance(speedMps: number | null): number {
  return (speedMps ?? DEFAULT_SPEED_MPS) > 22 ? 1000 : 500;
}

// ── Camera ──

/** Navigation camera zoom: closer at town speeds, further out on highways (MapLibre zoom levels). */
export function navZoom(speedKmh: number): number {
  return Math.max(15, Math.min(17.5, 17.5 - speedKmh / 40));
}

/** Arrow size factor for a camera zoom: 1 at zoom 16.5, twice as big one zoom level further out. */
export function arrowScale(zoom: number): number {
  return 2 ** (16.5 - zoom);
}

// ── Turn arrow drawn on the road ──

export type ManeuverArrow = {
  /** Line along the road up to the arrow head. */
  shaft: LngLatTuple[];
  /** Closed triangle ring (first point repeated at the end). */
  head: LngLatTuple[];
};

// Valhalla types with no turn to show: start, destinations, "becomes", "continue".
const NO_ARROW = new Set([1, 2, 3, 4, 5, 6, 7, 8]);

/** Offsets a point by metres east/north. */
function offset([lng, lat]: LngLatTuple, east: number, north: number): LngLatTuple {
  const cosLat = Math.cos((lat * Math.PI) / 180);
  return [lng + east / (EARTH_M_PER_DEG_LNG_EQUATOR * cosLat), lat + north / EARTH_M_PER_DEG_LAT];
}

/**
 * Arrow following the road through maneuver `index`: from `before` metres before
 * it to `after` metres after (not past the next maneuver), ending in a triangle.
 * Null for maneuvers that aren't turns (start, arrive, continue). `scale` grows it
 * when the camera is zoomed out (see `arrowScale`), so it looks the same size on screen.
 */
export function maneuverArrow(
  p: PreparedRoute,
  index: number,
  { before = 45, after = 30, headLength = 16, headWidth = 22, scale = 1 } = {},
): ManeuverArrow | null {
  const maneuver = p.route.maneuvers[index];
  if (!maneuver || NO_ARROW.has(maneuver.type)) return null;
  const at = p.maneuverAt[index];
  const start = Math.max(0, at - before * scale);
  const end = Math.min(p.total, at + after * scale, (p.maneuverAt[index + 1] ?? p.total) - 2);
  if (end - start < 10) return null;

  const shaft: LngLatTuple[] = [pointAtDistance(p, start).point];
  for (let i = 0; i < p.cumulative.length; i++) {
    if (p.cumulative[i] > start && p.cumulative[i] < end) shaft.push(p.route.coordinates[i]);
  }
  const tip = pointAtDistance(p, end).point;
  shaft.push(tip);

  // Head direction: the last few metres of the shaft.
  const dir = (bearing(pointAtDistance(p, end - 4).point, tip) * Math.PI) / 180;
  const ux = Math.sin(dir);
  const uy = Math.cos(dir);
  const length = headLength * scale;
  const half = (headWidth * scale) / 2;
  const point = offset(tip, ux * length, uy * length);
  const left = offset(tip, -uy * half, ux * half);
  const right = offset(tip, uy * half, -ux * half);
  return { shaft, head: [left, point, right, left] };
}

/**
 * Practice drive: a fake GPS fix `distance` metres along the route, moving at
 * `speedMps`. Lets you try navigation without driving.
 */
export function simulatedFix(p: PreparedRoute, distance: number, speedMps: number, time: number): Fix {
  const { point } = pointAtDistance(p, distance);
  return { coordinate: point, accuracy: 5, speed: speedMps, time };
}

/** Practice drive speeds you can pick (km/h). */
export const PRACTICE_SPEED_MIN_KMH = 10;
export const PRACTICE_SPEED_MAX_KMH = 150;
const PRACTICE_SPEED_STEP_KMH = 10;

/** One step faster (+1) or slower (-1), staying between the min and max. */
export function stepPracticeSpeed(kmh: number, direction: 1 | -1): number {
  const next =
    Math.round(kmh / PRACTICE_SPEED_STEP_KMH) * PRACTICE_SPEED_STEP_KMH + direction * PRACTICE_SPEED_STEP_KMH;
  return Math.max(PRACTICE_SPEED_MIN_KMH, Math.min(PRACTICE_SPEED_MAX_KMH, next));
}
