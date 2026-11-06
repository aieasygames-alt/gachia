import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { digest } from '../../scripts/desktop-release-assets.mjs';
import { boundedBody } from '../../scripts/desktop-version-preview.mjs';

const report = fileURLToPath(new URL('./', import.meta.url));
const active = JSON.parse(readFileSync(report + 'baseline-release/active.json', 'utf8'));
const observations = [];
for (const game of ['ananta', 'genshin', 'nte']) {
  const source = active.find(row => row.sourcePath === `packages/data/games/${game}/raw-guides.json`);
  const path = `/data/${game}/raw-guides.json`;
  const response = await fetch('https://gachia.com' + path, { redirect: 'error', credentials: 'omit',
    headers: { 'accept-language': 'zh' }, signal: AbortSignal.timeout(30000) });
  const body = await boundedBody(response);
  assert.equal(response.status, 200);
  assert(response.headers.get('content-type')?.startsWith('application/json'));
  assert(!response.headers.has('set-cookie'));
  assert.equal(digest(body), source.sha256, 'Public content changed after editorial preparation');
  const rows = JSON.parse(body);
  if (game === 'genshin') {
    assert.equal(rows.length, 32);
    assert(rows.some(row => row.id === 'cms-returning-player-checklist'));
  } else if (game === 'nte') assert.equal(rows.length, 53);
  else assert(!rows.find(row => row.id === 'download-install-guide').content.includes('安装前检查清单'));
  observations.push({ path, status: response.status, sha256: digest(body), guides: rows.length, publicBaselineUnchanged: true });
}
for (const path of ['/zh/ananta/guides/download-install-guide', '/api/auth/get-session']) {
  const response = await fetch('https://gachia.com' + path, { redirect: 'error', credentials: 'omit',
    headers: { 'accept-language': path.match(/^\/(zh|en|ja)\//)?.[1] ?? 'zh' }, signal: AbortSignal.timeout(30000) });
  const body = await boundedBody(response);
  assert(!response.headers.has('set-cookie'));
  if (path.startsWith('/api/')) {
    assert.equal(response.status, 404);
    assert.equal(JSON.parse(body).code, 'ACCOUNT_FEATURES_DISABLED');
  } else {
    assert.equal(response.status, 200);
    assert(response.headers.get('content-type')?.startsWith('text/html'));
    assert(!body.toString().includes('安装前检查清单'));
  }
  observations.push({ path, status: response.status, sha256: digest(body) });
}
const result = { at: new Date().toISOString(), status: 'public_unchanged_editorial_not_activated', observations,
  cloudWrites: false, productionPromoted: false };
writeFileSync(report + 'public-after.json', JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify(result, null, 2));
