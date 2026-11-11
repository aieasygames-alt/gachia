import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { artifactFiles, withLocalWorker } from './desktop-publish.mjs';
import { assertDiskBudget } from './desktop-disk-preflight.mjs';
import { boundedBody } from './desktop-version-preview.mjs';
import { digest } from './desktop-release-assets.mjs';
import { genshinContentAssets } from './genshin-content-assets.mjs';
import { genshinMigrationLocalConfigs } from './genshin-migration-local-smoke.mjs';
import { verifyGenshinMainCandidate } from './genshin-main-candidate.mjs';

const json = value => JSON.stringify(value, null, 2) + '\n';
const escape = text => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' })[char]);

export function assertGenshinDeliveryData(path, body, expected, baseline) {
  const value = JSON.parse(body);
  if (path.startsWith('/data/genshin/') || path.startsWith(expected.contract.prefix + '/')) {
    const file = path.startsWith('/data/genshin/') ? 'data/' + path.slice('/data/genshin/'.length) : path.slice(expected.contract.prefix.length + 1);
    assert(body.equals(expected.files.get(file)), `Raw delivery bytes differ: ${path}`);
  } else if (path === '/data-client/genshin-platform.json') assert.deepEqual(value, JSON.parse(expected.files.get('platform.json')));
  else if (path === '/data-client/tier-list-genshin.json') assert.deepEqual(value, JSON.parse(expected.files.get('tier-list.json')).data);
  else {
    const file = path.slice('/data-manifest/'.length), slice = JSON.parse(expected.files.get(file)).data;
    if (file === 'games.json') {
      assert.deepEqual(value.games.genshin, slice);
      const other = structuredClone(value); delete other.games.genshin;
      assert.deepEqual(other, baseline, 'Other game membership changed');
    } else {
      assert.deepEqual(value.genshin, slice, `Search slice differs: ${path}`);
      const other = structuredClone(value); delete other.genshin;
      assert.deepEqual(other, baseline, 'Other game search content changed');
    }
  }
}

// Actual OpenNext Workers and the actual Router, never synthetic page renderers.
// The main application and every non-Genshin search slice remain fixed throughout.
export async function verifyGenshinContentDelivery({ root, output, candidateSource, baselineSource, candidateArtifact, previousArtifact, mainCandidate, mainPin, characterId = 'hu-tao' }) {
  root = realpathSync(root);
  const directory = resolve(output), main = verifyGenshinMainCandidate(mainCandidate, mainPin);
  assert.equal(realpathSync(dirname(directory)), dirname(directory));
  assertDiskBudget({ path: root, operation: 'Genshin CMS delivery HTTP', estimatedBytes: 512 * 1024 ** 2 });
  const a = genshinContentAssets(baselineSource), b = genshinContentAssets(candidateSource);
  assert.notEqual(a.manifest.version, b.manifest.version, 'An actual content edit is required');
  for (const [artifact, expected] of [[previousArtifact, a], [candidateArtifact, b]]) {
    for (const [file, bytes] of expected.files) assert(readFileSync(join(artifact, 'assets', expected.contract.prefix, file)).equals(bytes), `Built content differs: ${file}`);
  }
  const trees = { main: artifactFiles(main.artifact), previous: artifactFiles(previousArtifact), candidate: artifactFiles(candidateArtifact) };
  mkdirSync(directory, { mode: 0o700 });
  const save = (file, value) => writeFileSync(join(directory, file), value, { flag: 'wx', mode: 0o600 });
  for (const [owner, tree] of Object.entries(trees)) save(`${owner}-tree.json`, json(tree));
  const require = createRequire(join(root, 'apps/web/package.json'));
  const wranglerEntrypoint = join(dirname(require.resolve('wrangler/package.json')), 'bin/wrangler.js');
  const references = [], otherResponses = new Map(), aggregateBases = new Map();
  const dataPaths = ['/data/genshin/raw-characters.json',
    '/data-client/genshin-platform.json', '/data-client/tier-list-genshin.json',
    ...['games.json', 'search-zh.json', 'search-en.json', 'search-ja.json'].map(file => '/data-manifest/' + file)];
  for (const mode of ['A', 'B', 'failure', 'recovery']) {
    const local = join(directory, mode); mkdirSync(local); mkdirSync(join(local, 'home'));
    save(`${mode}/probe.mjs`, 'export default {fetch(request,env){const url=new URL(request.url);if(url.pathname.startsWith("/__main/")){url.pathname=url.pathname.slice(7);return env.MAIN.fetch(new Request(url,request));}return env.ROUTER.fetch(request);}};\n');
    save(`${mode}/unavailable.mjs`, 'export default {fetch(){return new Response(null,{status:503});}};\n');
    const configs = genshinMigrationLocalConfigs({ root, directory: local, mainArtifact: main.artifact,
      gameArtifact: mode === 'B' ? candidateArtifact : previousArtifact, failure: mode === 'failure' });
    for (const [name, config] of Object.entries(configs)) save(`${mode}/${name}.json`, json(config));
    const expected = mode === 'B' ? b : a, available = mode !== 'failure';
    const character = JSON.parse(expected.files.get('platform.json')).data.characters.find(row => row.id === characterId);
    assert(character, 'Edited character missing from platform projection');
    await withLocalWorker(join(root, 'apps/web'), join(local, 'probe.json'), join(local, 'home'), join(local, 'worker.log'), async origin => {
      const observe = async (path, status, check) => {
        const page = path.replace(/^\/__main(?=\/)/, ''), locale = page.match(/^\/(zh|en|ja)(?:\/|$)/)?.[1] ?? 'en';
        const response = await fetch(origin + path, { redirect: 'manual', credentials: 'omit', signal: AbortSignal.timeout(30000), headers: { 'accept-language': locale } });
        const body = await boundedBody(response), bodyFile = `${mode}/${references.length}.body`;
        save(bodyFile, body);
        references.push({ mode, path, status: response.status, headers: Object.fromEntries(response.headers), bytes: body.length, sha256: digest(body), bodyFile });
        assert.equal(response.status, status, `${mode} ${path}`); assert(!response.headers.has('set-cookie'), path);
        await check?.(response, body);
      };
      for (const locale of ['zh', 'en', 'ja']) {
        for (const section of [`characters/${characterId}`, 'characters', 'build', 'compare', 'teams', 'tier-list']) {
          const path = `/${locale}/genshin/${section}`;
          await observe(path, available ? 200 : 503, (_response, body) => {
            if (!available) return;
            const html = body.toString(), content = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
            assert(content?.includes(escape(character.name[locale])), `${mode} ${path}: edited name missing from actual page`);
            assert(html.includes(`https://gachia.com${path}`), 'Canonical changed');
          });
        }
        for (const path of [`/${locale}`, `/__main/${locale}`]) await observe(path, 200, (response, body) => {
          assert.match(response.headers.get('cache-control') ?? '', /no-store/);
          const html = body.toString();
          if (available) assert(html.includes(`alt="${escape(character.name[locale])}"`), `${mode}: fixed Main did not read back ${locale}`);
          else {
            assert(!html.includes(`alt="${escape(character.name[locale])}"`), 'Fixed Main fell back to stale content');
            assert(html.includes(({ en: 'Genshin content is temporarily unavailable.', zh: '原神资料暂不可用', ja: '原神のデータは一時的に利用できません' })[locale]), 'Missing explicit failure state');
          }
        });
      }
      for (const path of dataPaths) await observe(path, available ? 200 : 503, (response, body) => {
        assert.equal(response.headers.get('cache-control'), 'no-store');
        if (!available) return;
        assert.equal(response.headers.get('content-type')?.split(';')[0], 'application/json');
        if (path.startsWith('/data-manifest/') && !aggregateBases.has(path)) {
          assert.equal(mode, 'A');
          const base = JSON.parse(body);
          if (path.endsWith('/games.json')) delete base.games.genshin; else delete base.genshin;
          aggregateBases.set(path, base);
        }
        assertGenshinDeliveryData(path, body, expected, aggregateBases.get(path));
      });
      await observe('/__main/data/genshin/raw-characters.json', 404);
      for (const path of ['/en/starrail/version', '/sitemap.xml']) await observe(path, 200, (_response, body) => {
        if (!otherResponses.has(path)) otherResponses.set(path, digest(body));
        assert.equal(digest(body), otherResponses.get(path), `Non-Genshin response changed: ${path}`);
      });
    }, { wranglerEntrypoint, additionalConfigs: ['router', 'main', 'genshin'].map(name => join(local, `${name}.json`)) });
  }
  for (const [name, artifact] of [['main', main.artifact], ['previous', previousArtifact], ['candidate', candidateArtifact]]) assert.deepEqual(artifactFiles(artifact), trees[name]);
  const referencesPin = digest(json(references)); save('references.json', json(references));
  const receipt = { schemaVersion: 1, kind: 'genshin_cms_full_content_delivery_local', versions: { A: a.manifest.version, B: b.manifest.version },
    mainCandidate, mainPin, candidateArtifact, previousArtifact, responses: references.length, referencesPin,
    actualOpenNextWorkers: true, unchangedMain: true, unchangedOtherSearchSlices: true, candidatePageBuilt: true,
    localOnly: true, cloudWrites: false, productionReady: false };
  save('delivery.json', json(receipt));
  return { directory, pin: digest(json(receipt)), ...receipt };
}
