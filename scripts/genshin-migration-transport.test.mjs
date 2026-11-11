import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { migrationRouterDeploymentWriter, migrationUploadResponse } from './genshin-migration-transport.mjs';
import { migrationPreviewOrigin, migrationSave } from './genshin-migration-http.mjs';
import { migrationGenshinStepReferences } from './genshin-migration-source-advance.mjs';
import { migrationRouterModule } from './genshin-migration-router.mjs';

const versionId = '00000000-0000-4000-8000-000000000001', deploymentId = '00000000-0000-4000-8000-000000000002', releaseKey = 'a'.repeat(64);
const args = { owner: 'router', service: 'gachia-router', versionId, releaseKey };
test('Genshin public step keeps the original Router GET freshness policy and excludes not-yet-routed data', t => {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'genshin-step-'))); t.after(() => rmSync(directory, { recursive: true, force: true }));
  const output = join(directory, 'genshin/candidate/local-http/responses'); mkdirSync(output, { recursive: true });
  const rows = [{ path: '/en/genshin/characters/hu-tao', headers: { 'cache-control': 's-maxage=31536000', 'content-type': 'text/html' } },
    { path: '/_games/genshin/_next/static/code.js', headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    { path: '/data/genshin/raw-characters.json', headers: {} }, { path: '/en', headers: {} }];
  const references = migrationSave(output, 'references.json', rows);
  const result = migrationGenshinStepReferences({ directory, value: { owners: { genshin: { candidate: { referencesPin: references.pin } } } } });
  assert.equal(result.length, 2); assert.equal(result[0].headers['cache-control'], 'private, no-cache, no-store, max-age=0, must-revalidate');
  assert.deepEqual(result[1], rows[1]); assert.equal(rows[0].headers['cache-control'], 's-maxage=31536000');
});
test('migration upload accepts one exact UUID and its exact version preview, never an alias', () => {
  const log = `Worker Version ID: ${versionId}\nVersion Preview URL: ${migrationPreviewOrigin('gachia-router', versionId)}\n`;
  assert.deepEqual(migrationUploadResponse(log, 'gachia-router'), { versionId });
  assert.throws(() => migrationUploadResponse(log + log, 'gachia-router'));
  assert.throws(() => migrationUploadResponse(log.replace(versionId.slice(0, 8) + '-gachia-router', 'latest-gachia-router'), 'gachia-router'));
  for (const service of ['gachia-staging', 'gachia-game-nte', 'injected']) assert.throws(() => migrationPreviewOrigin(service, versionId));
});
test('fixed Router deployment writes once, verifies allocation and records both responses', async () => {
  const requests = [], responses = [];
  const write = migrationRouterDeploymentWriter({ releaseKey, versionId, token: 'test-only', recordResponse: row => responses.push(row), request: async (url, options) => {
    requests.push({ url, options }); return Response.json({ success: true, result: { id: deploymentId, strategy: 'percentage', versions: [{ version_id: versionId, percentage: 100 }] } });
  } });
  const result = await write(args); assert.equal(result.deploymentId, deploymentId);
  assert.deepEqual(requests.map(row => row.options.method), ['POST', 'GET']); assert.deepEqual(responses.map(row => row.kind), ['creation', 'verification']);
  await assert.rejects(write(args), /cannot be retried/); assert.equal(requests.length, 2);
});
for (const failure of ['network', 'status', 'wrong-version', 'missing-deployment']) test(`Router ${failure} stops without retry`, async () => {
  let calls = 0;
  const write = migrationRouterDeploymentWriter({ releaseKey, versionId, token: 'test-only', recordResponse: () => {}, request: async () => {
    calls++;
    if (failure === 'network') throw Error('lost response');
    return Response.json({ success: true, result: { id: failure === 'missing-deployment' ? undefined : deploymentId,
      strategy: 'percentage', versions: [{ version_id: failure === 'wrong-version' ? deploymentId : versionId, percentage: 100 }] } }, { status: failure === 'status' ? 500 : 200 });
  } });
  await assert.rejects(write(args)); const count = calls; await assert.rejects(write(args)); assert.equal(calls, count);
});
test('Router writer cannot target Main, another UUID or another migration key', async () => {
  let calls = 0;
  const write = migrationRouterDeploymentWriter({ releaseKey, versionId, token: 'test-only', recordResponse: () => {}, request: async () => { calls++; throw Error('unexpected'); } });
  for (const change of [{ owner: 'main' }, { service: 'gachia' }, { versionId: deploymentId }, { releaseKey: 'b'.repeat(64) }]) await assert.rejects(write({ ...args, ...change }));
  assert.equal(calls, 0);
});
test('legacy Router parser accepts only a single original index.js or sealed worker.js', async () => {
  const archive = async names => {
    const form = new FormData(); for (const name of names) form.set(name, new Blob(['export default {}'], { type: 'application/javascript' }), name);
    return Buffer.from(await new Response(form).arrayBuffer());
  };
  for (const name of ['index.js', 'worker.js']) assert.equal((await migrationRouterModule(await archive([name]))).name, name);
  for (const names of [['injected.js'], ['worker.js', 'extra.js']]) await assert.rejects(migrationRouterModule(await archive(names)));
});
