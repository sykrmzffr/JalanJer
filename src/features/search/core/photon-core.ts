// Photon geocoder: request URLs and response parsing. Pure (no React Native),
// so it is unit-tested in Node. API reference:
// https://github.com/komoot/photon/blob/master/docs/api-v1.md

import type { LngLatTuple } from './search-core';

/** Malaysia (with a margin into Singapore and southern Thailand), minLon,minLat,maxLon,maxLat. */
export const MALAYSIA_BBOX = '99.5,0.8,119.5,7.5';

export type PhotonFeature = {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    osm_type?: string;
    osm_id?: number;
    osm_key?: string;
    osm_value?: string;
    name?: string;
    housenumber?: string;
    street?: string;
    locality?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    countrycode?: string;
    type?: string;
  };
};

export type PhotonResponse = { features?: PhotonFeature[] };

/** What the app needs from a search result. Matches the stored `Place` shape plus a kind. */
export type GeocodedPlace = {
  id: string;
  name: string;
  address: string;
  coordinate: LngLatTuple;
  /** OSM "key:value", e.g. "amenity:fuel". Used for the row icon. */
  kind: string;
};

export type SearchParams = {
  /** Text the user typed (already expanded with `expandQuery`). Empty for category-only search. */
  query: string;
  /** Prefer results near here. */
  near?: LngLatTuple | null;
  /** Photon category filter, e.g. "osm.amenity.fuel" or "osm.amenity.restaurant,osm.amenity.cafe". */
  include?: string;
  limit?: number;
  /** Preferred result language. Photon accepts one; "default" = local names. */
  lang?: string;
};

/** Builds a /api search URL. */
export function buildSearchUrl(baseUrl: string, params: SearchParams): string {
  const search = new URLSearchParams();
  if (params.query) search.set('q', params.query);
  if (params.include) search.set('include', params.include);
  search.set('limit', String(params.limit ?? 15));
  search.set('bbox', MALAYSIA_BBOX);
  if (params.lang) search.set('lang', params.lang);
  if (params.near) {
    search.set('lon', params.near[0].toFixed(5));
    search.set('lat', params.near[1].toFixed(5));
    // Category searches ("Gas near me") want a tight radius; text searches a wider one.
    search.set('zoom', params.include && !params.query ? '14' : '11');
    search.set('location_bias_scale', '0.2');
  }
  return `${baseUrl.replace(/\/+$/, '')}/api/?${search.toString()}`;
}

/** Builds a /reverse URL (coordinate -> address). */
export function buildReverseUrl(baseUrl: string, at: LngLatTuple, lang?: string): string {
  const search = new URLSearchParams({
    lon: at[0].toFixed(6),
    lat: at[1].toFixed(6),
    limit: '1',
  });
  if (lang) search.set('lang', lang);
  return `${baseUrl.replace(/\/+$/, '')}/reverse?${search.toString()}`;
}

function joinUnique(parts: (string | undefined)[], exclude?: string): string {
  const seen = new Set<string>();
  if (exclude) seen.add(exclude.toLowerCase());
  const out: string[] = [];
  for (const part of parts) {
    const value = part?.trim();
    if (!value || seen.has(value.toLowerCase())) continue;
    seen.add(value.toLowerCase());
    out.push(value);
  }
  return out.join(', ');
}

/** "6 Persiaran Barat, Petaling Jaya, Selangor" style address line. */
export function formatAddress(p: PhotonFeature['properties'], name?: string): string {
  const streetLine = p.street ? [p.housenumber, p.street].filter(Boolean).join(' ') : undefined;
  return joinUnique([streetLine, p.district ?? p.locality, p.city ?? p.county, p.state], name);
}

/** Turns Photon's GeoJSON into places. Skips features without coordinates or a usable name. */
export function parsePhotonResponse(json: PhotonResponse): GeocodedPlace[] {
  const places: GeocodedPlace[] = [];
  for (const feature of json.features ?? []) {
    const coords = feature.geometry?.coordinates;
    if (!coords || !Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) continue;
    const p = feature.properties ?? {};
    const streetName = p.street ? [p.housenumber, p.street].filter(Boolean).join(' ') : undefined;
    const name = p.name ?? streetName ?? p.city ?? p.state;
    if (!name) continue;
    const id = p.osm_type && p.osm_id != null ? `osm:${p.osm_type}${p.osm_id}` : `pt:${coords[0]},${coords[1]}`;
    places.push({
      id,
      name,
      address: formatAddress(p, name) || p.country || '',
      coordinate: [coords[0], coords[1]],
      kind: p.osm_key && p.osm_value ? `${p.osm_key}:${p.osm_value}` : 'place:unknown',
    });
  }
  return places;
}
