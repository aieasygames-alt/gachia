import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { digest } from './desktop-release-assets.mjs';
import { unifiedMainPublicReferences, validateUnifiedMainPublic, verifyUnifiedMainPublic, recheckUnifiedMainPublic } from './unified-main-public.mjs';
import { UNIFIED_MAIN_GUIDE_GAMES } from './unified-main-guide-contract.mjs';

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

function addGuide(f, path) {
  const body = Buffer.from(html.replace('https://gachia.com/zh/ananta/guides/download-install-guide', `https://gachia.com${path}`));
  const index = f.bodies.length;
  f.bodies.push(body);
  f.rows.push({ ...f.rows[6], path, bodyFile: `${index}.body`, bytes: body.length, sha256: digest(body) });
}

const qualification = { policy: 'main-existing-guide-content-v1', game: 'hi3', changed: ['accepted-existing-guide'], fields: ['/content'], locale: 'zh' };
function guideFixture() {
  const f = fixture(), body = Buffer.from('[]'), index = f.bodies.length;
  f.bodies.push(body); f.rows.push({ ...f.rows[3], path: '/data/hi3/raw-guides.json', bodyFile: `${index}.body`, bytes: body.length, sha256: digest(body) });
  return f;
}

test('public acceptance includes the already-qualified HI3 Chinese guide instead of stopping before promotion', () => {
  const f = guideFixture(), path = '/zh/hi3/guides/v9-0-official-update-guide'; addGuide(f, path);
  const references = unifiedMainPublicReferences(f.rows, (_, index) => f.bodies[index], qualification);
  const guide = references.find(row => row.path === path);
  assert(guide); assert.deepEqual(guide.fingerprint.canonical, [`https://gachia.com${path}`]);
});

test('public reference projection accepts every existing Chinese guide in the shared eleven-game qualification', () => {
  const f = guideFixture(), expected = [];
  assert.equal(UNIFIED_MAIN_GUIDE_GAMES.length, 11);
  for (const game of UNIFIED_MAIN_GUIDE_GAMES) {
    const guides = JSON.parse(readFileSync(new URL(`../packages/data/games/${game}/raw-guides.json`, import.meta.url)));
    for (const { id } of guides) {
      const path = `/zh/${game}/guides/${id}`; expected.push(path);
      if (!f.rows.some(row => row.path === path)) addGuide(f, path);
    }
  }
  assert.equal(expected.length, 237);
  const references = unifiedMainPublicReferences(f.rows, (_, index) => f.bodies[index], qualification);
  for (const path of expected) assert(references.some(row => row.path === path), path);
});

test('guide public projection does not admit other owners, Sea, translations, content types or path escapes', () => {
  const base = guideFixture();
  for (const path of ['/zh/sea/guides/guide', '/zh/genshin/guides/guide', '/zh/nte/guides/guide', '/zh/azur-promilia/guides/guide',
    '/zh/lvmeng/guides/guide', '/zh/unknown/guides/guide', '/en/hi3/guides/guide', '/ja/hi3/guides/guide',
    '/zh/hi3/characters/guide', '/zh/hi3/guides', '/zh/hi3/guides/a/b', '/zh/hi3/guides/%67uide',
    '/zh/hi3/guides/guide?latest=true', '/zh/hi3/guides/guide#body', '/zh/hi3/guides/../guide']) {
    const f = { bodies: [...base.bodies], rows: [...base.rows] }; addGuide(f, path);
    assert.throws(() => unifiedMainPublicReferences(f.rows, (_, index) => f.bodies[index], qualification), undefined, path);
  }
});

for (const fault of ['missing', 'mime', 'canonical']) test(`new guide projection refuses ${fault} despite a matching path`, () => {
  const f = guideFixture(); addGuide(f, '/zh/hi3/guides/v9-0-official-update-guide');
  const row = f.rows.at(-1);
  if (fault === 'missing') row.status = 404;
  if (fault === 'mime') row.headers = { ...row.headers, 'content-type': 'application/json' };
  if (fault === 'canonical') {
    f.bodies[f.bodies.length - 1] = Buffer.from(html); row.bytes = Buffer.byteLength(html); row.sha256 = digest(html);
  }
  assert.throws(() => unifiedMainPublicReferences(f.rows, (_, index) => f.bodies[index], qualification), /Qualified/);
});

test('guide requirements follow the verified release policy, while legacy pilot coverage remains unchanged', () => {
  const f = guideFixture(); addGuide(f, '/zh/hi3/guides/v9-0-official-update-guide');
  const rows = f.rows.filter(row => row.path !== '/en/ananta/guides/download-install-guide');
  const read = row => f.bodies[Number(row.bodyFile.split('.')[0])];
  assert.equal(unifiedMainPublicReferences(rows, read, qualification).length, rows.length);
  assert.throws(() => unifiedMainPublicReferences(rows, read), /Unqualified/);
  for (const path of ['/zh/hi3/guides/v9-0-official-update-guide', '/data/hi3/raw-guides.json', '/zh/ananta/guides/download-install-guide']) {
    assert.throws(() => unifiedMainPublicReferences(rows.filter(row => row.path !== path), read, qualification), /Missing Main/);
  }
  for (const changed of [{ ...qualification, policy: 'all-content' }, { ...qualification, game: 'sea' }, { ...qualification, changed: [] },
    { ...qualification, locale: 'en' }, { ...qualification, fields: ['/title'] }, { ...qualification, skipCoverage: true }]) {
    assert.throws(() => unifiedMainPublicReferences(rows, read, changed));
  }
  assert.throws(() => unifiedMainPublicReferences(rows, read, { ...qualification, game: 'wuwa' }), /Missing Main/);
});

test('HI3 public HTTP and independent reread bind the added Chinese guide body and metadata', async t => {
  const f = guideFixture(), path = '/zh/hi3/guides/v9-0-official-update-guide'; addGuide(f, path);
  const references = unifiedMainPublicReferences(f.rows, (_, index) => f.bodies[index], qualification);
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'unified-main-guide-http-'))); t.after(() => rmSync(root, { recursive: true, force: true }));
  const directory = join(root, 'http'), prefix = readFileSync(new URL('./fixtures/cloudflare-robots-prefix-2026-11-01.txt', import.meta.url));
  const result = await verifyUnifiedMainPublic({ references, directory, request: async (url, options) => {
    assert.equal(new URL(url).origin, 'https://gachia.com'); assert.equal(options.method, 'GET');
    const index = f.rows.findIndex(row => row.path === new URL(url).pathname), row = f.rows[index];
    return new Response(row.path === '/robots.txt' ? Buffer.concat([prefix, f.bodies[index]]) : f.bodies[index], { status: row.status, headers: row.headers });
  } });
  assert.equal(result.observations.length, f.rows.length); recheckUnifiedMainPublic(directory, result.evidenceSHA256, references);
  writeFileSync(join(directory, `${f.rows.length - 1}.body`), f.bodies.at(-1).toString().replace('Approved checklist', 'Wrong checklist'));
  assert.throws(() => recheckUnifiedMainPublic(directory, result.evidenceSHA256, references));
});

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
