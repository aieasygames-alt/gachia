import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { requireLocalContentOrigin, verifyManagedContent } from './managed-content-smoke.mjs';

test('managed content checks reject remote origins, credentials and implicit ports before requesting data', async () => {
  for (const origin of ['https://gachia.com', 'http://localhost:8080', 'http://127.0.0.1', 'http://user:secret@127.0.0.1:8080', 'http://127.0.0.1:8080/other', 'http://127.0.0.1:8080/?token=secret']) {
    await assert.rejects(verifyManagedContent(origin), /explicit local Worker origin/);
  }
});
test('managed content checks accept only an explicit loopback fixture', () => {
  assert.equal(requireLocalContentOrigin('http://127.0.0.1:8080'), 'http://127.0.0.1:8080');
});
test('compiled managed content runs after browser installation and before artifact sealing', () => {
  const source = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
  const check = source.indexOf('run: pnpm test:managed-content:local');
  assert(check > source.indexOf('name: Install Playwright browser'));
  assert(check < source.indexOf('id: seal-web'));
  assert.match(source, /name: Verify compiled managed content and official echo names\n\s+if: steps.scope.outputs.scope != 'admin'\n\s+run: pnpm test:managed-content:local/);
});
