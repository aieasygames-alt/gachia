import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { unifiedReconciliationRequest } from './unified-main-reconcile.mjs';

const pin = 'a'.repeat(64), run = '/tmp/frozen';
const request = () => ({ schemaVersion: 1, kind: 'unified_main_reconciliation_request', run, transportPin: pin, releaseKey: pin,
  journal: { path: `${run}/unified-promotion-${pin}.jsonl`, pin } });
test('fixed diagnostic accepts only a pinned exact journal location', () => {
  assert.deepEqual(unifiedReconciliationRequest(request()), { run, pin, transportPin: pin, releaseKey: pin });
  for (const value of [null, [], { ...request(), run: 'relative' }, { ...request(), releaseKey: 'bad' },
    { ...request(), journal: { path: '/elsewhere', pin } }, { ...request(), journal: { ...request().journal, passed: true } }]) {
    assert.throws(() => unifiedReconciliationRequest(value));
  }
  for (const key of ['snapshot', 'request', 'promote', 'recover', 'sourceAdvance', 'force', 'skipCI']) {
    assert.throws(() => unifiedReconciliationRequest({ ...request(), [key]: true }));
  }
});
test('diagnostic CLI refuses writes and unknown flags before contacting the cloud', () => {
  for (const args of [[], ['promote'], ['recover'], ['reconcile'], ['reconcile', '--force', 'true']]) {
    const result = spawnSync(process.execPath, ['scripts/unified-main-reconcile.mjs', ...args], { encoding: 'utf8' });
    assert.equal(result.status, 1); assert.match(result.stderr, /Usage: unified-main-reconcile|Require explicit|Invalid reconciliation/);
  }
});
