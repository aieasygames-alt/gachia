// Read-only public verification of the existing Chinese-only Router boundary.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { digest } from '../../scripts/desktop-release-assets.mjs';
import { migrationSave } from '../../scripts/genshin-migration-http.mjs';
import { createGenshinPublicNetwork } from '../../scripts/unified-preview-network.mjs';

const root = import.meta.dirname;
const before = JSON.parse(readFileSync(root + '/locale-boundary-before.json'));
const network = await createGenshinPublicNetwork('http://127.0.0.1:18646');
const rows = [];
try {
  for (const expected of before) {
    const response = await network.request('https://gachia.com' + expected.path, {
      method: 'GET', credentials: 'omit', redirect: 'error',
      headers: { connection: 'close' }, signal: AbortSignal.timeout(30000),
    });
    const bytes = Buffer.from(await response.arrayBuffer());
    const row = { path: expected.path, status: response.status, bytes: bytes.length,
      sha256: digest(bytes), headers: Object.fromEntries(['content-type', 'cache-control', 'x-robots-tag'].map(name => [name, response.headers.get(name)])) };
    assert.deepEqual(row, expected);
    rows.push(row);
  }
} finally { await network.close(); }
migrationSave(root, 'locale-boundary-after.json', { status: 'passed', checkedAt: new Date().toISOString(), rows });
console.log(JSON.stringify({ localeBoundary: 'preserved', requests: rows.length }));
