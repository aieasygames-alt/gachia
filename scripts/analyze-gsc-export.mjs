import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_MIN_IMPRESSIONS = 100;
const DEFAULT_OUTPUT_DIR = 'reports';

function usage() {
  console.log(`Usage:
  pnpm gsc:report -- /path/to/gsc-export
  pnpm gsc:report -- /path/to/gsc-export --min-impressions 250 --out reports/gsc-latest.md`);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    inputDir: args.find((arg) => !arg.startsWith('--')),
    minImpressions: DEFAULT_MIN_IMPRESSIONS,
    out: '',
  };

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--help' || args[i] === '-h') {
      usage();
      process.exit(0);
    }
    if (args[i] === '--min-impressions') {
      options.minImpressions = Number(args[i + 1]);
      i += 1;
    }
    if (args[i] === '--out') {
      options.out = args[i + 1] ?? '';
      i += 1;
    }
  }

  if (!options.inputDir) throw new Error('Missing GSC export directory.');
  if (!Number.isFinite(options.minImpressions) || options.minImpressions < 0) {
    throw new Error('--min-impressions must be a positive number.');
  }

  return options;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }
    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  if (cell || row.length > 0) {
    row.push(cell);
    if (row.some((value) => value.trim() !== '')) rows.push(row);
  }

  const [headers = [], ...body] = rows;
  return body.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}

function readCsv(inputDir, name) {
  const filePath = path.join(inputDir, name);
  if (!fs.existsSync(filePath)) return [];
  return parseCsv(fs.readFileSync(filePath, 'utf8'));
}

function numberValue(value) {
  const clean = String(value ?? '').replace('%', '').replaceAll(',', '').trim();
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : 0;
}

function percentValue(value) {
  return numberValue(value) / 100;
}

function formatPercent(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatNumber(value) {
  return Math.round(value).toLocaleString('en-US');
}

function metricRow(row, dimensionName) {
  const impressions = numberValue(row.Impressions);
  const clicks = numberValue(row.Clicks);
  const ctr = row.CTR ? percentValue(row.CTR) : impressions > 0 ? clicks / impressions : 0;
  const position = numberValue(row.Position);

  return {
    name: row[dimensionName] ?? '',
    clicks,
    impressions,
    ctr,
    position,
    potentialClicks: impressions * Math.max(0, 0.03 - ctr),
  };
}

function sortByOpportunity(a, b) {
  return b.potentialClicks - a.potentialClicks || b.impressions - a.impressions;
}

function markdownTable(headers, rows) {
  if (rows.length === 0) return '_No matching rows._';
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function groupByGame(rows) {
  const counts = new Map();
  for (const row of rows) {
    const match = row.name.match(/gachia\.com\/(?:zh|en|ja)\/([^/?#]+)/);
    if (!match) continue;
    const game = match[1];
    counts.set(game, (counts.get(game) ?? 0) + row.impressions);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
}

function buildReport({ inputDir, minImpressions }) {
  const queries = readCsv(inputDir, 'Queries.csv').map((row) => metricRow(row, 'Top queries'));
  const pages = readCsv(inputDir, 'Pages.csv').map((row) => metricRow(row, 'Top pages'));
  const countries = readCsv(inputDir, 'Countries.csv').map((row) => metricRow(row, 'Country'));
  const devices = readCsv(inputDir, 'Devices.csv').map((row) => metricRow(row, 'Device'));
  const chart = readCsv(inputDir, 'Chart.csv').map((row) => metricRow(row, 'Date'));
  const filters = readCsv(inputDir, 'Filters.csv');
  const dateFilter = filters.find((row) => row.Filter === 'Date')?.Value ?? 'Unknown range';

  const totals = chart.reduce(
    (acc, row) => ({
      clicks: acc.clicks + row.clicks,
      impressions: acc.impressions + row.impressions,
      position: acc.position + row.position,
    }),
    { clicks: 0, impressions: 0, position: 0 }
  );
  const averagePosition = chart.length > 0 ? totals.position / chart.length : 0;
  const averageCtr = totals.impressions > 0 ? totals.clicks / totals.impressions : 0;

  const queryOpportunities = queries
    .filter((row) => row.impressions >= minImpressions && row.ctr < 0.03 && row.position <= 20)
    .sort(sortByOpportunity)
    .slice(0, 15);

  const pageOpportunities = pages
    .filter((row) => row.impressions >= minImpressions && row.ctr < 0.02 && row.position <= 20)
    .sort(sortByOpportunity)
    .slice(0, 15);

  const pageRows = pageOpportunities.map((row) => [
    row.name.replace('https://gachia.com', ''),
    formatNumber(row.clicks),
    formatNumber(row.impressions),
    formatPercent(row.ctr),
    row.position.toFixed(2),
    `+${formatNumber(row.potentialClicks)}`,
  ]);

  const queryRows = queryOpportunities.map((row) => [
    row.name,
    formatNumber(row.clicks),
    formatNumber(row.impressions),
    formatPercent(row.ctr),
    row.position.toFixed(2),
    `+${formatNumber(row.potentialClicks)}`,
  ]);

  const deviceRows = devices
    .sort((a, b) => b.impressions - a.impressions)
    .map((row) => [row.name, formatNumber(row.clicks), formatNumber(row.impressions), formatPercent(row.ctr), row.position.toFixed(2)]);

  const countryRows = countries
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10)
    .map((row) => [row.name, formatNumber(row.clicks), formatNumber(row.impressions), formatPercent(row.ctr), row.position.toFixed(2)]);

  const gameRows = groupByGame(pages).map(([game, impressions]) => [game, formatNumber(impressions)]);

  return `# GSC Performance Report

Source: \`${inputDir}\`
Date filter: ${dateFilter}
Minimum opportunity impressions: ${formatNumber(minImpressions)}

## Summary

- Clicks: ${formatNumber(totals.clicks)}
- Impressions: ${formatNumber(totals.impressions)}
- Average CTR: ${formatPercent(averageCtr)}
- Average position: ${averagePosition.toFixed(2)}

## Page CTR Opportunities

${markdownTable(['Page', 'Clicks', 'Impressions', 'CTR', 'Position', 'CTR upside @3%'], pageRows)}

## Query CTR Opportunities

${markdownTable(['Query', 'Clicks', 'Impressions', 'CTR', 'Position', 'CTR upside @3%'], queryRows)}

## Device Split

${markdownTable(['Device', 'Clicks', 'Impressions', 'CTR', 'Position'], deviceRows)}

## Country Split

${markdownTable(['Country', 'Clicks', 'Impressions', 'CTR', 'Position'], countryRows)}

## Game Impression Mix

${markdownTable(['Game', 'Impressions'], gameRows)}

## Recommended Next Actions

1. Rewrite titles/descriptions for the page CTR opportunities before creating new content.
2. Add quick-answer sections for queries with high impressions, low CTR, and positions under 10.
3. Prioritize internal links from game hubs and guide indexes to pages appearing in both page and query opportunity tables.
4. Re-run this report after each GSC export and compare whether CTR upside is shrinking.
`;
}

const options = parseArgs(process.argv);
const report = buildReport(options);
const outputPath = options.out
  ? path.resolve(process.cwd(), options.out)
  : path.resolve(process.cwd(), DEFAULT_OUTPUT_DIR, `gsc-performance-${path.basename(options.inputDir)}.md`);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, report);
console.log(`Wrote ${outputPath}`);
