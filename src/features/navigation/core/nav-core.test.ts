import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { LngLatTuple, Maneuver, Route } from '../../route/core/valhalla-core.ts';
import {
  type Fix,
  formatManeuverDistance,
  initialState,
  type NavState,
  prepareRoute,
  progress,
  segmentBearing,
  simulatedFix,
  snapToRoute,
  spokenDistance,
  update,
} from './nav-core.ts';

// Invented test route: 1.1 km east along latitude 3.07, then a right turn and
// 1.1 km south. Each step is 0.001° (about 111 m).
const east: LngLatTuple[] = Array.from({ length: 11 }, (_, i) => [101.5 + i * 0.001, 3.07]);
const south: LngLatTuple[] = Array.from({ length: 10 }, (_, i) => [101.51, 3.07 - (i + 1) * 0.001]);
const coordinates = [...east, ...south];

const maneuver = (over: Partial<Maneuver>): Maneuver => ({
  type: 1,
  instruction: '',
  streetNames: [],
  length: 0,
  time: 0,
  beginShapeIndex: 0,
  toll: false,
  highway: false,
  verbalAlert: '',
  verbalPre: '',
  verbalPost: '',
  beginStreetNames: [],
  roundaboutExitCount: null,
  ...over,
});

const route: Route = {
  id: 'r',
  duration: 160,
  distance: 2300,
  coordinates,
  hasToll: false,
  hasHighway: false,
  hasFerry: false,
  via: [],
  bounds: { minLon: 101.5, minLat: 3.06, maxLon: 101.51, maxLat: 3.07 },
  maneuvers: [
    maneuver({ type: 1, beginShapeIndex: 0, time: 80, verbalPre: 'Drive east on Jalan Satu.' }),
    maneuver({
      type: 10,
      beginShapeIndex: 10,
      time: 80,
      verbalAlert: 'Turn right onto Jalan Dua.',
      verbalPre: 'Turn right onto Jalan Dua.',
      streetNames: ['Jalan Dua'],
    }),
    maneuver({ type: 4, beginShapeIndex: 20, time: 0, verbalPre: 'You have arrived at your destination.' }),
  ],
};

const prepared = prepareRoute(route);
const fixAt = (coordinate: LngLatTuple, speed = 14, accuracy = 5): Fix => ({ coordinate, speed, accuracy, time: 0 });

/** Runs fixes through `update`, collecting all events. */
function drive(fixes: Fix[], start: NavState = initialState(prepared)) {
  let state = start;
  const events: ReturnType<typeof update>['events'] = [];
  for (const fix of fixes) {
    const result = update(prepared, state, fix);
    state = result.state;
    events.push(...result.events);
  }
  return { state, events };
}

const spoken = (events: ReturnType<typeof update>['events']) =>
  events.flatMap((e) => (e.type === 'speak' ? [e.text] : []));

describe('prepareRoute', () => {
  it('measures the route and places maneuvers', () => {
    assert.ok(prepared.total > 2200 && prepared.total < 2400, `total ${prepared.total}`);
    assert.equal(prepared.maneuverAt[0], 0);
    assert.ok(Math.abs(prepared.maneuverAt[1] - prepared.cumulative[10]) < 1e-9);
  });

  it('knows the direction of travel', () => {
    assert.ok(Math.abs(segmentBearing(prepared, 0) - 90) < 1);
    assert.ok(Math.abs(segmentBearing(prepared, 12) - 180) < 1);
  });
});

describe('snapToRoute', () => {
  it('finds the nearest segment and the distance off the road', () => {
    const snap = snapToRoute(prepared, [101.5035, 3.0702]);
    assert.equal(snap.segment, 3);
    assert.ok(snap.distance > 15 && snap.distance < 30, `distance ${snap.distance}`);
  });
});

describe('update', () => {
  it('says the first instruction when navigation starts', () => {
    const { events, state } = drive([fixAt(coordinates[0])]);
    assert.deepEqual(spoken(events), ['Drive east on Jalan Satu.']);
    assert.equal(state.step, 0);
  });

  it('warns early, then again just before the turn, each once', () => {
    // From the start towards the turn at index 10, one fix per shape point.
    const { events } = drive(east.map((c) => fixAt(c)));
    const texts = spoken(events);
    assert.equal(texts[0], 'Drive east on Jalan Satu.');
    assert.ok(texts[1].startsWith('In ') && texts[1].endsWith('turn right onto Jalan Dua.'), texts[1]);
    assert.equal(texts[2], 'Turn right onto Jalan Dua.');
    assert.equal(texts.length, 3);
  });

  it('moves to the next step after the turn', () => {
    const { state, events } = drive([...east, south[1]].map((c) => fixAt(c)));
    assert.equal(state.step, 1);
    assert.ok(events.some((e) => e.type === 'step' && e.index === 1));
  });

  it('ignores small backwards GPS jumps', () => {
    const { state } = drive([fixAt(east[0]), fixAt(east[5]), fixAt([101.5047, 3.07])]);
    assert.ok(Math.abs(state.distanceAlong - prepared.cumulative[5]) < 1);
  });

  it('reports leaving the route once, after several far fixes', () => {
    const far: LngLatTuple = [101.505, 3.075]; // ~550 m north of the road
    const { events, state } = drive([fixAt(east[0]), fixAt(far), fixAt(far), fixAt(far), fixAt(far)]);
    assert.equal(events.filter((e) => e.type === 'offRoute').length, 1);
    assert.equal(state.offRoute, true);
    // One far fix alone (GPS glitch) is not enough.
    assert.equal(drive([fixAt(east[0]), fixAt(far)]).state.offRoute, false);
  });

  it('announces arrival at the end', () => {
    const { events, state } = drive([...coordinates].map((c) => fixAt(c)));
    assert.equal(state.arrived, true);
    assert.ok(events.some((e) => e.type === 'arrived'));
    assert.ok(spoken(events).includes('You have arrived at your destination.'));
  });
});

describe('progress', () => {
  it('counts down distance and time', () => {
    const start = drive([fixAt(coordinates[0])]).state;
    const middle = drive([...east].map((c) => fixAt(c))).state;
    const a = progress(prepared, start);
    const b = progress(prepared, middle);
    assert.ok(a.remainingDistance > b.remainingDistance);
    assert.ok(a.remainingDuration > b.remainingDuration);
    assert.ok(Math.abs(a.remainingDuration - 160) < 1);
    assert.equal(a.next, 1);
  });
});

describe('formatting', () => {
  it('formats banner distances', () => {
    assert.equal(formatManeuverDistance(73), '70 m');
    assert.equal(formatManeuverDistance(232), '250 m');
    assert.equal(formatManeuverDistance(1234), '1.2 km');
    assert.equal(formatManeuverDistance(14_600), '15 km');
  });

  it('formats spoken distances', () => {
    assert.equal(spokenDistance(380), '400 meters');
    assert.equal(spokenDistance(1500), '1.5 kilometers');
    assert.equal(spokenDistance(2000), '2 kilometers');
  });
});

describe('practice drive', () => {
  it('moves along the route at the given speed', () => {
    const fix = simulatedFix(prepared, 10_000, 20, 0); // 200 m after 10 s
    const snap = snapToRoute(prepared, fix.coordinate);
    assert.ok(Math.abs(snap.along - 200) < 1, `along ${snap.along}`);
  });
});
