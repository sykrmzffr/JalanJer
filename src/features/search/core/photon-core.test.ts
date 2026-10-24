import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildReverseUrl, buildSearchUrl, formatAddress, parsePhotonResponse } from './photon-core.ts';

// Shape follows docs/api-v1.md in the Photon repo. Values are invented test
// data, not real server output.
const sample = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [101.6127, 3.1095] },
      properties: {
        osm_type: 'W',
        osm_id: 123,
        osm_key: 'building',
        osm_value: 'commercial',
        name: 'CelcomDigi Tower',
        housenumber: '6',
        street: 'Persiaran Barat',
        city: 'Petaling Jaya',
        state: 'Selangor',
        country: 'Malaysia',
        countrycode: 'MY',
      },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [101.5, 3.07] },
      properties: {
        osm_type: 'W',
        osm_id: 9,
        osm_key: 'highway',
        osm_value: 'residential',
        street: 'Jalan Budiman 22/3',
        city: 'Shah Alam',
        state: 'Selangor',
      },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [Number.NaN, 3] },
      properties: { name: 'Broken' },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [101, 3] },
      properties: {},
    },
  ],
} as const;

describe('parsePhotonResponse', () => {
  it('turns features into places with name, address and kind', () => {
    const places = parsePhotonResponse(sample as never);
    assert.equal(places.length, 2);
    assert.deepEqual(places[0], {
      id: 'osm:W123',
      name: 'CelcomDigi Tower',
      address: '6 Persiaran Barat, Petaling Jaya, Selangor',
      coordinate: [101.6127, 3.1095],
      kind: 'building:commercial',
    });
  });

  it('uses the street as the name for unnamed streets, without repeating it', () => {
    const places = parsePhotonResponse(sample as never);
    assert.equal(places[1].name, 'Jalan Budiman 22/3');
    assert.equal(places[1].address, 'Shah Alam, Selangor');
  });

  it('handles an empty or odd response', () => {
    assert.deepEqual(parsePhotonResponse({}), []);
  });
});

describe('formatAddress', () => {
  it('skips missing and duplicate parts', () => {
    assert.equal(formatAddress({ city: 'Kuala Lumpur', state: 'Kuala Lumpur' }), 'Kuala Lumpur');
  });
});

describe('URLs', () => {
  it('builds a text search biased to the user and limited to Malaysia', () => {
    const url = new URL(
      buildSearchUrl('https://photon.example/', {
        query: 'jalan ss 2',
        near: [101.5183, 3.0733],
      }),
    );
    assert.equal(url.pathname, '/api/');
    assert.equal(url.searchParams.get('q'), 'jalan ss 2');
    assert.equal(url.searchParams.get('lat'), '3.07330');
    assert.equal(url.searchParams.get('lon'), '101.51830');
    assert.equal(url.searchParams.get('zoom'), '11');
    assert.ok(url.searchParams.get('bbox'));
  });

  it('builds a category search without q and with a tight radius', () => {
    const url = new URL(
      buildSearchUrl('https://photon.example', {
        query: '',
        include: 'osm.amenity.fuel',
        near: [101.5, 3],
      }),
    );
    assert.equal(url.searchParams.has('q'), false);
    assert.equal(url.searchParams.get('include'), 'osm.amenity.fuel');
    assert.equal(url.searchParams.get('zoom'), '14');
  });

  it('builds a reverse URL', () => {
    const url = new URL(buildReverseUrl('https://photon.example', [101.5, 3.07]));
    assert.equal(url.pathname, '/reverse');
    assert.equal(url.searchParams.get('lat'), '3.070000');
  });
});
