import assert from 'node:assert/strict';
import { mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { digest } from './desktop-release-assets.mjs';
import { genshinContentAssets } from './genshin-content-assets.mjs';
import { migrationAggregateBases, migrationPinned, migrationSave, recheckMigrationReferences, validateMigrationJSON, verifyMigrationHTTP } from './genshin-migration-http.mjs';

const root = new URL('../', import.meta.url).pathname, expected = genshinContentAssets(), bases = migrationAggregateBases(root);
function output(t) { const root = realpathSync(mkdtempSync(join(tmpdir(), 'migration-http-'))); t.after(() => rmSync(root, { recursive: true, force: true })); return join(root, 'observations'); }
test('pinned evidence rejects symlinks and nonabsolute paths', t => {
  const directory = join(output(t), '..'), proof = migrationSave(directory, 'input.json', { fixture: true });
  assert.deepEqual(migrationPinned(proof), { fixture: true });
  symlinkSync(proof.path, join(directory, 'link.json'));
  assert.throws(() => migrationPinned({ ...proof, path: join(directory, 'link.json') }), /Linked/);
  assert.throws(() => migrationPinned({ ...proof, path: 'input.json' }));
});
test('saved aggregate references are revalidated against all other games, not just body hashes', t => {
  const directory = join(output(t), '..'), path = '/data-manifest/search-en.json', body = Buffer.from('{}');
  writeFileSync(join(directory, '0.body'), body);
  const proof = migrationSave(directory, 'references.json', [{ path, status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    bodyFile: '0.body', sha256: digest(body), bytes: body.length }]);
  assert.throws(() => recheckMigrationReferences({ proof, requests: [{ path, status: 200 }], owner: 'router', role: 'candidate', expected, bases }));
});
for (const file of ['games.json', 'search-zh.json', 'search-en.json', 'search-ja.json']) test(`compares ${file} semantically across Main cutover and preserves every other game`, () => {
  const path = '/data-manifest/' + file, base = bases[path], data = JSON.parse(expected.files.get(file)).data;
  const value = file === 'games.json' ? { ...base, games: { genshin: data, ...base.games } } : { genshin: data, ...base };
  validateMigrationJSON({ owner: 'router', role: 'candidate', path, body: Buffer.from(JSON.stringify(value)), expected, bases });
  const broken = structuredClone(value);
  if (file === 'games.json') delete broken.games.nte; else delete broken.nte;
  assert.throws(() => validateMigrationJSON({ owner: 'router', role: 'candidate', path, body: Buffer.from(JSON.stringify(broken)), expected, bases }));
  assert.throws(() => validateMigrationJSON({ owner: 'main', role: 'candidate', path, body: Buffer.from(JSON.stringify(value)), expected, bases }));
});
test('retired Main JSON requires a real nonindexable no-store 404, not a success fallback', async t => {
  const reference = { path: '/data/genshin/raw-characters.json', status: 404, headers: { 'content-type': 'text/html' } };
  const body = '<meta name="robots" content="noindex"><title>Not found</title>';
  const proof = await verifyMigrationHTTP({ origin: 'http://127.0.0.1:1', references: [reference], directory: output(t), owner: 'main', role: 'candidate', expected, bases,
    request: async () => new Response(body, { status: 404, headers: { 'content-type': 'text/html', 'cache-control': 'no-store' } }) });
  assert.equal(proof.status, 'passed');
});
for (const fault of ['status', 'noindex', 'cache', 'cookie']) test(`rejects retired Main JSON ${fault} regression`, async t => {
  await assert.rejects(verifyMigrationHTTP({ origin: 'http://127.0.0.1:1', references: [{ path: '/data/genshin/raw-characters.json', status: 404 }], directory: output(t), owner: 'main', role: 'candidate', expected, bases,
    request: async () => new Response(fault === 'noindex' ? '<title>Not found</title>' : '<meta name="robots" content="noindex">', { status: fault === 'status' ? 200 : 404,
      headers: { 'content-type': 'text/html', 'cache-control': fault === 'cache' ? 'public,max-age=3600' : 'no-store', ...(fault === 'cookie' ? { 'set-cookie': 'session=1' } : {}) } }) }));
});
test('public raw JSON still requires the exact reviewed bytes', async t => {
  const body = expected.files.get('data/raw-characters.json'), reference = { path: '/data/genshin/raw-characters.json', status: 200, sha256: digest(body), bytes: body.length,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } };
  await assert.rejects(verifyMigrationHTTP({ origin: 'http://127.0.0.1:1', references: [reference], directory: output(t), owner: 'router', role: 'candidate', expected, bases,
    request: async () => new Response('[]', { headers: reference.headers }) }));
});
