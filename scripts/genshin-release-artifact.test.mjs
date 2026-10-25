import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import { genshinArtifactConfigs, parseGenshinArtifactArguments, sealGenshinArtifact, sha256, verifyGenshinArtifact } from './genshin-release-artifact.mjs';

const configText = readFileSync(new URL('../apps/game-genshin/wrangler.jsonc', import.meta.url), 'utf8');
const commit = 'a'.repeat(40);
const importTs = async path => import('data:text/javascript;base64,' + Buffer.from(ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64'));

test('Genshin preview recognition uses parsed hostnames, not a substring or build mode', async () => {
  const { isWorkerPreviewOrigin } = await importTs('../apps/game-genshin/lib/preview-origin.ts');
  for (const url of ['https://gachia-game-genshin-staging.aieasygames.workers.dev', 'https://gachia-game-genshin.aieasygames.workers.dev']) assert.equal(isWorkerPreviewOrigin(url), true);
  for (const url of ['https://gachia.com', 'https://workers.dev.evil.invalid', 'https://gachia.com/path.workers.dev', 'https://name.workers.dev@evil.invalid', 'invalid']) assert.equal(isWorkerPreviewOrigin(url), false);
  const middleware = readFileSync(new URL('../apps/game-genshin/middleware.ts', import.meta.url), 'utf8');
  assert.match(middleware, /isWorkerPreviewOrigin\(request.nextUrl.origin\)/);
  assert.match(middleware, /Disallow: \/\\n/);
  assert.match(middleware, /X-Robots-Tag', 'noindex, nofollow'/);
  assert.doesNotMatch(middleware, /process.env/);
});

test('material watchlist accepts old arrays, retains unknown IDs and bounds malformed state', async () => {
  const { parseMaterialWatchlist, MATERIAL_WATCHLIST_KEY } = await importTs('../apps/game-genshin/lib/material-watchlist.ts');
  assert.equal(MATERIAL_WATCHLIST_KEY, 'gachia-genshin-material-watchlist-v1');
  assert.deepEqual(parseMaterialWatchlist('["mora","future-material","mora",null,42,{},""]'), ['mora', 'future-material']);
  for (const raw of [null, '', '{', 'null', '{}', '3', '"mora"', ' '.repeat(256 * 1024 + 1)]) assert.deepEqual(parseMaterialWatchlist(raw), []);
  assert.deepEqual(parseMaterialWatchlist(JSON.stringify(['a'.repeat(129), 'mora'])), ['mora']);
  assert.equal(parseMaterialWatchlist(JSON.stringify(Array.from({ length: 2100 }, (_, i) => `id-${i}`))).length, 2000);
});

test('sealed targets differ only in service name; never add resources, routes or preview builds', () => {
  const { production, staging } = genshinArtifactConfigs(configText);
  assert.equal(production.name, 'gachia-game-genshin');
  assert.equal(staging.name, 'gachia-game-genshin-staging');
  assert.deepEqual(staging, { ...production, name: staging.name });
  assert.equal(staging.vars.GENSHIN_DEPLOYMENT_MODE, 'production');
  assert.equal(production.env, undefined);
  for (const mutate of [c => { c.services = []; }, c => { c.routes = ['gachia.com/*']; }, c => { c.build = {}; }, c => { c.assets.binding = 'OTHER'; }, c => { c.env.staging.main = 'evil.js'; }, c => { c.vars.X = 'unknown'; }, c => { c.compatibility_date = '2027-01-01'; }]) {
    const config = JSON.parse(configText); mutate(config);
    assert.throws(() => genshinArtifactConfigs(JSON.stringify(config)));
  }
});

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'genshin-artifact-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, 'source'), directory = join(root, 'sealed');
  const put = (path, value) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, value); };
  put(join(source, 'worker.js'), 'export default {}');
  put(join(source, '.build/open-next.config.edge.mjs'), 'export default {}');
  put(join(source, 'assets/BUILD_ID'), 'fixture-build');
  put(join(source, 'assets/_next/static/chunks/a.js'), 'fixture chunk');
  symlinkSync('assets/BUILD_ID', join(source, 'internal-link'));
  const previousAssets = { receiptSha256: 'b'.repeat(64), versionId: '472903c2-3fca-43c0-a613-8c54f108bf73' };
  const input = { directory, source, sourceCommit: commit, configText, previousAssets, sitemap: '<urlset/>', verification: { fixture: true } };
  const result = sealGenshinArtifact(input);
  const options = { ...result, configText, previousAssets };
  return { directory, input, put, options, verify: () => verifyGenshinArtifact(directory, options) };
}

test('seals the full portable artifact and separately pins the manifest identity', t => {
  const f = fixture(t);
  assert.equal(f.verify().sourceCommit, commit);
  assert.equal(f.verify().provenance, 'local_operator_build_and_integrity_not_remote_attestation');
  assert.equal(sha256(readFileSync(join(f.directory, 'manifest.json'))), f.options.manifestSha256);
  assert.throws(() => sealGenshinArtifact(f.input), /EEXIST/);
});

for (const [name, mutate] of Object.entries({
  chunk: f => f.put(join(f.directory, '.open-next/assets/_next/static/chunks/a.js'), 'modified chunk'),
  'extra file': f => f.put(join(f.directory, 'unreviewed.js'), 'extra'),
  'extra empty directory': f => mkdirSync(join(f.directory, 'extra')),
  'manifest change': f => f.put(join(f.directory, 'manifest.json'), '{}'),
  'target config': f => f.put(join(f.directory, 'wrangler.staging.json'), '{}'),
  'missing file': f => rmSync(join(f.directory, '.open-next/assets/BUILD_ID')),
  'external link': f => symlinkSync('/etc/passwd', join(f.directory, '.open-next/escape')),
  'dangling link': f => symlinkSync('missing', join(f.directory, '.open-next/dangling')),
  'outside Worker link': f => symlinkSync('.open-next/assets/BUILD_ID', join(f.directory, 'alias')),
  'wrong commit': f => { f.options.sourceCommit = 'c'.repeat(40); },
  'wrong receipt': f => { f.options.previousAssets = {}; },
  'wrong pinned digest': f => { f.options.manifestSha256 = 'c'.repeat(64); },
  'changed source config': f => { f.options.configText += '\n'; },
})) test(`artifact verification rejects ${name}`, t => {
  const f = fixture(t); mutate(f); assert.throws(f.verify);
});

test('CLI is local-only, explicit and rejects duplicate/unknown deployment flags', () => {
  const flags = ['--directory', 'out', '--previous-assets-receipt', 'receipt.json', '--rollback-version', 'version'];
  assert.equal(parseGenshinArtifactArguments(['build', ...flags]).action, 'build');
  assert.equal(parseGenshinArtifactArguments(['verify', ...flags, '--sha256', 'a'.repeat(64), '--commit', commit]).action, 'verify');
  for (const args of [['deploy', ...flags], ['build', ...flags, '--env', 'production'], ['build', ...flags, '--directory', 'other'], ['verify', ...flags], ['build'], ['build', ...flags, '--commit', commit]]) assert.throws(() => parseGenshinArtifactArguments(args));
});
