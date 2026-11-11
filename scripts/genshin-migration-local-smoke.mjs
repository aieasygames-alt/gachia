import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { artifactFiles, withLocalWorker } from './desktop-publish.mjs';
import { assertDiskBudget } from './desktop-disk-preflight.mjs';
import { boundedBody } from './desktop-version-preview.mjs';
import { parseWrangler } from './game-release.mjs';
import { genshinContentAssets } from './genshin-content-assets.mjs';
import { verifyGenshinMainCandidate } from './genshin-main-candidate.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => `${JSON.stringify(value, null, 2)}\n`;
const probeSource = `export default { fetch(request, env) {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/__main/')) {
    url.pathname = url.pathname.slice('/__main'.length);
    return env.MAIN.fetch(new Request(url, request));
  }
  return env.ROUTER.fetch(request);
} };\n`;

export function genshinMigrationLocalConfigs({ root, directory, mainArtifact, gameArtifact, failure = false }) {
  const main = parseWrangler(readFileSync(join(root, 'apps/web/wrangler.jsonc'), 'utf8'));
  const game = parseWrangler(readFileSync(join(root, 'apps/game-genshin/wrangler.jsonc'), 'utf8'));
  const router = parseWrangler(readFileSync(join(root, 'apps/router/wrangler.jsonc'), 'utf8'));
  const common = config => ({ compatibility_date: config.compatibility_date, compatibility_flags: config.compatibility_flags ?? [] });
  return {
    probe: { ...common(main), name: 'r101-probe', main: join(directory, 'probe.mjs'),
      services: [{ binding: 'MAIN', service: 'r101-main' }, { binding: 'ROUTER', service: 'r101-router' }] },
    router: { ...common(router), name: 'r101-router', main: join(root, 'apps/router/src/index.ts'),
      vars: { GENSHIN_ENABLED: 'true', GENSHIN_FULL_CUTOVER: 'true', GENSHIN_CONTENT_ENABLED: 'true',
        NTE_ENABLED: 'false', AZUR_PROMILIA_ENABLED: 'false', LVMENG_ENABLED: 'false' },
      services: [{ binding: 'MAIN_SITE', service: 'r101-main' }, { binding: 'GENSHIN_SITE', service: 'r101-genshin' }] },
    main: { ...common(main), name: 'r101-main', main: join(mainArtifact, 'worker.js'),
      assets: { directory: join(mainArtifact, 'assets'), binding: 'ASSETS' },
      vars: { NEXT_PUBLIC_APP_URL: 'https://gachia.com', BETTER_AUTH_URL: 'https://gachia.com', GENSHIN_CONTENT_ENABLED: 'true' },
      services: [{ binding: 'GENSHIN_CONTENT', service: 'r101-genshin' }, { binding: 'WORKER_SELF_REFERENCE', service: 'r101-main' }],
      d1_databases: [{ binding: 'DB', database_name: 'r101-local-only', database_id: '00000000-0000-0000-0000-000000000000' }],
      r2_buckets: [{ binding: 'IMAGES', bucket_name: 'r101-local-only' }] },
    genshin: { ...common(game), name: 'r101-genshin', main: failure ? join(directory, 'unavailable.mjs') : join(gameArtifact, 'worker.js'),
      ...(failure ? {} : { assets: { directory: join(gameArtifact, 'assets'), binding: 'ASSETS' },
        vars: { NEXT_PUBLIC_APP_URL: 'https://gachia.com', GENSHIN_DEPLOYMENT_MODE: 'production' } }) },
  };
}

export async function smokeGenshinMigration({ output, candidate, pin, root = ROOT }) {
  root = realpathSync(root);
  const directory = resolve(output), built = verifyGenshinMainCandidate(candidate, pin);
  assert(directory !== root && !root.startsWith(directory + '/'), 'Unsafe smoke output');
  assert.equal(realpathSync(dirname(directory)), dirname(directory), 'Linked smoke output parent');
  assertDiskBudget({ path: root, operation: 'full Main/Genshin local binding smoke', estimatedBytes: 512 * 1024 ** 2 });
  const sourceGameArtifact = join(root, 'apps/game-genshin/.open-next'), expected = genshinContentAssets(root);
  const gameTree = artifactFiles(sourceGameArtifact), mainTree = artifactFiles(built.artifact);
  for (const [file, bytes] of expected.files) assert(readFileSync(join(sourceGameArtifact, 'assets', expected.contract.prefix, file)).equals(bytes), 'Game build is stale');
  mkdirSync(directory, { mode: 0o700 });
  const gameArtifact = join(directory, 'game-artifact');
  cpSync(sourceGameArtifact, gameArtifact, { recursive: true, verbatimSymlinks: true, force: false, errorOnExist: true });
  assert.deepEqual(artifactFiles(gameArtifact), gameTree, 'Game artifact copy differs from the build');
  const save = (name, bytes) => writeFileSync(join(directory, name), bytes, { flag: 'wx', mode: 0o600 });
  save('main-tree.json', json(mainTree)); save('genshin-tree.json', json(gameTree));
  const require = createRequire(join(root, 'apps/web/package.json'));
  const wranglerEntrypoint = join(dirname(require.resolve('wrangler/package.json')), 'bin/wrangler.js');
  const references = [];
  for (const failure of [false, true]) {
    const mode = failure ? 'unavailable' : 'connected', local = join(directory, mode);
    mkdirSync(local); mkdirSync(join(local, 'home'));
    writeFileSync(join(local, 'probe.mjs'), probeSource, { flag: 'wx' });
    writeFileSync(join(local, 'unavailable.mjs'), 'export default { fetch() { return new Response("Unavailable", {status:503}); } };\n', { flag: 'wx' });
    const configs = genshinMigrationLocalConfigs({ root, directory: local, mainArtifact: built.artifact, gameArtifact, failure });
    for (const [name, config] of Object.entries(configs)) writeFileSync(join(local, `${name}.json`), json(config), { flag: 'wx' });
    await withLocalWorker(join(root, 'apps/web'), join(local, 'probe.json'), join(local, 'home'), join(local, 'worker.log'), async origin => {
      const observe = async (path, status, check) => {
        const pagePath = path.startsWith('/__main/') ? path.slice('/__main'.length) : path;
        const response = await fetch(origin + path, { redirect: 'manual', headers: { 'accept-language': pagePath.match(/^\/(zh|en|ja)(?:\/|$)/)?.[1] ?? 'zh' },
          signal: AbortSignal.timeout(30000) });
        const body = await boundedBody(response), bodyFile = `${mode}/${references.length}.body`;
        save(bodyFile, body);
        references.push({ mode, path, status: response.status, headers: Object.fromEntries(response.headers), bytes: body.length, sha256: hash(body), bodyFile });
        assert.equal(response.status, status, `${mode}: ${path}`);
        assert(!response.headers.has('set-cookie'), `Public response sets a cookie: ${path}`);
        await check?.(response, body);
      };
      if (failure) {
        await observe('/en', 200, (response, body) => {
          assert.match(response.headers.get('cache-control') ?? '', /no-store/);
          assert(body.toString().includes('Genshin content is temporarily unavailable.'));
          assert(!body.toString().includes('Hu Tao'));
        });
        await observe('/data/genshin/raw-characters.json', 503);
        await observe('/data-client/genshin-platform.json', 503);
        await observe('/data-manifest/search-en.json', 503);
        await observe('/en/genshin/characters/hu-tao', 503);
        await observe('/en/genshin/build', 503);
        await observe('/en/genshin/calculator', 503);
        await observe('/en/genshin/compare', 503);
        await observe('/en/genshin/teams', 503);
        await observe('/en/genshin/tier-list', 503);
      } else {
        const platform = JSON.parse(expected.files.get('platform.json'));
        for (const locale of ['zh', 'en', 'ja']) await observe(`/${locale}`, 200, (response, body) => {
          assert.match(response.headers.get('cache-control') ?? '', /no-store/);
          const name = platform.data.characters.find(row => row.id === 'hu-tao').name[locale];
          assert(body.toString().includes(name), `Actual homepage lost ${locale} owner content`);
          assert(!body.toString().includes('Genshin content is temporarily unavailable.'));
        });
        for (const [file, bytes] of expected.files) await observe(`${expected.contract.prefix}/${file}`, 200, (_response, body) => assert(body.equals(bytes)));
        for (const file of expected.contract.rawFiles) {
          await observe(`/data/genshin/${file}`, 200, (_response, body) => assert(body.equals(expected.files.get(`data/${file}`))));
          await observe(`/__main/data/genshin/${file}`, 404);
        }
        await observe('/data-client/genshin-platform.json', 200, (_response, body) => assert.deepEqual(JSON.parse(body), platform));
        await observe('/data-client/tier-list-genshin.json', 200, (_response, body) => assert.deepEqual(JSON.parse(body), JSON.parse(expected.files.get('tier-list.json')).data));
        await observe('/__main/data-client/genshin-platform.json', 404);
        await observe('/__main/data-client/tier-list-genshin.json', 404);
        for (const file of ['games.json', 'search-zh.json', 'search-en.json', 'search-ja.json']) {
          const legacy = JSON.parse(readFileSync(join(root, 'apps/web/public/data-manifest', file)));
          await observe(`/data-manifest/${file}`, 200, (_response, body) => assert.deepEqual(JSON.parse(body), legacy));
          await observe(`/__main/data-manifest/${file}`, 200, (_response, body) => {
            const value = JSON.parse(body), without = structuredClone(legacy);
            if (file === 'games.json') { delete without.games.genshin; assert(!value.games.genshin); }
            else { delete without.genshin; assert(!value.genshin); }
            assert.deepEqual(value, without);
          });
        }
        for (const locale of ['zh', 'en', 'ja']) {
          const pages = ['characters', 'weapons', 'items', 'artifacts', 'guides', 'redeem-codes', 'build', 'calculator', 'compare', 'teams', 'tier-list',
            'characters/hu-tao', 'weapons/staff-of-homa', 'items/silk-flower',
            'artifacts/crimson-witch-of-flames', 'guides/banner-schedule-guide'];
          for (const page of pages) {
            const path = `/${locale}/genshin/${page}`;
            await observe(path, 200, (_response, body) => {
              assert(body.toString().includes(`https://gachia.com${path}`), 'Dedicated page canonical changed');
              assert(body.toString().includes('<h1'), 'Dedicated catalogue page lost its heading');
            });
          }
          for (const section of ['characters', 'weapons', 'items', 'artifacts', 'guides', 'redeem-codes', 'build', 'calculator', 'compare', 'teams', 'tier-list']) {
            for (const suffix of ['', '/example']) await observe(`/__main/${locale}/genshin/${section}${suffix}`, 404, response => {
              assert.equal(response.headers.get('cache-control'), 'no-store');
              assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
            });
          }
        }
        await observe('/api/auth/get-session', 404, (_response, body) => assert.equal(JSON.parse(body).code, 'ACCOUNT_FEATURES_DISABLED'));
      }
    }, { wranglerEntrypoint, additionalConfigs: ['router', 'main', 'genshin'].map(name => join(local, `${name}.json`)) });
  }
  verifyGenshinMainCandidate(candidate, pin);
  assert.deepEqual(artifactFiles(gameArtifact), gameTree, 'Runtime smoke changed the game artifact');
  assert.deepEqual(artifactFiles(sourceGameArtifact), gameTree, 'Runtime smoke changed the source game build');
  assert.deepEqual(artifactFiles(built.artifact), mainTree, 'Runtime smoke changed the Main artifact');
  save('references.json', json(references));
  const receipt = { schemaVersion: 1, kind: 'genshin_full_main_local_binding', candidate: { directory: resolve(candidate), pin }, gameArtifactDirectory: gameArtifact,
    version: expected.manifest.version, responses: references.length, referencesPin: hash(readFileSync(join(directory, 'references.json'))),
    mainTreePin: hash(readFileSync(join(directory, 'main-tree.json'))), gameTreePin: hash(readFileSync(join(directory, 'genshin-tree.json'))),
    cloudWrites: false, productionReady: false,
    scope: 'Actual Main/Genshin OpenNext and actual Router, with local-only bindings, an asset-only Main candidate and the current Main catalogue boundary. Map/tool and inline-copy dependencies remain; no CMS write, full topology, source/recovery or production qualification.' };
  save('verification.json', json(receipt));
  return { directory, responses: references.length, version: receipt.version, cloudWrites: false, productionReady: false };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert(process.argv.length === 8 && process.argv[2] === '--output' && process.argv[4] === '--candidate' && process.argv[6] === '--pin',
    'Usage: node scripts/genshin-migration-local-smoke.mjs --output <new-directory> --candidate <directory> --pin <sha256>');
  console.log(JSON.stringify(await smokeGenshinMigration({ output: process.argv[3], candidate: process.argv[5], pin: process.argv[7] })));
}
