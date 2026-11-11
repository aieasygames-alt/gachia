import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { genshinPublicFixture as fixture } from './fixtures/unified-genshin-public-fixture.mjs';
import { unifiedGenshinPublicReferences, verifyUnifiedGenshinPublic, recheckUnifiedGenshinPublic } from './unified-genshin-public.mjs';
import { recheckUnifiedMainPublic } from './unified-main-public.mjs';

test('Genshin public coverage follows the Router, preserves exact locales and collapses static aliases', () => {
  const f = fixture(), before = structuredClone(f.rows), references = f.references();
  assert.deepEqual(f.rows, before, 'Sealed local references cannot be rewritten');
  assert.deepEqual(references.map(row => row.path), [...f.requirements.map(row => row.path), '/sitemaps/genshin/index.xml', '/_games/genshin/_next/static/fixture.js']);
  for (const row of references.filter(row => row.fingerprint)) {
    assert.deepEqual(row.fingerprint.canonical, [`https://gachia.com${row.path}`]);
    assert.equal(row.headers['cache-control'], 'private, no-cache, no-store, max-age=0, must-revalidate');
  }
  assert(!references.some(row => ['/sitemap.xml', '/robots.txt', '/_next/static/fixture.js'].includes(row.path)), 'Main root routes are not Genshin evidence');
});

test('public asset paths preserve the build adapter encoded Next dynamic route brackets', () => {
  const f = fixture();
  for (const row of f.rows.filter(row => row.path.endsWith('.js'))) row.path = row.path.replace('fixture.js', 'chunks/app/%5Blocale%5D/page.js');
  assert(f.references().some(row => row.path === '/_games/genshin/_next/static/chunks/app/%5Blocale%5D/page.js'));
  for (const escaped of ['%2e%2e', '%2F', '%5C', '%255B', '%5b']) {
    const changed = fixture(); changed.rows[5].path = `/_next/static/chunks/${escaped}/page.js`;
    assert.throws(changed.references);
  }
});

for (const path of ['/zh/nte/characters/fixture', '/zh/genshin/characters/other', '/zh/genshin/guides/fixture', '/data/genshin/raw-characters.json',
  '/api/auth/get-session', '/zh/genshin/characters/fixture?latest=1', '/zh/genshin/characters/%66ixture', '/zh/genshin/characters/a/../fixture',
  '/_games/nte/_next/static/fixture.js', '//example.invalid/escape', '/zh/genshin/characters/fixture#body']) test(`Genshin rejects unreviewed public path ${path}`, () => {
  const f = fixture(); f.rows[0].path = path; assert.throws(f.references);
});

for (const fault of ['missing-locale', 'missing-sitemap', 'missing-robots', 'missing-static', 'missing-alias', 'changed-alias', 'duplicate', 'status', 'mime', 'canonical',
  'cookie', 'noindex', 'meta-noindex', 'body', 'json-ld-only', 'attribute-only', 'wrong-hash', 'wrong-size', 'sitemap-mime', 'robots-mime']) test(`Genshin projection rejects ${fault}`, () => {
  const f = fixture();
  if (fault === 'missing-locale') f.rows.splice(1, 1);
  if (fault === 'missing-sitemap') f.rows.splice(3, 1);
  if (fault === 'missing-robots') f.rows.splice(4, 1);
  if (fault === 'missing-static') f.rows.splice(5, 2);
  if (fault === 'missing-alias') f.rows.splice(6, 1);
  if (fault === 'changed-alias') f.replace(6, 'wrong asset');
  if (fault === 'duplicate') f.rows.push(f.rows[0]);
  if (fault === 'status') f.rows[0].status = 404;
  if (fault === 'mime') f.rows[0].headers['content-type'] = 'application/json';
  if (fault === 'canonical') f.replace(0, f.bodies[0].toString().replace('/zh/genshin/characters/fixture', '/zh/genshin'));
  if (fault === 'cookie') f.rows[0].headers['set-cookie'] = 'private=value';
  if (fault === 'noindex') f.rows[0].headers['x-robots-tag'] = 'noindex';
  if (fault === 'meta-noindex') f.replace(0, f.bodies[0].toString().replace('</head>', '<meta name="robots" content="noindex"></head>'));
  if (fault === 'body') f.replace(0, f.bodies[0].toString().replace('Approved zh', 'Old text'));
  if (fault === 'json-ld-only') f.replace(0, f.bodies[0].toString().replace('<h1>Approved zh</h1>', '<script type="application/ld+json">{"name":"Approved zh"}</script>Old text'));
  if (fault === 'attribute-only') f.replace(0, f.bodies[0].toString().replace('<h1>Approved zh</h1>', '<img alt="Approved zh">Old text'));
  if (fault === 'wrong-hash') f.rows[0].sha256 = '0'.repeat(64);
  if (fault === 'wrong-size') f.rows[0].bytes++;
  if (fault === 'sitemap-mime') f.rows[3].headers['content-type'] = 'text/html';
  if (fault === 'robots-mime') f.rows[4].headers['content-type'] = 'text/html';
  assert.throws(f.references);
});

test('requirements cannot broaden owner, identity, locale, status or text policy', () => {
  for (const mutate of [f => { f.requirements = []; }, f => { f.requirements.push(f.requirements[0]); },
    f => { f.requirements[1].path = '/en/genshin/characters/other'; }, f => { f.requirements[0].owner = 'main'; },
    f => { f.requirements[0].status = 404; }, f => { f.requirements[0].contains = ['Approved zh']; },
    f => { f.requirements[0].contains = []; }, f => { f.requirements[0].skipCoverage = true; }]) {
    const f = fixture(); mutate(f);
    assert.throws(() => unifiedGenshinPublicReferences(f.rows, f.read, f.requirements));
  }
});

test('public HTTP and independent reread bind Router-projected HTML, discovery, static bytes and owner evidence kind', async t => {
  const f = fixture(), references = f.references(), root = realpathSync(mkdtempSync(join(tmpdir(), 'unified-genshin-public-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const directory = join(root, 'http'), calls = [];
  const result = await verifyUnifiedGenshinPublic({ references, directory, request: async (url, options) => {
    const parsed = new URL(url); calls.push(parsed.pathname);
    assert.equal(parsed.origin, 'https://gachia.com'); assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'error'); assert.equal(options.credentials, 'omit');
    const row = references.find(row => row.path === parsed.pathname); assert(row);
    assert.equal(options.headers['accept-language'], parsed.pathname.match(/^\/(zh|en|ja)\//)?.[1] ?? 'zh');
    return new Response(f.read(row), { status: row.status, headers: row.headers });
  } });
  assert.equal(result.kind, 'unified_genshin_public_http'); assert.equal(result.observations.length, references.length);
  assert.deepEqual(calls.sort(), references.map(row => row.path).sort());
  recheckUnifiedGenshinPublic(directory, result.evidenceSHA256, references);
  assert.throws(() => recheckUnifiedMainPublic(directory, result.evidenceSHA256, references));
  writeFileSync(join(directory, '0.body'), f.bodies[0].toString().replace('Approved zh', 'Wrong content'));
  assert.throws(() => recheckUnifiedGenshinPublic(directory, result.evidenceSHA256, references));
});

for (const fault of ['body', 'cache', 'cookie', 'noindex', 'canonical', 'link', 'media', 'asset', 'sitemap', 'sitemap-noindex-xml', 'sitemap-noindex-text-xml']) test(`live Genshin public acceptance fails closed on ${fault}`, async t => {
  const f = fixture();
  if (fault === 'sitemap-noindex-text-xml') f.rows[3].headers['content-type'] = 'text/xml';
  const references = f.references(), root = realpathSync(mkdtempSync(join(tmpdir(), 'unified-genshin-public-fail-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const directory = join(root, 'http');
  await assert.rejects(verifyUnifiedGenshinPublic({ references, directory, request: async url => {
    const row = references.find(row => row.path === new URL(url).pathname), headers = new Headers(row.headers); let body = f.read(row);
    if (row.path === references[0].path) {
      if (fault === 'body') body = Buffer.from(body.toString().replace('Approved zh', 'Old text'));
      if (fault === 'cache') headers.set('cache-control', 'public, max-age=86400');
      if (fault === 'cookie') headers.set('set-cookie', 'private=value');
      if (fault === 'noindex') headers.set('x-robots-tag', 'noindex');
      if (fault === 'canonical') body = Buffer.from(body.toString().replace('https://gachia.com/zh/genshin/characters/fixture', 'https://gachia.com/zh/genshin'));
      if (fault === 'link') body = Buffer.from(body.toString().replace('href="/zh/genshin"', 'href="/zh/nte"'));
      if (fault === 'media') body = Buffer.from(body.toString().replace('/character.webp', '/wrong.webp'));
    }
    if (fault === 'asset' && row.path.endsWith('.js') || fault === 'sitemap' && row.path.endsWith('.xml')) body = Buffer.from('wrong bytes');
    if (fault.startsWith('sitemap-noindex') && row.path.endsWith('.xml')) headers.set('x-robots-tag', 'noindex');
    return new Response(body, { status: row.status, headers });
  } }));
  assert.equal(JSON.parse(readFileSync(join(directory, 'result.json'))).status, 'failed');
});
