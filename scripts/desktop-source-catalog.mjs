import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { artifactFiles } from './desktop-publish.mjs';
import { activeVersion, assertTopology } from './desktop-cloud-release.mjs';
import { digest, pinnedJson, verifyAssetEvidence } from './desktop-release-assets.mjs';
import { verifyPublishedBaseline } from './desktop-published-baseline.mjs';
import { verifyRecoveryCompatibility } from './desktop-release-readiness.mjs';
import { assertReleaseScope } from './desktop-release-scope.mjs';
import { boundedBody, exactPreviewOrigin } from './desktop-version-preview.mjs';

const json = value => JSON.stringify(value, null, 2) + '\n';
const save = (path, value) => { const raw = json(value); writeFileSync(path, raw, { flag: 'wx', mode: 0o600 }); return digest(raw); };

function privateDirectory(directory, create = false) {
  if (create) mkdirSync(directory, { recursive: true, mode: 0o700 });
  assert.equal(realpathSync(directory), resolve(directory), 'Linked catalog path forbidden');
  const info = statSync(directory);
  assert(info.isDirectory() && !(info.mode & 0o077), 'Catalog directory must be private');
}

function privateFile(path) {
  assert.equal(realpathSync(path), resolve(path), 'Linked catalog entry forbidden');
  const info = statSync(path);
  assert(info.isFile() && info.size <= 16 * 1024 * 1024 && !(info.mode & 0o077), 'Catalog entry must be private and bounded');
}

function entryPath(root, plan, snapshot) {
  const scope = assertReleaseScope(plan);
  const versions = Object.fromEntries(scope.owners.map(owner => [owner, activeVersion(snapshot, scope.serviceFor(owner))]));
  return { versions, directory: join(root, plan.game, `${versions[plan.game]}-${versions.main}`) };
}

function sourcesFromRecovery(recovery, verified, versions) {
  verifyRecoveryCompatibility(recovery.path, recovery.pin, verified);
  const evidence = pinnedJson(recovery.path, recovery.pin);
  const baseline = verifyPublishedBaseline(evidence.baselinePath, evidence.baselinePin, verified.plan, versions);
  const owners = {};
  for (const owner of verified.plan.owners) {
    const row = evidence.owners[owner], directory = join(evidence.directory, owner, '.open-next');
    assert.equal(row.oldVersionId, versions[owner], 'Catalog source is not the current published version');
    assert.equal(realpathSync(directory), resolve(directory), 'Linked source directory forbidden');
    const tree = artifactFiles(directory), runtime = join(directory, 'worker.js');
    assert.equal(digest(json(tree)), row.artifactSHA256, 'Catalog source tree changed');
    assert(tree.every(file => !(file.path === 'assets' || file.path.startsWith('assets/')) || file.type !== 'link'), 'Linked asset source forbidden');
    assert.equal(realpathSync(runtime), runtime, 'Linked runtime forbidden');
    assert.equal(digest(readFileSync(runtime)), row.runtimeModuleSHA256, 'Source is not the downloaded cloud runtime');
    owners[owner] = { directory, versionId: row.oldVersionId, artifactSHA256: row.artifactSHA256 };
  }
  return { profile: { schemaVersion: 1, game: verified.plan.game, owners }, baseline, evidence };
}

function checkInputs({ verified, recovery, assets }, versions) {
  assertReleaseScope(verified.plan);
  assert.deepEqual(pinnedJson(join(verified.directory, 'receipt.json'), verified.retentionPin), verified.receipt, 'Retained source context changed');
  const original = verifyAssetEvidence(assets.path, assets.pin, verified.plan.game);
  assert.equal(original.capture.summary.versionId, versions[verified.plan.game], 'Game asset source is not current');
  assert.equal(original.evidence.main.source.versionId, versions.main, 'Main asset source is not current');
  return sourcesFromRecovery(recovery, verified, versions);
}

async function currentBytes({ plan, sources, versions, reader, request, directory }) {
  const scope = assertReleaseScope(plan), modules = {};
  for (const owner of scope.owners) {
    const live = await reader.module(scope.serviceFor(owner), versions[owner]);
    assert.equal(live.moduleSHA256, sources.evidence.owners[owner].runtimeModuleSHA256, 'Current cloud runtime differs from catalog source');
    assert.equal(digest(live.code), live.moduleSHA256);
    writeFileSync(join(directory, `${owner}-current.multipart`), live.archive, { flag: 'wx', mode: 0o600 });
    modules[owner] = live.moduleSHA256;
  }
  const path = `/data/${plan.game}/raw-guides.json`, origin = exactPreviewOrigin('gachia', versions.main);
  const response = await request(origin + path, { method: 'GET', credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200); assert(!response.headers.has('set-cookie'));
  assert.equal(response.headers.get('content-type')?.split(';')[0], 'application/json');
  const body = await boundedBody(response);
  assert.equal(digest(body), sources.baseline.contentSHA256, 'Published content changed; catalog must follow A, not import O');
  writeFileSync(join(directory, 'published.body'), body, { flag: 'wx', mode: 0o600 });
  return { modules, contentSHA256: digest(body), origin, path, status: response.status, headers: Object.fromEntries(response.headers) };
}

// The catalog is a private index of already verified inputs, not a new approval.
// Its fixed game/Main UUID key never advances itself after a deployment.
export async function registerSourceCatalog({ root, directory, verified, recovery, reader, request = fetch }) {
  privateDirectory(root, true); privateDirectory(directory, true);
  const diagnostic = { status: 'running', game: verified.plan.game, cloudWrites: false };
  try {
    const before = await reader.snapshot(); assertTopology(before, before);
    const target = entryPath(root, verified.plan, before);
    const assets = { path: verified.receipt.evidencePath, pin: verified.receipt.evidencePin };
    const sources = checkInputs({ verified, recovery, assets }, target.versions);
    const current = await currentBytes({ plan: verified.plan, sources, versions: target.versions, reader, request, directory });
    const after = await reader.snapshot(); assertTopology(before, after);
    checkInputs({ verified, recovery, assets }, target.versions);
    // Existing entries are never replaced, including incomplete prior registrations.
    privateDirectory(join(root, verified.plan.game), true);
    mkdirSync(target.directory, { mode: 0o700 });
    const sourcePath = join(target.directory, 'sources.json'), sourcePin = save(sourcePath, sources.profile);
    const manifest = { schemaVersion: 1, kind: 'verified_local_source_catalog', game: verified.plan.game, versions: target.versions,
      assets, recovery, origin: { plan: { game: verified.plan.game, owners: verified.plan.owners, changed: verified.plan.changed,
        releaseKey: verified.plan.releaseKey, preview: verified.plan.preview, sourceSHA256: verified.plan.sourceSHA256 },
        receipt: verified.receipt, directory: verified.directory, retentionPin: verified.retentionPin },
      sourcePath, sourcePin, current, before, after, observedAt: new Date().toISOString(),
      cloudWrites: false, productionReady: false, note: 'References require retained local evidence; not a self-contained backup or cloud release approval.' };
    const manifestPath = join(target.directory, 'manifest.json'), manifestPin = save(manifestPath, manifest);
    diagnostic.status = 'passed';
    return { status: 'current_sources_registered', game: manifest.game, versions: target.versions, manifestPath, manifestPin,
      evidencePath: assets.path, evidencePin: assets.pin, sourcePath, sourcePin, cloudWrites: false, productionReady: false };
  } catch (error) { diagnostic.status = 'failed'; diagnostic.error = error.message; throw new Error(`${error.message}; diagnostics: ${join(directory, 'diagnostic.json')}`, { cause: error }); }
  finally { save(join(directory, 'diagnostic.json'), diagnostic); }
}

export async function selectSourceCatalog({ root, directory, plan, reader, request = fetch }) {
  privateDirectory(directory, true);
  const diagnostic = { status: 'running', game: plan.game, cloudWrites: false };
  try {
    privateDirectory(root);
    const before = await reader.snapshot(); assertTopology(before, before);
    const target = entryPath(root, plan, before), path = join(target.directory, 'manifest.json');
    privateDirectory(join(root, plan.game)); privateDirectory(target.directory); privateFile(path);
    const raw = readFileSync(path), manifestPin = digest(raw), manifest = JSON.parse(raw);
    assert.equal(manifest.schemaVersion, 1); assert.equal(manifest.kind, 'verified_local_source_catalog');
    assert.equal(manifest.game, plan.game); assert.deepEqual(manifest.versions, target.versions);
    assert.equal(manifest.cloudWrites, false); assert.equal(manifest.productionReady, false);
    assert.equal(manifest.origin.plan.game, plan.game);
    assert.equal(manifest.sourcePath, join(target.directory, 'sources.json'));
    privateFile(manifest.sourcePath);
    const sources = checkInputs({ verified: manifest.origin, recovery: manifest.recovery, assets: manifest.assets }, target.versions);
    assert.deepEqual(pinnedJson(manifest.sourcePath, manifest.sourcePin), sources.profile);
    const current = await currentBytes({ plan, sources, versions: target.versions, reader, request, directory });
    assert.deepEqual(current.modules, manifest.current.modules); assert.equal(current.contentSHA256, manifest.current.contentSHA256);
    assertTopology(before, await reader.snapshot());
    checkInputs({ verified: manifest.origin, recovery: manifest.recovery, assets: manifest.assets }, target.versions);
    privateDirectory(root); privateDirectory(join(root, plan.game)); privateDirectory(target.directory); privateFile(path); privateFile(manifest.sourcePath);
    assert.equal(digest(readFileSync(path)), manifestPin, 'Catalog changed during selection');
    assert.deepEqual(pinnedJson(manifest.sourcePath, manifest.sourcePin), sources.profile);
    const result = { status: 'current_sources_selected', game: plan.game, versions: target.versions, manifestPath: path, manifestPin,
      evidencePath: manifest.assets.path, evidencePin: manifest.assets.pin, sourcePath: manifest.sourcePath, sourcePin: manifest.sourcePin,
      cloudWrites: false, productionReady: false, freshAssetHTTPStillRequired: true, freshCandidateRecoveryStillRequired: true };
    save(join(directory, 'selection.json'), result); diagnostic.status = 'passed'; return result;
  } catch (error) { diagnostic.status = 'failed'; diagnostic.error = error.message; throw new Error(`${error.message}; diagnostics: ${join(directory, 'diagnostic.json')}`, { cause: error }); }
  finally { save(join(directory, 'diagnostic.json'), diagnostic); }
}
