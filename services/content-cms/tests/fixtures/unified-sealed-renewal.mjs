import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { request as playwright } from '@playwright/test';
import { digest } from '../../../../scripts/desktop-release-assets.mjs';
import { exactUnifiedPreviewOrigin, recheckUnifiedPreview } from '../../../../scripts/unified-version-preview.mjs';
import { renewUnifiedMainPreviews } from '../../src/unified-promotion.ts';

// Keep the real proxy adapter and validators; isolate only the HTTP client response.
export async function qualifySealedRenewal(t, opened, root) {
  let fault, contexts = 0, closed = 0, responses = 0, disposed = 0;
  const originals = structuredClone(opened.previews.receipt);
  const rows = Object.fromEntries(['recovery', 'candidate'].map(role => [role, opened.references('main', role)]));
  const origins = Object.fromEntries(['recovery', 'candidate'].map(role => [role,
    exactUnifiedPreviewOrigin('gachia', originals.accepted[role].main.versionId)]));
  t.mock.method(playwright, 'newContext', async options => {
    assert.deepEqual(options, { proxy: { server: opened.server }, ignoreHTTPSErrors: false, timeout: 30000, userAgent: 'node',
      storageState: { cookies: [], origins: [] } });
    contexts++;
    return { dispose: async () => { closed++; }, get: async (input, options) => {
      const url = new URL(input), role = Object.keys(origins).find(role => origins[role] === url.origin);
      assert(role, 'Only the exact two sealed preview versions may be read');
      assert.equal(options.maxRetries, 0); assert.equal(options.maxRedirects, 0); assert.equal(options.timeout, 30000);
      assert.deepEqual(Object.keys(options.headers).sort(), ['accept-language', 'connection', 'cookie']);
      assert.equal(options.headers.cookie, ''); assert.equal(options.headers.connection, 'close');
      const row = rows[role].find(row => row.path === url.pathname); assert(row, 'Only sealed preview paths may be read');
      assert.equal(options.headers['accept-language'], row.path.match(/^\/(zh|en|ja)\//)?.[1] ?? 'zh');
      let body = readFileSync(path.join(opened.evidence.transport.directory, 'main', role, 'http', row.bodyFile));
      assert.equal(digest(body), row.sha256);
      if (row.path === '/robots.txt') body = Buffer.from(fault === 'robots' ? 'User-agent: *\nAllow: /\n' : 'User-agent: *\nDisallow: /\n');
      const headers = { ...row.headers, 'x-robots-tag': 'noindex', ...(fault === 'cookie' ? { 'set-cookie': 'isolated=forbidden' } : {}) };
      responses++;
      return { body: async () => body, status: () => row.status,
        headersArray: () => Object.entries(headers).map(([name, value]) => ({ name, value })), dispose: async () => { disposed++; } };
    } };
  });

  await t.test('real renewal preserves versions and independently reopens both fresh HTTP evidence sets', async () => {
    const directory = path.join(root, 'renewal-success');
    const result = await renewUnifiedMainPreviews(opened, 'isolated-cloud-token', directory);
    const raw = readFileSync(path.join(directory, 'receipt.json'));
    assert.equal(digest(raw), result.pin); assert.deepEqual(JSON.parse(raw), result.receipt);
    assert.equal(result.receipt.cloudWrites, false); assert.equal(result.receipt.productionPromoted, false);
    assert.equal(result.receipt.releaseKey, opened.evidence.value.releaseKey);
    assert.equal(result.receipt.previewPin, opened.request.previews.pin);
    for (const role of ['recovery', 'candidate']) {
      const proof = result.receipt.accepted[role].main, original = originals.accepted[role].main;
      const { originalEvidenceSHA256, evidenceSHA256, acceptedAt, ...identity } = proof;
      const { evidenceSHA256: oldEvidence, acceptedAt: oldAccepted, ...oldIdentity } = original;
      assert.deepEqual(identity, oldIdentity); assert.equal(originalEvidenceSHA256, oldEvidence);
      assert(acceptedAt > oldAccepted && acceptedAt <= Date.now());
      recheckUnifiedPreview(path.join(directory, role), evidenceSHA256,
        { service: 'gachia', versionId: proof.versionId, references: rows[role], parserVersion: 'streaming-v2' });
    }
    const proof = result.receipt.accepted.candidate.main, body = path.join(directory, 'candidate', '0.body');
    writeFileSync(body, 'tampered isolated evidence');
    assert.throws(() => recheckUnifiedPreview(path.join(directory, 'candidate'), proof.evidenceSHA256,
      { service: 'gachia', versionId: proof.versionId, references: rows.candidate, parserVersion: 'streaming-v2' }));
    assert.deepEqual(opened.previews.receipt, originals);
    assert.equal(contexts, 1); assert.equal(closed, contexts); assert.equal(disposed, responses);
  });

  for (const value of ['robots', 'cookie']) await t.test(`real renewal rejects ${value} and leaves no success receipt`, async () => {
    fault = value;
    const directory = path.join(root, `renewal-${value}`);
    await assert.rejects(renewUnifiedMainPreviews(opened, 'isolated-cloud-token', directory),
      value === 'robots' ? /Preview robots must exactly prohibit/ : /Unified preview sets a cookie/);
    assert.equal(existsSync(path.join(directory, 'receipt.json')), false);
    assert.equal(JSON.parse(readFileSync(path.join(directory, 'recovery/result.json'), 'utf8')).status, 'failed');
    assert.deepEqual(opened.previews.receipt, originals);
    assert.equal(closed, contexts); assert.equal(disposed, responses);
  });
  t.diagnostic(JSON.stringify({ renewalContexts: contexts, closed, responses, disposed, syntheticPreviewHTTP: true }));
}
