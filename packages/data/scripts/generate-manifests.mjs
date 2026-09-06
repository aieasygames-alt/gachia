import { readFile, mkdir, writeFile } from 'node:fs/promises';

const gamesRoot = new URL('../games/', import.meta.url);
const outputRoot = new URL('../../../apps/web/public/data-manifest/', import.meta.url);
const clientDataRoot = new URL('../../../apps/web/public/data-client/', import.meta.url);

const gameIds = ['genshin', 'starrail', 'wuwa', 'nte', 'zzz', 'guihuan', 'ananta', 'endfield', 'sea', 'roco', 'roco-cn', 'aniimo'];
const searchGames = ['genshin', 'starrail', 'wuwa', 'nte', 'zzz', 'guihuan', 'ananta', 'endfield', 'sea', 'skjh', 'aniimo'];

function idsFromJson(value) {
  if (!Array.isArray(value)) throw new Error('Expected an array');
  return value.flatMap((entry) => typeof entry?.id === 'string' ? [entry.id] : []);
}

await mkdir(outputRoot, { recursive: true });
await mkdir(clientDataRoot, { recursive: true });
const manifest = { version: 1, games: {} };

for (const game of gameIds) {
  const files = ['raw-character-summaries.json', 'raw-characters.json'];
  let raw;
  for (const file of files) {
    try {
      raw = JSON.parse(await readFile(new URL(`${game}/${file}`, gamesRoot), 'utf8'));
      break;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  if (!raw) throw new Error(`No character data found for ${game}`);
  manifest.games[game] ??= {};
  manifest.games[game].characters = idsFromJson(raw);
}

await writeFile(new URL('games.json', outputRoot), `${JSON.stringify(manifest)}\n`);

const locales = ['zh', 'en', 'ja'];
for (const locale of locales) {
  const index = {};
  for (const game of searchGames) {
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
        if (!Array.isArray(raw)) continue;
        data[category] = raw.flatMap((entry) => {
          if (typeof entry?.id !== 'string') return [];
          const name = locale === 'zh' ? entry.name : locale === 'ja' ? (entry.nameJa ?? entry.nameEn ?? entry.name) : (entry.nameEn ?? entry.name);
          const nameAlt = locale === 'zh' ? (entry.nameEn ?? '') : entry.name;
          return typeof name === 'string' ? [{ id: entry.id, name, nameAlt }] : [];
        });
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    if (Object.keys(data).length) index[game] = data;
  }
  await writeFile(new URL(`search-${locale}.json`, outputRoot), `${JSON.stringify(index)}\n`);
}

const tierListFields = {
  genshin: ['element', 'weaponType'],
  starrail: ['element', 'path'],
  wuwa: ['element', 'weaponType'],
};
for (const [game, fields] of Object.entries(tierListFields)) {
  const raw = JSON.parse(await readFile(new URL(`${game}/raw-characters.json`, gamesRoot), 'utf8'));
  const data = raw
    .filter((entry) => entry?.status !== 'upcoming' && typeof entry?.id === 'string')
    .map((entry) => {
      const result = {
        id: entry.id,
        name: entry.name,
        nameEn: entry.nameEn,
        nameJa: entry.nameJa,
        image: entry.image || `/images/${game}/characters/${entry.id}.webp`,
        rarity: entry.rarity,
        tierRank: entry.tierRank,
      };
      for (const field of fields) result[field] = entry[field];
      if (game === 'wuwa') result.tierReason = entry.tierReason;
      return result;
    });
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

for (const game of ['sea']) {
  await mkdir(new URL(`${game}/`, clientDataRoot), { recursive: true });
  const raw = JSON.parse(await readFile(new URL(`${game}/raw-guides.json`, gamesRoot), 'utf8'));
  const summaries = raw.map(({ content: _content, contentEn: _contentEn, contentJa: _contentJa, faq: _faq, ...summary }) => summary);
  await writeFile(new URL(`${game}/guides.json`, clientDataRoot), `${JSON.stringify(summaries)}\n`);
  const detailsRoot = new URL(`${game}/guides/`, clientDataRoot);
  await mkdir(detailsRoot, { recursive: true });
  for (const guide of raw) {
    await writeFile(new URL(`${guide.id}.json`, detailsRoot), `${JSON.stringify(guide)}\n`);
  }
}
console.log(`Generated ${Object.keys(manifest.games).length} game manifests.`);
