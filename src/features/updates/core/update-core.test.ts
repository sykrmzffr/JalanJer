import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatProgress, isUpdate, parseCurrent, parseLatest, shortSha } from './update-core.ts';

const json = {
  sha: '37891ff1e7c21c64538af32d532380c7f348e61b',
  builtAt: '2026-10-24T07:55:00Z',
  branch: 'main-kdl2pb',
  apk: 'https://github.com/sykrmzffr/JalanJer/releases/download/android-latest/JalanJer-latest.apk',
};

describe('parseLatest', () => {
  it('reads a valid latest.json', () => {
    const latest = parseLatest(json);
    assert.ok(latest);
    assert.equal(latest.sha, json.sha);
    assert.equal(latest.builtAt, Date.parse(json.builtAt));
    assert.equal(latest.apk, json.apk);
  });

  it('rejects broken files and downloads from anywhere but GitHub', () => {
    assert.equal(parseLatest(null), null);
    assert.equal(parseLatest({ ...json, sha: 'not a sha' }), null);
    assert.equal(parseLatest({ ...json, builtAt: 'yesterday' }), null);
    assert.equal(parseLatest({ ...json, apk: 'https://example.com/app.apk' }), null);
  });
});

describe('isUpdate', () => {
  const latest = parseLatest(json);
  it('offers a newer build from another commit', () => {
    assert.equal(isUpdate(parseCurrent('a8ef1ce', '2026-10-24T07:07:00Z'), latest), true);
  });
  it('not the same build, and not an older one', () => {
    assert.equal(isUpdate(parseCurrent(json.sha, json.builtAt), latest), false);
    assert.equal(isUpdate(parseCurrent('abcdef0', '2026-10-25T00:00:00Z'), latest), false);
  });
  it('a local build (no build info) can always install the published one', () => {
    assert.equal(isUpdate(parseCurrent(undefined, undefined), latest), true);
    assert.equal(isUpdate(null, null), false);
  });
});

describe('formatting', () => {
  it('shortens shas and shows download progress', () => {
    assert.equal(shortSha(json.sha), '37891ff');
    assert.equal(formatProgress(5 * 1_048_576, 20 * 1_048_576), '5.0 / 20.0 MB');
    assert.equal(formatProgress(1_048_576, -1), '1.0 MB');
  });
});
