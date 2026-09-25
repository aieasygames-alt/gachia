import { mkdir, writeFile } from 'node:fs/promises';

const origin = process.env.GENSHIN_CANARY_ORIGIN ?? 'https://gachia.com';
const token = process.env.GENSHIN_CANARY_TOKEN;
const rounds = Number.parseInt(process.env.GENSHIN_OBSERVATION_ROUNDS ?? '3', 10);
const timeoutMs = Number.parseInt(process.env.GENSHIN_OBSERVATION_TIMEOUT_MS ?? '30000', 10);

if (!token) throw new Error('GENSHIN_CANARY_TOKEN is required for canary observation.');
if (!Number.isInteger(rounds) || rounds < 1 || rounds > 12) throw new Error('GENSHIN_OBSERVATION_ROUNDS must be between 1 and 12.');

const cases = [
  { path: '/zh/genshin', status: 200, target: 'genshin', kind: 'html' },
  { path: '/en/genshin/characters', status: 200, target: 'genshin', kind: 'html' },
  { path: '/ja/genshin/weapons/sacrificial-jade', status: 200, target: 'genshin', kind: 'html' },
  { path: '/zh/genshin/map', status: 200, target: 'genshin', kind: 'html' },
  { path: '/sitemaps/genshin/index.xml', status: 200, target: 'genshin', kind: 'xml' },
  { path: '/_games/genshin/_next/static/chunks/31eb0341-f7f1cc992898a8c4.js', status: 200, target: 'genshin', kind: 'javascript' },
  { path: '/zh/genshin/unknown', status: 404, target: 'main', kind: 'html' },
  { path: '/zh', status: 200, target: 'main', kind: 'html' },
  { path: '/zh/nte', status: 200, target: 'nte', kind: 'html' },
  { path: '/zh/azur-promilia', status: 200, target: 'azur-promilia', kind: 'html' },
  { path: '/api/auth/get-session', status: 200, target: 'main', kind: 'json' },
];

async function inspect(entry) {
  const started = performance.now();
  try {
    const response = await fetch(new URL(entry.path, origin), {
      headers: {
        cookie: `gachia_genshin_canary=${token}`,
        'x-gachia-route-debug': '1',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    await response.arrayBuffer();
    const target = response.headers.get('x-gachia-route-target') ?? 'main';
    const contentType = response.headers.get('content-type') ?? '';
    const ttfbMs = Math.round(performance.now() - started);
    const pass = response.status === entry.status && target === entry.target && contentType.includes(entry.kind);
    return { ...entry, status: response.status, target, contentType, cacheControl: response.headers.get('cache-control') ?? '', ttfbMs, pass };
  } catch (error) {
    return { ...entry, status: 0, target: '', contentType: '', cacheControl: '', ttfbMs: Math.round(performance.now() - started), pass: false, error: String(error) };
  }
}

const observations = [];
for (let round = 1; round <= rounds; round += 1) {
  const checks = await Promise.all(cases.map(inspect));
  observations.push({ round, checks });
  console.log(`Round ${round}/${rounds}: ${checks.filter((check) => check.pass).length}/${checks.length} passed`);
  if (round < rounds) await new Promise((resolve) => setTimeout(resolve, 1000));
}

const failures = observations.flatMap(({ round, checks }) => checks.filter((check) => !check.pass).map((check) => `round ${round} ${check.path}: HTTP ${check.status} ${check.target || 'unreachable'} ${check.contentType || check.error || 'missing content type'}`));
const allChecks = observations.flatMap(({ checks }) => checks);
const successfulTtfb = allChecks.filter((check) => check.pass).map((check) => check.ttfbMs);
const report = {
  generatedAt: new Date().toISOString(), origin, rounds, timeoutMs, observations, failures,
  metrics: {
    checks: allChecks.length,
    failures: failures.length,
    maxSuccessfulTtfbMs: successfulTtfb.length ? Math.max(...successfulTtfb) : 0,
    averageSuccessfulTtfbMs: successfulTtfb.length ? Math.round(successfulTtfb.reduce((sum, value) => sum + value, 0) / successfulTtfb.length) : 0,
  },
};
await mkdir('reports/genshin', { recursive: true });
const output = `reports/genshin/canary-observation-${new Date().toISOString().slice(0, 10)}.json`;
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${output}; failures: ${failures.length}; max TTFB: ${report.metrics.maxSuccessfulTtfbMs}ms.`);
if (failures.length) process.exit(1);
