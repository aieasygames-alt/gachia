import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
import { genshinContentAssets, prepareGenshinContentAssets } from './genshin-content-assets.mjs';
import { parseWrangler, prepareNamespacedAssets } from './game-release.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const CONTRACT = JSON.parse(readFileSync(join(ROOT, 'packages/core/genshin-content.json')));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const document = (assets, file) => JSON.parse(assets.files.get(file));
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'genshin-content-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const path of ['packages/core/genshin-content.json', 'packages/data/games/genshin']) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    cpSync(join(ROOT, path), join(root, path), { recursive: true });
  }
  mkdirSync(join(root, 'apps/game-genshin/.open-next/assets/_next/static'), { recursive: true });
  writeFileSync(join(root, 'apps/game-genshin/.open-next/assets/_next/static/app.js'), 'export{}');
  return root;
}

test('content exports are deterministic, complete and bound to exact source/output bytes', () => {
  const a = genshinContentAssets(), b = genshinContentAssets();
  assert.equal(a.files.size, CONTRACT.rawFiles.length + CONTRACT.locales.length + 4);
  assert.deepEqual(a, b);
  for (const source of a.manifest.sources) {
    const bytes = readFileSync(join(ROOT, source.path));
    assert.equal(source.sha256, digest(bytes));
    assert.equal(source.bytes, bytes.length);
    assert(a.files.get(`data/${source.path.split('/').at(-1)}`).equals(bytes));
  }
  for (const file of a.manifest.files) {
    const bytes = a.files.get(file.path.slice(CONTRACT.prefix.length + 1));
    assert.equal(digest(bytes), file.sha256);
    assert.equal(bytes.length, file.bytes);
  }
  for (const file of ['games.json', 'tier-list.json', 'platform.json', 'search-zh.json', 'search-en.json', 'search-ja.json']) {
    const envelope = document(a, file);
    assert.equal(envelope.owner, 'genshin');
    assert.equal(envelope.version, a.manifest.version);
    assert.equal(envelope.schemaVersion, 1);
  }
});

for (const locale of CONTRACT.locales) test(`${locale}: new search fragment matches the existing client schema and projection`, () => {
  const base = JSON.parse(readFileSync(join(ROOT, `apps/web/public/data-manifest/search-${locale}.json`)));
  assert.deepEqual(document(genshinContentAssets(), `search-${locale}.json`).data, base.genshin);
});

test('games and tier-list fragments preserve existing derived values', () => {
  const assets = genshinContentAssets();
  assert.deepEqual(document(assets, 'games.json').data,
    JSON.parse(readFileSync(join(ROOT, 'apps/web/public/data-manifest/games.json'))).games.genshin);
  assert.deepEqual(document(assets, 'tier-list.json').data,
    JSON.parse(readFileSync(join(ROOT, 'apps/web/public/data-client/tier-list-genshin.json'))));
});

test('repository Router configurations leave the new content switch disabled', () => {
  const config = parseWrangler(readFileSync(join(ROOT, 'apps/router/wrangler.jsonc'), 'utf8'));
  assert.equal(config.vars.GENSHIN_CONTENT_ENABLED, undefined);
  for (const environment of Object.values(config.env ?? {})) assert.equal(environment.vars?.GENSHIN_CONTENT_ENABLED, undefined);
});

test('the normal game asset preparation includes content without replacing original assets', t => {
  const root = fixture(t);
  const result = prepareNamespacedAssets({ game: 'genshin', app: 'apps/game-genshin' }, root);
  assert.equal(result.content.files, 16);
  const assets = genshinContentAssets(root);
  for (const [file, bytes] of assets.files) {
    assert(readFileSync(join(root, 'apps/game-genshin/.open-next/assets', CONTRACT.prefix, file)).equals(bytes));
  }
  assert.equal(readFileSync(join(root, 'apps/game-genshin/.open-next/assets/_next/static/app.js'), 'utf8'), 'export{}');
  assert.throws(() => prepareGenshinContentAssets(root), /already exist/);
});

test('an owner-only source update changes version and projections without reading or changing Main', t => {
  const root = fixture(t), before = genshinContentAssets(root);
  const source = join(root, 'packages/data/games/genshin/raw-characters.json');
  const characters = JSON.parse(readFileSync(source));
  characters[0].name = 'Owner-only character update';
  characters[0].description = 'An isolated candidate, not a CMS or production edit.';
  writeFileSync(source, JSON.stringify(characters));
  const after = genshinContentAssets(root);
  assert.notEqual(before.manifest.version, after.manifest.version);
  assert.notDeepEqual(document(before, 'search-zh.json').data, document(after, 'search-zh.json').data);
  assert.equal(document(after, 'data/raw-characters.json')[0].description, characters[0].description);
});

test('linked output parents cannot create files outside the game artifact', t => {
  const root = fixture(t), outside = join(root, 'outside');
  mkdirSync(outside);
  symlinkSync(outside, join(root, 'apps/game-genshin/.open-next/assets/_games'));
  assert.throws(() => prepareGenshinContentAssets(root), /Linked content output parent/);
});

for (const fault of ['missing', 'extra', 'invalid', 'linked', 'empty']) test(`rejects ${fault} source instead of publishing an incomplete data plane`, t => {
  const root = fixture(t), source = join(root, 'packages/data/games/genshin/raw-characters.json');
  if (fault === 'missing') rmSync(source);
  if (fault === 'extra') writeFileSync(join(dirname(source), 'raw-unreviewed.json'), '[]');
  if (fault === 'invalid') writeFileSync(source, '{invalid');
  if (fault === 'empty') writeFileSync(source, '[]');
  if (fault === 'linked') { rmSync(source); symlinkSync(join(ROOT, 'packages/data/games/genshin/raw-characters.json'), source); }
  assert.throws(() => genshinContentAssets(root));
});

// Run the actual Router against generated A/B game assets and an unchanged Main response.
function loadRouterModule(file) {
  const source = readFileSync(join(ROOT, 'apps/router/src', file), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled.outputText)(name => {
    if (name === '../../../packages/core/genshin-content.json') return CONTRACT;
    assert.equal(name, '../../../packages/core/genshin-platform');
    const schema = { exports: {} };
    const source = readFileSync(join(ROOT, 'packages/core/genshin-platform.ts'), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
    new Function('require', 'module', 'exports', compiled.outputText)(createRequire(join(ROOT, 'packages/core/package.json')), schema, schema.exports);
    return schema.exports;
  }, module, module.exports);
  return module.exports;
}

for (const ownerPresent of [true, false]) test(`actual Router observes A/B with Genshin ${ownerPresent ? 'present in' : 'absent from'} unchanged Main indexes`, async t => {
  const root = fixture(t), handler = loadRouterModule('genshin-content.ts');
  let active = genshinContentAssets(root);
  const base = JSON.parse(readFileSync(join(ROOT, 'apps/web/public/data-manifest/search-zh.json')));
  const original = structuredClone(base);
  if (!ownerPresent) delete base.genshin;
  const sealedMain = JSON.stringify(base), mainRequests = [];
  const main = { fetch: async request => { mainRequests.push(request.url); return Response.json(JSON.parse(sealedMain)); } };
  const game = { fetch: async request => {
    const file = new URL(request.url).pathname.slice(CONTRACT.prefix.length + 1);
    return new Response(active.files.get(file), { headers: { 'content-type': 'application/json' } });
  } };
  const request = new Request('https://gachia.com/data-manifest/search-zh.json');
  const a = await handler.serveGenshinContent(request, game, main);
  assert.equal(a.status, 200);
  assert.deepEqual(await a.json(), original);
  const source = join(root, 'packages/data/games/genshin/raw-characters.json'), values = JSON.parse(readFileSync(source));
  values[0].name = 'Isolated new owner name';
  writeFileSync(source, JSON.stringify(values));
  active = genshinContentAssets(root);
  const b = await handler.serveGenshinContent(request, game, main), result = await b.json();
  assert.notEqual(a.headers.get('x-gachia-content-version'), b.headers.get('x-gachia-content-version'));
  assert.equal(result.genshin.characters[0].name, values[0].name);
  for (const [owner, dataset] of Object.entries(base)) if (owner !== 'genshin') assert.deepEqual(result[owner], dataset);
  assert.equal(JSON.stringify(base), sealedMain);
  assert.equal(mainRequests.length, 2);
  const raw = await handler.serveGenshinContent(new Request('https://gachia.com/data/genshin/raw-characters.json'), game, main);
  assert.equal(await raw.text(), readFileSync(source, 'utf8'));
  assert.equal(mainRequests.length, 2, 'raw data must not read its stale Main mirror');
  const platform = await handler.serveGenshinContent(new Request('https://gachia.com/data-client/genshin-platform.json'), game, main);
  assert.equal(platform.status, 200);
  assert.deepEqual(await platform.json(), document(active, 'platform.json'));
  assert.equal(mainRequests.length, 2, 'platform data must not read its stale Main compatibility snapshot');
});
