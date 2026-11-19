import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { artifactFiles } from './desktop-publish.mjs';
import { genshinContentAssets } from './genshin-content-assets.mjs';
import { nteContentAssets } from './nte-content-assets.mjs';
import { prepareNteMainCandidate, verifyNteMainCandidate } from './nte-main-candidate.mjs';
import { mainManifestOptions, mainManifests } from '../packages/data/scripts/main-manifests.mjs';

const ROOT = resolve(import.meta.dirname, '..');
async function fixture(t, current = false) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'nte-main-'))); t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (file, bytes) => { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), bytes); };
  for (const file of ['packages/core/genshin-content.json', 'packages/core/nte-content.json', 'packages/data/raw-content-review.json', 'packages/data/games/genshin', 'packages/data/games/nte']) {
    mkdirSync(dirname(join(root, file)), { recursive: true }); cpSync(join(ROOT, file), join(root, file), { recursive: true });
  }
  for (const entry of readdirSync(join(ROOT, 'packages/data/games'), { withFileTypes: true })) if (entry.isDirectory() && !['genshin', 'nte'].includes(entry.name)) symlinkSync(join(ROOT, 'packages/data/games', entry.name), join(root, 'packages/data/games', entry.name));
  if (current) cpSync(join(ROOT, 'packages/data/main-manifest-contract.json'), join(root, 'packages/data/main-manifest-contract.json'));
  const source = 'apps/web/.open-next';
  write(`${source}/worker.js`, 'export default {};'); write(`${source}/.build/open-next.config.edge.mjs`, 'export default {};');
  write(`${source}/assets/BUILD_ID`, 'nte-local-test');
  write(`${source}/cache/index.html`, '<main>Same cached page</main>'); write(`${source}/assets/data/sea/raw-guides.json`, '["preserved"]');
  const review = JSON.parse(readFileSync(join(root, 'packages/data/raw-content-review.json')));
  for (const game of [genshinContentAssets(root), nteContentAssets(root)]) {
    const owner = game.contract.owner;
    for (const pair of review.pairs.filter(file => file.startsWith(owner + '/'))) write(`${source}/assets/data/${pair}`, readFileSync(join(root, 'packages/data/games', pair)));
    write(`${source}/assets/data-client/${owner}-platform.json`, game.files.get('platform.json'));
    if (owner === 'genshin') write(`${source}/assets/data-client/tier-list-genshin.json`, JSON.stringify(JSON.parse(game.files.get('tier-list.json')).data));
  }
  const gamesRoot = pathToFileURL(join(root, 'packages/data/games/'));
  for (const [file, value] of await mainManifests(gamesRoot, await mainManifestOptions(gamesRoot))) write(`${source}/assets/data-manifest/${file}`, JSON.stringify(value));
  return { root, source: join(root, source), output: join(root, 'candidate'), write };
}
for (const current of [false, true]) test(`Main migration preserves the ${current ? 'current' : 'historical'} search contract while removing independent copies`, async t => {
  const f = await fixture(t, current), original = artifactFiles(f.source), result = await prepareNteMainCandidate(f.output, f.root);
  assert.deepEqual(artifactFiles(f.source), original); verifyNteMainCandidate(result.proof);
  assert.equal(readFileSync(join(result.artifact, 'cache/index.html'), 'utf8'), '<main>Same cached page</main>');
  assert.equal(readFileSync(join(result.artifact, 'assets/data/sea/raw-guides.json'), 'utf8'), '["preserved"]');
  const games = JSON.parse(readFileSync(join(result.artifact, 'assets/data-manifest/games.json'))).games;
  assert(!Object.hasOwn(games, 'genshin') && !Object.hasOwn(games, 'nte') && Object.hasOwn(games, 'sea'));
  for (const locale of ['zh', 'en', 'ja']) {
    const search = JSON.parse(readFileSync(join(result.artifact, `assets/data-manifest/search-${locale}.json`)));
    assert.equal(Object.hasOwn(search, 'roco-cn'), current);
    if (current) assert.deepEqual(Object.keys(search['roco-cn']), ['items']);
  }
  f.write('candidate/artifact/cache/index.html', 'tampered'); assert.throws(() => verifyNteMainCandidate(result.proof));
});
for (const fault of ['raw-drift', 'index-drift', 'unregistered-mirror', 'server-copy']) test(`Main candidate rejects ${fault}`, async t => {
  const f = await fixture(t);
  f.write('apps/web/.open-next/' + ({ 'raw-drift': 'assets/data/nte/raw-materials.json', 'index-drift': 'assets/data-manifest/games.json',
    'unregistered-mirror': 'assets/data/nte/private.json', 'server-copy': 'server-functions/default/packages/data/games/nte/raw-characters.json' })[fault], '[]');
  await assert.rejects(prepareNteMainCandidate(f.output, f.root));
});
