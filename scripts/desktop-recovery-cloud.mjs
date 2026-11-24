import { sessionReadFileBytes } from './artifact-verification-session.mjs';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { verifyCloudBundle, sealCloudModule, assertOwnerSettings } from './desktop-cloud-transport.mjs';
import { verifyRecoveryCompatibility } from './desktop-release-readiness.mjs';
import { digest, pinnedJson, verifiedInPass, verifyRetainedCandidate, withVerificationPass } from './desktop-release-assets.mjs';
import { withLocalWorker, withRunLock } from './desktop-publish.mjs';
import { assertTopology } from './desktop-cloud-release.mjs';
import { boundedBody, pageFingerprint } from './desktop-version-preview.mjs';
import { recoveryBaselineSHA256, recoveryGuideStatuses } from './desktop-published-baseline.mjs';
import { assertReleaseScope } from './desktop-release-scope.mjs';

const json = x => JSON.stringify(x, null, 2) + '\n';
const save = (path, data) => writeFileSync(path, json(data), { flag: 'wx', mode: 0o600 });
function inputs(input) {
  const candidate = verifyCloudBundle(input), manifest = candidate.manifest;
  const retained = verifyRetainedCandidate(input.run, input.pin, manifest.retentionId, manifest.retentionPin);
  const recovery = pinnedJson(input.evidencePath, input.evidencePin);
  verifyRecoveryCompatibility(input.evidencePath, input.evidencePin, { ...retained, retentionPin: manifest.retentionPin });
  return { candidate, retained, recovery };
}

export async function prepareRecoveryCloud(input) {
  return withRunLock(input.run, async () => {
    const { candidate, recovery, retained } = inputs(input), { plan } = candidate;
    const publishedBaselineSHA256 = recoveryBaselineSHA256(recovery, retained);
    const guideStatuses = recoveryGuideStatuses(recovery, retained);
    assertTopology(candidate.manifest.snapshot, input.snapshot);
    const id = randomBytes(8).toString('hex'), directory = join(input.run, 'recovery-bundles', id), temp = join(input.run, `recovery-temp-${id}`);
    mkdirSync(directory, { recursive: true, mode: 0o700 }); mkdirSync(temp, { mode: 0o700 });
    const owners = {};
    for (const owner of plan.owners) {
      const artifact = join(recovery.directory, owner, '.open-next'), sealed = await sealCloudModule({ run: input.run, owner, artifact, directory, temp, snapshot: input.snapshot });
      const config = sealed.uploadConfig, ownerDir = join(directory, owner);
      const inventory = pinnedJson(join(recovery.directory, `${owner}-inventory.json`), recovery.owners[owner].artifactSHA256);
      const hashes = new Map(inventory.filter(row => row.type === 'file' && (row.path.startsWith('assets/_next/static/') || row.path.startsWith(`assets/_games/${owner}/_next/static/`))).map(row => ['/' + row.path.slice(7).split('/').map(encodeURIComponent).join('/'), row.sha256]));
      const paths = owner === 'main' ? [`/data/${plan.game}/raw-guides.json`, '/sitemap.xml', '/robots.txt', '/api/auth/get-session']
        : ['/sitemap.xml', '/robots.txt', ...(plan.added?.length ? ['zh', 'en', 'ja'].map(lang => `/${lang}/${plan.game}/guides`) : []),
          ...plan.changed.flatMap(key => ['zh', 'en', 'ja'].map(lang => `/${lang}/${plan.game}/guides/${key}`))];
      const preserved = owner === 'main' && plan.preservedGuides ? pinnedJson(plan.preservedGuides.path, plan.preservedGuides.pin) : undefined;
      const preservedPath = preserved && `/data/${preserved.otherGame}/raw-guides.json`;
      if (preserved) paths.push(preservedPath);
      paths.push(...hashes.keys());
      const local = { name: `cms-recovery-sealed-${owner}`, main: config.main, no_bundle: true, compatibility_date: config.compatibility_date, compatibility_flags: config.compatibility_flags, assets: config.assets, vars: config.vars,
        ...(owner === 'main' ? { d1_databases: [{ binding: 'DB', database_name: 'local-only', database_id: '00000000-0000-0000-0000-000000000000' }], r2_buckets: [{ binding: 'IMAGES', bucket_name: 'local-only' }] } : {}) };
      const configPath = join(temp, `${owner}-local.json`); save(configPath, local);
      const references = await withLocalWorker(join(input.run, 'source/apps', owner === 'main' ? 'web' : `game-${owner}`), configPath, join(input.run, 'home'), join(temp, `${owner}-local.log`), async origin => {
        const rows = [];
        for (const path of paths) {
          const response = await fetch(origin + path, { redirect: 'error', signal: AbortSignal.timeout(30000) }), body = await boundedBody(response);
          assert.equal(response.status, path.startsWith('/api/auth/') ? 404 : (guideStatuses.get(path) ?? 200));
          const row = { path, status: response.status, headers: Object.fromEntries(response.headers), sha256: digest(body) };
          if (path === preservedPath) row.preservedMainVersion = preserved.mainVersionId;
          if (hashes.has(path)) assert.equal(row.sha256, hashes.get(path), 'Recovery static HTTP changed');
          if (path.startsWith('/data/')) assert.equal(row.sha256, path === preservedPath ? preserved.sha256 : publishedBaselineSHA256, 'Recovery must serve the previous published JSON');
          if (path.startsWith('/api/auth/')) { assert.equal(JSON.parse(body).code, 'ACCOUNT_FEATURES_DISABLED'); assert.match(row.headers['cache-control'], /no-store/); }
          if (row.headers['content-type']?.startsWith('text/html')) row.fingerprint = pageFingerprint(body.toString(), row.status);
          const old = recovery.owners[owner].observations.find(x => x.path === path);
          if (old) {
            assert.equal(row.status, old.status, 'Recovery status differs from original evidence');
            if (row.fingerprint) assert.deepEqual(row.fingerprint, pageFingerprint(sessionReadFileBytes(join(recovery.directory, old.bodyFile)).toString('utf8'), old.status), 'Recovery rendered baseline changed');
            else assert.equal(row.sha256, old.sha256, 'Recovery response differs from original recovery evidence');
          }
          writeFileSync(join(ownerDir, `${rows.length}.body`), body, { flag: 'wx', mode: 0o600 }); rows.push(row);
        }
        return rows;
      });
      save(join(ownerDir, 'references.json'), references);
      owners[owner] = { service: config.name, sourceVersionId: recovery.owners[owner].oldVersionId, candidateArtifactSHA256: candidate.manifest.owners[owner].artifactSHA256,
        recoveryArtifactSHA256: recovery.owners[owner].artifactSHA256, moduleSHA256: sealed.moduleSHA256, configSHA256: digest(json(config)), referencesSHA256: digest(json(references)), paths: references.length, tool: sealed.tool };
    }
    inputs(input);
    const manifest = { schemaVersion: 1, kind: 'sealed_local_recovery', id, planSHA256: input.pin, candidateId: input.id, candidatePin: input.bundlePin, releaseKey: plan.releaseKey,
      evidencePath: resolve(input.evidencePath), evidencePin: input.evidencePin, snapshot: input.snapshot, previewCandidate: plan.preview, owners, cloudWrites: false, cloudRecoveryAccepted: false };
    save(join(directory, 'manifest.json'), manifest);
    return { id, directory, recoveryBundlePin: digest(json(manifest)), owners, cloudWrites: false, cloudRecoveryAccepted: false };
  });
}

export function verifyRecoveryCloud({ run, pin, recoveryId, recoveryBundlePin }) {
  const input = { run, pin, recoveryId, recoveryBundlePin };
  return withVerificationPass(() => verifiedInPass(verifyRecoveryCloud, JSON.stringify(input), () => readRecoveryCloud(input)));
}

function readRecoveryCloud({ run, pin, recoveryId, recoveryBundlePin }) {
  assert(/^[a-f0-9]{16}$/.test(recoveryId));
  const directory = join(run, 'recovery-bundles', recoveryId), manifest = pinnedJson(join(directory, 'manifest.json'), recoveryBundlePin);
  assert.equal(manifest.schemaVersion, 1); assert.equal(manifest.cloudWrites, false); assert.equal(manifest.cloudRecoveryAccepted, false);
  assert.equal(manifest.id, recoveryId); assert.equal(manifest.kind, 'sealed_local_recovery'); assert.equal(manifest.planSHA256, pin);
  const verified = inputs({ run, pin, id: manifest.candidateId, bundlePin: manifest.candidatePin, evidencePath: manifest.evidencePath, evidencePin: manifest.evidencePin });
  assert.equal(manifest.releaseKey, verified.candidate.plan.releaseKey); assert.equal(manifest.previewCandidate, verified.candidate.plan.preview);
  assertTopology(verified.candidate.manifest.snapshot, manifest.snapshot);
  assertReleaseScope(verified.candidate.plan, manifest.owners);
  for (const [owner, row] of Object.entries(manifest.owners)) {
    assert.equal(row.sourceVersionId, verified.recovery.owners[owner].oldVersionId);
    assert.equal(row.candidateArtifactSHA256, verified.candidate.manifest.owners[owner].artifactSHA256);
    assert.equal(row.recoveryArtifactSHA256, verified.recovery.owners[owner].artifactSHA256);
    assert.equal(digest(readFileSync(join(directory, owner, 'worker.js'))), row.moduleSHA256, 'Recovery sealed module changed');
    const config = pinnedJson(join(directory, owner, 'upload.json'), row.configSHA256); assertOwnerSettings(owner, config, manifest.snapshot);
    assert.equal(row.service, config.name); assert.equal(row.tool.version, '4.148.0');
    assert.equal(digest(readFileSync(row.tool.bin)), row.tool.binSHA256, 'Recovery Wrangler launcher changed');
    assert.equal(digest(readFileSync(row.tool.cli)), row.tool.cliSHA256, 'Recovery Wrangler implementation changed');
    assert.equal(config.main, join(directory, owner, 'worker.js')); assert.equal(config.assets.directory, join(verified.recovery.directory, owner, '.open-next/assets'));
    const refs = pinnedJson(join(directory, owner, 'references.json'), row.referencesSHA256); assert.equal(refs.length, row.paths);
    refs.forEach((ref, i) => assert.equal(digest(sessionReadFileBytes(join(directory, owner, `${i}.body`))), ref.sha256, 'Recovery network reference changed'));
    if (owner === 'main' && verified.candidate.plan.preservedGuides) {
      const preserved = pinnedJson(verified.candidate.plan.preservedGuides.path, verified.candidate.plan.preservedGuides.pin);
      const rows = refs.filter(ref => ref.path === `/data/${preserved.otherGame}/raw-guides.json`);
      assert.equal(rows.length, 1, 'Recovery lacks preserved other-game reference');
      assert.equal(rows[0].sha256, preserved.sha256); assert.equal(rows[0].preservedMainVersion, preserved.mainVersionId);
    }
  }
  return { ...verified, directory, manifest };
}
