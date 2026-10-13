import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { openStore } from '../src/store.mjs';
import { startWorkbench } from '../src/server.mjs';

const input = { requestId: 'request-1', materialId: 'material', planId: 'plan', planDigest: 'a'.repeat(64),
  ownerInstanceId: 'instance-one', ownerNonce: 'b'.repeat(64), leaseMs: 1000 };
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'gachia-intents-')); const filename = join(dir, 'state.sqlite');
  let time = 10000; const store = openStore(filename, { intentNow: () => time });
  t.after(() => { store.close(); rmSync(dir, { recursive: true, force: true }); });
  return { dir, filename, store, advance: (ms) => { time += ms; } };
}
test('inspection export is authenticated and cannot mutate or release the active slot', async (t) => {
  const f = fixture(t);
  const app = await startWorkbench({ dataDir: f.dir, port: 0 }); t.after(() => app.close());
  const sameDatabase = openStore(join(f.dir, 'workbench.sqlite')); t.after(() => sameDatabase.close());
  const reserved = sameDatabase.executionIntents.reserve(input).intent;
  const url = `${app.origin}/api/execution-intents/inspection-contract`;
  const headers = { Authorization: `Bearer ${app.token}`, Origin: app.origin, 'Content-Type': 'application/json' };
  const request = { method: 'POST', headers, body: JSON.stringify({ id: reserved.id }) };
  assert.equal((await fetch(url, { ...request, headers: { 'Content-Type': 'application/json' } })).status, 401);
  const response = await fetch(url, request); assert.equal(response.status, 200);
  const { contract } = await response.json(); assert.equal(contract.capabilities.stop, false);
  assert.equal(contract.expected.instanceId, null);
  assert.equal((await fetch(url, { ...request, body: JSON.stringify({ id: 'missing' }) })).status, 404);
  assert.equal((await fetch(`${app.origin}/api/execution-intents/stop`, request)).status, 404);
  assert.equal(sameDatabase.executionIntents.list()[0].status, 'reserved');
});
test('atomic reservation, idempotency, owner-checked heartbeat and cancellation retain history without runtime', (t) => {
  const f = fixture(t); const other = openStore(f.filename, { intentNow: () => 10000 }); t.after(() => other.close());
  const first = f.store.executionIntents.reserve(input);
  assert.equal(first.intent.status, 'reserved'); assert.equal(first.intent.runtimeCreated, false);
  assert.equal(other.executionIntents.reserve(input).duplicate, true);
  const beforeRejected = f.store.executionIntents.list();
  assert.throws(() => other.executionIntents.reserve({ ...input, requestId: 'other', ownerInstanceId: 'instance-two' }), /占用/);
  assert.throws(() => other.executionIntents.reserve({ ...input, planDigest: 'c'.repeat(64) }), /冲突/);
  const operation = { ...input, id: first.intent.id };
  assert.throws(() => other.executionIntents.heartbeat({ ...operation, ownerNonce: 'c'.repeat(64) }), /归属/);
  assert.throws(() => other.executionIntents.cancelBeforeLaunch({ ...operation, ownerInstanceId: 'instance-two' }), /归属/);
  assert.deepEqual(f.store.executionIntents.list(), beforeRejected);
  assert.equal(f.store.executionIntents.heartbeat({ ...operation, leaseMs: 5000 }).leaseUntil, 15000);
  assert.equal(f.store.executionIntents.cancelBeforeLaunch(operation).status, 'cancelled_before_launch');
  assert.equal(other.executionIntents.reserve({ ...input, requestId: 'next' }).duplicate, false);
  assert.equal(f.store.executionIntents.list().length, 2);
  const output = JSON.stringify(f.store.executionIntents.list());
  assert.ok(!output.includes(input.ownerNonce)); assert.ok(!output.includes('owner_hash'));
});
test('expiration persists reconciliation, blocks takeover and cannot be revived or released after restart', (t) => {
  const f = fixture(t); const record = f.store.executionIntents.reserve(input).intent;
  f.advance(1000);
  assert.throws(() => f.store.executionIntents.heartbeat({ ...input, id: record.id }), /失效/);
  assert.equal(f.store.executionIntents.list()[0].status, 'needs_reconciliation');
  assert.throws(() => f.store.executionIntents.cancelBeforeLaunch({ ...input, id: record.id }), /失效/);
  const restarted = openStore(f.filename); t.after(() => restarted.close());
  assert.throws(() => restarted.executionIntents.reserve({ ...input, requestId: 'replacement' }), /待对账/);
  assert.equal(restarted.executionIntents.reserve(input).intent.status, 'needs_reconciliation');
  assert.equal(restarted.executionIntents.list()[0].capabilities.execute, false);
});
test('invalid owner, lease and identity fields never reserve a slot', (t) => {
  const f = fixture(t);
  for (const patch of [{ ownerNonce: 'short' }, { ownerInstanceId: 'x' }, { leaseMs: 999 }, { leaseMs: 60001 },
    { leaseMs: 1.5 }, { planDigest: 'invalid' }, { requestId: '../path' }, { materialId: '' }]) {
    assert.throws(() => f.store.executionIntents.reserve({ ...input, ...patch }));
    assert.deepEqual(f.store.executionIntents.list(), []);
  }
  assert.deepEqual(f.store.executionIntents.list(), []);
});

test('unknown saved states block replacement instead of implicitly releasing the slot', (t) => {
  const f = fixture(t); const reserved = f.store.executionIntents.reserve(input).intent;
  const raw = new DatabaseSync(f.filename); t.after(() => raw.close());
  // Simulate malformed/future persisted data without relaxing production constraints.
  raw.exec('PRAGMA ignore_check_constraints=ON');
  raw.prepare('UPDATE execution_intents SET status=? WHERE id=?').run('unexpected_future_state', reserved.id);
  assert.throws(() => f.store.executionIntents.reserve({ ...input, requestId: 'replacement' }), (error) => error.status === 409);
  assert.equal(f.store.executionIntents.list().length, 1);
  assert.equal(f.store.executionIntents.list()[0].status, 'unexpected_future_state');
});

test('invalid clocks deny reservation and mutation without clearing an existing lease', (t) => {
  const f = fixture(t); const reserved = f.store.executionIntents.reserve(input).intent;
  for (const value of [NaN, Infinity, -1, '10000', 1.5, Number.MAX_SAFE_INTEGER]) {
    const other = openStore(f.filename, { intentNow: () => value });
    try {
      assert.throws(() => other.executionIntents.reserve({ ...input, requestId: 'replacement' }), /clock/);
      assert.throws(() => other.executionIntents.heartbeat({ ...input, id: reserved.id }), /clock/);
      assert.throws(() => other.executionIntents.cancelBeforeLaunch({ ...input, id: reserved.id }), /clock/);
    } finally { other.close(); }
  }
  assert.equal(f.store.executionIntents.list()[0].status, 'reserved');
  assert.equal(f.store.executionIntents.list()[0].leaseUntil, reserved.leaseUntil);
});
test('schema v10 migration backs up database before adding intent table and rejects newer versions', (t) => {
  const f = fixture(t); const path = join(f.dir, 'old.sqlite');
  const seeded = openStore(path); seeded.close();
  const old = new DatabaseSync(path); old.exec('DROP TABLE execution_intents; DROP INDEX official_source_runs_source_cursor; PRAGMA user_version=10'); old.close();
  const migrated = openStore(path); assert.deepEqual(migrated.executionIntents.list(), []); migrated.close();
  const backupPath = readdirSync(f.dir).find((name) => name.startsWith('old.sqlite.v10-') && name.endsWith('.bak'));
  assert.ok(backupPath); const backup = new DatabaseSync(join(f.dir, backupPath));
  assert.equal(backup.prepare('PRAGMA user_version').get().user_version, 10); backup.close();
  const newer = new DatabaseSync(path); newer.exec('PRAGMA user_version=14'); newer.close();
  assert.throws(() => openStore(path), /newer/);
});
test('persisted launch attempt fences cancellation, identity replacement and incorrect runtime reports', (t) => {
  const f = fixture(t); const reserved = f.store.executionIntents.reserve(input).intent;
  const launch = { ...input, id: reserved.id, runtimeKind: 'docker', image: `registry.example.com/preview@sha256:${'c'.repeat(64)}`,
    platform: 'linux/arm64', runtimeOwnershipNonce: 'd'.repeat(64) };
  const started = f.store.executionIntents.beginLaunch(launch);
  assert.equal(started.status, 'launching'); assert.equal(started.runtimeCreated, null); assert.equal(started.identityVerified, false);
  assert.throws(() => f.store.executionIntents.cancelBeforeLaunch(launch), /状态/);
  assert.throws(() => f.store.executionIntents.beginLaunch(launch), /状态/);
  const result = { ...launch, launchAttemptId: started.runtimeIdentity.launchAttemptId, outcome: 'identity_reported', instanceId: 'e'.repeat(64) };
  for (const patch of [{ launchAttemptId: 'wrong' }, { runtimeOwnershipNonce: 'f'.repeat(64) }, { platform: 'linux/amd64' },
    { runtimeKind: 'podman' }, { image: 'other' }, { ownerNonce: 'f'.repeat(64) }, { instanceId: 'short-id' }]) {
    assert.throws(() => f.store.executionIntents.recordLaunchResult({ ...result, ...patch }));
  }
  const recorded = f.store.executionIntents.recordLaunchResult(result);
  const contract = f.store.executionIntents.inspectionContract({ id: reserved.id });
  assert.equal(f.store.executionIntents.inspectProfile({ id: reserved.id, executable: '/usr/local/bin/docker' }).executableNow, false);
  assert.equal(f.store.executionIntents.compareInspectResults({ id: reserved.id }).status, 'unknown');
  assert.equal(contract.expected.instanceId, result.instanceId); assert.equal(contract.capabilities.stop, false);
  const compared = f.store.executionIntents.compareObservation({ id: reserved.id, observation: {
    result: 'found', intentId: reserved.id, launchAttemptId: started.runtimeIdentity.launchAttemptId,
    runtimeKind: launch.runtimeKind, instanceId: result.instanceId, image: launch.image, platform: launch.platform,
    ownerInstanceId: input.ownerInstanceId, planDigest: input.planDigest, runtimeOwnershipNonce: launch.runtimeOwnershipNonce,
    observedAt: 10000, state: 'running',
  } });
  assert.equal(compared.status, 'claims_match_only'); assert.equal(compared.capabilities.stop, false);
  assert.throws(() => f.store.executionIntents.inspectionContract({ id: 'missing' }), /不存在/);
  assert.equal(recorded.status, 'identity_recorded'); assert.equal(recorded.identityVerified, false);
  assert.equal(f.store.executionIntents.recordLaunchResult(result).runtimeIdentity.instanceId, result.instanceId);
  assert.throws(() => f.store.executionIntents.recordLaunchResult({ ...result, instanceId: 'f'.repeat(64) }), /覆写/);
  assert.throws(() => f.store.executionIntents.reserve({ ...input, requestId: 'new' }), /占用/);
  assert.equal(f.store.executionIntents.heartbeat({ ...input, id: reserved.id }).status, 'identity_recorded');
  assert.ok(!JSON.stringify(f.store.executionIntents.list()).includes(launch.runtimeOwnershipNonce));
  assert.ok(!JSON.stringify(f.store.executionIntents.list()).includes('ownershipHash'));
  f.advance(1000);
  const recovered = f.store.executionIntents.list()[0]; assert.equal(recovered.status, 'needs_reconciliation');
  assert.equal(recovered.runtimeIdentity.instanceId, result.instanceId);
  assert.throws(() => f.store.executionIntents.recordLaunchResult(result), /失效/);
});
test('unknown launch result and crash after launch intent retain slot without claiming runtime absence', (t) => {
  const f = fixture(t); const reserved = f.store.executionIntents.reserve(input).intent;
  const launch = { ...input, id: reserved.id, runtimeKind: 'podman', image: `registry.example.com/preview@sha256:${'c'.repeat(64)}`,
    platform: 'linux/amd64', runtimeOwnershipNonce: 'd'.repeat(64) };
  const started = f.store.executionIntents.beginLaunch(launch);
  const reopened = openStore(f.filename, { intentNow: () => 10000 }); t.after(() => reopened.close());
  assert.equal(reopened.executionIntents.list()[0].status, 'launching');
  const unknown = reopened.executionIntents.recordLaunchResult({ ...launch, launchAttemptId: started.runtimeIdentity.launchAttemptId, outcome: 'unknown' });
  assert.equal(unknown.status, 'needs_reconciliation'); assert.equal(unknown.runtimeCreated, null);
  assert.throws(() => reopened.executionIntents.cancelBeforeLaunch(launch), /失效/);
  assert.throws(() => reopened.executionIntents.reserve({ ...input, requestId: 'takeover' }), /待对账/);
});
test('launch intent without a returned result expires to reconciliation and retains attempt identity', (t) => {
  const f = fixture(t); const reserved = f.store.executionIntents.reserve(input).intent;
  const launch = { ...input, id: reserved.id, runtimeKind: 'docker', image: `registry.example.com/preview@sha256:${'c'.repeat(64)}`,
    platform: 'linux/arm64', runtimeOwnershipNonce: 'd'.repeat(64) };
  const started = f.store.executionIntents.beginLaunch(launch);
  f.advance(1000);
  const expired = f.store.executionIntents.list()[0];
  assert.equal(expired.status, 'needs_reconciliation'); assert.equal(expired.runtimeCreated, null);
  assert.equal(expired.runtimeIdentity.launchAttemptId, started.runtimeIdentity.launchAttemptId);
  assert.throws(() => f.store.executionIntents.recordLaunchResult({ ...launch, launchAttemptId: started.runtimeIdentity.launchAttemptId, outcome: 'unknown' }), /失效/);
});
test('simulated inspection fences cross-connection lease changes against the persisted attempt snapshot', async (t) => {
  const f = fixture(t); const reserved = f.store.executionIntents.reserve(input).intent;
  const launch = { ...input, id: reserved.id, runtimeKind: 'docker', image: `registry.example.com/preview@sha256:${'c'.repeat(64)}`,
    platform: 'linux/arm64', runtimeOwnershipNonce: 'd'.repeat(64) };
  const started = f.store.executionIntents.beginLaunch(launch);
  f.store.executionIntents.recordLaunchResult({ ...launch, launchAttemptId: started.runtimeIdentity.launchAttemptId, outcome: 'identity_reported', instanceId: 'e'.repeat(64) });
  const other = openStore(f.filename, { intentNow: () => 10000 }); t.after(() => other.close());
  const result = await f.store.executionIntents.simulateInspection({ id: reserved.id, executable: '/usr/bin/docker', profileId: 'docker_linux_system', simulatedOnly: true,
    simulate: async () => { other.executionIntents.heartbeat({ ...input, id: reserved.id, leaseMs: 5000 }); return { exitCode: 1 }; } });
  assert.deepEqual(result.issues, ['snapshot_or_lease_changed_during_inspection']);
  assert.equal(result.capabilities.release, false);
  assert.equal(f.store.executionIntents.list()[0].status, 'identity_recorded');
});
test('v11 intent migration preserves active ownership and backs up pre-migration records', (t) => {
  const f = fixture(t); const path = join(f.dir, 'v11.sqlite');
  const seeded = openStore(path); const original = seeded.executionIntents.reserve(input).intent; seeded.close();
  const old = new DatabaseSync(path);
  old.exec(`DROP INDEX official_source_runs_source_cursor; DROP INDEX execution_intents_active_slot; ALTER TABLE execution_intents DROP COLUMN runtime_payload;
    CREATE UNIQUE INDEX execution_intents_active_slot ON execution_intents(slot) WHERE status IN ('reserved','needs_reconciliation'); PRAGMA user_version=11`); old.close();
  const migrated = openStore(path, { intentNow: () => original.createdAt }); t.after(() => migrated.close());
  assert.equal(migrated.executionIntents.list()[0].id, original.id);
  assert.equal(migrated.executionIntents.list()[0].status, 'reserved');
  assert.equal(migrated.executionIntents.cancelBeforeLaunch({ ...input, id: original.id }).status, 'cancelled_before_launch');
  assert.ok(readdirSync(f.dir).some((name) => name.startsWith('v11.sqlite.v11-') && name.endsWith('.bak')));
});
test('two separate processes racing for the same initialized slot yield exactly one reservation', { timeout: 10000 }, async (t) => {
  const f = fixture(t);
  const moduleUrl = new URL('../src/store.mjs', import.meta.url).href;
  const code = `import {openStore} from ${JSON.stringify(moduleUrl)};
    const store=openStore(process.argv[1]); console.log('ready');
    process.stdin.once('data',()=>{try{store.executionIntents.reserve(JSON.parse(process.argv[2]));console.log('won');}
      catch(error){console.log(error.status===409?'blocked':'error:'+error.message);}finally{store.close();}});`;
  function child(number) {
    const proc = spawn(process.execPath, ['--input-type=module', '-e', code, f.filename,
      JSON.stringify({ ...input, requestId: `request-${number}`, ownerInstanceId: `instance-${number}` })], { stdio: ['pipe', 'pipe', 'pipe'] });
    t.after(() => { if (proc.exitCode === null) proc.kill(); });
    let output = ''; let errors = ''; let readyResolve;
    const ready = new Promise((resolve) => { readyResolve = resolve; });
    proc.stdout.on('data', (bytes) => { output += bytes; if (output.includes('ready')) readyResolve(); });
    proc.stderr.on('data', (bytes) => { errors += bytes; });
    const done = new Promise((resolve, reject) => { proc.on('error', reject); proc.on('exit', (code) => code === 0 ? resolve(output) : reject(new Error(errors))); });
    return { proc, ready, done };
  }
  const a = child(1); const b = child(2);
  await Promise.all([a.ready, b.ready]); a.proc.stdin.end('go'); b.proc.stdin.end('go');
  const outputs = await Promise.all([a.done, b.done]);
  assert.equal(outputs.filter((output) => output.includes('won')).length, 1);
  assert.equal(outputs.filter((output) => output.includes('blocked')).length, 1);
  assert.equal(f.store.executionIntents.list().length, 1);
});
test('owner process exits without cancellation; subsequent controller preserves reservation then reconciliation', { timeout: 10000 }, async (t) => {
  const f = fixture(t);
  const code = `import {openStore} from ${JSON.stringify(new URL('../src/store.mjs', import.meta.url).href)};
    const store=openStore(process.argv[1],{intentNow:()=>10000});
    store.executionIntents.reserve(JSON.parse(process.argv[2])); process.exit(0);`;
  const child = spawn(process.execPath, ['--input-type=module', '-e', code, f.filename, JSON.stringify(input)], { stdio: 'ignore' });
  t.after(() => { if (child.exitCode === null) child.kill(); });
  await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`Owner exited ${code}`))); });
  assert.equal(f.store.executionIntents.list()[0].status, 'reserved');
  f.advance(1000); assert.equal(f.store.executionIntents.list()[0].status, 'needs_reconciliation');
  assert.throws(() => f.store.executionIntents.reserve({ ...input, requestId: 'after-crash' }), /待对账/);
});
