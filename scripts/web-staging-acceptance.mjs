import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { localBrowserProxy } from './game-staging-acceptance.mjs';
import { verifyHttp, verifyBrowser } from './runtime-rollout-smoke.mjs';
import { verifyPublishedManagedContent } from './managed-content-smoke.mjs';

export function webStagingOrigin(args = []) {
  if (args.length) throw new Error('No arguments accepted; only the isolated main staging is permitted');
  return 'https://gachia-staging.aieasygames.workers.dev';
}

async function main() {
  const origin = webStagingOrigin(process.argv.slice(2));
  const directory = resolve(import.meta.dirname, '..', '.release-records', `web-staging-${randomUUID()}`);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const record = { schemaVersion: 1, origin, startedAt: new Date().toISOString(), status: 'running', productionTrafficSwitch: false };
  try {
    record.http = await verifyHttp('web', origin, { preview: true });
    record.browser = await verifyBrowser('web', origin, { proxy: localBrowserProxy(process.env.STAGING_CHECK_PROXY), directory });
    record.managedContent = await verifyPublishedManagedContent(origin, directory, { proxy: localBrowserProxy(process.env.STAGING_CHECK_PROXY) });
    record.status = 'main_staging_verified_accounts_disabled';
  } catch (error) { record.status = 'failed'; record.error = error.message; throw error; }
  finally {
    record.finishedAt = new Date().toISOString();
    writeFileSync(resolve(directory, 'result.json'), JSON.stringify(record, null, 2) + '\n', { mode: 0o600 });
    console.log(`Main staging acceptance: ${resolve(directory, 'result.json')}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
