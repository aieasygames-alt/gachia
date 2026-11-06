import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { digest } from '../../../../scripts/desktop-release-assets.mjs';
import { readPinnedUnifiedInput } from '../../src/unified-desktop.ts';
import { readUnifiedHistoricalPublication, unifiedHistoricalPublicationRequest } from '../../src/unified-historical-publication.ts';
import { unifiedProductionRequest, verifyUnifiedProductionLocal } from '../../src/unified-production.ts';

// Explicit local qualification: real retained files and installed app, synthetic CMS HTTP only.
const file = process.env.UNIFIED_SEALED_LOCAL_HISTORY;
const pin = process.env.UNIFIED_SEALED_LOCAL_HISTORY_PIN;
assert(file && path.isAbsolute(file) && /^[a-f0-9]{64}$/.test(pin ?? ''),
  'Require UNIFIED_SEALED_LOCAL_HISTORY (absolute path) and UNIFIED_SEALED_LOCAL_HISTORY_PIN');
const history = unifiedHistoricalPublicationRequest(readPinnedUnifiedInput(file, pin));

test('complete local preflight reopens sealed artifacts and installed files without verifier replacements', async t => {
  let handler;
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (input, options) => {
    const url = new URL(String(input));
    assert.equal(url.origin, 'http://127.0.0.1:3100', 'Cloud and other network access forbidden');
    assert.equal(options?.method, 'GET');
    assert.equal(options?.redirect, 'error');
    assert.equal(new Headers(options?.headers).get('authorization'), 'JWT isolated-sealed-local-token');
    requests.push(url.pathname);
    assert(handler, 'Historical reopening must not use network');
    return handler(url);
  });
  const opened = await readUnifiedHistoricalPublication(history);
  assert.equal(requests.length, 0);
  const production = unifiedProductionRequest(readPinnedUnifiedInput(history.production.path, history.production.pin));
  const originals = [file, history.production.path, production.application.path, production.editorial.path,
    production.active.path, production.selection.path, production.localPreview.path];
  const originalPins = originals.map(name => digest(readFileSync(name)));
  const documents = opened.review.records.map((record, index) => ({ ...structuredClone(record),
    id: opened.review.reviews[index].id, updatedAt: opened.review.reviews[index].updatedAt, game: index + 1 }));

  for (const fault of ['none', 'caller-mutation', 'reviewer', 'late-review', 'transport']) {
    await t.test(`real local preflight with isolated CMS: ${fault}`, async () => {
      let reads = 0, users = 0;
      const input = structuredClone(production);
      handler = url => {
        if (url.pathname === '/api/users/me') {
          users++;
          if (fault === 'transport') throw new TypeError('isolated transport failure');
          if (fault === 'caller-mutation') {
            input.application.pin = '0'.repeat(64);
            input.editorial.pin = '0'.repeat(64);
            input.preservation = { path: '/invalid-mutated-request', pin: '0'.repeat(64) };
          }
          return Response.json({ user: { role: fault === 'reviewer' ? 'editor' : 'reviewer' } });
        }
        if (url.pathname === '/api/content-records') {
          reads++;
          for (const [key, value] of Object.entries({ draft: 'false', locale: 'all', 'fallback-locale': 'none', depth: '0', limit: '2' })) {
            assert.equal(url.searchParams.get(key), value);
          }
          const doc = structuredClone(documents.find(row => row.stableKey === url.searchParams.get('where[stableKey][equals]')));
          assert(doc, 'Only the sealed selection may be requested');
          if (fault === 'late-review' && users === 2) doc.updatedAt = new Date(Date.parse(doc.updatedAt) + 1000).toISOString();
          return Response.json({ totalDocs: 1, docs: [doc], hasNextPage: false });
        }
        const index = documents.findIndex(doc => url.pathname === `/api/games/${doc.game}`);
        assert(index >= 0, 'Unexpected CMS path');
        return Response.json({ id: documents[index].game, key: opened.review.records[index].sourceRecord.game });
      };
      const run = () => verifyUnifiedProductionLocal(input, 'isolated-sealed-local-token');
      if (fault === 'reviewer') await assert.rejects(run, /Production review requires reviewer access/);
      else if (fault === 'transport') await assert.rejects(run, /Production read failed/);
      else if (fault === 'late-review') {
        await assert.rejects(run, /Formal CMS review changed during preflight/);
        assert.equal(users, 2);
      } else {
        const result = await run();
        assert.deepEqual(result.request, production);
        assert.equal(result.review.reviewPin, opened.review.reviewPin);
        assert.equal(result.built.frozen.candidate.candidateSHA256, opened.built.frozen.candidate.candidateSHA256);
        assert.deepEqual(result.qualification, opened.qualification);
        assert.equal(users, 2); assert.equal(reads, documents.length * 2);
        assert.deepEqual(Object.keys(result.preservation ?? {}).sort(), result.scope.preservationOnlyOwners);
      }
      assert.deepEqual(originals.map(name => digest(readFileSync(name))), originalPins);
    });
  }
  t.diagnostic(JSON.stringify({ sources: opened.plan.sources.length, selected: documents.length,
    installedSourceCommit: opened.built.frozen.sourceCommit, cmsHTTPSynthetic: true,
    verifierReplacements: false, cloudContacted: false, productionReady: false }));
});
