import assert from 'node:assert/strict';
import test from 'node:test';
import seed from '../../../packages/data/cms/starrail-snapshot.json';
import { isContentDate, isOfficialStarRailSource, isCommunityStarRailSource, isStarRailSource, parseStarRailUpdate } from '../../../packages/data/cms/starrail-updates';
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

test('MiYouShe citations accept only canonical Star Rail article URLs', () => {
  for (const url of ['https://www.miyoushe.com/sr/article/79482327', 'https://www.miyoushe.com/sr/article/79504324/']) {
    assert.equal(isOfficialStarRailSource(url), true);
    assert.ok(parseStarRailUpdate({ ...seed[0], sources: [{ url }] }));
  }
  for (const url of [
    'https://www.miyoushe.com/sr/home/53', 'https://www.miyoushe.com/ys/article/79482327',
    'https://www.miyoushe.com/sr/article/no-id', 'https://www.miyoushe.com/sr/article/0',
    'https://www.miyoushe.com/sr/article/79482327?redirect=example.com',
    'https://www.miyoushe.com/sr/article/79482327#comment',
    'https://www.miyoushe.com.evil.example/sr/article/79482327',
    'http://www.miyoushe.com/sr/article/79482327',
    'https://name:pass@www.miyoushe.com/sr/article/79482327',
    'https://www.miyoushe.com:444/sr/article/79482327',
  ]) assert.equal(isOfficialStarRailSource(url), false);
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

test('reviewed community references are accepted without being labelled official', () => {
  for (const url of ['https://bbs.mihoyo.com/sr/wiki/content/8099/detail', 'https://www.prydwen.gg/star-rail/characters/aha', 'https://www.miyoushe.com/sr/article/79485999/']) {
    assert.equal(isStarRailSource(url), true);
    assert.equal(isCommunityStarRailSource(url), true);
    assert.equal(isOfficialStarRailSource(url), false);
    assert.ok(parseStarRailUpdate({ ...seed[0], kind: 'character', sources: [{ url }] }));
  }
  for (const url of ['https://bbs.mihoyo.com/sr/wiki/content/8099/detail?redirect=evil', 'https://www.prydwen.gg/star-rail/characters/aha#comments', 'https://www.prydwen.gg.evil.example/star-rail/characters/aha', 'https://name:pass@www.prydwen.gg/star-rail/characters/aha', 'http://www.prydwen.gg/star-rail/characters/aha', 'https://www.prydwen.gg/star-rail/characters/other']) {
    assert.equal(isStarRailSource(url), false);
  }
});

test('reviewed guide sources retain exact URL and community attribution', () => {
  const url = 'https://www.prydwen.gg/star-rail/guides/relic-sets';
  assert.ok(parseStarRailUpdate({ ...seed[0], kind: 'guide', sources: [{ url }] }));
  assert.equal(isCommunityStarRailSource(url), true);
  assert.equal(isOfficialStarRailSource(url), false);
  for (const unsafe of [url + '?source=unreviewed', url + '#comments', 'https://www.prydwen.gg/star-rail/guides/other']) {
    assert.equal(isStarRailSource(unsafe), false);
  }
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
