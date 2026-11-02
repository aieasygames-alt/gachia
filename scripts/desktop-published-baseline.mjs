import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { digest, pinnedJson } from './desktop-release-assets.mjs';
import { activeVersion, assertTopology } from './desktop-cloud-release.mjs';
import { validateGuideOverlay } from './desktop-publish.mjs';
import { boundedBody, exactPreviewOrigin } from './desktop-version-preview.mjs';

const json = value => JSON.stringify(value, null, 2) + '\n';
const serviceFor = owner => owner === 'main' ? 'gachia' : `gachia-game-${owner}`;

// Import provenance stays O; recovery follows the currently deployed A, not O.
// Capture never advances published state or writes a cloud resource.
export async function capturePublishedBaseline({ plan, importBytes, directory, observe, request }) {
  assert(['genshin', 'nte'].includes(plan.game));
  assert.deepEqual(plan.owners, [plan.game, 'main']);
  assert.equal(digest(importBytes), plan.sourceSHA256);
  const before = await observe(); assertTopology(before, before);
  const versions = Object.fromEntries(plan.owners.map(owner => [owner, activeVersion(before, serviceFor(owner))]));
  const origin = exactPreviewOrigin('gachia', versions.main), path = `/data/${plan.game}/raw-guides.json`;
  const response = await request(origin + path, { method: 'GET', credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200); assert(!response.headers.has('set-cookie'));
  assert.equal(response.headers.get('content-type')?.split(';')[0], 'application/json');
  const body = await boundedBody(response);
  validateGuideOverlay(importBytes.toString(), body.toString());
  const after = await observe(); assertTopology(before, after);
  mkdirSync(directory, { mode: 0o700 });
  writeFileSync(join(directory, 'import.body'), importBytes, { flag: 'wx', mode: 0o600 });
  writeFileSync(join(directory, 'published.body'), body, { flag: 'wx', mode: 0o600 });
  const manifest = { schemaVersion: 1, kind: 'observed_published_baseline', game: plan.game, importSHA256: plan.sourceSHA256,
    contentSHA256: digest(body), versions, origin, path, status: response.status, headers: Object.fromEntries(response.headers),
    before, after, capturedAt: new Date().toISOString(), cloudWrites: false };
  const baselinePath = join(directory, 'manifest.json'); writeFileSync(baselinePath, json(manifest), { flag: 'wx', mode: 0o600 });
  return { baselinePath, baselinePin: digest(json(manifest)), contentSHA256: manifest.contentSHA256, versions };
}

export function verifyPublishedBaseline(path, pin, plan, previousVersions) {
  const manifest = pinnedJson(path, pin), directory = resolve(path, '..');
  assert.equal(manifest.schemaVersion, 1); assert.equal(manifest.kind, 'observed_published_baseline');
  assert.equal(manifest.cloudWrites, false); assert.equal(manifest.game, plan.game);
  assert.equal(manifest.importSHA256, plan.sourceSHA256);
  assert.deepEqual(Object.keys(manifest.versions).sort(), [...plan.owners].sort());
  assertTopology(manifest.before, manifest.after);
  for (const owner of plan.owners) {
    assert.equal(manifest.versions[owner], previousVersions[owner], 'Published baseline belongs to another deployed version');
    assert.equal(activeVersion(manifest.before, serviceFor(owner)), previousVersions[owner]);
  }
  assert.equal(manifest.origin, exactPreviewOrigin('gachia', previousVersions.main));
  assert.equal(manifest.path, `/data/${plan.game}/raw-guides.json`); assert.equal(manifest.status, 200);
  const read = name => { const file = join(directory, name); assert.equal(realpathSync(file), file); return readFileSync(file); };
  const original = read('import.body'), published = read('published.body');
  assert.equal(digest(original), plan.sourceSHA256); assert.equal(digest(published), manifest.contentSHA256);
  validateGuideOverlay(original.toString(), published.toString());
  return manifest;
}

export function recoveryBaselineSHA256(recovery, verified) {
  if (recovery.baselinePath || recovery.baselinePin) {
    return verifyPublishedBaseline(recovery.baselinePath, recovery.baselinePin, verified.plan,
      Object.fromEntries(verified.plan.owners.map(owner => [owner, verified.receipt.owners[owner].previousVersion]))).contentSHA256;
  }
  // Old rehearsal evidence remains readable, but cannot authorize real recovery.
  assert.equal(verified.plan.preview, true, 'Real recovery requires a version-bound published baseline');
  return verified.plan.sourceSHA256;
}

// Bind a new receipt instead of changing an already pinned recovery receipt.
export async function bindPublishedBaseline({ evidencePath, evidencePin, baselinePath, baselinePin, destination, verified }) {
  const original = pinnedJson(evidencePath, evidencePin);
  const recovery = { ...original, baselinePath: resolve(baselinePath), baselinePin };
  recoveryBaselineSHA256(recovery, verified);
  writeFileSync(destination, json(recovery), { flag: 'wx', mode: 0o600 });
  const pin = digest(json(recovery));
  const { verifyRecoveryCompatibility } = await import('./desktop-release-readiness.mjs');
  // A failed verification leaves an auditable, unusable receipt, not an approval.
  verifyRecoveryCompatibility(destination, pin, verified);
  return { evidencePath: resolve(destination), evidencePin: pin, cloudWrites: false };
}
