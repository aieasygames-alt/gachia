import { readFile } from 'node:fs/promises';

const characterSource = await readFile(new URL('../packages/data/games/azur-promilia/characters.ts', import.meta.url), 'utf8');
const dataSource = await readFile(new URL('../apps/game-azur-promilia/lib/data.ts', import.meta.url), 'utf8');
const rawCharacters = JSON.parse(await readFile(new URL('../packages/data/games/azur-promilia/raw-characters.json', import.meta.url), 'utf8'));
const characters = rawCharacters.filter((entry) => typeof entry?.id === 'string');
const kiboCount = (dataSource.match(/export const kibo:/)?.length ?? 0) > 0 ? (dataSource.match(/id: '[^']+'/g) ?? []).length : 0;
const guideCount = (dataSource.match(/id: '[^']+'/g) ?? []).length;

const failures = [];
if (!characterSource.includes('checkedAt:') || !characterSource.includes('url:') || !characterSource.includes('sourceType')) failures.push('characters: missing source audit fields');
if (!dataSource.includes('checkedAt:') || !dataSource.includes('version:')) failures.push('content: missing source audit fields');
if (characters.length < 10) failures.push('characters: content floor is below 10 entries');
if (kiboCount < 5) failures.push('kibo: content floor is below 5 entries');
if (guideCount < 3) failures.push('guides: content floor is below 3 reference entries');
if (!dataSource.includes('export const redeemCodes:')) failures.push('redeem codes: collection is missing');
if (!dataSource.includes('sourceStatusLabel')) failures.push('content: source status labels are missing');

if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Azur content audit passed: ${characters.length} characters, ${kiboCount} indexed records, ${guideCount} source records.`);
