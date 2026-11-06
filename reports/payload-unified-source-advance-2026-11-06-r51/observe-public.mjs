import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { digest } from '../../scripts/desktop-release-assets.mjs';
import { boundedBody } from '../../scripts/desktop-version-preview.mjs';
import { unifiedPinnedJSON } from '../../scripts/unified-promotion-protocol.mjs';
import { unifiedProductionRead } from '../../scripts/unified-production-transport.mjs';

const report = fileURLToPath(new URL('./', import.meta.url));
const input = unifiedPinnedJSON(join(report, '../payload-main-only-preservation-2026-11-06-r48/upload-previews-request.json'),
  '99b9b4da50e8c5ab9ff754388ab4418b8060d702ca1e730e10e05c91f1e77b7e');
const active = unifiedPinnedJSON(input.active.path, input.active.pin), directory = join(report, 'public-final');
mkdirSync(directory, { mode: 0o700 });
const result = { status: 'running', observedAt: new Date().toISOString(), observations: [], cloudWrites: false, productionPromoted: false, sourceAdvanced: false };
const marker = '\u5b89\u88c5\u524d\u68c0\u67e5\u6e05\u5355';
try {
  for (const path of ['/data/ananta/raw-guides.json', '/data/genshin/raw-guides.json', '/data/nte/raw-guides.json', '/zh/ananta/guides/download-install-guide', '/api/auth/get-session']) {
    const response = await unifiedProductionRead('https://gachia.com' + path, { method: 'GET', redirect: 'error', credentials: 'omit',
      headers: { 'accept-language': 'zh', connection: 'close' }, signal: AbortSignal.timeout(30000) });
    const body = await boundedBody(response), bodyFile = `${result.observations.length}.body`;
    writeFileSync(join(directory, bodyFile), body, { flag: 'wx', mode: 0o600 });
    const row = { path, status: response.status, bytes: body.length, sha256: digest(body), bodyFile }; result.observations.push(row);
    assert(!response.headers.has('set-cookie'));
    if (path.startsWith('/data/')) {
      assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /^application\/json/);
      assert.equal(row.sha256, active.find(source => source.sourcePath === 'packages/data/games/' + path.slice(6)).sha256);
      const values = JSON.parse(body); row.records = values.length;
      if (path.includes('/genshin/')) { assert.equal(values.length, 32); assert(values.some(row => row.id === 'cms-returning-player-checklist')); }
      else if (path.includes('/nte/')) assert.equal(values.length, 53);
      else assert(!values.find(row => row.id === 'download-install-guide').content.includes(marker));
    } else if (path.startsWith('/api/')) {
      assert.equal(response.status, 404); assert.equal(JSON.parse(body).code, 'ACCOUNT_FEATURES_DISABLED'); assert.match(response.headers.get('cache-control'), /no-store/);
    } else { assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /^text\/html/); assert(!body.toString().includes(marker)); }
  }
  result.status = 'public_A_unchanged_editorial_not_activated';
} catch (error) { result.status = 'failed'; result.error = error.message; throw error; }
finally { writeFileSync(join(directory, 'result.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); }
console.log(JSON.stringify({ status: result.status, responses: result.observations.length, cloudWrites: false, productionPromoted: false, sourceAdvanced: false }));
