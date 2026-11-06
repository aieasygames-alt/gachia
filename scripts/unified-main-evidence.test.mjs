import assert from 'node:assert/strict';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { artifactFiles } from './desktop-publish.mjs';
import { digest } from './desktop-release-assets.mjs';
import { readUnifiedCompletedMainPromotion } from './unified-main-evidence.mjs';
import { unifiedSourceFixture } from './fixtures/unified-source-fixture.mjs';
import { advanceUnifiedSourceIndex, captureUnifiedNextBaseline, readUnifiedNextBaseline } from './unified-source-advance.mjs';
import { unifiedMainFixture as fixture } from './fixtures/unified-main-fixture.mjs';

const sha = 'a'.repeat(64);
const paths = ['/sitemap.xml', '/robots.txt', '/api/auth/get-session', '/data/ananta/raw-guides.json', '/data/genshin/raw-guides.json', '/data/nte/raw-guides.json',
  '/zh/ananta/guides/download-install-guide', '/en/ananta/guides/download-install-guide'];
const json = value => JSON.stringify(value, null, 2) + '\n';

test('completed Main reader reloads real protocol, module, renewal, deployment and public evidence without live requests', async t => {
  const f = await fixture(t); let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; throw Error('Historical reads must be offline'); });
  const result = await readUnifiedCompletedMainPromotion(f.input);
  assert.equal(calls, 0); assert.equal(result.currentCMSRead, false); assert.equal(result.currentCloudRead, false);
  assert.equal(result.freshnessRenewed, false); assert.equal(result.sourceAdvanced, false); assert.equal(result.publicHTTP.observations.length, paths.length);
});

test('old accepted evidence remains independently readable without making it fresh for another operation', async t => {
  const f = await fixture(t), now = Date.now();
  t.mock.method(Date, 'now', () => now + 86400000);
  const result = await readUnifiedCompletedMainPromotion(f.input);
  assert.equal(result.freshnessRenewed, false);
  assert(result.renewal.receipt.accepted.candidate.main.acceptedAt < Date.now() - 900000);
});

test('completed promotion evidence feeds five-owner source advance and fresh next-batch consumption in one isolated protocol chain', async t => {
  const s = await unifiedSourceFixture(t), f = await fixture(t, s.spec.baseline);
  const completed = await readUnifiedCompletedMainPromotion(f.input), candidate = completed.modules.candidate;
  const accepted = f.input.previews.receipt.accepted.candidate.main;
  s.spec.publication = f.input.proof; s.spec.releaseKey = f.input.value.releaseKey; s.spec.transportPin = f.input.value.transportPin;
  s.spec.deploymentId = completed.original.rows[3].result.deploymentId;
  s.spec.publicReferences = f.input.publicReferences;
  s.spec.pairs = ['ananta/raw-guides.json', 'genshin/raw-guides.json', 'nte/raw-guides.json'];
  s.spec.sources = s.spec.sources.filter(row => row.sourcePath.endsWith('.ts'));
  for (const pair of s.spec.pairs) {
    const reference = f.input.publicReferences.find(row => row.path === '/data/' + pair), index = f.input.publicReferences.indexOf(reference);
    const text = f.roleBodies.candidate.bodies[index].toString();
    writeFileSync(join(s.spec.owners.main.directory, 'assets/data', pair), text);
    s.spec.sources.push({ sourcePath: 'packages/data/games/' + pair, text, sha256: digest(text) });
  }
  s.spec.sources.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));
  s.spec.owners.main = { ...s.spec.owners.main, versionId: accepted.versionId, version: candidate.version,
    moduleProof: accepted.moduleProof, moduleContext: candidate.receipt.context, modulePath: candidate.receipt.archive.path,
    archiveSHA256: candidate.receipt.archive.pin, moduleSHA256: accepted.moduleSHA256,
    artifactSHA256: digest(json(artifactFiles(s.spec.owners.main.directory))) };
  s.versions.gachia = candidate.version;
  s.current.services.gachia = { id: s.spec.deploymentId, versions: [{ version_id: accepted.versionId, percentage: 100 }] };
  const request = async url => {
    const index = f.input.publicReferences.findIndex(row => row.path === new URL(url).pathname), reference = f.input.publicReferences[index];
    return new Response(readFileSync(join(f.directory, 'public', `${index}.body`)), { status: reference.status, headers: reference.headers });
  };
  const advanced = await advanceUnifiedSourceIndex({ ...s, request, directory: join(s.root, 'advance') });
  const next = await captureUnifiedNextBaseline({ ...s, request, proof: advanced.proof, directory: join(s.root, 'next') });
  const opened = await readUnifiedNextBaseline({ spec: s.spec, handoff: next.proof, fresh: true });
  assert.equal(opened.previous.owners.main.versionId, completed.receipt.versions.gachia);
  assert.deepEqual(opened.index.value.publication, f.input.proof); assert.equal(opened.sources.length, 28);
  assert.equal(opened.sources.filter(row => row.sourcePath.endsWith('.ts')).length, 25);
  assert.equal(readFileSync(join(opened.previous.owners.main.directory, 'worker.js'), 'utf8'), candidate.code.toString());
});

test('a valid stopped journal cannot be repackaged as a completed public source', async t => {
  const f = await fixture(t), file = join(f.input.run, `unified-promotion-${sha}.jsonl`);
  const rows = readFileSync(file, 'utf8').trimEnd().split('\n').map(JSON.parse), last = rows.pop();
  rows.push({ ...last, phase: 'stopped', error: 'isolated stop', automaticRetry: false, automaticRollback: false },
    { ...last, phase: 'read_only_reconciliation', result: { status: 'candidate_active_public_acceptance_still_required' } });
  const bytes = rows.map(JSON.stringify).join('\n') + '\n'; writeFileSync(file, bytes);
  f.changeReceipt(receipt => { receipt.journalPin = digest(bytes); });
  await assert.rejects(readUnifiedCompletedMainPromotion(f.input), /stopped promotion/);
});

for (const fault of ['receipt-pin', 'journal', 'status', 'source-advanced', 'release', 'baseline', 'renewal', 'renewal-identity', 'renewal-body', 'module',
  'version', 'remote', 'creation', 'creation-repin', 'verification', 'allocation-repin', 'public-proof', 'public-body', 'public-missing', 'ci', 'unverified-ci', 'request', 'receipt-location']) {
  test(`completed Main source refuses ${fault}`, async t => {
    const f = await fixture(t), input = f.input;
    if (fault === 'receipt-pin') input.proof.pin = 'c'.repeat(64);
    if (fault === 'journal') writeFileSync(join(input.run, `unified-promotion-${sha}.jsonl`), '{}\n');
    if (fault === 'status') f.changeReceipt(receipt => { receipt.status = 'stopped'; });
    if (fault === 'source-advanced') f.changeReceipt(receipt => { receipt.sourceAdvanced = true; });
    if (fault === 'release') f.changeReceipt(receipt => { receipt.releaseKey = 'c'.repeat(64); });
    if (fault === 'baseline') input.value.baseline.routes.push({ pattern: 'changed' });
    if (fault === 'renewal') writeFileSync(join(f.renewalDirectory, 'receipt.json'), '{}');
    if (fault === 'renewal-identity') input.previews.receipt.accepted.recovery.main.moduleSHA256 = 'c'.repeat(64);
    if (fault === 'renewal-body') writeFileSync(join(f.renewalDirectory, 'recovery/0.body'), 'changed');
    if (fault === 'module') writeFileSync(input.previews.receipt.accepted.candidate.main.moduleProof.path, '{}');
    if (fault === 'version') writeFileSync(join(input.previews.directory, 'candidate-main/version.json'), '{}');
    if (fault === 'remote') writeFileSync(join(f.directory, 'remote-0.json'), '{}');
    if (fault === 'creation') writeFileSync(join(f.directory, 'deployment-creation.body'), '{}');
    if (fault === 'verification') writeFileSync(join(f.directory, 'deployment-verification.body'), '{}');
    if (['creation-repin', 'allocation-repin'].includes(fault)) {
      const kind = fault === 'creation-repin' ? 'creation' : 'verification', file = join(f.directory, `deployment-${kind}`);
      const response = JSON.parse(readFileSync(file + '.body')); response.result.versions[0].percentage = 50;
      const bytes = Buffer.from(json(response)); writeFileSync(file + '.body', bytes);
      const metadata = JSON.parse(readFileSync(file + '.json')); f.save(file + '.json', { ...metadata, sha256: digest(bytes), bytes: bytes.length });
    }
    if (fault === 'public-proof') writeFileSync(join(f.directory, 'public-acceptance.json'), '{}');
    if (fault === 'public-body') writeFileSync(join(f.directory, 'public/6.body'), 'changed');
    if (fault === 'public-missing') rmSync(join(f.directory, 'public/7.body'));
    if (fault === 'ci') input.executorCI = { ...input.executorCI, commit: 'd'.repeat(40) };
    if (fault === 'unverified-ci') delete input.sourceCI;
    if (fault === 'request') input.productionRequest = { ...input.productionRequest, pin: 'd'.repeat(64) };
    if (fault === 'receipt-location') { const file = join(input.run, 'other-receipt.json'); input.proof = f.save(file, f.receipt); }
    await assert.rejects(readUnifiedCompletedMainPromotion(input));
  });
}
