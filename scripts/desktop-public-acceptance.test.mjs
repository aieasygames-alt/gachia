import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { loadPublicReferences, publicReferences, publicRobots, validatePublicResponse, verifyPublicHTTP } from './desktop-public-acceptance.mjs';
import { digest } from './desktop-release-assets.mjs';
import { pageFingerprint } from './desktop-version-preview.mjs';
import { verifyRecoveryCloud } from './desktop-recovery-cloud.mjs';

const html = '<html><head><title>Old guide</title><meta name="description" content="Old body"/><link rel="canonical" href="https://gachia.com/zh/genshin/guides/one"/></head><body><h1>Old guide</h1><p>Old body</p><script type="application/ld+json">{"name":"Old guide"}</script></body></html>';
const reference = { path: '/zh/genshin/guides/one', status: 200, headers: { 'content-type': 'text/html', 'cache-control': 's-maxage=31536000' }, sha256: digest(html), fingerprint: pageFingerprint(html), expectedRobots: [] };

test('NTE public references use their own sitemap, Router assets and guide routes', () => {
  const rows = publicReferences('nte', ['/sitemap.xml', '/robots.txt', '/_next/static/a.js', '/zh/nte/guides/one'].map(path => ({ ...reference, path })));
  assert.deepEqual(rows.map(row => row.path), ['/sitemaps/nte/index.xml', '/_games/nte/_next/static/a.js', '/zh/nte/guides/one']);
  assert.equal(rows.at(-1).headers['cache-control'], 'private, no-cache, no-store, max-age=0, must-revalidate');
});

test('NTE Main mirror requires explicit game selection and rejects cross-game data', () => {
  assert.equal(publicReferences('main', [{ ...reference, path: '/data/nte/raw-guides.json' }], 'nte')[0].path, '/data/nte/raw-guides.json');
  assert.throws(() => publicReferences('main', [{ ...reference, path: '/data/nte/raw-guides.json' }]));
  assert.throws(() => publicReferences('main', [{ ...reference, path: '/data/genshin/raw-guides.json' }], 'nte'));
  assert.throws(() => publicReferences('nte', [reference], 'genshin'));
  assert.throws(() => publicReferences('main', [reference], 'azur-promilia'));
});

test('Main accepts only an explicitly bound preserved other-game guide reference', () => {
  const reference = { path: '/data/genshin/raw-guides.json', sha256: digest('published A'), headers: {}, preservedMainVersion: '00000000-0000-0000-0000-000000000001' };
  assert.equal(publicReferences('main', [reference], 'nte')[0].sha256, reference.sha256);
  for (const path of ['/data/unknown/raw-guides.json', '/data/genshin/characters.json']) assert.throws(() => publicReferences('main', [{ ...reference, path }], 'nte'));
  assert.throws(() => publicReferences('main', [{ ...reference, preservedMainVersion: 'unknown' }], 'nte'));
});

test('public routing uses actual Router sitemap and asset namespace, not the direct Worker paths', () => {
  const rows = publicReferences('genshin', [{ ...reference, path: '/sitemap.xml' }, { ...reference, path: '/robots.txt' }, reference,
    { ...reference, path: '/_next/static/a.js' }, { ...reference, path: '/_games/genshin/_next/static/a.js' }]);
  assert.deepEqual(rows.map(x => x.path), ['/sitemaps/genshin/index.xml', reference.path, '/_games/genshin/_next/static/a.js']);
  assert.equal(rows[1].headers['cache-control'], 'private, no-cache, no-store, max-age=0, must-revalidate');
  assert.equal(publicReferences('main', [{ ...reference, path: '/_next/static/a.js' }])[0].path, '/_next/static/a.js');
});

for (const path of ['//evil.invalid/a', '/_next/static/../x', '/_next/static/%2e%2e/x', '/_next/static/a?b', '/_next/static/a#b', '/_next/static/a\\b', '/api/private']) test(`public mapping rejects ${path}`, () => {
  assert.throws(() => publicReferences('genshin', [{ ...reference, path }]));
});

test('unknown owner, conflicting asset bytes and empty coverage are rejected', () => {
  assert.throws(() => publicReferences('nte', [reference])); assert.throws(() => publicReferences('main', []));
  assert.throws(() => publicReferences('genshin', [{ ...reference, path: '/_next/static/a.js' }, { ...reference, path: '/_games/genshin/_next/static/a.js', sha256: 'b'.repeat(64) }]));
});

test('public page accepts canonical candidate fingerprint and cache directive ordering', () => {
  validatePublicResponse(new Response(html, { headers: reference.headers }), Buffer.from(html), reference);
  const body = Buffer.from('{}'), ref = { path: '/data/genshin/raw-guides.json', status: 200, sha256: digest(body), headers: { 'content-type': 'application/json', 'cache-control': 'max-age=0, public' } };
  validatePublicResponse(new Response(body, { headers: { ...ref.headers, 'cache-control': 'public,max-age=0' } }), body, ref);
});

for (const reason of ['noindex', 'meta-noindex', 'cookie', 'mime', 'status', 'cache', 'body']) test(`public acceptance rejects ${reason}`, () => {
  const headers = { ...reference.headers }; let body = html, status = 200;
  if (reason === 'noindex') headers['x-robots-tag'] = 'noindex, nofollow';
  if (reason === 'meta-noindex') body = html.replace('<head>', '<head><meta name="robots" content="noindex"/>');
  if (reason === 'cookie') headers['set-cookie'] = 'session=bad';
  if (reason === 'mime') headers['content-type'] = 'application/json';
  if (reason === 'status') status = 404;
  if (reason === 'cache') headers['cache-control'] = 'public,max-age=3600';
  if (reason === 'body') body = html.replace('<p>Old body</p>', '<p>Wrong content</p>');
  assert.throws(() => validatePublicResponse(new Response(body, { headers, status }), Buffer.from(body), reference));
});

test('public robots and JSON require exact bytes, not merely a successful response', () => {
  const body = Buffer.from('User-agent: *\nDisallow: /\n');
  assert.throws(() => validatePublicResponse(new Response(body, { headers: { 'content-type': 'text/plain' } }), body,
    { path: '/robots.txt', status: 200, headers: { 'content-type': 'text/plain' }, sha256: digest('User-agent: *\nAllow: /\n') }));
});

test('intentional locale noindex must match sealed HTML; absence of robots evidence cannot pass', () => {
  const body = html.replace('<head>', '<head><meta name="robots" content="noindex, follow"/>');
  validatePublicResponse(new Response(body, { headers: reference.headers }), Buffer.from(body), { ...reference, expectedRobots: publicRobots(body) });
  assert.throws(() => validatePublicResponse(new Response(body, { headers: reference.headers }), Buffer.from(body), { ...reference, expectedRobots: undefined }), /evidence required/);
});

test('robots expectations are derived only from hash-verified local HTML', t => {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'cms-public-reference-'))); t.after(() => rmSync(directory, { recursive: true, force: true }));
  const data = JSON.stringify([reference]); writeFileSync(join(directory, 'references.json'), data); writeFileSync(join(directory, '0.body'), html);
  assert.deepEqual(loadPublicReferences(directory, digest(data))[0].expectedRobots, []);
  writeFileSync(join(directory, '0.body'), html.replace('<head>', '<head><meta name="robots" content="noindex"/>'));
  assert.throws(() => loadPublicReferences(directory, digest(data)), /HTML changed/);
});

test('real loopback HTTP checks fixed public origin requests and preserves failed response bytes', async t => {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'cms-public-'))); t.after(() => rmSync(directory, { recursive: true, force: true }));
  let broken = false;
  const server = createServer((_request, response) => { response.writeHead(200, publicReferences('genshin', [reference])[0].headers); response.end(broken ? html.replace('Old guide', 'Wrong guide') : html); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => new Promise(resolve => server.close(resolve)));
  const request = (url, options) => { assert.equal(url, 'https://gachia.com' + reference.path); assert.equal(options.redirect, 'error'); assert.equal(options.credentials, 'omit'); return fetch(`http://127.0.0.1:${server.address().port}${reference.path}`, options); };
  assert.equal((await verifyPublicHTTP({ owner: 'genshin', references: [reference], directory: join(directory, 'passed'), request })).status, 'passed');
  broken = true; await assert.rejects(verifyPublicHTTP({ owner: 'genshin', references: [reference], directory: join(directory, 'failed'), request }));
  const result = JSON.parse(readFileSync(join(directory, 'failed/result.json'))); assert.equal(result.status, 'failed'); assert.equal(result.observations.length, 1);
  assert.equal(digest(readFileSync(join(directory, 'failed/0.body'))), result.observations[0].sha256);
});

test('recovery bundle verifier rejects unsafe IDs before filesystem access', () => {
  for (const recoveryId of ['../escape', '', 'latest', '0'.repeat(64)]) assert.throws(() => verifyRecoveryCloud({ run: '/unused', recoveryId }));
});

test('only the reviewed managed robots prefix may precede the exact original site body', () => {
  const prefix = readFileSync(new URL('./fixtures/cloudflare-robots-prefix-2026-11-01.txt', import.meta.url));
  const original = Buffer.from('User-agent: *\nAllow: /\n'), headers = { 'content-type': 'text/plain' };
  const ref = { path: '/robots.txt', status: 200, headers, sha256: digest(original) }, body = Buffer.concat([prefix, original]);
  validatePublicResponse(new Response(body, { headers }), body, ref);
  for (const wrong of [original, Buffer.concat([Buffer.from('Unreviewed policy\n'), original]), Buffer.concat([prefix, Buffer.from('Disallow: /\n')])]) {
    assert.throws(() => validatePublicResponse(new Response(wrong, { headers }), wrong, ref));
  }
});
