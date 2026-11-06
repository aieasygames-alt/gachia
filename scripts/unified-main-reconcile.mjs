import assert from 'node:assert/strict';
import { existsSync, writeFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { desktopCloudSnapshot } from './desktop-cloud-release.mjs';
import { digest } from './desktop-release-assets.mjs';
import { unifiedProductionRead } from './unified-production-transport.mjs';
import { unifiedPinnedJSON } from './unified-promotion-protocol.mjs';
import { reconcileUnifiedMainPromotion } from './unified-promotion-reconciliation.mjs';

export function unifiedReconciliationRequest(value) {
  assert(value && typeof value === 'object' && !Array.isArray(value));
  assert.deepEqual(Object.keys(value).sort(), ['journal', 'kind', 'releaseKey', 'run', 'schemaVersion', 'transportPin']);
  assert.equal(value.schemaVersion, 1); assert.equal(value.kind, 'unified_main_reconciliation_request');
  assert(typeof value.run === 'string' && isAbsolute(value.run));
  for (const pin of [value.transportPin, value.releaseKey, value.journal?.pin]) assert(/^[a-f0-9]{64}$/.test(pin));
  assert.deepEqual(Object.keys(value.journal).sort(), ['path', 'pin']);
  assert.equal(value.journal.path, join(value.run, `unified-promotion-${value.transportPin}.jsonl`));
  return { run: value.run, pin: value.journal.pin, releaseKey: value.releaseKey, transportPin: value.transportPin };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [action, ...flags] = process.argv.slice(2), options = new Map();
  assert.equal(action, 'reconcile', 'Usage: unified-main-reconcile.mjs reconcile --request FILE --pin SHA256 --output NEW_FILE');
  const allowed = ['--request', '--pin', '--output'];
  for (let i = 0; i < flags.length; i += 2) {
    const [key, value] = flags.slice(i, i + 2);
    assert(allowed.includes(key) && !options.has(key) && value && !value.startsWith('--'), 'Invalid reconciliation arguments');
    options.set(key, value);
  }
  assert(allowed.every(key => options.has(key)), 'Require explicit reconciliation arguments');
  assert(!existsSync(options.get('--output')), 'Reconciliation output already exists');
  const input = unifiedReconciliationRequest(unifiedPinnedJSON(options.get('--request'), options.get('--pin')));
  const token = process.env.CLOUDFLARE_API_TOKEN; assert(typeof token === 'string' && token.length > 0, 'Authenticated cloud read required');
  const result = await reconcileUnifiedMainPromotion(input, () => desktopCloudSnapshot(token, unifiedProductionRead, { allowSplit: true }));
  const raw = JSON.stringify(result, null, 2) + '\n'; writeFileSync(options.get('--output'), raw, { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ status: result.status, pin: digest(raw), output: options.get('--output'), cloudWrites: false }));
}
