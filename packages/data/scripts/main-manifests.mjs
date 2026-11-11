import { readFile } from 'node:fs/promises';
import { characterIds, searchProjection } from './game-public-projections.mjs';

const GAME_IDS = ['genshin', 'starrail', 'wuwa', 'nte', 'zzz', 'hi3', 'guihuan', 'ananta', 'endfield', 'sea', 'roco', 'roco-cn', 'aniimo', 'azur-promilia'];
const SEARCH_GAMES = ['genshin', 'starrail', 'wuwa', 'nte', 'zzz', 'hi3', 'guihuan', 'ananta', 'endfield', 'sea', 'skjh', 'aniimo', 'azur-promilia'];

export async function mainManifests(gamesRoot = new URL('../games/', import.meta.url), { genshinWorkerBase = false } = {}) {
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
    result.set(`search-${locale}.json`, index);
  }
  return result;
}
