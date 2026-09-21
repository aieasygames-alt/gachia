import fs from 'node:fs';
import path from 'node:path';
import {
  scanFreshnessEntryFile,
  scanFreshnessGuides,
  summarizeFreshnessFindings,
} from '../apps/web/lib/content-freshness.ts';

const ROOT = process.cwd();
const DATA_ROOT = path.join(ROOT, 'apps/web/public/data');

const GAME_IDS = [
  'genshin',
  'starrail',
  'wuwa',
  'nte',
  'zzz',
  'guihuan',
  'ananta',
  'endfield',
  'sea',
  'skjh',
  'roco',
  'roco-cn',
  'aniimo',
];

const CURRENT_ENTRY_FILES = [
  'apps/web/app/[lang]/[game]/page.tsx',
  'apps/web/app/[lang]/[game]/version/page.tsx',
  'apps/web/app/[lang]/[game]/download/page.tsx',
  'apps/web/app/[lang]/calendar/calendar-client.tsx',
  'apps/web/app/llms.txt/route.ts',
  'apps/web/lib/live-content.ts',
  'apps/web/lib/version-snapshots.ts',
  'apps/web/lib/market-intel.ts',
  'apps/web/lib/banner-intent.ts',
];

function parseArgs(argv) {
  const args = argv.filter((arg) => arg !== '--');
  return {
    json: args.includes('--json'),
    failOnRisk: args.includes('--fail-on-risk'),
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function scanRawGuides() {
  const findings = [];

  for (const gameId of GAME_IDS) {
    const file = path.join(DATA_ROOT, gameId, 'raw-guides.json');
    if (!fs.existsSync(file)) continue;

    findings.push(...scanFreshnessGuides(gameId, readJson(file), path.relative(ROOT, file)));
  }

  return findings;
}

function scanCurrentEntryFiles() {
  const findings = [];

  for (const relativeFile of CURRENT_ENTRY_FILES) {
    const file = path.join(ROOT, relativeFile);
    if (!fs.existsSync(file)) continue;
    findings.push(...scanFreshnessEntryFile(relativeFile, fs.readFileSync(file, 'utf8')));
  }

  return findings;
}

function printTable(findings) {
  const summary = summarizeFreshnessFindings(findings);
  console.log(`Content freshness audit: ${summary.risk} risks, ${summary.archive} archived matches, ${summary.total} total matches.`);

  const risky = findings.filter((item) => item.severity === 'risk');
  if (risky.length > 0) {
    console.log('\nRisks');
    for (const item of risky) {
      const target = item.id ? `${item.gameId}/${item.id}` : item.gameId;
      console.log(`- [${item.scope}] ${target}: "${item.term}" in ${item.file} -> ${item.currentRoute}`);
    }
  }

  const archived = findings.filter((item) => item.severity === 'archive');
  if (archived.length > 0) {
    console.log('\nArchived matches');
    for (const item of archived.slice(0, 40)) {
      console.log(`- ${item.gameId}/${item.id}: "${item.term}"`);
    }
    if (archived.length > 40) console.log(`- ... ${archived.length - 40} more archived matches`);
  }
}

const options = parseArgs(process.argv.slice(2));
const findings = [...scanCurrentEntryFiles(), ...scanRawGuides()];
const output = { generatedAt: new Date().toISOString(), summary: summarizeFreshnessFindings(findings), findings };

if (options.json) {
  console.log(JSON.stringify(output, null, 2));
} else {
  printTable(findings);
}

if (options.failOnRisk && output.summary.risk > 0) {
  process.exitCode = 1;
}
