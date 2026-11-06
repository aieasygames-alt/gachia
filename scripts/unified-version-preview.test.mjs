import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { digest } from './desktop-release-assets.mjs';
import { exactPreviewOrigin } from './desktop-version-preview.mjs';
import { UNIFIED_OWNERS, unifiedService } from './unified-release-assets.mjs';
import { exactUnifiedPreviewOrigin, recheckUnifiedPreview, unifiedPageFingerprints, unifiedPreviewPath, unifiedPreviewReferences,
  unifiedHTMLParserPin, validateUnifiedPreviewResponse, verifyUnifiedVersionPreview } from './unified-version-preview.mjs';

const versionId = '1234abcd-0000-4000-8000-000000000001';
const html = '<!doctype html><html><head><title>Game &amp; Wiki</title><meta content="Description" name="description">' +
  '<link href="https://gachia.com/zh/hi3/characters" rel="canonical"></head><body><main><h1>Characters</h1>' +
  '<p>Content &amp; numbers: 123</p><a href="/zh/hi3">Game</a><img alt="Character" src="/image.png"></main>' +
  '<script>self.__next_f.push(["host-dependent"])</script></body></html>';
const headers = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, no-store' };
const ref = (path, body, headers) => ({ path, status: 200, headers, bytes: Buffer.byteLength(body), sha256: digest(body), bodyFile: 'unused' });

test('five exact targets are separate from the legacy dual-game guard', () => {
  for (const owner of UNIFIED_OWNERS) assert.equal(exactUnifiedPreviewOrigin(unifiedService(owner), versionId), `https://1234abcd-${unifiedService(owner)}.aieasygames.workers.dev`);
  for (const service of ['gachia-router', 'gachia-staging', 'gachia-game-hi3', 'gachia-game-lvmeng-staging', 'gachia@evil.invalid']) assert.throws(() => exactUnifiedPreviewOrigin(service, versionId));
  for (const uuid of ['1234abcd', versionId.toUpperCase(), versionId + '.evil']) assert.throws(() => exactUnifiedPreviewOrigin('gachia', uuid));
  assert.throws(() => exactPreviewOrigin('gachia-game-lvmeng', versionId), /Unreviewed/);
});

test('preview paths reject origin escapes, normalized traversal and query selectors', () => {
  for (const path of ['//evil.invalid', '/a/../robots.txt', '/%2e%2e/x', '/a\\x', '/x?version=latest', '/x#hash', 'https://evil.invalid']) assert.throws(() => unifiedPreviewPath(path, 'https://gachia.com'));
  assert.equal(unifiedPreviewPath('/_next/static/app/%5Blang%5D/page.js', 'https://gachia.com'), 'https://gachia.com/_next/static/app/%5Blang%5D/page.js');
});

test('standard HTML parsing supports non-guide pages without inventing JSON-LD', () => {
  const [result, equivalent] = unifiedPageFingerprints([{ html, status: 200 }, { html: html.replace('host-dependent', 'other host').replace('content="Description" name="description"', "name='description' content='Description'"), status: 200 }]);
  assert.deepEqual(result, equivalent); assert.equal(result.title, 'Game & Wiki'); assert.deepEqual(result.jsonld, []);
  assert.deepEqual(result.headings, [['h1', 'Characters']]); assert.equal(result.links.length, 1); assert.equal(result.media.length, 1);
  const withLd = html.replace('</head>', '<SCRIPT TYPE="application/ld+json">{"name":"Wiki"}</SCRIPT></head>');
  assert.deepEqual(unifiedPageFingerprints([{ html: withLd, status: 200 }])[0].jsonld, [{ name: 'Wiki' }]);
  const escapedTitle = html.replace('Game &amp; Wiki', 'Game &lt;title&gt; &amp; Wiki');
  assert.equal(unifiedPageFingerprints([{ html: escapedTitle, status: 200 }])[0].title, 'Game <title> & Wiki');
});

for (const [name, replacement] of [
  ['title', html.replace('Game &amp; Wiki', 'Other')], ['text', html.replace('123', '456')], ['heading', html.replace('<h1>', '<h2>').replace('</h1>', '</h2>')],
  ['link', html.replace('href="/zh/hi3"', 'href="/zh/hsr"')], ['media', html.replace('/image.png', '/other.png')],
  ['metadata', html.replace('Description', 'Other')], ['canonical', html.replace('/zh/hi3/characters', '/zh/hsr/characters')],
  ['JSON-LD', html.replace('</head>', '<script type="application/ld+json">{"name":"Added"}</script></head>')],
  ['script source', html.replace('</head>', '<script src="/wrong.js"></script></head>')],
  ['stylesheet', html.replace('</head>', '<link rel="stylesheet" href="/wrong.css"></head>')],
  ['base URL', html.replace('</head>', '<base href="https://evil.invalid/"></head>')],
]) test(`HTML comparison rejects changed ${name}`, () => {
  const fingerprint = unifiedPageFingerprints([{ html, status: 200 }])[0];
  assert.throws(() => validateUnifiedPreviewResponse({ response: new Response(null, { headers: { ...headers, 'x-robots-tag': 'noindex' } }), bytes: Buffer.from(replacement),
    reference: { ...ref('/zh/hi3/characters', html, headers), fingerprint } }), /differ/);
});

test('malformed, unsafe or incomplete HTML fails closed', () => {
  for (const invalid of [html.replace('</body>', ''), html.replace('<body>', '<body><body>'), html.replace('<title>', '<title><title>'),
    html.replace('<title>', '<title><em>'), html.replace('</title>', '</em></title>'),
    html.replace('https://gachia.com/zh', 'https://gachia.com.evil/zh'), html.replace('</head>', '<script type="application/ld+json">{"name":"x</ScRiPt><img>"}</script></head>'),
    html.replace('</head>', '<script type="application/ld+json">{}'), html.replace('name="description"', 'name="description" name="robots"')]) {
    assert.throws(() => unifiedPageFingerprints([{ html: invalid, status: 200 }]), undefined, invalid);
  }
});

test('preview discovery is noindex and exact robots cannot hide agent exceptions', () => {
  const robots = ref('/robots.txt', 'User-agent: *\nAllow: /\n', { 'content-type': 'text/plain' });
  const response = new Response(null, { headers: { 'content-type': 'text/plain', 'x-robots-tag': 'noindex, nofollow' } });
  for (const body of ['User-agent: *\nAllow: /\n', 'User-agent: *\nDisallow: /\nUser-agent: Googlebot\nAllow: /\n']) assert.throws(() => validateUnifiedPreviewResponse({ response, bytes: Buffer.from(body), reference: robots }), /exactly/);
  validateUnifiedPreviewResponse({ response, bytes: Buffer.from('User-agent: *\nDisallow: /\n'), reference: robots });
  const sitemap = ref('/sitemap.xml', '<xml/>', { 'content-type': 'text/xml', 'cache-control': 'public, max-age=0' });
  assert.throws(() => validateUnifiedPreviewResponse({ response: new Response(null, { headers: sitemap.headers }), bytes: Buffer.from('<xml/>'), reference: sitemap }), /noindex/);
});

test('public bytes, MIME, cache, cookies and HTML noindex are retained', () => {
  const row = ref('/data/raw.json', '{"a":1}', { 'content-type': 'application/json', 'cache-control': 'private, no-store' });
  for (const change of [{ 'set-cookie': 'x=1' }, { 'content-type': 'text/html' }, { 'cache-control': 'public' }]) assert.throws(() => validateUnifiedPreviewResponse({
    response: new Response(null, { headers: { ...row.headers, ...change } }), bytes: Buffer.from('{"a":1}'), reference: row }));
  assert.throws(() => validateUnifiedPreviewResponse({ response: new Response(null, { headers: row.headers }), bytes: Buffer.from('{"a":2}'), reference: row }), /bytes differ/);
  assert.throws(() => validateUnifiedPreviewResponse({ response: new Response(null, { headers }), bytes: Buffer.from(html), reference: ref('/zh/hi3/characters', html, headers) }), /noindex/);
});

test('complete preview bodies are re-opened; local Host evidence cannot authorize cloud acceptance', async t => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'unified-preview-'))); t.after(() => rmSync(root, { recursive: true, force: true }));
  const bodies = [html, '<xml/>', 'User-agent: *\nDisallow: /\n', '{"a":1}'];
  const rows = [ref('/zh/hi3/characters', bodies[0], headers), ref('/sitemap.xml', bodies[1], { 'content-type': 'application/xml' }),
    ref('/robots.txt', bodies[2], { 'content-type': 'text/plain' }), ref('/data/raw.json', bodies[3], { 'content-type': 'application/json' })];
  const references = unifiedPreviewReferences(rows, (_, i) => Buffer.from(bodies[i])); let calls = 0;
  const request = async (url, options) => {
    assert(url.startsWith(exactUnifiedPreviewOrigin('gachia', versionId))); assert.equal(options.redirect, 'error'); assert.equal(options.credentials, 'omit');
    const i = rows.findIndex(row => new URL(url).pathname === row.path); calls++;
    return new Response(bodies[i], { headers: { ...rows[i].headers, 'x-robots-tag': 'noindex' } });
  };
  const directory = join(root, 'passed'), expected = { service: 'gachia', versionId, references, observationMode: 'loopback_exact_host' };
  const proof = await verifyUnifiedVersionPreview({ ...expected, directory, request }); assert.equal(calls, rows.length);
  recheckUnifiedPreview(directory, proof.evidenceSHA256, expected);
  assert.throws(() => recheckUnifiedPreview(directory, proof.evidenceSHA256, { ...expected, observationMode: 'cloud_exact_version' }), /not cloud/);
  writeFileSync(join(directory, '3.body'), 'changed'); assert.throws(() => recheckUnifiedPreview(directory, proof.evidenceSHA256, expected));
  await assert.rejects(verifyUnifiedVersionPreview({ ...expected, directory, request }), /EEXIST/);
  const failed = join(root, 'failed'); await assert.rejects(verifyUnifiedVersionPreview({ ...expected, directory: failed, request: async () => { throw Error('offline'); } }), /offline/);
  assert.equal(JSON.parse(readFileSync(join(failed, 'result.json'))).status, 'failed');
  assert.throws(() => unifiedPreviewReferences(rows.slice(0, 1), () => Buffer.from(html)), /discovery/);
});

const language = '<link rel="alternate" href="https://gachia.com/zh/hi3/characters" hreflang="zh-Hans">';
const languageEN = language.replace('/zh/', '/en/').replace('zh-Hans', 'en');
const scripts = '<script src="/first.js" async></script><script src="/second.js" async></script>';
const styles = '<link rel="stylesheet" href="/first.css"><link rel="stylesheet" href="/second.css">';
const staticMetadata = html.replace('</head>', language + languageEN + scripts + styles + '</head>');
const streamedMetadata = staticMetadata.replace('<title>Game &amp; Wiki</title>', '').replace(language + languageEN, '')
  .replace('</body>', languageEN + language + '<title>Game &amp; Wiki</title></body>');

test('streaming-v2 separates title metadata and language links without changing frozen legacy semantics', () => {
  const rows = [staticMetadata, streamedMetadata].map(html => ({ html, status: 200 }));
  const [legacyA, legacyB] = unifiedPageFingerprints(rows); assert.notDeepEqual(legacyA, legacyB);
  assert.equal(legacyB.text, legacyA.text + ' Game & Wiki');
  const [a, b] = unifiedPageFingerprints(rows, 'streaming-v2'); assert.deepEqual(a, b);
  assert.equal(a.title, 'Game & Wiki'); assert.equal(a.languageLinks.length, 2); assert.equal(a.resources.length, 4);
  assert.notEqual(unifiedHTMLParserPin('streaming-v2'), unifiedHTMLParserPin());
  assert.throws(() => unifiedHTMLParserPin('unversioned')); assert.throws(() => unifiedPageFingerprints(rows, 'unversioned'));
});

for (const [name, changed] of [
  ['title value', streamedMetadata.replace('Game &amp; Wiki', 'Other title')],
  ['body text', streamedMetadata.replace('123', '456')],
  ['heading', streamedMetadata.replace('Characters</h1>', 'Changed</h1>')],
  ['canonical', streamedMetadata.replace('rel="canonical"', 'rel="alternate"')],
  ['metadata', streamedMetadata.replace('Description', 'Other')],
  ['language href', streamedMetadata.replace('href="https://gachia.com/en/', 'href="https://gachia.com/ja/')],
  ['language code', streamedMetadata.replace('hreflang="en"', 'hreflang="ja"')],
  ['language multiplicity', streamedMetadata.replace(languageEN, languageEN + languageEN)],
  ['script order', streamedMetadata.replace(scripts, '<script src="/second.js" async></script><script src="/first.js" async></script>')],
  ['stylesheet order', streamedMetadata.replace(styles, '<link rel="stylesheet" href="/second.css"><link rel="stylesheet" href="/first.css">')],
  ['navigation', streamedMetadata.replace('href="/zh/hi3"', 'href="/zh/nte"')],
  ['media', streamedMetadata.replace('/image.png', '/other.png')],
  ['JSON-LD', streamedMetadata.replace('</body>', '<script type="application/ld+json">{"name":"Changed"}</script></body>')],
]) test(`streaming-v2 still rejects changed ${name}`, () => {
  const compare = () => unifiedPageFingerprints([staticMetadata, changed].map(html => ({ html, status: 200 })), 'streaming-v2');
  try { const [a, b] = compare(); assert.notDeepEqual(a, b); } catch (error) { assert.notEqual(error.code, 'ERR_ASSERTION'); }
});

test('streaming-v2 rejects malformed metadata and cannot be relabelled as legacy evidence', async t => {
  for (const invalid of [streamedMetadata.replace('hreflang="en"', 'hreflang=""'), streamedMetadata.replace(languageEN, languageEN.replace('rel="alternate"', 'rel="stylesheet"')),
    streamedMetadata.replace('hreflang="en"', 'hreflang="en" hreflang="ja"'), streamedMetadata.replace('<title>', '<title><em>'), streamedMetadata.replace('</title>', '')]) {
    assert.throws(() => unifiedPageFingerprints([{ html: invalid, status: 200 }], 'streaming-v2'));
  }
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'unified-streaming-'))); t.after(() => rmSync(root, { recursive: true, force: true }));
  const bodies = [staticMetadata, '<xml/>', 'User-agent: *\nDisallow: /\n'];
  const rows = [ref('/zh/hi3/characters', bodies[0], headers), ref('/sitemap.xml', bodies[1], { 'content-type': 'application/xml' }),
    ref('/robots.txt', bodies[2], { 'content-type': 'text/plain' })];
  const references = unifiedPreviewReferences(rows, (_, i) => Buffer.from(bodies[i]), 'streaming-v2');
  const expected = { service: 'gachia', versionId, references, parserVersion: 'streaming-v2' }, directory = join(root, 'http');
  const proof = await verifyUnifiedVersionPreview({ ...expected, directory, request: async url => {
    const i = rows.findIndex(row => row.path === new URL(url).pathname);
    return new Response(i === 0 ? streamedMetadata : bodies[i], { headers: { ...rows[i].headers, 'x-robots-tag': 'noindex' } });
  } });
  recheckUnifiedPreview(directory, proof.evidenceSHA256, expected);
  assert.throws(() => recheckUnifiedPreview(directory, proof.evidenceSHA256, { ...expected, parserVersion: 'legacy-v1' }), /parser changed/);
});
