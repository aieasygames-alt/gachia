import assert from 'node:assert/strict';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { digest, verifyRetainedCandidate } from './desktop-release-assets.mjs';
import { withRunLock } from './desktop-publish.mjs';
import { assertReleaseScope } from './desktop-release-scope.mjs';

const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const SHA = /^[a-f0-9]{64}$/;
export const SERVICES = ['gachia', 'gachia-staging', 'gachia-router', 'gachia-game-genshin', 'gachia-game-nte', 'gachia-game-azur-promilia', 'gachia-game-lvmeng'];
const serviceFor = owner => owner === 'main' ? 'gachia' : `gachia-game-${owner}`;

export async function desktopCloudSnapshot(token, request = fetch, { allowSplit = false } = {}) {
  assert(typeof token === 'string' && token.length > 0, 'Cloudflare credential required');
  const account = 'accounts/e6472b6c6172a3ac1e1596ef100543ae';
  const get = async path => {
    const response = await request(`https://api.cloudflare.com/client/v4/${path}`, { method: 'GET', redirect: 'error', headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
    const body = await response.json(); assert(response.ok && body.success, `Read-only Cloudflare request failed: ${response.status}`);
    return body.result;
  };
  const snapshot = { services: {}, settings: {}, bindings: {}, subdomains: {} };
  for (const service of SERVICES) {
    const base = `${account}/workers/scripts/${service}`;
    snapshot.services[service] = (await get(base + '/deployments')).deployments.toSorted((a, b) => Date.parse(a.created_on) - Date.parse(b.created_on)).at(-1);
    if (!allowSplit) activeVersion(snapshot, service);
    const settings = await get(base + '/settings');
    settings.bindings = settings.bindings.map(binding => binding.type === 'secret_text' ? { type: binding.type, name: binding.name } : binding);
    snapshot.settings[service] = settings;
    snapshot.bindings[service] = settings.bindings;
    snapshot.subdomains[service] = await get(base + '/subdomain');
  }
  snapshot.scripts = (await get(`${account}/workers/scripts`)).map(row => row.id).sort();
  snapshot.routes = await get('zones/9ebfe7f1aeb7225947a1fc50c0deffc8/workers/routes');
  snapshot.domains = (await get(`${account}/workers/domains`)).filter(row => row.hostname === 'gachia.com' || row.hostname.endsWith('.gachia.com'));
  return snapshot;
}

// A separate continuation never calls upload. Its verifier must re-open pinned
// preview bodies and cloud recovery evidence, not trust a caller-supplied flag.
// The controlled desktop wrapper supplies the pinned recovery evidence gate.
export async function executePromotionContinuation({ run, retentionId, verify, authorize, transport }) {
  return withRunLock(run, async () => {
    assert(/^[a-f0-9]{16}$/.test(retentionId));
    const initial = structuredClone(await verify());
    const check = value => {
      assert.equal(value.plan.preview, false); assert(value.plan.changed.length > 0);
      const scope = assertReleaseScope(value.plan, value.manifest.owners);
      assert(SHA.test(value.plan.releaseKey)); assert.equal(value.manifest.retentionId, retentionId, 'Continuation journal belongs to another retention');
      assert.deepEqual(Object.keys(value.accepted).sort(), [...scope.services].sort());
      assert.deepEqual(Object.keys(value.recovery.owners).sort(), [...scope.owners].sort());
      assert(SHA.test(value.journalPin) && SHA.test(value.recoveryPin));
      assert.equal(value.recovery.status, 'exact_cloud_recovery_previews_accepted', 'Cloud recovery acceptance required');
      assert.equal(value.recovery.releaseKey, value.plan.releaseKey);
      for (const owner of value.plan.owners) {
        const service = serviceFor(owner), proof = value.accepted[service], recovery = value.recovery.owners[owner];
        assert.equal(proof.service, service); assert.equal(proof.status, 'passed');
        assert.equal(proof.releaseKey, value.plan.releaseKey);
        assert.equal(proof.moduleSHA256, value.manifest.owners[owner].moduleSHA256);
        assert.equal(proof.artifactSHA256, value.manifest.owners[owner].artifactSHA256);
        assert(UUID.test(proof.versionId) && SHA.test(proof.moduleSHA256) && SHA.test(proof.artifactSHA256) && SHA.test(proof.evidenceSHA256));
        assert(proof.versionId !== activeVersion(value.baseline, service));
        assert(Number.isSafeInteger(proof.acceptedAt) && proof.acceptedAt <= Date.now() && Date.now() - proof.acceptedAt < 15 * 60 * 1000, 'Preview acceptance expired');
        assert.equal(recovery.sourceVersionId, activeVersion(value.baseline, service));
        assert.equal(recovery.candidateArtifactSHA256, proof.artifactSHA256);
        assert(UUID.test(recovery.versionId) && recovery.versionId !== recovery.sourceVersionId && recovery.versionId !== proof.versionId, 'Raw old UUID is not compatible recovery');
        assert(SHA.test(recovery.evidenceSHA256));
        assert(Number.isSafeInteger(recovery.acceptedAt) && recovery.acceptedAt <= Date.now() && Date.now() - recovery.acceptedAt < 15 * 60 * 1000, 'Recovery preview acceptance expired');
      }
      assertTopology(value.baseline, value.baseline);
      assertTopology(value.manifest.snapshot, value.baseline);
    };
    check(initial); assert.equal(await authorize(initial), initial.plan.releaseKey);
    const revalidate = async () => { const fresh = await verify(); check(fresh); assert.deepEqual(fresh, initial, 'Promotion evidence changed'); };
    const journal = join(run, `promotion-${retentionId}.jsonl`);
    writeFileSync(journal, '', { flag: 'wx', mode: 0o600 });
    const record = row => appendFileSync(journal, JSON.stringify({ at: new Date().toISOString(), releaseKey: initial.plan.releaseKey, previewJournalPin: initial.journalPin, recoveryPin: initial.recoveryPin, ...row }) + '\n', { flush: true });
    const promoted = {}; let pendingOperation;
    record({ phase: 'baseline', baseline: initial.baseline, accepted: initial.accepted });
    try {
      assertTopology(initial.baseline, await transport.snapshot());
      const remote = await transport.verifyVersions(initial);
      assert.equal(remote.status, 'passed');
      const versions = Object.fromEntries(Object.entries(initial.accepted).map(([service, proof]) => [service, proof.versionId]));
      assert.deepEqual(remote.versions, versions, 'Fresh remote UUID verification required');
      assert.deepEqual(remote.modules, Object.fromEntries(Object.entries(initial.accepted).map(([service, proof]) => [service, proof.moduleSHA256])), 'Fresh remote module verification required');
      assert.deepEqual(remote.recoveryVersions, Object.fromEntries(initial.plan.owners.map(owner => [serviceFor(owner), initial.recovery.owners[owner].versionId])), 'Fresh cloud recovery verification required');
      assert(SHA.test(remote.evidenceSHA256)); record({ phase: 'remote_versions_verified', proof: remote });
      for (const owner of initial.plan.owners) {
        await revalidate(); assertTopology(initial.baseline, await transport.snapshot(), promoted);
        const service = serviceFor(owner), versionId = versions[service];
        pendingOperation = { phase: 'promotion', owner, service, versionId };
        record({ ...pendingOperation, phase: 'promotion_intent' });
        await transport.promote({ owner, service, versionId, releaseKey: initial.plan.releaseKey });
        promoted[service] = versionId;
        assertTopology(initial.baseline, await transport.snapshot(), promoted);
        record({ ...pendingOperation, phase: 'promoted' }); pendingOperation = undefined;
      }
      await revalidate();
      const proof = await transport.acceptProduction(initial);
      assert.equal(proof.status, 'passed'); assert.equal(proof.releaseKey, initial.plan.releaseKey);
      assert.deepEqual(proof.versions, versions); assert(SHA.test(proof.evidenceSHA256));
      await revalidate();
      assertTopology(initial.baseline, await transport.snapshot(), promoted);
      record({ phase: 'production_accepted', proof });
      return { status: 'production_accepted', versions, journalSHA256: digest(readFileSync(journal)) };
    } catch (error) {
      record({ phase: 'stopped', error: error.message, pendingOperation, promoted });
      try { record({ phase: 'reconciliation', result: { ...reconcileRelease(initial.baseline, await transport.snapshot(), initial.accepted), unresolvedOperation: pendingOperation } }); }
      catch (failure) { record({ phase: 'reconciliation_unavailable', error: failure.message }); }
      throw error;
    }
  });
}

export function activeVersion(snapshot, service) {
  const deployment = snapshot.services?.[service];
  assert(UUID.test(deployment?.id) && deployment.versions?.length === 1 && deployment.versions[0].percentage === 100, `Split/missing deployment: ${service}`);
  assert(UUID.test(deployment.versions[0].version_id), 'Invalid active UUID');
  return deployment.versions[0].version_id;
}

export function assertTopology(before, after, changed = {}) {
  assert.deepEqual(Object.keys(before.services).sort(), [...SERVICES].sort(), 'Incomplete protected service set');
  assert.deepEqual(Object.keys(after.services).sort(), [...SERVICES].sort(), 'Protected service set changed');
  for (const key of ['bindings', 'routes', 'domains', 'settings', 'subdomains', 'scripts']) {
    assert(before[key] !== undefined && after[key] !== undefined, `Missing topology evidence: ${key}`);
    // Workers /settings reports the latest uploaded version's message, even
    // before deployment. Keep it in evidence, but not in the topology identity.
    const identity = value => key !== 'settings' ? value : Object.fromEntries(Object.entries(value).map(([service, settings]) => {
      if (!settings?.annotations || !Object.hasOwn(settings.annotations, 'workers/message')) return [service, settings];
      const { 'workers/message': message, ...annotations } = settings.annotations;
      assert.equal(typeof message, 'string', 'Invalid Worker version message');
      return [service, { ...settings, annotations }];
    }));
    assert.deepEqual(identity(after[key]), identity(before[key]), `Topology drift: ${key}`);
  }
  for (const service of SERVICES) {
    activeVersion(before, service);
    if (Object.hasOwn(changed, service)) assert.equal(activeVersion(after, service), changed[service], `Unexpected promoted version: ${service}`);
    else assert.deepEqual(after.services[service], before.services[service], `Protected deployment drift: ${service}`);
  }
  assert(Object.keys(changed).every(service => SERVICES.includes(service)), 'Unknown promotion target');
}

export function reconcileRelease(baseline, current, uploaded = {}) {
  const owners = {}, drift = [];
  try { assertTopology(baseline, current, Object.fromEntries(Object.keys(uploaded).map(service => [service, activeVersion(current, service)]))); }
  catch (error) { drift.push(error.message); }
  for (const [service, candidate] of Object.entries(uploaded)) {
    try {
      assert(SERVICES.includes(service) && UUID.test(candidate.versionId), 'Unrecognized upload');
      const live = activeVersion(current, service), original = activeVersion(baseline, service);
      owners[service] = { original, candidate: candidate.versionId, live, state: live === candidate.versionId ? 'candidate' : live === original ? 'original' : 'unexpected' };
      if (owners[service].state === 'unexpected') drift.push(`${service}: unrelated active version`);
      if (owners[service].state === 'original' && current.services[service].id !== baseline.services[service].id) drift.push(`${service}: deployment changed back to original version`);
    } catch (error) { drift.push(error.message); }
  }
  const states = Object.values(owners).map(row => row.state);
  const status = drift.length ? 'drift_requires_manual_reconciliation' : states.length === 0 || states.every(s => s === 'original') ? 'baseline_active'
    : states.every(s => s === 'candidate') ? 'candidates_active_acceptance_still_required' : 'partial_promotion_requires_manual_reconciliation';
  return { status, owners, drift, automaticRetry: false, automaticRollback: false, cloudWrites: false };
}

// Upload/preview can stop without moving traffic. Production promotion remains
// a separate capability; it cannot be implied by preparing a cloud preview.
export async function executeReleaseProtocol({ run, pin, retentionId, retentionPin, authorize, transport, previewOnly = false, verify = verifyRetainedCandidate }) {
  return withRunLock(run, async () => {
    const { plan, receipt } = verify(run, pin, retentionId, retentionPin);
    assert.equal(plan.preview, false, 'Preview/rehearsal candidates must never enter the cloud executor');
    assert(plan.changed.length > 0, 'No changed editorial content');
    assert.deepEqual(plan.owners, [plan.game, 'main']);
    assert(['genshin', 'nte'].includes(plan.game));
    const release = { releaseKey: plan.releaseKey, planSHA256: pin, retentionId, retentionPin };
    assert.equal(await authorize(release), plan.releaseKey, 'Explicit local release intent required');
    // An existing journal blocks retries even when the previous process died
    // between a successful cloud write and its response reaching this machine.
    const journal = join(run, `cloud-${retentionId}.jsonl`);
    writeFileSync(journal, '', { flag: 'wx', mode: 0o600 });
    const record = value => appendFileSync(journal, JSON.stringify({ at: new Date().toISOString(), ...release, ...value }) + '\n', { flush: true });
    const uploaded = {}, accepted = {}, promoted = {}; let baseline, pendingOperation;
    const revalidate = () => verify(run, pin, retentionId, retentionPin);
    try {
      baseline = await transport.snapshot(); assertTopology(baseline, baseline);
      for (const owner of plan.owners) assert.equal(activeVersion(baseline, serviceFor(owner)), receipt.owners[owner].previousVersion, 'Stale retained rollback version');
      record({ phase: 'baseline', baseline });
      for (const owner of plan.owners) {
        revalidate(); assertTopology(baseline, await transport.snapshot());
        const service = serviceFor(owner), artifactSHA256 = receipt.owners[owner].artifactSHA256;
        assert(SHA.test(artifactSHA256));
        pendingOperation = { phase: 'upload', owner, service };
        record({ phase: 'upload_intent', owner, service, artifactSHA256 });
        const result = await transport.upload({ owner, service, artifactSHA256, ...release });
        assert(UUID.test(result.versionId) && result.versionId !== activeVersion(baseline, service), 'Upload must return a new exact UUID');
        assert.equal(result.artifactSHA256, artifactSHA256); assert.equal(result.releaseKey, plan.releaseKey);
        assert(SHA.test(result.moduleSHA256), 'Uploaded module bytes must be bound');
        uploaded[service] = result; record({ phase: 'uploaded', owner, service, result });
        pendingOperation = undefined;
        assertTopology(baseline, await transport.snapshot()); revalidate();
        const proof = await transport.preview({ owner, service, ...result });
        assert.equal(proof.versionId, result.versionId, 'Preview UUID differs from uploaded UUID');
        assert.equal(proof.releaseKey, plan.releaseKey); assert.equal(proof.artifactSHA256, artifactSHA256);
        assert.equal(proof.moduleSHA256, result.moduleSHA256); assert(SHA.test(proof.evidenceSHA256), 'Persisted network evidence required');
        assert.deepEqual(proof.moduleProof, result.moduleProof, 'Module receipt changed between upload and preview');
        assert.equal(proof.status, 'passed');
        accepted[service] = { ...proof, acceptedAt: Date.now() }; record({ phase: 'preview_accepted', owner, service, proof });
      }
      if (previewOnly) {
        revalidate(); assertTopology(baseline, await transport.snapshot());
        record({ phase: 'cloud_previews_accepted_no_promotion', accepted });
        return { status: 'cloud_previews_accepted_no_promotion', releaseKey: plan.releaseKey, uploaded, accepted, journalSHA256: digest(readFileSync(journal)) };
      }
      // Both owners must have passed exact-version preview before ANY traffic move.
      for (const owner of plan.owners) {
        revalidate(); assertTopology(baseline, await transport.snapshot(), promoted);
        const service = serviceFor(owner), proof = accepted[service];
        assert(Date.now() - proof.acceptedAt < 15 * 60 * 1000, 'Preview acceptance expired');
        pendingOperation = { phase: 'promotion', owner, service, versionId: proof.versionId };
        record({ phase: 'promotion_intent', owner, service, versionId: proof.versionId });
        await transport.promote({ owner, service, versionId: proof.versionId, ...release });
        promoted[service] = proof.versionId;
        assertTopology(baseline, await transport.snapshot(), promoted);
        record({ phase: 'promoted', owner, service, versionId: proof.versionId });
        pendingOperation = undefined;
      }
      revalidate();
      const acceptance = await transport.acceptProduction({ plan, uploaded, baseline });
      assert.equal(acceptance.status, 'passed'); assert.equal(acceptance.releaseKey, plan.releaseKey);
      assert(SHA.test(acceptance.evidenceSHA256));
      assert.deepEqual(acceptance.versions, promoted, 'Production proof must cover both exact UUIDs');
      assertTopology(baseline, await transport.snapshot(), promoted);
      record({ phase: 'production_accepted', acceptance });
      return { status: 'production_accepted', releaseKey: plan.releaseKey, versions: promoted, journalSHA256: digest(readFileSync(journal)) };
    } catch (error) {
      record({ phase: 'stopped', error: error.message, uploaded, promoted, pendingOperation });
      try {
        if (baseline) {
          const result = reconcileRelease(baseline, await transport.snapshot(), uploaded);
          if (pendingOperation) result.unresolvedOperation = pendingOperation;
          if (pendingOperation?.phase === 'upload' && result.status === 'baseline_active') result.status = 'baseline_active_upload_outcome_unknown';
          record({ phase: 'reconciliation', result });
        }
      } catch (readError) { record({ phase: 'reconciliation_unavailable', error: readError.message }); }
      throw error;
    }
  });
}
