import assert from 'node:assert/strict';
import test from 'node:test';
import seed from '../../../packages/data/cms/starrail-snapshot.json';
import { parseStarRailPublication } from '../../../packages/data/cms/starrail-publication';
import { readStarRailUpdates } from '../../../packages/data/cms/starrail-client';
import { STARRAIL_LOCALE_LIMIT, STARRAIL_PUBLICATION_LIMIT, STARRAIL_EXPORT_LIMIT, STARRAIL_PUBLICATION_BYTES } from '../../../packages/data/cms/starrail-limits';
import { publishStarRail } from '../scripts/publish-starrail';
const rows = (locale: string, count: number) => Array.from({ length: count }, (_, i) => ({ ...seed[0], locale, slug: `capacity-${i}` }));
test('complete publication accepts the locale and total boundaries, rejects one extra and duplicate identities', () => {
  const docs = ['zh', 'en', 'ja'].flatMap(locale => rows(locale, STARRAIL_LOCALE_LIMIT));
  assert.equal(docs.length, STARRAIL_PUBLICATION_LIMIT);
  assert.equal(parseStarRailPublication({ revision: 1, docs })?.docs.length, docs.length);
  assert.equal(parseStarRailPublication({ revision: 1, docs: rows('zh', STARRAIL_LOCALE_LIMIT + 1) }), null);
  assert.equal(parseStarRailPublication({ revision: 1, docs: [...docs, { ...seed[0], slug: 'extra' }] }), null);
  assert.equal(parseStarRailPublication({ revision: 1, docs: [docs[0], docs[0]] }), null);
});
test('reader requests and returns all 100 records, refuses overflow and a truncated export', async () => {
  for (const count of [55, STARRAIL_LOCALE_LIMIT, STARRAIL_LOCALE_LIMIT + 1]) {
    const result = await readStarRailUpdates('zh', 'http://127.0.0.1:4320', (async url => {
      assert.equal(new URL(String(url)).searchParams.get('limit'), String(STARRAIL_LOCALE_LIMIT));
      return Response.json({ docs: rows('zh', count), hasNextPage: false });
    }) as typeof fetch);
    assert.equal(result.source, count <= STARRAIL_LOCALE_LIMIT ? 'cms' : 'snapshot');
    if (result.source === 'cms') assert.equal(result.updates.length, count);
  }
  assert.equal((await readStarRailUpdates('zh', 'http://127.0.0.1:4320', (async () => Response.json({ docs: rows('zh', 100), hasNextPage: true })) as typeof fetch)).source, 'snapshot');
});
test('publisher exports the complete collection and rejects count, pagination and UTF-8 byte overflow before PUT', async () => {
  const previousFetch = globalThis.fetch;
  const env = { ...process.env };
  process.env.STARRAIL_PUBLISH_ORIGIN = 'https://gachia.com';
  process.env.STARRAIL_PUBLISH_TOKEN = 'capacity-test';
  process.env.CMS_SERVER_URL = 'http://127.0.0.1:4320';
  try {
    for (const scenario of ['valid', 'maximum', 'per-locale-overflow', 'total-overflow', 'paginated', 'bytes']) {
      let puts = 0, revision = 0;
      const docs = scenario === 'maximum' ? ['zh', 'en', 'ja'].flatMap(l => rows(l,100)) : scenario === 'per-locale-overflow' ? rows('zh', 101) : scenario === 'total-overflow' ? [...['zh','en','ja'].flatMap(l => rows(l,100)), {...seed[0],slug:'extra'}] : scenario === 'bytes' ? rows('zh',100).map(d => ({...d, facts: Array.from({length:12}, () => ({text:'材'.repeat(800)}))})) : rows('zh',55);
      globalThis.fetch = (async (input, init) => {
        const url = new URL(String(input));
        if (url.hostname === '127.0.0.1') {
          assert.equal(url.searchParams.get('limit'), String(STARRAIL_EXPORT_LIMIT));
          return Response.json({ docs, hasNextPage: scenario === 'paginated' });
        }
        if (init?.method === 'PUT') {
          puts++;
          const body = JSON.parse(String(init.body)); revision = body.revision;
          assert.equal(body.docs.length, scenario === 'maximum' ? 300 : 55);
          assert.ok(Buffer.byteLength(String(init.body)) <= STARRAIL_PUBLICATION_BYTES);
          return Response.json({ok:true,count:55});
        }
        return Response.json({revision});
      }) as typeof fetch;
      if (scenario === 'valid' || scenario === 'maximum') { await publishStarRail(); assert.equal(puts,1); }
      else { await assert.rejects(publishStarRail(), scenario === 'bytes' ? /512 KiB/ : /Incomplete|Invalid complete/); assert.equal(puts,0); }
    }
  } finally { globalThis.fetch = previousFetch; process.env = env; }
});
