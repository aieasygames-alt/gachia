import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { desktopCloudSnapshot, executePromotionContinuation } from './desktop-cloud-release.mjs';
import { assertUploadedVersion } from './desktop-cloud-transport.mjs';
import { digest, pinnedJson, withVerificationPass } from './desktop-release-assets.mjs';
import { boundedBody, exactPreviewOrigin } from './desktop-version-preview.mjs';
import { loadPublicReferences, verifyPublicHTTP } from './desktop-public-acceptance.mjs';
import { promotionWriter } from './desktop-promotion-request.mjs';
import { verifyPromotionEvidence, verifyRecoveryReceipt } from './desktop-recovery-receipt.mjs';
import { assertReleaseScope } from './desktop-release-scope.mjs';
import { revalidateUploadedModule } from './desktop-version-provenance.mjs';
import { verifyPublishedGuideUpdate } from './desktop-published-baseline.mjs';

const base = 'https://api.cloudflare.com/client/v4/accounts/e6472b6c6172a3ac1e1596ef100543ae/workers/scripts/';
const json = value => JSON.stringify(value, null, 2) + '\n';
const save = (path, value) => { const raw = json(value); writeFileSync(path, raw, { flag: 'wx', mode: 0o600 }); return digest(raw); };

export function verifyPromotionGuideUpdate({ evidence, sealed }) {
  assert.deepEqual(sealed.retained.plan, evidence.plan, 'Update gate must use the verified candidate plan');
  const { baselinePath, baselinePin } = sealed.recovery;
  return verifyPublishedGuideUpdate({ baselinePath, baselinePin, verified: sealed.retained,
    candidatePath: join(sealed.retained.directory, 'main/.open-next/assets/data', evidence.plan.game, 'raw-guides.json') });
}

// Internal adapter. Only the continuation owns the journal/authorization gate.
export function createPromotionTransport({ run, evidence, candidateDirectory, recoveryDirectory, recoveryManifest, token, request, evidenceDirectoryName }) {
  assert.equal(typeof request, 'function'); assert(typeof token === 'string' && token.length > 0);
  const pinned = structuredClone(evidence), recovery = structuredClone(recoveryManifest);
  assertReleaseScope(pinned.plan, pinned.manifest.owners);
  assert(/^[a-f0-9]{16}$/.test(pinned.manifest.retentionId));
  const name = evidenceDirectoryName ?? `promotion-evidence-${pinned.manifest.retentionId}`;
  assert(/^[a-z0-9-]{1,100}$/.test(name));
  const directory = join(run, name);
  const versions = Object.fromEntries(Object.entries(pinned.accepted).map(([service, proof]) => [service, proof.versionId]));
  const write = promotionWriter({ game: pinned.plan.game, releaseKey: pinned.plan.releaseKey, versions, token, request,
    recordResponse: ({ service, kind, status, headers, bytes }) => {
      const suffix = kind === 'creation' ? 'response' : 'verification';
      writeFileSync(join(directory, `${service}-deployment-${suffix}.body`), bytes, { flag: 'wx', mode: 0o600 });
      save(join(directory, `${service}-deployment-${suffix}.json`), { service, kind, status, headers, bytes: bytes.length, sha256: digest(bytes) });
    } });
  let initialized = false, snapshots = 0, remoteVerified = false;
  const initialize = () => { if (!initialized) { mkdirSync(directory, { mode: 0o700 }); initialized = true; } };
  const get = async (service, versionId) => {
    exactPreviewOrigin(service, versionId);
    const suffix = `/versions/${versionId}`;
    const response = await request(base + service + suffix, { method: 'GET', redirect: 'error',
      headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
    assert(response.ok, `Fresh remote verification failed: ${response.status}`);
    const bytes = await boundedBody(response);
    const body = JSON.parse(bytes.toString()); assert.equal(body.success, true); return body.result;
  };
  return {
    snapshot: async () => {
      initialize();
      const current = await desktopCloudSnapshot(token, request, { allowSplit: true });
      save(join(directory, `snapshot-${snapshots++}.json`), current); return current;
    },
    verifyVersions: async initial => {
      remoteVerified = false;
      assert.deepEqual(initial, pinned); initialize();
      const observations = [], modules = {}, recoveryVersions = {};
      for (const owner of pinned.plan.owners) {
        const candidate = pinned.manifest.owners[owner], fallback = recovery.owners[owner];
        assert.equal(fallback.service, candidate.service);
        assert.equal(fallback.candidateArtifactSHA256, candidate.artifactSHA256);
        assert.equal(fallback.moduleSHA256, pinned.recovery.owners[owner].moduleSHA256);
        for (const [kind, record, versionId, root] of [
          ['candidate', candidate, versions[candidate.service], candidateDirectory],
          ['recovery', fallback, pinned.recovery.owners[owner].versionId, recoveryDirectory],
        ]) {
          const config = pinnedJson(join(root, owner, 'upload.json'), record.configSHA256);
          const version = await get(record.service, versionId);
          const versionSHA256 = save(join(directory, `${owner}-${kind}-version.json`), version);
          assertUploadedVersion(version, versionId, config, pinned.baseline.bindings[record.service]);
          const target = kind === 'candidate' ? pinned.accepted[record.service] : pinned.recovery.owners[owner];
          const role = versionId === pinned.recovery.owners[owner].versionId ? 'recovery' : 'candidate';
          const saved = await revalidateUploadedModule({ proof: target.moduleProof, service: record.service, versionId, moduleSHA256: record.moduleSHA256,
            context: { role, releaseKey: pinned.plan.releaseKey, configSHA256: record.configSHA256 }, readVersion: async () => version });
          writeFileSync(join(directory, `${owner}-${kind}.multipart`), saved.archive, { flag: 'wx', mode: 0o600 });
          observations.push({ owner, kind, service: record.service, versionId, versionSHA256, moduleSHA256: record.moduleSHA256,
            multipartSHA256: digest(saved.archive), moduleProof: target.moduleProof, provenanceMode: saved.provenanceMode });
        }
        modules[candidate.service] = candidate.moduleSHA256;
        recoveryVersions[candidate.service] = pinned.recovery.owners[owner].versionId;
      }
      const proof = { status: 'passed', versions, modules, recoveryVersions, observations };
      const evidenceSHA256 = save(join(directory, 'remote-versions.json'), proof);
      remoteVerified = true;
      return { ...proof, evidenceSHA256 };
    },
    promote: async args => {
      assert(remoteVerified, 'Fresh candidate and recovery verification required');
      const result = await write(args);
      save(join(directory, `${args.owner}-deployment.json`), result); return result;
    },
    acceptProduction: async initial => {
      assert(remoteVerified); assert.deepEqual(initial, pinned);
      const owners = {};
      for (const owner of pinned.plan.owners) {
        const references = loadPublicReferences(join(candidateDirectory, owner), pinned.manifest.owners[owner].referencesSHA256);
        const result = await verifyPublicHTTP({ owner, game: pinned.plan.game, references, directory: join(directory, `${owner}-public`), request });
        owners[owner] = { status: result.status, evidenceSHA256: result.evidenceSHA256, responses: result.observations.length };
      }
      const proof = { status: 'passed', releaseKey: pinned.plan.releaseKey, versions, owners };
      return { ...proof, evidenceSHA256: save(join(directory, 'public-acceptance.json'), proof) };
    },
  };
}

// No raw target, percentage, URL, verifier, or transport can be passed by CLI.
export async function promoteDesktopRelease(input) {
  assert(process.platform === 'darwin' && !process.env.CI && !process.env.GITHUB_ACTIONS, 'Cloud publishing is desktop-only');
  assert(typeof input.token === 'string' && input.token.length > 0, 'Cloudflare credential required');
  const renewal = input.renewalId ? await import('./desktop-evidence-renewal.mjs') : undefined;
  let sealed;
  const verify = async () => {
    const result = renewal ? await renewal.verifyRenewedEvidence(input, 'promote') : withVerificationPass(() => ({
      evidence: verifyPromotionEvidence(input), sealed: verifyRecoveryReceipt(input).verified,
    }));
    sealed = result.sealed;
    assert.equal(input.releaseKey, result.evidence.plan.releaseKey);
    assert.deepEqual(sealed.candidate.manifest, result.evidence.manifest);
    verifyPromotionGuideUpdate(result);
    return result.evidence;
  };
  // The first full pass runs under the continuation's lock, not twice before it.
  return executePromotionContinuation({ run: input.run, verify, authorize: () => input.releaseKey,
    makeTransport: evidence => createPromotionTransport({ run: input.run, evidence, candidateDirectory: sealed.candidate.directory,
      recoveryDirectory: sealed.directory, recoveryManifest: sealed.manifest, token: input.token, request: fetch }) });
}
