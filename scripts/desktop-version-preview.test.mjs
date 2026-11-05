import assert from 'node:assert/strict';
import test from 'node:test';
import { exactPreviewOrigin, pageFingerprint, safeJsonLdScripts, validatePreviewResponse } from './desktop-version-preview.mjs';

const document = script => `<html><head><title>Guide</title><meta name="description" content="Summary"><link rel="canonical" href="https://gachia.com/zh/nte/guides/one"></head><body><h1>Guide</h1>${script}</body></html>`;
const ld = value => `<script type="application/ld+json">${value}</script>`;

test('JSON-LD raw-text gate rejects every casing of script termination and HTML comment escapes', () => {
  for (const attack of ['</script>', '</SCRIPT>', '</ScRiPt >', '<!--', '<script>']) {
    const html = document(ld(JSON.stringify({ headline: attack + '<span>injected</span>' })));
    assert.throws(() => pageFingerprint(html));
  }
  assert.throws(() => safeJsonLdScripts('<script type="application/ld+json">{}'), /Unclosed/);
  assert.throws(() => safeJsonLdScripts(ld('undefined')));
});

test('escaped JSON-LD retains Unicode and markup as data with HTML casing semantics', () => {
  const data = { headline: '</SCRIPT> 中文 日本語 & " \u2028\u2029' };
  const script = `<SCRIPT TYPE='application/ld+json'>${JSON.stringify(data).replace(/</g, '\\u003c')}</SCRIPT >`;
  assert.deepEqual(pageFingerprint(document(script)).jsonld, [data]);
  assert.equal(pageFingerprint(document(script)).text, 'Guide');
});

test('version preview rejects injected HTML even when comparing an otherwise matching reference', () => {
  const html = document(ld(JSON.stringify({ headline: 'Safe' })));
  const headers = { 'content-type': 'text/html', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' };
  const reference = { status: 200, headers, fingerprint: pageFingerprint(html) };
  validatePreviewResponse({ path: '/zh/nte/guides/one', response: new Response(html, { headers }), bytes: Buffer.from(html), reference });
  assert.throws(() => validatePreviewResponse({ path: '/zh/nte/guides/one', response: new Response(html, { headers }),
    bytes: Buffer.from(document(ld(JSON.stringify({ headline: '</SCRIPT><span>injected</span>' })))), reference }));
  assert.throws(() => exactPreviewOrigin('unreviewed', '00000000-0000-0000-0000-000000000000'));
});
