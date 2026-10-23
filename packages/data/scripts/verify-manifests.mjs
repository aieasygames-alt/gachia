import { readFile } from 'node:fs/promises';
import { verifySeaGuideContract } from './sea-guide-contract.mjs';
import { verifyRawMirrors } from './raw-mirror-contract.mjs';

await verifySeaGuideContract();
await verifyRawMirrors();

const outputRoot = new URL('../../../apps/web/public/data-manifest/', import.meta.url);
const clientDataRoot = new URL('../../../apps/web/public/data-client/', import.meta.url);
const files = ['games.json', 'search-zh.json', 'search-en.json', 'search-ja.json'];
const documents = new Map();

for (const file of files) {
  try {
    documents.set(file, JSON.parse(await readFile(new URL(file, outputRoot), 'utf8')));
  } catch (error) {
    throw new Error(`Invalid or missing data manifest ${file}: ${error.message}`);
  }
}

const games = documents.get('games.json');
if (games?.version !== 1 || Object.keys(games.games ?? {}).length !== 14) {
  throw new Error('games.json does not contain the expected version 1 game manifest');
}

for (const locale of ['zh', 'en', 'ja']) {
  const index = documents.get(`search-${locale}.json`);
  const entries = Object.values(index).flatMap((game) => Object.values(game)).flat().length;
  if (entries === 0) throw new Error(`search-${locale}.json contains no searchable entries`);
}

for (const game of ['genshin', 'starrail', 'wuwa']) {
  let entries;
  try {
    entries = JSON.parse(await readFile(new URL(`tier-list-${game}.json`, clientDataRoot), 'utf8'));
  } catch (error) {
    throw new Error(`Invalid or missing tier list client data for ${game}: ${error.message}`);
  }
  if (!Array.isArray(entries) || entries.length === 0 || entries.some((entry) => typeof entry.id !== 'string')) {
    throw new Error(`tier-list-${game}.json contains invalid entries`);
  }
}
let rocoCnIndex;
try {
  rocoCnIndex = JSON.parse(await readFile(new URL('roco-cn/characters.json', clientDataRoot), 'utf8'));
} catch (error) {
  throw new Error(`Invalid or missing roco-cn character index: ${error.message}`);
}
if (!Array.isArray(rocoCnIndex) || rocoCnIndex.length === 0) throw new Error('roco-cn character index is empty');
for (const entry of rocoCnIndex) {
  if (typeof entry.id !== 'string') throw new Error('roco-cn character index contains an invalid id');
  try {
    JSON.parse(await readFile(new URL(`roco-cn/characters/${entry.id}.json`, clientDataRoot), 'utf8'));
  } catch (error) {
    throw new Error(`Missing roco-cn character payload ${entry.id}: ${error.message}`);
  }
}
try {
  const seaGuides = JSON.parse(await readFile(new URL('sea/guides.json', clientDataRoot), 'utf8'));
  if (!Array.isArray(seaGuides) || seaGuides.length === 0 || seaGuides.some((guide) => typeof guide.id !== 'string')) {
    throw new Error('sea guide index is empty or invalid');
  }
} catch (error) {
  throw new Error(`Invalid or missing sea guide index: ${error.message}`);
}
for (const guide of JSON.parse(await readFile(new URL('sea/guides.json', clientDataRoot), 'utf8'))) {
  try {
    const detail = JSON.parse(await readFile(new URL(`sea/guides/${guide.id}.json`, clientDataRoot), 'utf8'));
    if (detail.id !== guide.id || typeof detail.content !== 'string') throw new Error('invalid detail');
  } catch (error) {
    throw new Error(`Missing sea guide detail ${guide.id}: ${error.message}`);
  }
}

console.log('Data manifests verified.');
