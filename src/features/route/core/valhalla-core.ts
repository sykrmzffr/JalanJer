// Valhalla routing: request body and response parsing. Pure (no React Native),
// so it is unit-tested in Node. API reference (checked 2026-10-23):
// https://github.com/valhalla/valhalla/blob/master/docs/docs/api/route/api-reference.md

/** [longitude, latitude] */
export type LngLatTuple = [number, number];

export type AvoidOptions = { tolls: boolean; highways: boolean; ferries: boolean };

export const NO_AVOID: AvoidOptions = { tolls: false, highways: false, ferries: false };

export type Vehicle = 'car' | 'motorcycle';

export type RouteRequest = {
  from: LngLatTuple;
  to: LngLatTuple;
  /** Direction of travel at the start (degrees from north), so the route doesn't begin with a U-turn. */
  heading?: number | null;
  avoid: AvoidOptions;
  /** Defaults to car. Motorcycle uses Valhalla's `motorcycle` costing (marked BETA by Valhalla). */
  vehicle?: Vehicle;
  /** How many extra routes to ask for. Valhalla may return fewer. */
  alternates?: number;
};

export type Maneuver = {
  type: number;
  instruction: string;
  streetNames: string[];
  /** Metres. */
  length: number;
  /** Seconds. */
  time: number;
  beginShapeIndex: number;
  toll: boolean;
  highway: boolean;
  /** Spoken well before the turn, e.g. "Turn right onto Jalan Ilmu". */
  verbalAlert: string;
  /** Spoken just before the turn. */
  verbalPre: string;
  /** Spoken just after the turn, e.g. "Continue for 2 kilometers". */
  verbalPost: string;
  /** Street names at the start of the turn when different from `streetNames`. */
  beginStreetNames: string[];
  roundaboutExitCount: number | null;
};

export type Route = {
  id: string;
  /** Seconds. */
  duration: number;
  /** Metres. */
  distance: number;
  /** [lng, lat] points along the route. */
  coordinates: LngLatTuple[];
  hasToll: boolean;
  hasHighway: boolean;
  hasFerry: boolean;
  /** Main roads, for "via Persekutuan Hwy" style summaries. */
  via: string[];
  maneuvers: Maneuver[];
  bounds: { minLon: number; minLat: number; maxLon: number; maxLat: number };
};

/**
 * JSON body for POST /route. `use_*` 0 means "avoid if at all possible"
 * (Valhalla may still use them when there is no other way).
 */
export function buildRouteRequest(request: RouteRequest) {
  const start: Record<string, unknown> = { lat: request.from[1], lon: request.from[0] };
  if (request.heading != null && Number.isFinite(request.heading) && request.heading >= 0) {
    start.heading = Math.round(request.heading);
    start.heading_tolerance = 45;
  }
  // Valhalla: "All of the options described above for autos also apply to motorcycle costing."
  const costing = request.vehicle === 'motorcycle' ? 'motorcycle' : 'auto';
  return {
    locations: [start, { lat: request.to[1], lon: request.to[0] }],
    costing,
    costing_options: {
      [costing]: {
        use_tolls: request.avoid.tolls ? 0 : 0.5,
        use_highways: request.avoid.highways ? 0 : 0.5,
        use_ferry: request.avoid.ferries ? 0 : 0.5,
      },
    },
    units: 'kilometers',
    // Malay is not in Valhalla's instruction languages (checked 2026-10-23), so English for now.
    language: 'en-GB',
    alternates: request.alternates ?? 2,
  };
}

/** Decodes an encoded polyline (Google algorithm). Valhalla uses 6 decimal places. */
export function decodePolyline(encoded: string, precision = 6): LngLatTuple[] {
  const factor = 10 ** precision;
  const points: LngLatTuple[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    for (const axis of [0, 1]) {
      let result = 0;
      let shift = 0;
      let byte: number;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index < encoded.length);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta;
      else lng += delta;
    }
    points.push([lng / factor, lat / factor]);
  }
  return points;
}

/** Encodes points as a polyline. Used by the tests (and later for reroute requests). */
export function encodePolyline(points: LngLatTuple[], precision = 6): string {
  const factor = 10 ** precision;
  let out = '';
  let prevLat = 0;
  let prevLng = 0;
  const encodeValue = (value: number) => {
    let v = value < 0 ? ~(value << 1) : value << 1;
    let chunk = '';
    while (v >= 0x20) {
      chunk += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
      v >>= 5;
    }
    return chunk + String.fromCharCode(v + 63);
  };
  for (const [lng, lat] of points) {
    const iLat = Math.round(lat * factor);
    const iLng = Math.round(lng * factor);
    out += encodeValue(iLat - prevLat) + encodeValue(iLng - prevLng);
    prevLat = iLat;
    prevLng = iLng;
  }
  return out;
}

type ValhallaManeuver = {
  type?: number;
  instruction?: string;
  street_names?: string[];
  length?: number;
  time?: number;
  begin_shape_index?: number;
  toll?: boolean;
  highway?: boolean;
  verbal_transition_alert_instruction?: string;
  verbal_pre_transition_instruction?: string;
  verbal_post_transition_instruction?: string;
  begin_street_names?: string[];
  roundabout_exit_count?: number;
};

type ValhallaTrip = {
  summary?: {
    time?: number;
    length?: number;
    has_toll?: boolean;
    has_highway?: boolean;
    has_ferry?: boolean;
    min_lat?: number;
    min_lon?: number;
    max_lat?: number;
    max_lon?: number;
  };
  legs?: { shape?: string; maneuvers?: ValhallaManeuver[] }[];
};

export type ValhallaResponse = {
  trip?: ValhallaTrip;
  /** Extra routes when `alternates` was requested. Each wraps its own `trip`. */
  alternates?: { trip?: ValhallaTrip }[];
};

/** The longest named roads on a route, longest first (deduplicated). */
export function mainRoads(maneuvers: Maneuver[], count = 2): string[] {
  const byName = new Map<string, number>();
  for (const m of maneuvers) {
    const name = m.streetNames[0];
    if (!name) continue;
    byName.set(name, (byName.get(name) ?? 0) + m.length);
  }
  return [...byName.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([name]) => name);
}

function parseTrip(trip: ValhallaTrip | undefined, id: string): Route | null {
  const summary = trip?.summary;
  const legs = trip?.legs ?? [];
  if (!summary || legs.length === 0) return null;

  const coordinates: LngLatTuple[] = [];
  const maneuvers: Maneuver[] = [];
  for (const leg of legs) {
    const offset = coordinates.length;
    const points = leg.shape ? decodePolyline(leg.shape) : [];
    // Legs share their joining point; don't repeat it.
    coordinates.push(...(offset > 0 ? points.slice(1) : points));
    for (const m of leg.maneuvers ?? []) {
      maneuvers.push({
        type: m.type ?? 0,
        instruction: m.instruction ?? '',
        streetNames: m.street_names ?? [],
        length: (m.length ?? 0) * 1000,
        time: m.time ?? 0,
        beginShapeIndex: (m.begin_shape_index ?? 0) + Math.max(0, offset - 1),
        toll: m.toll ?? false,
        highway: m.highway ?? false,
        verbalAlert: m.verbal_transition_alert_instruction ?? '',
        verbalPre: m.verbal_pre_transition_instruction ?? m.instruction ?? '',
        verbalPost: m.verbal_post_transition_instruction ?? '',
        beginStreetNames: m.begin_street_names ?? [],
        roundaboutExitCount: m.roundabout_exit_count ?? null,
      });
    }
  }
  if (coordinates.length < 2) return null;

  return {
    id,
    duration: summary.time ?? 0,
    distance: (summary.length ?? 0) * 1000,
    coordinates,
    hasToll: summary.has_toll ?? maneuvers.some((m) => m.toll),
    hasHighway: summary.has_highway ?? maneuvers.some((m) => m.highway),
    hasFerry: summary.has_ferry ?? false,
    via: mainRoads(maneuvers),
    maneuvers,
    bounds: {
      minLon: summary.min_lon ?? Math.min(...coordinates.map((c) => c[0])),
      minLat: summary.min_lat ?? Math.min(...coordinates.map((c) => c[1])),
      maxLon: summary.max_lon ?? Math.max(...coordinates.map((c) => c[0])),
      maxLat: summary.max_lat ?? Math.max(...coordinates.map((c) => c[1])),
    },
  };
}

/** Main route first, then alternates, fastest first after the main one. */
export function parseRouteResponse(json: ValhallaResponse): Route[] {
  const main = parseTrip(json.trip, 'route-0');
  const alternates = (json.alternates ?? [])
    .map((alt, i) => parseTrip(alt.trip, `route-${i + 1}`))
    .filter((r): r is Route => r != null)
    .sort((a, b) => a.duration - b.duration);
  return main ? [main, ...alternates] : alternates;
}

/** "1 h 5 min", "12 min", "<1 min". */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return '<1 min';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Arrival clock time, "14:35". 24-hour, as Malaysian phones usually show. */
export function formatArrival(now: Date, seconds: number): string {
  const arrival = new Date(now.getTime() + seconds * 1000);
  return `${String(arrival.getHours()).padStart(2, '0')}:${String(arrival.getMinutes()).padStart(2, '0')}`;
}

/** Point roughly in the middle of a route, for its time bubble. */
export function midpoint(coordinates: LngLatTuple[]): LngLatTuple {
  return coordinates[Math.floor(coordinates.length / 2)] ?? coordinates[0];
}

/**
 * Where to put each route's time bubble: on a part of the route that the
 * other routes don't share, so bubbles don't stack on top of each other.
 * Falls back to the midpoint when routes overlap completely.
 */
export function bubblePositions(routes: Route[]): LngLatTuple[] {
  const key = ([lng, lat]: LngLatTuple) => `${lng.toFixed(4)},${lat.toFixed(4)}`;
  return routes.map((route, i) => {
    const others = new Set<string>();
    routes.forEach((other, j) => {
      if (j !== i) for (const c of other.coordinates) others.add(key(c));
    });
    const unique = route.coordinates.filter((c) => !others.has(key(c)));
    return unique.length > 0 ? midpoint(unique) : midpoint(route.coordinates);
  });
}
