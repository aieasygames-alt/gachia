import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { digest } from './desktop-release-assets.mjs';
import { unifiedMainPublicReferences, validateUnifiedMainPublic, verifyUnifiedMainPublic, recheckUnifiedMainPublic } from './unified-main-public.mjs';

const html = '<html><head><title>Installation</title><meta name="description" content="Install guide"><link rel="canonical" href="https://gachia.com/zh/ananta/guides/download-install-guide"></head><body><main><h1>Installation</h1><p>Approved checklist</p><a href="/zh/ananta">Game</a><img src="/image.webp" alt="Game"></main></body></html>';
const paths = ['/sitemap.xml', '/robots.txt', '/api/auth/get-session', '/data/ananta/raw-guides.json', '/data/genshin/raw-guides.json', '/data/nte/raw-guides.json',
  '/zh/ananta/guides/download-install-guide', '/en/ananta/guides/download-install-guide'];
function fixture() {
  const bodies = paths.map(path => Buffer.from(path.includes('/guides/') ? html : path === '/api/auth/get-session' ? '{"code":"ACCOUNT_FEATURES_DISABLED"}'
    : path === '/sitemap.xml' ? '<urlset></urlset>' : path === '/robots.txt' ? 'User-agent: *\nAllow: /\n' : '[]'));
  const rows = paths.map((path, index) => ({ path, status: path.startsWith('/api/') ? 404 : 200, bytes: bodies[index].length, sha256: digest(bodies[index]), bodyFile: `${index}.body`,
    headers: { 'content-type': path.includes('/guides/') ? 'text/html; charset=utf-8' : path.endsWith('.xml') ? 'application/xml' : path.endsWith('.txt') ? 'text/plain' : 'application/json',
      'cache-control': path.startsWith('/api/') ? 'private, no-store' : 'public, max-age=0, must-revalidate' } }));
  const references = unifiedMainPublicReferences(rows, (_, index) => bodies[index]);
  return { bodies, rows, references };
}

test('Main public references bind all preserved JSON, account policy and both qualified locales', () => {
  const f = fixture(); assert.equal(f.references.length, paths.length);
  for (const path of paths) assert.throws(() => unifiedMainPublicReferences(f.rows.filter(row => row.path !== path), row => f.bodies[Number(row.bodyFile.split('.')[0])]), /Missing Main/);
  assert.throws(() => unifiedMainPublicReferences([...f.rows, f.rows[0]], (_, i) => f.bodies[i]));
  const changed = structuredClone(f.rows); changed[0].path = '/api/admin'; assert.throws(() => unifiedMainPublicReferences(changed, (_, i) => f.bodies[i]), /Unqualified/);
  assert.throws(() => unifiedMainPublicReferences(f.rows, () => Buffer.from('wrong')), /strictly equal/);
});

for (const fault of ['status', 'cookie', 'mime', 'cache', 'noindex', 'robots', 'body', 'canonical', 'link', 'media']) test(`public HTML refuses ${fault}`, () => {
  const f = fixture(), reference = f.references[6], headers = new Headers(reference.headers); let bytes = f.bodies[6];
  let status = 200;
  if (fault === 'status') status = 404;
  if (fault === 'cookie') headers.set('set-cookie', 'private=value');
  if (fault === 'mime') headers.set('content-type', 'application/json');
  if (fault === 'cache') headers.set('cache-control', 'public, max-age=86400');
  if (fault === 'noindex') headers.set('x-robots-tag', 'noindex');
  if (fault === 'robots') bytes = Buffer.from(html.replace('</head>', '<meta name="robots" content="noindex"></head>'));
  if (fault === 'body') bytes = Buffer.from(html.replace('Approved checklist', 'Old checklist'));
  if (fault === 'canonical') bytes = Buffer.from(html.replace('https://gachia.com/zh/ananta/guides/download-install-guide', 'https://gachia.com/zh/ananta'));
  if (fault === 'link') bytes = Buffer.from(html.replace('href="/zh/ananta"', 'href="/en/ananta"'));
  if (fault === 'media') bytes = Buffer.from(html.replace('/image.webp', '/wrong.webp'));
  assert.throws(() => validateUnifiedMainPublic({ status, headers }, bytes, reference));
});

test('public HTTP uses only the production origin and preserves bodies for independent reread', async t => {
  const f = fixture(), root = realpathSync(mkdtempSync(join(tmpdir(), 'unified-main-http-'))); t.after(() => rmSync(root, { recursive: true, force: true }));
  const directory = join(root, 'http'), prefix = readFileSync(new URL('./fixtures/cloudflare-robots-prefix-2026-11-01.txt', import.meta.url));
  const result = await verifyUnifiedMainPublic({ references: f.references, directory, request: async (url, options) => {
    assert.equal(new URL(url).origin, 'https://gachia.com'); assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'error'); assert.equal(options.credentials, 'omit');
    const index = paths.indexOf(new URL(url).pathname), row = f.rows[index]; assert.equal(options.headers['accept-language'], row.path.startsWith('/en/') ? 'en' : 'zh');
    return new Response(row.path === '/robots.txt' ? Buffer.concat([prefix, f.bodies[index]]) : f.bodies[index], { status: row.status, headers: row.headers });
  } });
  assert.equal(result.status, 'passed'); recheckUnifiedMainPublic(directory, result.evidenceSHA256, f.references);
  writeFileSync(join(directory, '6.body'), html.replace('Approved', 'Unapproved'));
  assert.throws(() => recheckUnifiedMainPublic(directory, result.evidenceSHA256, f.references));
});
