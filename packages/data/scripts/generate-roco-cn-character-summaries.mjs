import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const gameDir = join(__dirname, '../games/roco-cn');
const sourcePath = join(gameDir, 'raw-characters.json');
const targetPath = join(gameDir, 'raw-character-summaries.json');

const characters = JSON.parse(readFileSync(sourcePath, 'utf8'));
const summaries = characters.map((character) => ({
  id: character.id,
  name: character.name,
  nameEn: character.nameEn,
  ...(character.nameJa ? { nameJa: character.nameJa } : {}),
  attribute: character.attribute,
  attributeEn: character.attributeEn,
  rarity: character.rarity,
  ...(character.status ? { status: character.status } : {}),
}));

writeFileSync(targetPath, `${JSON.stringify(summaries, null, 2)}\n`);
