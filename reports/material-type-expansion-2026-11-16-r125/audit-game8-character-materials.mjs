import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const reportRoot = new URL('./', import.meta.url);
const manifestPath = new URL('./game8-character-fetch.json', reportRoot);
const rawPath = new URL('../../packages/data/games/nte/raw-character-materials.json', import.meta.url);
const materialsPath = new URL('../../packages/data/games/nte/raw-materials.json', import.meta.url);
const raw = JSON.parse(await readFile(rawPath, 'utf8'));
const materials = JSON.parse(await readFile(materialsPath, 'utf8'));
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const materialByName = new Map(materials.map((material) => [material.nameEn, material]));

const decode = (value) => value
  .replace(/&#39;|&#x27;/gi, "'")
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#x2F;|&#47;/gi, '/');

const text = (value) => decode(value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());

function parseCharacterPage(html, characterId, url, sha256) {
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ? text(html.match(/<title>([\s\S]*?)<\/title>/i)[1]) : null;
  const sectionMatch = html.match(/<h2[^>]*>[^<]*Ascension Materials[^<]*<\/h2>([\s\S]*?)(?=<h2\b|$)/i);
  if (!sectionMatch) {
    return { characterId, url, httpStatus: 200, sha256, title, kind: 'not-character-materials', stageCount: 0, stages: [] };
  }
  const section = sectionMatch?.[1] ?? '';
  const stages = [];
  const rowPattern = /<tr[^>]*>[\s\S]*?<th[^>]*>([\s\S]*?)<\/th>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi;
  for (const match of section.matchAll(rowPattern)) {
    const stage = text(match[1]);
    if (!/^Lv\.\s*\d+\s*(?:→|->)\s*Lv?\.?\s*\d+$/i.test(stage)) continue;
    const materials = [];
    const materialPattern = /<div[^>]*class=['"][^'"]*align[^'"]*['"][^>]*>[\s\S]*?<a[^>]*>[\s\S]*?<\/a>\s*[×x]\s*([\d,]+)/gi;
    for (const materialMatch of match[2].matchAll(materialPattern)) {
      const anchor = materialMatch[0].match(/<a[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? '';
      const materialName = text(anchor.replace(/<img[^>]*>/gi, ' '));
      if (!materialName) continue;
      materials.push({ name: materialName, quantity: Number(materialMatch[1].replace(/,/g, '')) });
    }
    stages.push({ stage, materials });
  }
  return { characterId, url, httpStatus: 200, sha256, title, kind: 'character-materials', stageCount: stages.length, stages };
}

const pages = [];
for (const entry of manifest.fetched) {
  const html = await readFile(new URL(`./${entry.htmlPath}`, reportRoot), 'utf8');
  const sha256 = createHash('sha256').update(html).digest('hex');
  if (sha256 !== entry.sha256) throw new Error(`SHA256 changed for ${entry.characterId}`);
  pages.push(parseCharacterPage(html, entry.characterId, entry.url, sha256));
}

const normalizeStage = (stage) => stage.replace(/\s+/g, '').replace(/Lv\.?/gi, '').replace('→', '-');
const rawStageRows = (entry) => entry?.levelingMaterials?.map((row) => ({
  stage: row.levelRange,
  materials: row.materials.map(({ id, quantity }) => ({ id, quantity })),
})) ?? [];

const comparisons = raw.map((entry) => {
  const page = pages.find((candidate) => candidate.characterId === entry.characterId) ?? null;
  const rawStages = rawStageRows(entry);
  if (!page || page.kind !== 'character-materials') {
    return {
      characterId: entry.characterId,
      status: page?.kind === 'not-character-materials' ? 'wrong-page' : 'page-unavailable',
      page: page ? { url: page.url, title: page.title, sha256: page.sha256 } : undefined,
      rawStageCount: rawStages.length,
      rawSkillMaterials: entry.skillMaterials,
      differences: [page ? 'The captured Game8 URL is not a character ascension-material page.' : 'No matching Game8 character archive was present in the captured material index.'],
    };
  }
  const stageCountMismatch = page.stageCount !== rawStages.length;
  const stageLabelsMismatch = page.stages.map((stage) => normalizeStage(stage.stage)).join('|') !== rawStages.map((stage) => stage.stage).join('|');
  const observedStageNames = page.stages.flatMap((stage) => stage.materials.map((material) => material.name));
  const rawIds = [...new Set(rawStages.flatMap((stage) => stage.materials.map((material) => material.id)))];
  return {
    characterId: entry.characterId,
    status: 'page-observed',
    page: {
      url: page.url,
      title: page.title,
      sha256: page.sha256,
      stageCount: page.stageCount,
      stages: page.stages,
    },
    raw: {
      stageCount: rawStages.length,
      stages: rawStages,
      skillMaterials: entry.skillMaterials,
    },
    differences: [
      ...(stageCountMismatch ? [`Stage count differs: raw ${rawStages.length}, Game8 ${page.stageCount}.`] : []),
      ...(stageLabelsMismatch ? [`Level stages differ: raw ${rawStages.map((stage) => stage.stage).join(', ')}, Game8 ${page.stages.map((stage) => stage.stage).join(', ')}.`] : []),
      'Game8 material names are display names with no safe one-to-one ID mapping to the current raw IDs.',
      'Game8 character pages expose level-up stages but do not provide the raw skillMaterials field in the captured ascension table.',
    ],
    observedMaterialNames: [...new Set(observedStageNames)],
    observedMaterialCandidates: [...new Set(observedStageNames)].map((name) => {
      const material = materialByName.get(name);
      return material ? { observedName: name, candidateId: material.id, type: material.type, rarity: material.rarity, approvedTarget: null } : { observedName: name, candidateId: null, approvedTarget: null };
    }),
    rawMaterialIds: rawIds,
    normalizedGame8Stages: page.stages.map((stage) => normalizeStage(stage.stage)),
  };
});

const observedNames = [...new Set(pages.flatMap((page) => page.stages.flatMap((stage) => stage.materials.map((material) => material.name))))];
const observedMaterialCandidates = observedNames.map((name) => {
  const material = materialByName.get(name);
  return material ? { observedName: name, candidateId: material.id, type: material.type, rarity: material.rarity, approvedTarget: null } : { observedName: name, candidateId: null, approvedTarget: null };
});
const report = {
  version: 'game8-character-material-audit-v1',
  generatedAt: new Date().toISOString(),
  source: {
    index: manifest.sourceIndex,
    pageCount: pages.length,
    pageSHA256Verified: true,
    thirdParty: true,
  },
  coverage: {
    rawCharacterCount: raw.length,
    pagesObserved: pages.length,
    pagesUnavailable: comparisons.filter((entry) => entry.status === 'page-unavailable').map((entry) => entry.characterId),
    wrongPageURLs: comparisons.filter((entry) => entry.status === 'wrong-page').map((entry) => entry.characterId),
    validCharacterMaterialPages: pages.filter((page) => page.kind === 'character-materials').length,
    pagesWithStageCountMismatch: comparisons.filter((entry) => entry.status === 'page-observed' && entry.differences.some((difference) => difference.startsWith('Stage count differs'))).map((entry) => entry.characterId),
    pagesWithStageLabelMismatch: comparisons.filter((entry) => entry.status === 'page-observed' && entry.differences.some((difference) => difference.startsWith('Level stages differ'))).map((entry) => entry.characterId),
    observedMaterialNameCount: observedNames.length,
    observedNamesWithExactRawMaterialMatch: observedMaterialCandidates.filter((candidate) => candidate.candidateId).length,
  },
  observedMaterialCandidates,
  comparisons,
  decision: {
    authoritySufficient: false,
    sourceBoundPlanGenerated: false,
    rawMutationAllowed: false,
    cmsWrites: false,
    cloudWrites: false,
    conclusion: 'The captured Game8 character pages show six Lv.20→Lv.80 progression rows and public names such as Fading Silhouette, A Page from Delusion\'s Shore, Blurred Silhouette, Chaos Silhouette, and Beetle Coin. The current raw relation uses 1-10…51-60 labels, different placeholder IDs, and skillMaterials not represented in these pages. Four raw characters have no matching archive in the captured index, and the Taygedo URL is a boss guide rather than a material page. These observations prove consumer drift and require authoritative/client evidence; they do not authorize ID or quantity edits.',
  },
};
await writeFile(new URL('./game8-character-material-audit.json', reportRoot), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ output: new URL('./game8-character-material-audit.json', reportRoot).pathname, pagesObserved: pages.length, pagesUnavailable: report.coverage.pagesUnavailable, stageMismatches: report.coverage.pagesWithStageCountMismatch }, null, 2));
