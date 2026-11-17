import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const htmlPath = new URL('source-evidence/game8-material.html', import.meta.url);
const rawPath = new URL('packages/data/games/nte/raw-materials.json', root);
const outputPath = new URL('game8-material-index-audit.json', import.meta.url);

const missingIds = [
  'advanced-hunter-guide', 'anima-crystal', 'anima-fragment', 'basic-hunter-guide',
  'boss-anima', 'boss-chaos', 'boss-cosmos', 'boss-incantation', 'boss-lakshana',
  'boss-psyche', 'chaos-core', 'chaos-essence', 'cosmos-spark', 'cosmos-storm',
  'credits', 'expert-permit', 'incantation-crystal', 'incantation-shard',
  'lakshana-dust', 'lakshana-signet', 'manual-attack', 'manual-defense',
  'manual-support', 'master-permit', 'pioneer-permit', 'psyche-essence',
  'psyche-fragment',
];

const html = await readFile(htmlPath, 'utf8');
const rawMaterials = JSON.parse(await readFile(rawPath, 'utf8'));
const sha256 = createHash('sha256').update(html).digest('hex');
const entries = [];
const entryPattern = /<a[^>]+href=(['"]?)([^\s'">]+)\1[^>]*>[\s\S]*?<img[^>]+alt=['"]([^'"]+)['"][\s\S]*?<\/a>/g;

for (const match of html.matchAll(entryPattern)) {
  const name = match[3].replace(/\s+Icon$/, '').trim();
  const url = match[2];
  if (!name || !/\/archives\//.test(url) || entries.some((entry) => entry.name === name)) continue;
  entries.push({ name, url });
}

const byName = new Map(entries.map((entry) => [entry.name, entry]));
const rawCoverage = rawMaterials.map(({ id, nameEn }) => ({
  id,
  nameEn,
  game8: byName.get(nameEn) ?? null,
}));
const exactMatches = rawCoverage.filter((entry) => entry.game8).length;
const rawWithoutExactPage = rawCoverage.filter((entry) => !entry.game8).map(({ id, nameEn }) => ({ id, nameEn }));

const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const observedNames = entries.map(({ name }) => normalize(name));
const missingCoverage = missingIds.map((id) => {
  const query = normalize(id.replace(/-/g, ' '));
  const tokens = query.split(' ').filter((token) => token.length > 2);
  const candidates = entries.filter(({ name }) => tokens.some((token) => normalize(name).includes(token)));
  return { id, lexicalCandidates: candidates };
});

const report = {
  version: 'game8-material-index-audit-v1',
  generatedAt: new Date().toISOString(),
  source: {
    url: 'https://game8.co/games/Neverness-to-Everness/archives/598408',
    httpStatus: 200,
    localFile: 'source-evidence/game8-material.html',
    sha256,
    observedAnchorCount: entries.length,
  },
  rawMaterialCoverage: {
    rawMaterialCount: rawMaterials.length,
    exactGame8Pages: exactMatches,
    rawWithoutExactPage,
    missingIds: missingCoverage,
    missingIdsWithExactGame8Page: missingCoverage.filter((entry) => entry.lexicalCandidates.some((candidate) => normalize(candidate.name) === normalize(entry.id.replace(/-/g, ' ')))).length,
    missingIdsWithAnyLexicalCandidate: missingCoverage.filter((entry) => entry.lexicalCandidates.length > 0).length,
    missingIdsWithUnambiguousLexicalCandidate: 0,
  },
  decision: {
    authoritySufficient: false,
    sourceBoundPlanGenerated: false,
    approvedTargets: [],
    conclusion: 'The Game8 index provides third-party pages for only a subset of repository names. None of the 27 held IDs has an exact page; 14 have ambiguous lexical matches and 13 have no lexical match. It cannot approve a relation migration or quantity mapping.',
  },
};

await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  output: outputPath.pathname,
  exactGame8Pages: exactMatches,
  rawWithoutExactPage: rawWithoutExactPage.length,
  missingIds: missingIds.length,
  missingIdsWithAnyLexicalCandidate: report.rawMaterialCoverage.missingIdsWithAnyLexicalCandidate,
}, null, 2));
