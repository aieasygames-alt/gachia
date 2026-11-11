import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { characterIds, genshinPlatformProjection, searchProjection, tierListProjection } from '../packages/data/scripts/game-public-projections.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => `${JSON.stringify(value)}\n`;

function regular(root, relative) {
  const file = join(root, relative);
  assert.equal(realpathSync(file), file, `Linked content input: ${relative}`);
  assert(lstatSync(file).isFile(), `Invalid content input: ${relative}`);
  return readFileSync(file);
}

export function genshinContentAssets(root = ROOT) {
  root = realpathSync(root);
  const contract = JSON.parse(regular(root, 'packages/core/genshin-content.json'));
  assert.equal(contract.schemaVersion, 1);
  assert.equal(contract.owner, 'genshin');
  assert.equal(contract.prefix, '/_games/genshin/content');
  assert.deepEqual(contract.locales, ['zh', 'en', 'ja']);
  assert(contract.rawFiles.length > 0 && new Set(contract.rawFiles).size === contract.rawFiles.length);
  assert(contract.rawFiles.every(file => /^raw-[a-z0-9-]+\.json$/.test(file)));
  const directory = 'packages/data/games/genshin';
  assert.deepEqual(readdirSync(join(root, directory)).filter(file => /^raw-.*\.json$/.test(file)).sort(), contract.rawFiles,
    'New raw content needs an explicit public export contract');
  const raw = new Map(contract.rawFiles.map(file => [file, regular(root, `${directory}/${file}`)]));
  const values = Object.fromEntries([...raw].map(([file, bytes]) => [file, JSON.parse(bytes.toString('utf8'))]));
  for (const [file, value] of Object.entries(values)) assert(Array.isArray(value) && value.length > 0, `Invalid public data: ${file}`);
  const sources = [...raw].map(([file, bytes]) => ({ path: `${directory}/${file}`, sha256: hash(bytes), bytes: bytes.length }));
  const files = new Map([...raw].map(([file, bytes]) => [`data/${file}`, bytes]));
  const searchSources = { characters: 'raw-characters.json', weapons: 'raw-weapons.json', items: 'raw-materials.json', artifacts: 'raw-artifacts.json' };
  const projections = {
    'games.json': { characters: characterIds(values['raw-character-summaries.json']) },
    'tier-list.json': tierListProjection(values['raw-characters.json'], 'genshin', ['element', 'weaponType']),
    'platform.json': genshinPlatformProjection(values['raw-characters.json'], values['raw-guides.json'], values['raw-redeem-codes.json']),
  };
  for (const locale of contract.locales) projections[`search-${locale}.json`] = Object.fromEntries(
    Object.entries(searchSources).map(([category, file]) => [category, searchProjection(values[file], locale)]));
  // Bind both source bytes and derived values; generator changes must change the content version too.
  const version = hash(json({ schemaVersion: 1, owner: contract.owner, sources, projections }));
  for (const [file, data] of Object.entries(projections)) files.set(file, Buffer.from(json({ schemaVersion: 1, owner: 'genshin', version, data })));
  const manifest = { schemaVersion: 1, owner: 'genshin', version, sources,
    files: [...files].map(([file, bytes]) => ({ path: `${contract.prefix}/${file}`, sha256: hash(bytes), bytes: bytes.length })) };
  files.set('manifest.json', Buffer.from(json(manifest)));
  return { contract, manifest, files };
}

export function prepareGenshinContentAssets(root = ROOT) {
  root = realpathSync(root);
  const result = genshinContentAssets(root);
  const assets = resolve(root, 'apps/game-genshin/.open-next/assets');
  assert.equal(realpathSync(assets), assets, 'Linked game assets directory');
  const target = join(assets, result.contract.prefix.slice(1));
  assert(!existsSync(target), 'Content assets already exist; rebuild before preparing again');
  let parent = assets;
  for (const part of result.contract.prefix.split('/').filter(Boolean)) {
    parent = join(parent, part);
    if (existsSync(parent)) assert(lstatSync(parent).isDirectory() && !lstatSync(parent).isSymbolicLink(), 'Linked content output parent');
  }
  for (const [file, bytes] of result.files) {
    const destination = join(target, file);
    mkdirSync(dirname(destination), { recursive: true });
    assert.equal(realpathSync(dirname(destination)), dirname(destination), 'Linked content output');
    writeFileSync(destination, bytes, { flag: 'wx' });
  }
  return { version: result.manifest.version, files: result.files.size, prefix: result.contract.prefix };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 2, 'Usage: node scripts/genshin-content-assets.mjs');
  console.log(JSON.stringify(prepareGenshinContentAssets()));
}
