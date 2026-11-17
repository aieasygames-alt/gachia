import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const reportRoot = new URL('./', import.meta.url);
const evidenceRoot = new URL('./source-evidence/', import.meta.url);
const indexPath = new URL('./source-evidence/game8-material.html', import.meta.url);

const characterURLs = {
  nanally: 'https://game8.co/games/Neverness-to-Everness/archives/596559',
  sakiri: 'https://game8.co/games/Neverness-to-Everness/archives/596592',
  fadia: 'https://game8.co/games/Neverness-to-Everness/archives/596595',
  lacrimosa: 'https://game8.co/games/Neverness-to-Everness/archives/598465',
  baicang: 'https://game8.co/games/Neverness-to-Everness/archives/596591',
  zero: 'https://game8.co/games/Neverness-to-Everness/archives/596585',
  hotori: 'https://game8.co/games/Neverness-to-Everness/archives/596586',
  daffodil: 'https://game8.co/games/Neverness-to-Everness/archives/596590',
  jiuyuan: 'https://game8.co/games/Neverness-to-Everness/archives/596594',
  haniel: 'https://game8.co/games/Neverness-to-Everness/archives/596596',
  adler: 'https://game8.co/games/Neverness-to-Everness/archives/596593',
  skia: 'https://game8.co/games/Neverness-to-Everness/archives/596598',
  edgar: 'https://game8.co/games/Neverness-to-Everness/archives/596589',
  mint: 'https://game8.co/games/Neverness-to-Everness/archives/596587',
  taygedo: 'https://game8.co/games/Neverness-to-Everness/archives/598031',
  hathor: 'https://game8.co/games/Neverness-to-Everness/archives/596597',
  chiz: 'https://game8.co/games/Neverness-to-Everness/archives/596588',
};

const raw = JSON.parse(await readFile(new URL('../../packages/data/games/nte/raw-character-materials.json', import.meta.url), 'utf8'));
const indexHTML = await readFile(indexPath, 'utf8');
const indexSHA256 = createHash('sha256').update(indexHTML).digest('hex');
const characterIds = raw.map((entry) => entry.characterId);
const missingFromIndex = characterIds.filter((id) => !characterURLs[id]);

await mkdir(evidenceRoot, { recursive: true });

const fetchOne = async ([characterId, url]) => {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'gachia-r125-source-audit/1.0 (+https://gachia.com)',
      accept: 'text/html,application/xhtml+xml',
    },
  });
  const body = await response.text();
  const headers = [...response.headers.entries()].map(([name, value]) => `${name}: ${value}`).join('\n') + '\n';
  const htmlPath = `source-evidence/game8-character-${characterId}.html`;
  const headersPath = `source-evidence/game8-character-${characterId}-headers.txt`;
  await writeFile(new URL(`./${htmlPath}`, reportRoot), body);
  await writeFile(new URL(`./${headersPath}`, reportRoot), headers);
  return {
    characterId,
    url,
    httpStatus: response.status,
    htmlPath,
    headersPath,
    bytes: Buffer.byteLength(body),
    sha256: createHash('sha256').update(body).digest('hex'),
  };
};

const fetched = [];
for (const batch of Object.entries(characterURLs).reduce((groups, entry, index) => {
  (groups[Math.floor(index / 4)] ??= []).push(entry);
  return groups;
}, [])) {
  fetched.push(...await Promise.all(batch.map(fetchOne)));
}

const manifest = {
  version: 'game8-character-material-fetch-v1',
  generatedAt: new Date().toISOString(),
  sourceIndex: {
    url: 'https://game8.co/games/Neverness-to-Everness/archives/598408',
    localFile: 'source-evidence/game8-material.html',
    sha256: indexSHA256,
  },
  rawCharacterIds: characterIds,
  fetched,
  missingFromIndex: missingFromIndex.map((characterId) => ({ characterId, reason: 'No character archive URL in the captured Game8 material index.' })),
  decision: {
    authoritySufficient: false,
    sourceBoundPlanGenerated: false,
    conclusion: 'Game8 character pages are third-party consumer observations. They are retained for stage, quantity, and terminology comparison only; they do not approve raw relation edits.',
  },
};
await writeFile(new URL('./game8-character-fetch.json', reportRoot), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ fetched: fetched.length, missingFromIndex: missingFromIndex.length, output: join(new URL('.', reportRoot).pathname, 'game8-character-fetch.json') }, null, 2));
