import { mkdir, writeFile } from 'node:fs/promises';

const origin = process.env.GENSHIN_API_ORIGIN ?? 'https://gachia.com';
const timeoutMs = Number.parseInt(process.env.GENSHIN_API_TIMEOUT_MS ?? '15000', 10);
const privateEndpoints = [
  '/api/favorites?gameId=genshin',
  '/api/user-characters?gameId=genshin',
  '/api/map/progress?map_id=teyvat',
];
const checks = [];

async function request(path) {
  try {
    const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(timeoutMs) });
    const body = await response.text();
    return { path, status: response.status, cacheControl: response.headers.get('cache-control') ?? '', vary: response.headers.get('vary') ?? '', body };
  } catch (error) {
    return { path, status: 0, cacheControl: '', vary: '', error: String(error) };
  }
}

for (const path of privateEndpoints) {
  const result = await request(path);
  checks.push({ ...result, expected: '401 and private/no-store response', pass: result.status === 401 && /(?:private|no-store)/i.test(result.cacheControl) });
}

const session = await request('/api/auth/get-session');
checks.push({ ...session, expected: 'anonymous JSON session response', pass: session.status === 200 && /application\/json/i.test(session.body === undefined ? '' : 'application/json') });

const mapPoints = await request('/api/map/points?map_id=2');
checks.push({ ...mapPoints, expected: 'anonymous public map data with shared-cache policy', pass: mapPoints.status === 200 && /public/i.test(mapPoints.cacheControl) });

const failures = checks.filter((check) => !check.pass).map((check) => `${check.path}: expected ${check.expected}, got HTTP ${check.status}, Cache-Control ${check.cacheControl || '(missing)'}`);
await mkdir('reports/genshin', { recursive: true });
const output = `reports/genshin/api-boundary-${new Date().toISOString().slice(0, 10)}.json`;
await writeFile(output, `${JSON.stringify({ generatedAt: new Date().toISOString(), origin, timeoutMs, checks, failures }, null, 2)}\n`);
console.log(`Wrote ${output}; checks: ${checks.length}; failures: ${failures.length}.`);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
