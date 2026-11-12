import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { writeSeaGuideOutputs } from './sea-guide-contract.mjs';
import { writeRawMirrors } from './raw-mirror-contract.mjs';
import { verifyRawInventory } from './raw-inventory-contract.mjs';
import { tierListProjection } from './game-public-projections.mjs';
import { mainManifests } from './main-manifests.mjs';
import { genshinContentAssets } from '../../../scripts/genshin-content-assets.mjs';
import { nteContentAssets } from '../../../scripts/nte-content-assets.mjs';

const gamesRoot = new URL('../games/', import.meta.url);
const outputRoot = new URL('../../../apps/web/public/data-manifest/', import.meta.url);
const clientDataRoot = new URL('../../../apps/web/public/data-client/', import.meta.url);

// Inspect committed content before any generation can conceal a new drift.
await verifyRawInventory();
await writeRawMirrors();
await mkdir(outputRoot, { recursive: true });
await mkdir(clientDataRoot, { recursive: true });
const manifests = await mainManifests(gamesRoot);
for (const [file, value] of manifests) await writeFile(new URL(file, outputRoot), `${JSON.stringify(value)}\n`);
await writeFile(new URL('genshin-platform.json', clientDataRoot), genshinContentAssets().files.get('platform.json'));
await writeFile(new URL('nte-platform.json', clientDataRoot), nteContentAssets().files.get('platform.json'));

const tierListFields = {
  genshin: ['element', 'weaponType'],
  starrail: ['element', 'path'],
  wuwa: ['element', 'weaponType'],
};
for (const [game, fields] of Object.entries(tierListFields)) {
  const raw = JSON.parse(await readFile(new URL(`${game}/raw-characters.json`, gamesRoot), 'utf8'));
  const data = tierListProjection(raw, game, fields);
  await writeFile(new URL(`tier-list-${game}.json`, clientDataRoot), `${JSON.stringify(data)}\n`);
}

const rocoCnCharacters = JSON.parse(await readFile(new URL('roco-cn/raw-characters.json', gamesRoot), 'utf8'))
  .filter((entry) => entry?.status !== 'upcoming' && typeof entry?.id === 'string');
const rocoCnRoot = new URL('../../../apps/web/public/data-client/roco-cn/characters/', import.meta.url);
await mkdir(rocoCnRoot, { recursive: true });
for (const character of rocoCnCharacters) {
  await writeFile(new URL(`${character.id}.json`, rocoCnRoot), `${JSON.stringify(character)}\n`);
}
await writeFile(new URL('roco-cn/characters.json', clientDataRoot), `${JSON.stringify(rocoCnCharacters.map(({ id, number, name, nameEn, nameJa, attribute, attributeEn, rarity, status }) => ({ id, number, name, nameEn, nameJa, attribute, attributeEn, rarity, status })))}\n`);

await writeSeaGuideOutputs();
console.log(`Generated ${Object.keys(manifests.get('games.json').games).length} game manifests.`);
