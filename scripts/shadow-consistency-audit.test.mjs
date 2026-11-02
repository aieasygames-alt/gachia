import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inspectShadowHTML, evidenceSampler, inspectShadowFlightFailure } from './shadow-consistency-audit.mjs';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const releaseKey = 'a'.repeat(64), contextId = '12345678-1234-1234-1234-123456789012';
const cacheKey = `shadow:${releaseKey}:hash`, mediaPath = `/shadow/${releaseKey}/media/${'b'.repeat(64)}`;
const expected = { releaseKey, owner: 'nte', page: { title: 'Fixture', body: 'Actual body' } };
function html() {
  return `<title>Fixture</title><meta name="robots" content="noindex, nofollow"><meta name="x-shadow-release" content="${releaseKey}"><meta name="x-shadow-context" content="${contextId}"><meta name="x-shadow-cache-key" content="${cacheKey}"><main data-shadow-release="${releaseKey}" data-shadow-owner="nte" data-shadow-context="${contextId}" data-shadow-cache-key="${cacheKey}" data-shadow-artifact-reads="3"><p data-shadow-body="true">Actual body</p><img src="${mediaPath}"><script data-shadow-context="${contextId}" type="application/ld+json">${JSON.stringify({ name: 'Fixture', text: 'Actual body', identifier: releaseKey, version: releaseKey, image: mediaPath })}</script></main>`;
}
test('network audit checks actual content and independent version/context witnesses', () => {
  assert.equal(inspectShadowHTML(html(), expected).releaseKey, releaseKey);
  for (const bad of [html().replace('Actual body</p>', 'Old body</p>'), html().replace('content="' + releaseKey, 'content="' + 'c'.repeat(64)), html().replace('data-shadow-context="' + contextId, 'data-shadow-context="' + 'x'.repeat(36)), html().replace('"identifier":"' + releaseKey, '"identifier":"' + 'd'.repeat(64)), html().replace('data-shadow-artifact-reads="3"', 'data-shadow-artifact-reads="6"')]) {
    assert.throws(() => inspectShadowHTML(bad, expected));
  }
});
test('fixture-only output cannot substitute for a real HTML response', () => {
  assert.throws(() => inspectShadowHTML(JSON.stringify({ releaseKey, consistent: true }), expected));
});
test('Flight streaming 200 requires a real error frame and cannot hide leaked success output', () => {
  const response = { status: 200, headers: { 'content-type': 'text/x-component', 'cache-control': 'private, no-store' }, text: '0:{}\n4:E{"digest":"failure"}\n' };
  assert.equal(inspectShadowFlightFailure(response, expected.page).noSuccessWitness, true);
  assert.throws(() => inspectShadowFlightFailure({ ...response, text: '0:{}' }, expected.page));
  assert.throws(() => inspectShadowFlightFailure({ ...response, text: response.text + 'Actual body' }, expected.page));
  assert.throws(() => inspectShadowFlightFailure({ ...response, text: response.text + 'data-shadow-release' }, expected.page));
});
test('adversarial Host probe sends the requested header rather than fetch-normalized localhost', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'shadow-auditor-test-'));
  const server = createServer((request, response) => { response.statusCode = 404; response.end(request.headers.host); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const sampler = evidenceSampler(directory);
    const response = await sampler.sample('host', `http://127.0.0.1:${server.address().port}`, { headers: { host: 'gachia.com' } });
    assert.equal(response.status, 404); assert.equal(response.text, 'gachia.com');
    assert.equal(response.requestHeaders.host, 'gachia.com');
  } finally {
    await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true });
  }
});
