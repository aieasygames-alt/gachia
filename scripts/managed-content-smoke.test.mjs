import assert from 'node:assert/strict';
import test from 'node:test';
import { requireLocalContentOrigin, verifyManagedContent } from './managed-content-smoke.mjs';

test('managed content checks reject remote origins, credentials and implicit ports before requesting data', async () => {
  for (const origin of ['https://gachia.com', 'http://localhost:8080', 'http://127.0.0.1', 'http://user:secret@127.0.0.1:8080', 'http://127.0.0.1:8080/other', 'http://127.0.0.1:8080/?token=secret']) {
    await assert.rejects(verifyManagedContent(origin), /explicit local Worker origin/);
  }
});
test('managed content checks accept only an explicit loopback fixture', () => {
  assert.equal(requireLocalContentOrigin('http://127.0.0.1:8080'), 'http://127.0.0.1:8080');
});
