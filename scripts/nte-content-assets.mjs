import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { characterIds, searchProjection } from '../packages/data/scripts/game-public-projections.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => `${JSON.stringify(value)}\n`;
function regular(root, path) {
  const file = join(root, path);
  assert.equal(realpathSync(file), file, `Linked NTE input: ${path}`);
  assert(lstatSync(file).isFile()); return readFileSync(file);
}

export function nteContentAssets(root = ROOT) {
  root = realpathSync(root);
  const contract = JSON.parse(regular(root, 'packages/core/nte-content.json'));
  assert.equal(contract.schemaVersion, 1); assert.equal(contract.owner, 'nte'); assert.equal(contract.prefix, '/_games/nte/content');
  assert.deepEqual(contract.locales, ['zh', 'en', 'ja']);
  assert.deepEqual(contract.sourceOnlyFiles, ['raw-image-sources.json']);
  const all = [...contract.rawFiles, ...contract.sourceOnlyFiles];
  assert(all.every(file => /^raw-[a-z0-9-]+\.json$/.test(file)) && new Set(all).size === all.length);
  const directory = 'packages/data/games/nte';
  assert.deepEqual(readdirSync(join(root, directory)).filter(file => /^raw-.*\.json$/.test(file)).sort(), all.sort(), 'Unreviewed NTE raw source');
  const raw = new Map(contract.rawFiles.map(file => [file, regular(root, `${directory}/${file}`)]));
  const values = Object.fromEntries([...raw].map(([file, bytes]) => [file, JSON.parse(bytes.toString('utf8'))]));
  for (const [file, value] of Object.entries(values)) {
    if (file === 'raw-gacha-system.json') assert(value && typeof value === 'object' && !Array.isArray(value) && Array.isArray(value.banners) && value.banners.length, 'Invalid NTE gacha data');
    else assert(Array.isArray(value) && value.length, `Invalid NTE data: ${file}`);
  }
  const localized = (zh, en, ja) => ({ zh, en: en || zh, ja: ja || en || zh });
  const projections = {
    'games.json': { characters: characterIds(values['raw-character-summaries.json']) },
    'platform.json': {
      characters: values['raw-characters.json'].filter(row => row.status !== 'upcoming').map(row => ({
        id: row.id, name: localized(row.name, row.nameEn, row.nameJa), attribute: row.attribute, rank: row.rank,
        imageUrl: row.id === 'chaos' ? null : `https://img.gachia.com/images/characters/${row.id}.webp`, imageAlt: row.nameEn || row.name,
      })),
      guides: values['raw-guides.json'].map(row => ({ id: row.id, title: localized(row.title, row.titleEn, row.titleJa),
        summary: localized(row.summary, row.summaryEn, row.summaryJa), updatedAt: row.updatedAt })),
    },
  };
  const categories = { characters: 'raw-characters.json', weapons: 'raw-weapons.json', items: 'raw-materials.json', artifacts: 'raw-disk-sets.json' };
  for (const locale of contract.locales) projections[`search-${locale}.json`] = Object.fromEntries(Object.entries(categories).map(([category, file]) => [category, searchProjection(values[file], locale)]));
  const sources = [...raw].map(([file, bytes]) => ({ path: `${directory}/${file}`, sha256: hash(bytes), bytes: bytes.length }));
  const version = hash(json({ schemaVersion: 1, owner: 'nte', sources, projections }));
  const files = new Map([...raw].map(([file, bytes]) => [`data/${file}`, bytes]));
  for (const [file, data] of Object.entries(projections)) files.set(file, Buffer.from(json({ schemaVersion: 1, owner: 'nte', version, data })));
  const manifest = { schemaVersion: 1, owner: 'nte', version, sources,
    files: [...files].map(([file, bytes]) => ({ path: `${contract.prefix}/${file}`, sha256: hash(bytes), bytes: bytes.length })) };
  files.set('manifest.json', Buffer.from(json(manifest)));
  return { contract, manifest, files };
}

export function prepareNteContentAssets(root = ROOT) {
  root = realpathSync(root);
  const result = nteContentAssets(root), assets = join(root, 'apps/game-nte/.open-next/assets');
  assert.equal(realpathSync(assets), assets);
  const target = join(assets, result.contract.prefix.slice(1)); assert(!existsSync(target), 'NTE assets already prepared; rebuild first');
  for (const [file, bytes] of result.files) {
    const output = join(target, file); mkdirSync(dirname(output), { recursive: true });
    assert.equal(realpathSync(dirname(output)), dirname(output)); writeFileSync(output, bytes, { flag: 'wx' });
  }
  return { version: result.manifest.version, files: result.files.size, prefix: result.contract.prefix };
}
