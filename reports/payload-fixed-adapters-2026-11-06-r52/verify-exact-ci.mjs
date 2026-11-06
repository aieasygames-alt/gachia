import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createUnifiedExecutorVerifier } from '../../services/content-cms/src/unified-production.ts';

assert.equal(process.argv.length, 3, 'Supply the exact full CI run ID');
assert(/^[1-9][0-9]*$/.test(process.argv[2]));
const token = execFileSync('gh', ['auth', 'token', '--hostname', 'github.com'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const executor = await createUnifiedExecutorVerifier(Number(process.argv[2]), token);
executor.verify();
const receipt = { ...executor.executorCI, verifiedAt: new Date().toISOString(), executorBytesVerified: true,
  cloudWrites: false, activationSupported: false, productionQualificationGranted: false };
writeFileSync(new URL('./ci-exact.json', import.meta.url), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify(receipt));
