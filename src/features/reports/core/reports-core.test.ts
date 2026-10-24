import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  activeReports,
  boxAround,
  parseReportRows,
  type Report,
  type ReportRow,
  reportAge,
  stillTherePrompt,
} from './reports-core.ts';

const NOW = Date.parse('2026-10-24T08:00:00Z');

const row = (over: Partial<ReportRow>): ReportRow => ({
  id: 'a',
  kind: 'police',
  lng: 101.5,
  lat: 3.07,
  created_at: '2026-10-24T07:50:00Z',
  expires_at: '2026-10-24T08:50:00Z',
  still_there: 0,
  not_there: 0,
  ...over,
});

const report = (id: string, lng: number, over: Partial<Report> = {}): Report => ({
  id,
  kind: 'hazard',
  coordinate: [lng, 3.07],
  createdAt: NOW - 60_000,
  expiresAt: NOW + 3_600_000,
  stillThere: 0,
  notThere: 0,
  ...over,
});

describe('parseReportRows', () => {
  it('converts rows and drops unknown kinds and broken ones', () => {
    const out = parseReportRows([
      row({}),
      row({ id: 'b', kind: 'aliens' }),
      row({ id: 'c', lat: Number.NaN }),
      row({ id: 'd', created_at: 'not a date' }),
    ]);
    assert.equal(out.length, 1);
    assert.deepEqual(out[0].coordinate, [101.5, 3.07]);
    assert.equal(out[0].createdAt, Date.parse('2026-10-24T07:50:00Z'));
  });
});

describe('activeReports', () => {
  it('hides expired reports and ones two people said are gone', () => {
    const out = activeReports(
      [report('ok', 101.5), report('old', 101.5, { expiresAt: NOW - 1 }), report('gone', 101.5, { notThere: 2 })],
      NOW,
    );
    assert.deepEqual(
      out.map((r) => r.id),
      ['ok'],
    );
  });
});

describe('reportAge', () => {
  it('formats ages', () => {
    assert.equal(reportAge(NOW - 20_000, NOW), 'just now');
    assert.equal(reportAge(NOW - 5 * 60_000, NOW), '5 min ago');
    assert.equal(reportAge(NOW - 125 * 60_000, NOW), '2 h ago');
  });
});

describe('boxAround', () => {
  it('makes a box roughly the right size', () => {
    const [w, s, e, n] = boxAround([101.5, 3.07], 10);
    assert.ok(Math.abs(n - s - 0.1809) < 0.001);
    assert.ok(e - w > 0.179 && e - w < 0.181);
  });
});

describe('stillTherePrompt', () => {
  const base = { answered: new Set<string>(), mine: new Set<string>(), now: NOW };

  it('picks the nearest report within range', () => {
    // 0.0005° of longitude is about 55 m here; 0.001° about 111 m.
    const out = stillTherePrompt([report('far', 101.501), report('near', 101.5005)], [101.5, 3.07], base);
    assert.equal(out?.id, 'near');
  });

  it('skips reports out of range, already answered, or your own', () => {
    const position: [number, number] = [101.5, 3.07];
    assert.equal(stillTherePrompt([report('x', 101.51)], position, base), null);
    assert.equal(stillTherePrompt([report('x', 101.5005)], position, { ...base, answered: new Set(['x']) }), null);
    assert.equal(stillTherePrompt([report('x', 101.5005)], position, { ...base, mine: new Set(['x']) }), null);
  });
});
