import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// Node 20 cannot import TypeScript directly; compile the shared, import-free rules in memory.
const rulesPath = new URL('../apps/web/lib/content-freshness.ts', import.meta.url);
const rulesSource = fs.readFileSync(rulesPath, 'utf8');
const { outputText } = ts.transpileModule(rulesSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const {
  scanFreshnessEntryFile,
  scanFreshnessGuides,
  summarizeFreshnessFindings,
} = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

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
  'hi3',
  'azur-promilia',
  'lvmeng',
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
  'apps/web/lib/three-game-status.ts',
  'apps/web/lib/three-game-update-radar.ts',
];

function parseArgs(argv) {
  const args = argv.filter((arg) => arg !== '--');
  const outputIndex = args.findIndex((arg) => arg === '--output' || arg === '-o');

  return {
    json: args.includes('--json'),
    markdown: args.includes('--markdown') || args.includes('--md'),
    failOnRisk: args.includes('--fail-on-risk'),
    output: outputIndex >= 0 ? args[outputIndex + 1] : undefined,
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

  const independentFiles = ['apps/game-lvmeng', 'apps/game-azur-promilia', 'apps/game-genshin', 'apps/game-nte']
    .flatMap((directory) => ['app', 'lib'].flatMap((subdirectory) => {
      const root = path.join(ROOT, directory, subdirectory);
      if (!fs.existsSync(root)) return [];
      return fs.readdirSync(root, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile() && /\.(ts|tsx)$/.test(entry.name))
        .map((entry) => path.relative(ROOT, path.join(entry.parentPath, entry.name)));
    }));

  for (const relativeFile of [...CURRENT_ENTRY_FILES, ...independentFiles]) {
    const file = path.join(ROOT, relativeFile);
    if (!fs.existsSync(file)) continue;
    findings.push(...scanFreshnessEntryFile(relativeFile, fs.readFileSync(file, 'utf8')));
  }

  return findings;
}

function renderTable(findings) {
  const summary = summarizeFreshnessFindings(findings);
  const lines = [`Content freshness audit: ${summary.risk} risks, ${summary.archive} archived matches, ${summary.total} total matches.`];

  const risky = findings.filter((item) => item.severity === 'risk');
  if (risky.length > 0) {
    lines.push('', 'Risks');
    for (const item of risky) {
      const target = item.id ? `${item.gameId}/${item.id}` : item.gameId;
      lines.push(`- [${item.scope}] ${target}: "${item.term}" in ${item.file} -> ${item.currentRoute}`);
    }
  }

  const archived = findings.filter((item) => item.severity === 'archive');
  if (archived.length > 0) {
    lines.push('', 'Archived matches');
    for (const item of archived.slice(0, 40)) {
      lines.push(`- ${item.gameId}/${item.id}: "${item.term}"`);
    }
    if (archived.length > 40) lines.push(`- ... ${archived.length - 40} more archived matches`);
  }

  return `${lines.join('\n')}\n`;
}

function countByGame(findings) {
  return findings.reduce((acc, item) => {
    acc[item.gameId] ??= { risk: 0, archive: 0, total: 0 };
    acc[item.gameId][item.severity] += 1;
    acc[item.gameId].total += 1;
    return acc;
  }, {});
}

function renderMarkdown(report) {
  const { generatedAt, summary, findings } = report;
  const byGame = countByGame(findings);
  const risky = findings.filter((item) => item.severity === 'risk');
  const archived = findings.filter((item) => item.severity === 'archive');
  const lines = [];

  lines.push('# Content Freshness Audit');
  lines.push('');
  lines.push(`Generated: ${generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Risk matches: ${summary.risk}`);
  lines.push(`- Archived matches: ${summary.archive}`);
  lines.push(`- Total matches: ${summary.total}`);
  lines.push('');

  lines.push('## By Game');
  lines.push('');
  lines.push('| Game | Risks | Archives | Total |');
  lines.push('|---|---:|---:|---:|');
  for (const [gameId, counts] of Object.entries(byGame).sort(([left], [right]) => left.localeCompare(right))) {
    lines.push(`| ${gameId} | ${counts.risk} | ${counts.archive} | ${counts.total} |`);
  }
  if (Object.keys(byGame).length === 0) {
    lines.push('| none | 0 | 0 | 0 |');
  }
  lines.push('');

  lines.push('## Action Queue');
  lines.push('');
  if (risky.length === 0) {
    lines.push('- No live-entry stale wording risks found.');
  } else {
    for (const item of risky) {
      const target = item.id ? `${item.gameId}/${item.id}` : item.gameId;
      lines.push(`- [${item.scope}] ${target}: replace "${item.term}" with ${item.currentRoute} context in ${item.file}.`);
    }
  }
  lines.push('');

  lines.push('## Archive Coverage');
  lines.push('');
  if (archived.length === 0) {
    lines.push('- No archived stale-version matches found.');
    return `${lines.join('\n')}\n`;
  }

  for (const item of archived.slice(0, 30)) {
    lines.push(`- ${item.gameId}/${item.id}: "${item.term}" retained as archive.`);
  }
  if (archived.length > 30) {
    lines.push(`- ${archived.length - 30} more archived matches omitted from this short report.`);
  }

  return `${lines.join('\n')}\n`;
}

function writeOrPrint(content, outputPath) {
  if (!outputPath) {
    process.stdout.write(content);
    return;
  }

  const absoluteOutput = path.resolve(ROOT, outputPath);
  fs.mkdirSync(path.dirname(absoluteOutput), { recursive: true });
  fs.writeFileSync(absoluteOutput, content);
  console.log(`Wrote ${path.relative(ROOT, absoluteOutput)}`);
}

const options = parseArgs(process.argv.slice(2));
const findings = [...scanCurrentEntryFiles(), ...scanRawGuides()];
const output = { generatedAt: new Date().toISOString(), summary: summarizeFreshnessFindings(findings), findings };

if (options.json) {
  writeOrPrint(`${JSON.stringify(output, null, 2)}\n`, options.output);
} else if (options.markdown) {
  writeOrPrint(renderMarkdown(output), options.output);
} else {
  writeOrPrint(renderTable(findings), options.output);
}

if (options.failOnRisk && output.summary.risk > 0) {
  process.exitCode = 1;
}
