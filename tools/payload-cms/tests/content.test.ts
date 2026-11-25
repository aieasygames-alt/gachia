import assert from 'node:assert/strict';
import test from 'node:test';
import seed from '../../../packages/data/cms/starrail-snapshot.json';
import { isContentDate, isOfficialStarRailSource, parseStarRailUpdate } from '../../../packages/data/cms/starrail-updates';
import { readStarRailUpdates } from '../../../packages/data/cms/starrail-client';

test('source contract rejects drafts, foreign games, unsafe sources and impossible dates', () => {
  for (const update of seed) assert.ok(parseStarRailUpdate(update));
  assert.equal(parseStarRailUpdate({ ...seed[0], _status: 'draft' }), null);
  assert.equal(parseStarRailUpdate({ ...seed[0], gameId: 'genshin' }), null);
  assert.equal(parseStarRailUpdate({ ...seed[0], checkedAt: '2026-02-30' }), null);
  assert.equal(parseStarRailUpdate({ ...seed[0], releaseDate: undefined }), null);
  assert.equal(isContentDate('2024-02-29'), true);
  for (const url of ['javascript:alert(1)', 'https://sr.mihoyo.com.evil.example/', 'https://name:pass@sr.mihoyo.com/', 'http://sr.mihoyo.com/']) {
    assert.equal(isOfficialStarRailSource(url), false);
  }
});

test('reader scopes queries to game, locale and published status, bypasses the Next cache', async () => {
  let calls = 0;
  const result = await readStarRailUpdates('zh', 'http://127.0.0.1:4320', (async (url, init) => {
    calls++;
    const query = new URL(String(url));
    assert.equal(query.searchParams.get('where[and][0][gameId][equals]'), 'starrail');
    assert.equal(query.searchParams.get('where[and][1][locale][equals]'), 'zh');
    assert.equal(query.searchParams.get('where[and][2][_status][equals]'), 'published');
    assert.equal(init?.cache, 'no-store');
    assert.ok(init?.signal);
    return Response.json({ docs: seed, hasNextPage: false });
  }) as typeof fetch);
  assert.equal(calls, 1);
  assert.equal(result.source, 'cms');
  assert.equal(result.updates.length, 3);
});

test('reader rejects mismatched language, drafts and truncated responses', async () => {
  for (const body of [
    { docs: [{ ...seed[0], locale: 'en' }] },
    { docs: [{ ...seed[0], _status: 'draft' }] },
    { docs: seed, hasNextPage: true },
    { docs: null },
  ]) {
    const result = await readStarRailUpdates('zh', 'https://cms.example.com', (async () => Response.json(body)) as typeof fetch);
    assert.equal(result.source, 'snapshot');
  }
});

test('outages use the dated snapshot; a valid empty CMS response stays empty', async () => {
  const outage = await readStarRailUpdates('zh', 'https://cms.example.com', (async () => { throw new Error('offline'); }) as typeof fetch);
  assert.equal(outage.source, 'snapshot');
  assert.equal(outage.updates[0]?.checkedAt, '2026-11-24');
  const empty = await readStarRailUpdates('zh', 'https://cms.example.com', (async () => Response.json({ docs: [], hasNextPage: false })) as typeof fetch);
  assert.deepEqual(empty, { source: 'cms', updates: [] });
  assert.deepEqual((await readStarRailUpdates('en')).updates, []);
});
