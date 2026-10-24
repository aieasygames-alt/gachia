import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { localBrowserProxy } from './game-staging-acceptance.mjs';
import { verifyHttp, verifyBrowser } from './runtime-rollout-smoke.mjs';
import { verifyPublishedManagedContent } from './managed-content-smoke.mjs';

if (process.argv.length !== 2) throw new Error('No arguments accepted; only main production acceptance is permitted');
const origin = 'https://gachia.com';
const directory = resolve(import.meta.dirname, '..', '.release-records', `web-production-${randomUUID()}`);
mkdirSync(directory, { recursive: true, mode: 0o700 });
const record = { schemaVersion: 1, origin, startedAt: new Date().toISOString(), status: 'running', deploymentPerformed: false };
try {
  const proxy = localBrowserProxy(process.env.STAGING_CHECK_PROXY);
  record.http = await verifyHttp('web', origin);
  record.browser = await verifyBrowser('web', origin, { proxy, directory });
  record.managedContent = await verifyPublishedManagedContent(origin, directory, { proxy });
  record.status = 'main_production_verified_accounts_disabled';
} catch (error) {
  record.status = 'failed'; record.error = error.message; process.exitCode = 1;
} finally {
  record.finishedAt = new Date().toISOString();
  writeFileSync(resolve(directory, 'result.json'), JSON.stringify(record, null, 2) + '\n', { mode: 0o600 });
  console.log(`Main production acceptance: ${resolve(directory, 'result.json')}`);
  if (record.error) console.error(record.error);
}
