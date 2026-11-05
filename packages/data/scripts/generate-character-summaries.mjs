import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const gamesDir = join(__dirname, '../games');

const configs = {
  genshin: {
    pick: (character) => ({
      id: character.id,
      name: character.name,
      nameEn: character.nameEn,
      ...(character.nameJa ? { nameJa: character.nameJa } : {}),
      element: character.element,
      weaponType: character.weaponType,
      rarity: character.rarity,
      ...(character.status ? { status: character.status } : {}),
    }),
  },
  starrail: {
    pick: (character) => ({
      id: character.id,
      name: character.name,
      nameEn: character.nameEn,
      ...(character.nameJa ? { nameJa: character.nameJa } : {}),
      element: character.element,
      path: character.path,
      rarity: character.rarity,
      ...(character.status ? { status: character.status } : {}),
    }),
  },
  nte: {
    pick: (character) => ({
      id: character.id,
      name: character.name,
      nameEn: character.nameEn,
      attribute: character.attribute,
      rank: character.rank,
      roleEn: character.roleEn,
      weaponEn: character.weaponEn,
      tierRank: character.tierRank,
      ...(character.availableAtLaunch === false ? { availableAtLaunch: character.availableAtLaunch } : {}),
      ...(character.status ? { status: character.status } : {}),
    }),
  },
  'roco-cn': {
    pick: (character) => ({
      id: character.id,
      name: character.name,
      nameEn: character.nameEn,
      ...(character.nameJa ? { nameJa: character.nameJa } : {}),
      attribute: character.attribute,
      attributeEn: character.attributeEn,
      rarity: character.rarity,
      ...(character.status ? { status: character.status } : {}),
    }),
  },
};

export function characterSummaries(gameId, characters) {
  if (!Object.hasOwn(configs, gameId) || !Array.isArray(characters)) throw new Error('Unknown character summary source');
  return characters.map(configs[gameId].pick);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const gameId of Object.keys(configs)) {
    const gameDir = join(gamesDir, gameId);
    const sourcePath = join(gameDir, 'raw-characters.json');
    const targetPath = join(gameDir, 'raw-character-summaries.json');
    const characters = JSON.parse(readFileSync(sourcePath, 'utf8'));
    const summaries = characterSummaries(gameId, characters);
    writeFileSync(targetPath, `${JSON.stringify(summaries, null, 2)}\n`);
    console.log(`Generated ${gameId} character summaries (${summaries.length} entries).`);
  }
}
