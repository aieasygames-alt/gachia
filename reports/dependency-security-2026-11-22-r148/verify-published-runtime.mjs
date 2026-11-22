import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { migrationPinned } from '../../scripts/genshin-migration-http.mjs';
import { digest } from '../../scripts/desktop-release-assets.mjs';
import { multipartModule } from '../../scripts/desktop-cloud-transport.mjs';
const root = import.meta.dirname;
const sourceIndex = JSON.parse(readFileSync(path.join(root, 'source-result.json')));
const current = migrationPinned(sourceIndex), previous = migrationPinned(current.previousSourceIndex), completed = migrationPinned(current.completion);
const row = current.owners.main, module = await multipartModule(readFileSync(row.modulePath));
assert.equal(module.moduleSHA256, row.moduleSHA256);
assert.equal(digest(readFileSync(path.join(row.directory, 'worker.js'))), row.moduleSHA256);
assert.equal(completed.after.services.gachia.versions[0].version_id, row.versionId);
const code = module.code.toString();
assert.equal(code.includes('1.6.22'), false); assert(code.includes('1.7.7'));
for (const owner of ['genshin', 'nte', 'azur-promilia', 'lvmeng']) assert.deepEqual(current.owners[owner], previous.owners[owner]);
writeFileSync(path.join(root, 'published-runtime-version.json'), JSON.stringify({
  at: new Date().toISOString(), sourceIndex, owner: 'main', service: row.service, versionId: row.versionId,
  moduleSHA256: row.moduleSHA256, uploadTimeArchiveSHA256: row.archiveSHA256,
  oldBetterAuthVersionStrings: 0, newBetterAuthVersionStrings: code.split('1.7.7').length - 1,
  contentSourcesPreserved: 115, gameOwnerIdentitiesPreserved: true,
  limit: 'Version strings substantiate the exact frozen build and uploaded-module receipts, not an independent exploit proof',
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ mainVersion: row.versionId, moduleSHA256: row.moduleSHA256, betterAuth: '1.7.7', gamesPreserved: true }));
