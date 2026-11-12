import assert from 'node:assert/strict';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { activeVersion, assertTopology, SERVICES } from './desktop-cloud-release.mjs';
import { normalizedBindings } from './desktop-cloud-transport.mjs';
import { digest } from './desktop-release-assets.mjs';
import { withRunLock } from './desktop-publish.mjs';
import { parseWrangler } from './game-release.mjs';
import { NTE_MIGRATION_ORDER, assertNteMigrationIdentity, assertNteMigrationTopology } from './nte-release-config.mjs';

export const GENSHIN_MIGRATION_POLICY = 'genshin-content-production-migration-v1';
export const GENSHIN_MIGRATION_ORDER = Object.freeze(['genshin', 'router', 'main']);
const services = { genshin: 'gachia-game-genshin', main: 'gachia', router: 'gachia-router' };
const configPins = {
  genshin: '71044abce9df463b547e471016b62f83715aba87c764d394bdd9336e0724add2',
  main: 'b1693ed74f4428f9180e877643d3455c43aef29161dc03ed223c3f4c64b973ff',
  router: '271086b3498a5fa24dd77e5be3f04da8211b0ef2bc0be158c67f137f51d2219a',
};
const SHA = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const fresh = at => assert(Number.isSafeInteger(at) && at <= Date.now() && Date.now() - at < 900000, 'Migration evidence expired');
const exactKeys = (value, keys) => assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), 'Unexpected migration fields');

// Configuration derivation is local only. It does not grant upload authority or
// relax the existing editorial production configuration allowlist.
export function genshinMigrationConfig(owner, source) {
  assert(Object.hasOwn(configPins, owner), 'Unknown migration owner');
  assert.equal(digest(source), configPins[owner], 'Migration configuration requires review');
  const config = parseWrangler(source);
  assert.equal(config.name, services[owner]);
  if (owner === 'main') {
    assert(!config.services.some(row => row.binding === 'GENSHIN_CONTENT'));
    assert(!Object.hasOwn(config.vars, 'GENSHIN_CONTENT_ENABLED'));
    config.services.push({ binding: 'GENSHIN_CONTENT', service: services.genshin });
    config.vars.GENSHIN_CONTENT_ENABLED = 'true';
  } else if (owner === 'router') {
    assert.equal(config.vars.GENSHIN_ENABLED, 'true');
    assert.equal(config.vars.GENSHIN_FULL_CUTOVER, 'true');
    assert(!Object.hasOwn(config.vars, 'GENSHIN_CONTENT_ENABLED'));
    config.vars.GENSHIN_CONTENT_ENABLED = 'true';
  }
  return config;
}

function migratedBindings(owner, baseline) {
  const bindings = structuredClone(baseline);
  if (owner === 'genshin') return normalizedBindings(bindings);
  assert(!bindings.some(row => row.name === 'GENSHIN_CONTENT_ENABLED'), 'Content migration is already configured');
  bindings.push({ name: 'GENSHIN_CONTENT_ENABLED', text: 'true', type: 'plain_text' });
  if (owner === 'main') {
    assert(!bindings.some(row => row.name === 'GENSHIN_CONTENT'), 'Content service binding already exists');
    bindings.push({ name: 'GENSHIN_CONTENT', service: services.genshin, environment: 'production', type: 'service' });
  }
  return normalizedBindings(bindings);
}

// Only the two explicitly reviewed binding deltas are permitted. Routes,
// domains, tags, secret names, staging and other games remain byte-for-byte
// controlled by the original topology checker.
/** @param {any} before @param {any} after @param {{configured?: string[], deployed?: Record<string, string>}} [options] */
export function assertGenshinMigrationTopology(before, after, { configured = [], deployed = {} } = {}) {
  assert.deepEqual(configured, GENSHIN_MIGRATION_ORDER.slice(0, configured.length), 'Invalid configured owner order');
  assert(Object.keys(deployed).every(owner => configured.includes(owner)), 'Unconfigured deployment');
  const expected = structuredClone(before);
  for (const owner of configured) {
    assert(GENSHIN_MIGRATION_ORDER.includes(owner));
    const service = services[owner], bindings = migratedBindings(owner, before.bindings[service]);
    assert.deepEqual(normalizedBindings(before.settings[service].bindings), normalizedBindings(before.bindings[service]), 'Inconsistent migration baseline');
    expected.bindings[service] = bindings;
    expected.settings[service].bindings = bindings;
  }
  const observed = structuredClone(after);
  for (const service of SERVICES) {
    observed.bindings[service] = normalizedBindings(observed.bindings[service]);
    observed.settings[service].bindings = normalizedBindings(observed.settings[service].bindings);
    expected.bindings[service] = normalizedBindings(expected.bindings[service]);
    expected.settings[service].bindings = normalizedBindings(expected.settings[service].bindings);
  }
  const changed = Object.fromEntries(Object.entries(deployed).map(([owner, version]) => {
    assert(UUID.test(version), 'Invalid migration deployment UUID'); return [services[owner], version];
  }));
  assertTopology(expected, observed, changed);
}

export function assertGenshinMigrationIdentity(value) {
  exactKeys(value, ['policy', 'releaseKey', 'sourceCommit', 'sourceCI', 'sourceIndexPin', 'activePin', 'baseline', 'observedAt', 'owners']);
  assert.equal(value.policy, GENSHIN_MIGRATION_POLICY);
  for (const key of ['releaseKey', 'sourceIndexPin', 'activePin']) assert(SHA.test(value[key]), `Missing ${key}`);
  assert(/^[a-f0-9]{40}$/.test(value.sourceCommit));
  assert.equal(value.sourceCI.status, 'full_exact_ci_passed');
  assert.equal(value.sourceCI.commit, value.sourceCommit);
  assert(Number.isSafeInteger(value.sourceCI.runID) && value.sourceCI.runID > 0);
  assertTopology(value.baseline, value.baseline);
  fresh(value.observedAt);
  exactKeys(value.owners, GENSHIN_MIGRATION_ORDER);
  for (const owner of GENSHIN_MIGRATION_ORDER) {
    const row = value.owners[owner];
    exactKeys(row, ['service', 'sourceVersionId', 'sourceIdentityPin', 'candidate', 'recovery']);
    assert.equal(row.service, services[owner]);
    assert.equal(row.sourceVersionId, activeVersion(value.baseline, row.service));
    assert(SHA.test(row.sourceIdentityPin));
    for (const role of ['candidate', 'recovery']) {
      exactKeys(row[role], ['moduleSHA256', 'artifactPin', 'configPin', 'referencesPin']);
      const proof = row[role];
      for (const key of ['moduleSHA256', 'artifactPin', 'configPin', 'referencesPin']) assert(SHA.test(proof[key]));
    }
  }
}

// Protocol core, deliberately without a CLI or a production adapter. A fixed
// adapter must independently reopen CI, current published A, source identities,
// sealed new/compatible-old artifacts. Each downstream preview is taken only
// after its dependency is live: Genshin, Router (still compatible with old Main),
// then Main. No zero-percent deployment or preview dependency override is used.
export function assertGenshinMigrationStoppedPrefix(identity, rows) {
  assertGenshinMigrationIdentity({ ...identity, observedAt: Date.now() });
  assert.deepEqual(rows.map(row => row.phase), ['baseline', 'upload_intent', 'upload_returned', 'preview_accepted',
    'upload_intent', 'upload_returned', 'preview_accepted', 'deployment_intent', 'deployed', 'stopped', 'read_only_reconciliation'],
  'Only a known Genshin deployment stopped before step acceptance can continue');
  let previousAt = -Infinity;
  for (const row of rows) {
    assert.equal(row.releaseKey, identity.releaseKey); assert.equal(row.policy, identity.policy);
    const at = Date.parse(row.at); assert(at >= previousAt && at <= Date.now()); previousAt = at;
  }
  assert.deepEqual(rows[0].baseline, identity.baseline); assert.deepEqual(rows[0].owners, identity.owners);
  const accepted = { genshin: { recovery: rows[3].proof, candidate: rows[6].proof } };
  const deployed = { genshin: accepted.genshin.candidate.versionId };
  assert(UUID.test(deployed.genshin)); assert.equal(rows[8].versionId, deployed.genshin);
  assert.equal(rows[8].owner, 'genshin'); assert.equal(rows[8].result.versionId, deployed.genshin);
  assert(UUID.test(rows[8].result.deploymentId));
  assert.equal(rows[9].pendingOperation, undefined); assert.equal(rows[10].pendingOperation, undefined);
  assert.equal(rows[9].automaticRetry, false); assert.equal(rows[9].automaticRollback, false);
  assert.deepEqual(rows[9].deployed, deployed); assert.deepEqual(rows[9].accepted, accepted);
  assertGenshinMigrationTopology(identity.baseline, rows[10].snapshot, { configured: ['genshin'], deployed });
  assert.equal(rows[10].snapshot.services[services.genshin].id, rows[8].result.deploymentId);
  return { accepted, deployed };
}

export function executeGenshinMigration(input) {
  return executeMigration(input);
}
export function executeNteMigration(input) { return executeMigration(input, undefined, 'nte'); }

export function executeGenshinMigrationContinuation(input) {
  assert(input.previous && SHA.test(input.previous.journal.pin));
  assert.equal(digest(readFileSync(input.previous.journal.path)), input.previous.journal.pin);
  const rows = readFileSync(input.previous.journal.path, 'utf8').trimEnd().split('\n').map(JSON.parse);
  const state = assertGenshinMigrationStoppedPrefix(input.previous.identity, rows);
  assert.notEqual(input.releaseKey, input.previous.identity.releaseKey, 'Continuation requires its own release identity');
  return executeMigration(input, { ...state, proof: input.previous.journal, identity: input.previous.identity });
}

async function executeMigration({ run, releaseKey, verify, transport }, continuation, game = 'genshin') {
  assert(['genshin', 'nte'].includes(game)); assert(game === 'genshin' || !continuation);
  const order = game === 'nte' ? NTE_MIGRATION_ORDER : GENSHIN_MIGRATION_ORDER;
  const gameServices = game === 'nte' ? { nte: 'gachia-game-nte', router: 'gachia-router', main: 'gachia' } : services;
  const assertIdentity = game === 'nte' ? assertNteMigrationIdentity : assertGenshinMigrationIdentity;
  const assertMigrationTopology = game === 'nte' ? assertNteMigrationTopology : assertGenshinMigrationTopology;
  return withRunLock(run, async () => {
    const initial = structuredClone(await verify());
    assertIdentity(initial);
    assert.equal(releaseKey, initial.releaseKey, 'Explicit migration release identity required');
    const journal = join(run, `${game}-migration-${releaseKey}.jsonl`);
    writeFileSync(journal, '', { flag: 'wx', mode: 0o600 });
    const record = value => appendFileSync(journal, JSON.stringify({ at: new Date().toISOString(), policy: initial.policy, releaseKey, ...value }) + '\n', { flush: true });
    if (continuation) assert.deepEqual({ ...initial, releaseKey: continuation.identity.releaseKey, observedAt: continuation.identity.observedAt }, continuation.identity);
    const configured = continuation ? ['genshin'] : [], deployed = structuredClone(continuation?.deployed ?? {}), accepted = structuredClone(continuation?.accepted ?? {});
    let pendingOperation, observedAt = initial.observedAt;
    const revalidate = async () => {
      const current = await verify(); assertIdentity(current);
      assert(current.observedAt >= observedAt, 'Migration observation moved backwards');
      assert.deepEqual({ ...current, observedAt: initial.observedAt }, initial, 'Migration identity changed');
      observedAt = current.observedAt;
      assertMigrationTopology(initial.baseline, await transport.snapshot(), { configured, deployed });
    };
    record({ phase: continuation ? 'continuation_baseline' : 'baseline', baseline: initial.baseline, owners: initial.owners,
      ...(continuation ? { previousJournal: continuation.proof, previousReleaseKey: continuation.identity.releaseKey, deployed, accepted } : {}) });
    try {
      await revalidate();
      if (continuation) {
        const proof = await transport.acceptStep({ owner: 'genshin', deployed: { ...deployed } });
        assert.equal(proof.status, 'passed'); assert(SHA.test(proof.evidenceSHA256));
        record({ phase: 'step_accepted', owner: 'genshin', proof });
        await revalidate();
      }
      for (const owner of order.slice(continuation ? 1 : 0)) {
        const row = initial.owners[owner];
        accepted[owner] = {};
        for (const role of ['recovery', 'candidate']) {
          await revalidate();
          pendingOperation = { phase: 'upload', owner, role, service: row.service };
          record({ ...pendingOperation, phase: 'upload_intent', sealed: row[role] });
          const result = await transport.upload({ owner, role, service: row.service, sealed: row[role], releaseKey });
          assert(UUID.test(result.versionId), 'Unknown upload outcome; do not retry');
          assert.notEqual(result.versionId, row.sourceVersionId, 'Raw old UUID is not compatible recovery');
          if (role === 'candidate') {
            assert.notEqual(result.versionId, accepted[owner].recovery.versionId);
            configured.push(owner);
          }
          pendingOperation.versionId = result.versionId;
          record({ ...pendingOperation, phase: 'upload_returned' });
          const proof = await transport.inspect({ owner, role, service: row.service, versionId: result.versionId, sealed: row[role] });
          assert.equal(proof.versionId, result.versionId); assert.equal(proof.moduleSHA256, row[role].moduleSHA256);
          assert(SHA.test(proof.moduleProof?.pin) && SHA.test(proof.versionPin), 'Immutable uploaded module proof required');
          await revalidate();
          const preview = await transport.preview({ owner, role, service: row.service, versionId: result.versionId, sealed: row[role], inspected: proof });
          assert.equal(preview.status, 'passed'); assert.equal(preview.observationMode, 'cloud_exact_version');
          assert.equal(preview.service, row.service); assert.equal(preview.versionId, result.versionId); assert(SHA.test(preview.evidenceSHA256));
          await transport.revalidate({ owner, role, service: row.service, versionId: result.versionId, sealed: row[role], inspected: proof });
          await revalidate();
          accepted[owner][role] = { ...proof, evidenceSHA256: preview.evidenceSHA256, acceptedAt: Date.now() };
          record({ phase: 'preview_accepted', owner, role, proof: accepted[owner][role] }); pendingOperation = undefined;
        }
        await revalidate();
        for (const role of ['recovery', 'candidate']) {
          fresh(accepted[owner][role].acceptedAt);
          await transport.revalidate({ owner, role, service: row.service, versionId: accepted[owner][role].versionId,
            sealed: row[role], inspected: accepted[owner][role] });
        }
        await revalidate();
        pendingOperation = { phase: 'deployment', owner, service: row.service, versionId: accepted[owner].candidate.versionId };
        record({ ...pendingOperation, phase: 'deployment_intent', observedAt });
        const result = await transport.promote({ ...pendingOperation, releaseKey });
        assert.equal(result.service, row.service); assert.equal(result.versionId, accepted[owner].candidate.versionId);
        assert(UUID.test(result.deploymentId), 'Unknown deployment outcome; do not retry');
        deployed[owner] = accepted[owner].candidate.versionId;
        record({ ...pendingOperation, phase: 'deployed', result }); pendingOperation = undefined;
        await revalidate();
        const proof = await transport.acceptStep({ owner, deployed: { ...deployed } });
        assert.equal(proof.status, 'passed'); assert(SHA.test(proof.evidenceSHA256));
        record({ phase: 'step_accepted', owner, proof });
      }
      await revalidate();
      const proof = await transport.acceptProduction({ deployed: { ...deployed }, accepted: structuredClone(accepted) });
      assert.equal(proof.status, 'passed'); assert(SHA.test(proof.evidenceSHA256));
      assert.deepEqual(proof.versions, Object.fromEntries(order.map(owner => [gameServices[owner], deployed[owner]])));
      await revalidate();
      record({ phase: 'production_accepted', proof });
      return { policy: initial.policy, status: 'production_accepted', versions: proof.versions,
        journalPin: digest(readFileSync(journal)), sourceAdvanced: false };
    } catch (error) {
      record({ phase: 'stopped', pendingOperation, deployed, accepted, error: error.message, automaticRetry: false, automaticRollback: false });
      try { record({ phase: 'read_only_reconciliation', snapshot: await transport.snapshot(), pendingOperation }); }
      catch (failure) { record({ phase: 'observation_unavailable', error: failure.message }); }
      throw error;
    }
  });
}
