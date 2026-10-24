import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  entriesFromSnapshot,
  entryToRow,
  MAX_RECENTS,
  mergePlaces,
  type PlaceRow,
  type PlacesSnapshot,
  rowToEntry,
  type SyncPlace,
} from './places-sync.ts';

const place = (id: string, name = id): SyncPlace => ({
  id,
  name,
  address: `${name} address`,
  coordinate: [101.5, 3.07],
});

const empty: PlacesSnapshot = { home: null, work: null, saved: [], recents: [], changes: {} };

const row = (kind: PlaceRow['kind'], slot: string, changedAt: number, deleted = false, name = slot): PlaceRow => ({
  kind,
  slot,
  place_id: slot,
  name,
  address: `${name} address`,
  lng: 101.5,
  lat: 3.07,
  changed_at: changedAt,
  deleted,
});

describe('entries', () => {
  it('turns a snapshot into entries, including tombstones', () => {
    const entries = entriesFromSnapshot({
      home: place('h'),
      work: null,
      saved: [place('s1')],
      recents: [],
      changes: { 'home:home': 5, 'saved:s1': 6, 'work:work': 7, 'recent:gone': 8 },
    });
    assert.equal(entries.get('home:home')?.place?.id, 'h');
    assert.equal(entries.get('work:work')?.place, null);
    assert.equal(entries.get('recent:gone')?.place, null);
    assert.equal(entries.size, 4);
  });

  it('keeps slots that contain a colon', () => {
    const entries = entriesFromSnapshot({ ...empty, changes: { 'saved:osm:W123': 1 } });
    assert.equal(entries.get('saved:osm:W123')?.slot, 'osm:W123');
  });

  it('round-trips rows', () => {
    const e = { kind: 'saved' as const, slot: 'a', place: place('a'), changedAt: 42 };
    assert.deepEqual(rowToEntry(entryToRow(e)), e);
    const t = { kind: 'recent' as const, slot: 'b', place: null, changedAt: 43 };
    assert.deepEqual(rowToEntry(entryToRow(t)), t);
  });
});

describe('mergePlaces', () => {
  it('first sync: pushes everything local, pulls everything remote', () => {
    const local: PlacesSnapshot = { ...empty, home: place('h'), changes: { 'home:home': 10 } };
    const { snapshot, toPush } = mergePlaces(local, [row('saved', 'x', 20)]);
    assert.equal(snapshot.home?.id, 'h');
    assert.deepEqual(
      snapshot.saved.map((p) => p.id),
      ['x'],
    );
    assert.deepEqual(
      toPush.map((r) => `${r.kind}:${r.slot}`),
      ['home:home'],
    );
  });

  it('newer change wins in both directions', () => {
    const local: PlacesSnapshot = {
      ...empty,
      home: place('local-home'),
      work: place('local-work'),
      changes: { 'home:home': 100, 'work:work': 10 },
    };
    const { snapshot, toPush } = mergePlaces(local, [
      row('home', 'home', 50, false, 'remote-home'),
      row('work', 'work', 60, false, 'remote-work'),
    ]);
    assert.equal(snapshot.home?.id, 'local-home');
    assert.equal(snapshot.work?.name, 'remote-work');
    assert.deepEqual(
      toPush.map((r) => r.kind),
      ['home'],
    );
  });

  it('a deletion on another phone removes the place here', () => {
    const local: PlacesSnapshot = { ...empty, saved: [place('s')], changes: { 'saved:s': 10 } };
    const { snapshot, toPush } = mergePlaces(local, [row('saved', 's', 20, true)]);
    assert.equal(snapshot.saved.length, 0);
    assert.equal(snapshot.changes['saved:s'], 20);
    assert.equal(toPush.length, 0);
  });

  it('a deletion here is pushed as a tombstone', () => {
    const local: PlacesSnapshot = { ...empty, changes: { 'saved:s': 30 } };
    const { toPush } = mergePlaces(local, [row('saved', 's', 20)]);
    assert.equal(toPush.length, 1);
    assert.equal(toPush[0].deleted, true);
  });

  it('nothing to push when both sides already agree', () => {
    const local: PlacesSnapshot = { ...empty, saved: [place('s')], changes: { 'saved:s': 20 } };
    assert.equal(mergePlaces(local, [row('saved', 's', 20)]).toPush.length, 0);
  });

  it('orders saved and recents newest first and caps recents', () => {
    const rows = Array.from({ length: MAX_RECENTS + 3 }, (_, i) => row('recent', `r${i}`, i + 1));
    const { snapshot, toPush } = mergePlaces(empty, rows);
    assert.equal(snapshot.recents.length, MAX_RECENTS);
    assert.equal(snapshot.recents[0].id, `r${MAX_RECENTS + 2}`);
    // The 3 oldest become tombstones on the server too.
    assert.deepEqual(
      toPush.map((r) => [r.slot, r.deleted]),
      [
        ['r0', true],
        ['r1', true],
        ['r2', true],
      ],
    );
  });
});
