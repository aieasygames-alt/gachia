import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { genshinContentAssets } from './genshin-content-assets.mjs';
import { assertDiskBudget } from './desktop-disk-preflight.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => `${JSON.stringify(value, null, 2)}\n`;

export async function smokeGenshinPlatform(output, root = ROOT) {
  root = realpathSync(root);
  const directory = resolve(output);
  assert(directory !== root && !root.startsWith(directory + '/'), 'Output cannot contain the source repository');
  assert.equal(realpathSync(dirname(directory)), dirname(directory), 'Linked smoke output parent');
  assertDiskBudget({ path: root, operation: 'Genshin platform binding smoke', estimatedBytes: 256 * 1024 * 1024 });
  const original = genshinContentAssets(root), a = original.files.get('platform.json');
  mkdirSync(directory, { mode: 0o700 });
  const frozen = join(directory, 'source-b');
  for (const path of ['packages/core/genshin-content.json', 'packages/data/games/genshin']) {
    mkdirSync(dirname(join(frozen, path)), { recursive: true });
    cpSync(join(root, path), join(frozen, path), { recursive: true });
  }
  const characterPath = join(frozen, 'packages/data/games/genshin/raw-characters.json');
  const characters = JSON.parse(readFileSync(characterPath));
  characters.find(row => row.id === 'hu-tao').nameEn = 'Local owner B character';
  characters.find(row => row.id === 'hu-tao').image = '/images/genshin/characters/owner-b.webp';
  writeFileSync(characterPath, json(characters));
  const guidePath = join(frozen, 'packages/data/games/genshin/raw-guides.json');
  const guides = JSON.parse(readFileSync(guidePath));
  guides.find(row => row.id === 'banner-schedule-guide').summaryEn = 'Local owner B guide summary';
  writeFileSync(guidePath, json(guides));
  const next = genshinContentAssets(frozen), b = next.files.get('platform.json');
  assert.notEqual(original.manifest.version, next.manifest.version);

  const appRequire = createRequire(join(root, 'apps/web/package.json'));
  const require = createRequire(appRequire.resolve('wrangler/package.json'));
  const { build } = require('esbuild');
  const { Miniflare, Log, LogLevel, convertV4MiniflareOptions } = require('miniflare');
  const compiled = await build({
    stdin: { contents: `
      import { readGenshinPlatformContent } from ${JSON.stringify(join(root, 'apps/web/lib/genshin-platform-content.ts'))};
      import { composeHomepageContent } from ${JSON.stringify(join(root, 'apps/web/lib/homepage-content.ts'))};
      export default { async fetch(request, env) {
        try {
          const value = await readGenshinPlatformContent(env);
          return Response.json({ content: value, home: composeHomepageContent(value) }, { headers: { 'cache-control': 'no-store' } });
        } catch {
          return Response.json({ home: composeHomepageContent(null) }, { status: 503, headers: { 'cache-control': 'no-store' } });
        }
      } };
    `, resolveDir: root, sourcefile: 'genshin-platform-smoke-entry.ts', loader: 'ts' },
    tsconfig: join(root, 'apps/web/tsconfig.json'), bundle: true, write: false,
    format: 'esm', platform: 'browser', target: 'es2022', external: ['node:*', 'cloudflare:*'],
  });
  assert.equal(compiled.outputFiles.length, 1);
  const script = compiled.outputFiles[0].text;
  writeFileSync(join(directory, 'consumer-worker.mjs'), script, { flag: 'wx' });
  const mainSHA256 = hash(script);
  const mf = new Miniflare(convertV4MiniflareOptions({ host: '127.0.0.1', port: 0, log: new Log(LogLevel.ERROR), workers: [
    { name: 'main', modules: true, script, compatibilityDate: '2026-07-08', compatibilityFlags: ['nodejs_compat'],
      bindings: { GENSHIN_CONTENT_ENABLED: 'true' }, serviceBindings: { GENSHIN_CONTENT: 'genshin', ASSETS: 'legacy-main' } },
    { name: 'genshin', modules: true, compatibilityDate: '2026-07-08', kvNamespaces: ['PLATFORM'], script: `
      export default { async fetch(request, env) {
        const url = new URL(request.url);
        if (request.method !== 'GET' || url.pathname !== '/_games/genshin/content/platform.json'
          || url.search || request.headers.has('cookie') || request.headers.has('authorization')) return new Response(null, { status: 400 });
        return new Response(await env.PLATFORM.get('active'), { headers: { 'content-type': 'application/json' } });
      } };
    ` },
    { name: 'legacy-main', modules: true, compatibilityDate: '2026-07-08', script: `
      export default { async fetch() { return new Response(${JSON.stringify(a.toString('utf8'))}, { headers: { 'content-type': 'application/json' } }); } };
    ` },
  ] }));
  const observations = [];
  try {
    const origin = String(await mf.ready), kv = await mf.getKVNamespace('PLATFORM', 'genshin');
    const observe = async (label, body, status) => {
      await kv.put('active', body);
      const response = await fetch(origin + '?private=discarded', { headers: { cookie: 'test-only=1', authorization: 'Bearer test-only' },
        redirect: 'error', signal: AbortSignal.timeout(30000) });
      assert.equal(response.status, status);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const bytes = Buffer.from(await response.arrayBuffer()), value = JSON.parse(bytes);
      observations.push({ label, status, sha256: hash(bytes), bytes: bytes.length, version: value.content?.version ?? null });
      writeFileSync(join(directory, `${label}.json`), bytes, { flag: 'wx' });
      return value;
    };
    const first = await observe('a', a.toString('utf8'), 200);
    assert.equal(first.home.featured[0].name.en, 'Hu Tao');
    const second = await observe('b', b.toString('utf8'), 200);
    assert.equal(second.home.featured[0].name.en, 'Local owner B character');
    assert.equal(second.home.featured[0].imageUrl, 'https://img.gachia.com/images/genshin/characters/owner-b.webp');
    assert.equal(second.home.banners.find(row => row.gameId === 'genshin').summary.en, 'Local owner B guide summary');
    for (const key of ['banners', 'codes', 'guides', 'versions']) assert.deepEqual(
      first.home[key].filter(row => row.gameId !== 'genshin'), second.home[key].filter(row => row.gameId !== 'genshin'));
    const failed = await observe('unavailable', '{invalid', 503);
    assert.equal(failed.home.genshinUnavailable, true);
    assert.deepEqual(failed.home.featured, []);
    assert.equal(hash(readFileSync(join(directory, 'consumer-worker.mjs'))), mainSHA256);
    assert.deepEqual(genshinContentAssets(root), original, 'Runtime fixture changed the real content source');
  } finally {
    await mf.dispose();
  }
  const result = { schemaVersion: 1, kind: 'genshin_platform_local_binding',
    mainSHA256, versionA: original.manifest.version, versionB: next.manifest.version, observations,
    cloudWrites: false, productionReady: false,
    scope: 'Actual workerd Service Binding and unchanged consumer bundle; actual application reader/home composer, not a full Main OpenNext build, CMS write or production qualification' };
  writeFileSync(join(directory, 'verification.json'), json(result), { flag: 'wx', mode: 0o600 });
  return { directory, observations: observations.length, mainSHA256, cloudWrites: false, productionReady: false };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert(process.argv.length === 4 && process.argv[2] === '--output', 'Usage: node scripts/genshin-platform-local-smoke.mjs --output <new-directory>');
  console.log(JSON.stringify(await smokeGenshinPlatform(process.argv[3])));
}
