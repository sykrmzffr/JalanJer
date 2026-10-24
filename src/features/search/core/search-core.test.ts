import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  combineResults,
  dedupe,
  distanceMeters,
  expandQuery,
  formatDistance,
  matchScore,
  normalize,
  rank,
  tokens,
} from './search-core.ts';

describe('normalize / tokens', () => {
  it('lowercases, strips accents and punctuation', () => {
    assert.equal(normalize('  Café  Al-Fariz, Maju! '), 'cafe al fariz maju');
  });

  it('expands Malaysian abbreviations and splits letters from digits', () => {
    assert.deepEqual(tokens('Jln SS2/24'), ['jalan', 'ss', '2', '24']);
    assert.deepEqual(tokens('tmn melawati'), ['taman', 'melawati']);
    assert.deepEqual(tokens('KL'), ['kuala', 'lumpur']);
  });

  it('expandQuery keeps words but expands abbreviations', () => {
    assert.equal(expandQuery('Jln Budiman 22/3'), 'jalan budiman 22 3');
    assert.equal(expandQuery('   '), '');
  });
});

describe('matchScore', () => {
  it('scores exact matches highest', () => {
    assert.ok(matchScore('home', 'Home') > 0.95);
  });

  it('matches prefixes while typing', () => {
    assert.ok(matchScore('celc', 'CelcomDigi Tower') > 0);
    assert.ok(matchScore('eco ci', 'KL Eco City Mall') > 0);
  });

  it('treats abbreviations and full words the same', () => {
    assert.ok(matchScore('jln ss 6', 'Jalan SS 6/20') > 0.5);
    assert.ok(matchScore('jalan ss6', 'Jln SS6/20') > 0.5);
  });

  it('requires every query word to match', () => {
    assert.equal(matchScore('eco mall xyz', 'KL Eco City Mall'), 0);
    assert.equal(matchScore('', 'anything'), 0);
  });

  it('prefers names that start with the query', () => {
    assert.ok(matchScore('kl eco', 'KL Eco City') > matchScore('eco', 'KL Eco City'));
  });
});

describe('distance', () => {
  it('measures roughly right (Shah Alam to KLCC is about 25 km)', () => {
    const km = distanceMeters([101.5183, 3.0733], [101.7119, 3.1579]) / 1000;
    assert.ok(km > 22 && km < 26, `got ${km}`);
  });

  it('formats metres and kilometres', () => {
    assert.equal(formatDistance(4), '10 m');
    assert.equal(formatDistance(347), '350 m');
    assert.equal(formatDistance(4230), '4.2 km');
    assert.equal(formatDistance(38_400), '38 km');
  });
});

describe('rank', () => {
  it('puts a good nearby match above a good far match', () => {
    const ranked = rank([
      { id: 'far', textScore: 0.9, distance: 60_000 },
      { id: 'near', textScore: 0.9, distance: 1_000 },
    ]);
    assert.deepEqual(
      ranked.map((r) => r.id),
      ['near', 'far'],
    );
  });

  it('still lets a much better text match beat a slightly closer weak one', () => {
    const ranked = rank([
      { id: 'weak-near', textScore: 0.3, distance: 2_000 },
      { id: 'strong', textScore: 1, distance: 5_000 },
    ]);
    assert.equal(ranked[0].id, 'strong');
  });

  it('keeps input order for ties and does not mutate', () => {
    const input = [
      { id: 'a', textScore: 0.5, distance: null },
      { id: 'b', textScore: 0.5, distance: null },
    ];
    const ranked = rank(input);
    assert.deepEqual(
      ranked.map((r) => r.id),
      ['a', 'b'],
    );
    assert.notEqual(ranked, input);
  });
});

describe('dedupe', () => {
  it('drops the same place listed twice', () => {
    const out = dedupe([
      {
        name: 'KL Eco City',
        coordinate: [101.6705, 3.1178] as [number, number],
      },
      {
        name: 'kl eco city',
        coordinate: [101.6706, 3.1179] as [number, number],
      },
      { name: 'KL Eco City', coordinate: [101.7, 3.2] as [number, number] },
    ]);
    assert.equal(out.length, 2);
  });
});

describe('combineResults', () => {
  const near: [number, number] = [101.5183, 3.0733];
  const home = {
    id: 'home',
    name: 'Home',
    address: 'Jalan Budiman 22/3, Shah Alam',
    coordinate: [101.52, 3.07] as [number, number],
    kind: 'home',
    source: 'home' as const,
  };
  const remote = (id: string, name: string, lng: number) => ({
    id,
    name,
    address: 'Selangor',
    coordinate: [lng, 3.07] as [number, number],
    kind: 'amenity:fuel',
    source: 'remote' as const,
  });

  it('shows matching on-device places and drops non-matching ones', () => {
    const out = combineResults('budiman', [home], [], near);
    assert.equal(out.length, 1);
    assert.equal(combineResults('klcc', [home], [], near).length, 0);
  });

  it('orders category results (no query) by distance', () => {
    const out = combineResults(
      '',
      [home],
      [remote('far', 'Petronas A', 101.9), remote('near', 'Shell B', 101.52)],
      near,
    );
    assert.deepEqual(
      out.map((r) => r.id),
      ['near', 'far'],
    );
  });

  it('keeps one copy when a saved place also comes back from the server', () => {
    const out = combineResults('home', [home], [{ ...remote('r', 'Home', 101.52), coordinate: home.coordinate }], near);
    assert.equal(out.length, 1);
    assert.equal(out[0].source, 'home');
  });

  it('works without knowing where the user is', () => {
    const out = combineResults('shell', [], [remote('a', 'Shell B', 101.52)], null);
    assert.equal(out[0].distance, null);
  });
});
