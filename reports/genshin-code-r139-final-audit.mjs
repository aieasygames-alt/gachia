// Read-only closeout of the completed R139 publication; never uploads or deploys.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { activeVersion, assertTopology, desktopCloudSnapshot } from '../scripts/desktop-cloud-release.mjs';
import { digest } from '../scripts/desktop-release-assets.mjs';
import { migrationPinned } from '../scripts/genshin-migration-http.mjs';
import { unifiedProductionRead } from '../scripts/unified-production-transport.mjs';

const root = path.join(import.meta.dirname, 'genshin-code-production-2026-11-20-r139');
const load = file => JSON.parse(readFileSync(path.join(root, file), 'utf8'));
const save = (file, value) => {
  const bytes = JSON.stringify(value, null, 2) + '\n', target = path.join(root, file);
  writeFileSync(target, bytes, { flag: 'wx', mode: 0o600 });
  return { path: target, pin: digest(bytes) };
};
const completion = load('completion.json'), before = load('baseline.json');
assert.equal(completion.status, 'production_accepted');
const sourceProof = load('source-result.json'), source = migrationPinned(sourceProof);
assert.deepEqual(source.previousSourceIndex, before.parent);
assert.deepEqual(source.baseline, completion.after);
assert.deepEqual(source.active, before.active);
const sources = migrationPinned(source.active);
assert.equal(sources.length, 115);
for (const row of sources) assert.equal(digest(readFileSync(path.join(source.workspace, row.sourcePath))), row.sha256);
const credential = readFileSync(path.join(homedir(), '.wrangler/config/default.toml'), 'utf8');
const token = JSON.parse(credential.match(/^oauth_token\s*=\s*("[^"\r\n]*")\s*$/m)[1]);
const snapshot = await desktopCloudSnapshot(token, unifiedProductionRead), staging = {};
assertTopology(before.before, snapshot, completion.promoted);
assertTopology(completion.after, snapshot);
for (const name of Object.keys(before.staging)) {
  staging[name] = {};
  for (const endpoint of ['deployments', 'settings']) {
    const response = await unifiedProductionRead(`https://api.cloudflare.com/client/v4/accounts/e6472b6c6172a3ac1e1596ef100543ae/workers/scripts/${name}/${endpoint}`,
      { method: 'GET', headers: { authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(30000) });
    const body = await response.json(); assert(response.ok && body.success);
    staging[name][endpoint] = body.result;
  }
}
assert.deepEqual(staging, before.staging);
const services = Object.keys(snapshot.services).map(name => ({ service: name,
  beforeVersion: activeVersion(before.before, name), afterVersion: activeVersion(snapshot, name),
  beforeDeployment: before.before.services[name].id, afterDeployment: snapshot.services[name].id }));
for (const name of Object.keys(staging)) services.push({ service: name, deploymentAndSettingsUnchanged: true });
assert.deepEqual(services.filter(row => row.beforeVersion !== row.afterVersion).map(row => row.service), ['gachia-game-genshin']);
const media = [];
for (const name of ['mualani', 'ororon']) {
  const expected = digest(readFileSync(path.join(source.workspace, `apps/game-genshin/public/images/genshin/characters/${name}.webp`)));
  const url = `https://img.gachia.com/images/genshin/characters/${name}.webp`;
  for (const method of ['HEAD', 'GET']) {
    const headers = path.join(root, `final-cdn-${name}-${method}.headers`), body = path.join(root, `final-cdn-${name}.webp`);
    const status = execFileSync('curl', ['--silent', '--show-error', '--max-time', '30', '--proxy', 'http://127.0.0.1:1087',
      ...(method === 'HEAD' ? ['--head'] : []), '--dump-header', headers, '--output', method === 'GET' ? body : '/dev/null', '--write-out', '%{http_code}', url], { encoding: 'utf8' });
    assert.equal(status, '200');
    if (method === 'GET') assert.equal(digest(readFileSync(body)), expected);
    media.push({ url, method, status: 200, headers, ...(method === 'GET' ? { sha256: expected, bytes: readFileSync(body).length } : {}) });
  }
}
const controlplane = save('controlplane-final.json', { at: new Date().toISOString(), snapshot, staging, cloudWrites: false });
const proof = save('final-audit.json', { at: new Date().toISOString(), status: 'passed', sourceProof, controlplane,
  sourcesPreserved: sources.length, onlyChangedService: 'gachia-game-genshin', protectedServicesUnchanged: 9, services, media, cloudWrites: false });
console.log(JSON.stringify({ status: 'passed', sourceProof, proof, versionId: activeVersion(snapshot, 'gachia-game-genshin'), protectedServicesUnchanged: 9 }));
