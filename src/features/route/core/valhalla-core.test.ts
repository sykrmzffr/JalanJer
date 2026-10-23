import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  bubblePositions,
  buildRouteRequest,
  decodePolyline,
  encodePolyline,
  formatArrival,
  formatDuration,
  mainRoads,
  NO_AVOID,
  parseRouteResponse,
  type LngLatTuple,
} from './valhalla-core.ts';

// Response shape follows Valhalla's route API reference. Values are invented
// test data, not real server output.
const shapeA: LngLatTuple[] = [
  [101.5183, 3.0733],
  [101.55, 3.08],
  [101.6, 3.1],
  [101.7119, 3.1579],
];
const shapeB: LngLatTuple[] = [
  [101.5183, 3.0733],
  [101.53, 3.05],
  [101.65, 3.06],
  [101.7119, 3.1579],
];

const trip = (shape: LngLatTuple[], time: number, toll: boolean) => ({
  summary: { time, length: 25.4, has_toll: toll, has_highway: true, has_ferry: false },
  legs: [
    {
      shape: encodePolyline(shape),
      maneuvers: [
        {
          type: 1,
          instruction: 'Drive east.',
          street_names: ['Persiaran Kayangan'],
          length: 1.2,
          time: 90,
          begin_shape_index: 0,
        },
        {
          type: 10,
          instruction: 'Turn right onto Federal Highway.',
          street_names: ['Federal Highway'],
          length: 20,
          time: 1200,
          begin_shape_index: 1,
          toll,
          highway: true,
        },
        { type: 4, instruction: 'You have arrived.', length: 0, time: 0, begin_shape_index: 3 },
      ],
    },
  ],
});

describe('polyline', () => {
  it('round-trips points at 6-digit precision', () => {
    const decoded = decodePolyline(encodePolyline(shapeA));
    assert.equal(decoded.length, shapeA.length);
    decoded.forEach(([lng, lat], i) => {
      assert.ok(Math.abs(lng - shapeA[i][0]) < 1e-6);
      assert.ok(Math.abs(lat - shapeA[i][1]) < 1e-6);
    });
  });

  it('decodes the documented example from Google (precision 5)', () => {
    // From Google's polyline algorithm page: (38.5,-120.2), (40.7,-120.95), (43.252,-126.453)
    const points = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@', 5);
    assert.deepEqual(points, [
      [-120.2, 38.5],
      [-120.95, 40.7],
      [-126.453, 43.252],
    ]);
  });
});

describe('buildRouteRequest', () => {
  it('sends lat/lon locations, auto costing and alternates', () => {
    const body = buildRouteRequest({ from: [101.5, 3.07], to: [101.7, 3.15], avoid: NO_AVOID });
    assert.deepEqual(body.locations, [
      { lat: 3.07, lon: 101.5 },
      { lat: 3.15, lon: 101.7 },
    ]);
    assert.equal(body.costing, 'auto');
    assert.equal(body.alternates, 2);
    assert.deepEqual(body.costing_options.auto, { use_tolls: 0.5, use_highways: 0.5, use_ferry: 0.5 });
  });

  it('maps Avoid choices to use_* = 0', () => {
    const body = buildRouteRequest({
      from: [101.5, 3.07],
      to: [101.7, 3.15],
      avoid: { tolls: true, highways: false, ferries: true },
    });
    assert.deepEqual(body.costing_options.auto, { use_tolls: 0, use_highways: 0.5, use_ferry: 0 });
  });

  it('adds the heading only when it is known', () => {
    const withHeading = buildRouteRequest({ from: [1, 2], to: [3, 4], heading: 91.6, avoid: NO_AVOID });
    assert.equal((withHeading.locations[0] as { heading?: number }).heading, 92);
    const without = buildRouteRequest({ from: [1, 2], to: [3, 4], heading: -1, avoid: NO_AVOID });
    assert.equal((without.locations[0] as { heading?: number }).heading, undefined);
  });
});

describe('parseRouteResponse', () => {
  it('returns the main route first, then alternates fastest first', () => {
    const routes = parseRouteResponse({
      trip: trip(shapeA, 1500, true),
      alternates: [{ trip: trip(shapeB, 2100, false) }, { trip: trip(shapeB, 1800, false) }],
    });
    assert.equal(routes.length, 3);
    assert.equal(routes[0].id, 'route-0');
    assert.deepEqual(
      routes.slice(1).map((r) => r.duration),
      [1800, 2100],
    );
  });

  it('converts km to metres and reads the toll flag', () => {
    const [route] = parseRouteResponse({ trip: trip(shapeA, 1500, true) });
    assert.equal(route.distance, 25_400);
    assert.equal(route.hasToll, true);
    assert.equal(route.maneuvers[1].length, 20_000);
    assert.equal(route.coordinates.length, 4);
    assert.deepEqual(route.via, ['Federal Highway', 'Persiaran Kayangan']);
  });

  it('copes with errors and empty answers', () => {
    assert.deepEqual(parseRouteResponse({}), []);
    assert.deepEqual(parseRouteResponse({ trip: { summary: { time: 1 }, legs: [] } }), []);
  });
});

describe('formatting', () => {
  it('formats durations', () => {
    assert.equal(formatDuration(20), '<1 min');
    assert.equal(formatDuration(12 * 60), '12 min');
    assert.equal(formatDuration(60 * 60), '1 h');
    assert.equal(formatDuration(65 * 60 + 10), '1 h 5 min');
  });

  it('formats arrival time in 24-hour clock', () => {
    const now = new Date(2026, 9, 23, 23, 50);
    assert.equal(formatArrival(now, 25 * 60), '00:15');
  });
});

describe('mainRoads', () => {
  it('ranks named roads by total length', () => {
    const roads = mainRoads([
      {
        type: 1,
        instruction: '',
        streetNames: ['A'],
        length: 100,
        time: 0,
        beginShapeIndex: 0,
        toll: false,
        highway: false,
      },
      {
        type: 1,
        instruction: '',
        streetNames: ['B'],
        length: 500,
        time: 0,
        beginShapeIndex: 0,
        toll: false,
        highway: false,
      },
      {
        type: 1,
        instruction: '',
        streetNames: ['A'],
        length: 450,
        time: 0,
        beginShapeIndex: 0,
        toll: false,
        highway: false,
      },
      {
        type: 1,
        instruction: '',
        streetNames: [],
        length: 9999,
        time: 0,
        beginShapeIndex: 0,
        toll: false,
        highway: false,
      },
    ]);
    assert.deepEqual(roads, ['A', 'B']);
  });
});

describe('bubblePositions', () => {
  it('places each bubble on a part of the route the others do not share', () => {
    const routes = parseRouteResponse({
      trip: trip(shapeA, 1500, true),
      alternates: [{ trip: trip(shapeB, 1800, false) }],
    });
    const [a, b] = bubblePositions(routes);
    assert.notDeepEqual(a, shapeA[0]);
    assert.ok(shapeA.slice(1, 3).some((p) => p[0] === a[0] && p[1] === a[1]));
    assert.ok(shapeB.slice(1, 3).some((p) => p[0] === b[0] && p[1] === b[1]));
  });
});
