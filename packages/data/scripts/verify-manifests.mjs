import { readFile } from 'node:fs/promises';

const outputRoot = new URL('../../../apps/web/public/data-manifest/', import.meta.url);
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
if (games?.version !== 1 || Object.keys(games.games ?? {}).length !== 12) {
  throw new Error('games.json does not contain the expected version 1 game manifest');
}

for (const locale of ['zh', 'en', 'ja']) {
  const index = documents.get(`search-${locale}.json`);
  const entries = Object.values(index).flatMap((game) => Object.values(game)).flat().length;
  if (entries === 0) throw new Error(`search-${locale}.json contains no searchable entries`);
}

console.log('Data manifests verified.');
