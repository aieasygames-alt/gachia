import { readFile } from 'node:fs/promises';
import { characterIds, searchProjection } from './game-public-projections.mjs';

const GAME_IDS = ['genshin', 'starrail', 'wuwa', 'nte', 'zzz', 'hi3', 'guihuan', 'ananta', 'endfield', 'sea', 'roco', 'roco-cn', 'aniimo', 'azur-promilia'];
const SEARCH_GAMES = ['genshin', 'starrail', 'wuwa', 'nte', 'zzz', 'hi3', 'guihuan', 'ananta', 'endfield', 'sea', 'skjh', 'aniimo', 'azur-promilia'];
export const LEGACY_MAIN_SEARCH = 'main-search-v1';
export const MATERIAL_MAIN_SEARCH = 'main-search-roco-cn-materials-v2';

// Frozen workspaces select their own contract. Old releases have no selector and
// retain v1; a new generator must never reinterpret their recorded search JSON.
async function readManifestOptions(file) {
  let contract;
  try {
    contract = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return { searchContract: LEGACY_MAIN_SEARCH };
    throw error;
  }
  if (Object.keys(contract).join(',') !== 'searchContract' || ![LEGACY_MAIN_SEARCH, MATERIAL_MAIN_SEARCH].includes(contract.searchContract)) {
    throw new Error('Unknown Main manifest contract');
  }
  return contract;
}

export function mainManifestOptions(gamesRoot = new URL('../games/', import.meta.url)) {
  return readManifestOptions(new URL('../main-manifest-contract.json', gamesRoot));
}

// An independent game release inherits the deployed Main's search shape, even
// when its newer source workspace can build a future Main migration.
export function publishedMainManifestOptions(artifactRoot) {
  return readManifestOptions(new URL('assets/data-manifest/main-contract.json', artifactRoot));
}

export async function mainManifests(gamesRoot = new URL('../games/', import.meta.url), { genshinWorkerBase = false, searchContract = LEGACY_MAIN_SEARCH } = {}) {
  if (![LEGACY_MAIN_SEARCH, MATERIAL_MAIN_SEARCH].includes(searchContract)) throw new Error('Unknown Main search contract');
  const included = game => !(genshinWorkerBase && game === 'genshin');
  const manifest = { version: 1, games: {} };
  for (const game of GAME_IDS.filter(included)) {
    let raw;
    for (const file of ['raw-character-summaries.json', 'raw-characters.json']) {
      try {
        raw = JSON.parse(await readFile(new URL(`${game}/${file}`, gamesRoot), 'utf8'));
        break;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    if (!raw) throw new Error(`No character data found for ${game}`);
    manifest.games[game] = { characters: characterIds(raw) };
  }
  const result = new Map([['games.json', manifest]]);
  for (const locale of ['zh', 'en', 'ja']) {
    const index = {};
    for (const game of SEARCH_GAMES.filter(included)) {
      const data = {};
      const categories = [
        ['characters', 'raw-characters.json'],
        ['weapons', game === 'starrail' ? 'raw-light-cones.json' : 'raw-weapons.json'],
        ['items', 'raw-materials.json'],
        ['artifacts', game === 'genshin' ? 'raw-artifacts.json' : game === 'starrail' ? 'raw-relics.json' : game === 'wuwa' ? 'raw-echoes.json' : game === 'nte' ? 'raw-disk-sets.json' : ''],
      ];
      for (const [category, file] of categories) {
        if (!file) continue;
        try {
          const raw = JSON.parse(await readFile(new URL(`${game}/${file}`, gamesRoot), 'utf8'));
          if (Array.isArray(raw)) data[category] = searchProjection(raw, locale);
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
        }
      }
      if (Object.keys(data).length) index[game] = data;
    }
    if (searchContract === MATERIAL_MAIN_SEARCH) {
      // CN materials are a separate scope. Do not expose withdrawn global Roco
      // content or implicitly qualify other CN entity types in this migration.
      const materials = JSON.parse(await readFile(new URL('roco-cn/raw-materials.json', gamesRoot), 'utf8'));
      if (!Array.isArray(materials)) throw new Error('Invalid roco-cn material search source');
      index['roco-cn'] = { items: searchProjection(materials, locale) };
    }
    result.set(`search-${locale}.json`, index);
  }
  return result;
}
