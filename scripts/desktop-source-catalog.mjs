import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { artifactFiles, inspectCandidate, prepareCandidate } from './desktop-publish.mjs';
import { activeVersion, assertTopology } from './desktop-cloud-release.mjs';
import { digest, pinnedJson, verifiedInPass, verifyAssetEvidence, withVerificationPass } from './desktop-release-assets.mjs';
import { verifyPublishedBaseline } from './desktop-published-baseline.mjs';
import { verifyRecoveryCompatibility } from './desktop-release-readiness.mjs';
import { assertReleaseScope } from './desktop-release-scope.mjs';
import { boundedBody, exactPreviewOrigin, pageFingerprint, validatePreviewResponse } from './desktop-version-preview.mjs';
import { publicRobots } from './desktop-public-acceptance.mjs';
import { publishedSourceInputs, recoveredSourceInputs } from './desktop-source-advance.mjs';
import { reboundSourceInputs } from './desktop-source-rebind.mjs';

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
  const owners = {}, allReferences = [];
  for (const owner of verified.plan.owners) {
    const row = evidence.owners[owner], directory = join(evidence.directory, owner, '.open-next');
    assert.equal(row.oldVersionId, versions[owner], 'Catalog source is not the current published version');
    assert.equal(realpathSync(directory), resolve(directory), 'Linked source directory forbidden');
    const tree = artifactFiles(directory), runtime = join(directory, 'worker.js');
    assert.equal(digest(json(tree)), row.artifactSHA256, 'Catalog source tree changed');
    assert(tree.every(file => !(file.path === 'assets' || file.path.startsWith('assets/')) || file.type !== 'link'), 'Linked asset source forbidden');
    assert.equal(realpathSync(runtime), runtime, 'Linked runtime forbidden');
    assert.equal(digest(readFileSync(runtime)), row.runtimeModuleSHA256, 'Source is not the downloaded cloud runtime');
    owners[owner] = { directory, versionId: row.oldVersionId, artifactSHA256: row.artifactSHA256, ...(row.moduleProof ? { moduleProof: row.moduleProof } : {}) };
    for (const reference of [...row.observations, ...(row.auxiliary ?? [])]) {
      assert.match(reference.bodyFile, new RegExp(`^${owner}-[0-9]+\\.body$`));
      const path = join(evidence.directory, reference.bodyFile); assert.equal(realpathSync(path), path);
      const body = readFileSync(path); assert.equal(digest(body), reference.sha256);
      allReferences.push({ owner, ...reference, body });
    }
  }
  return { profile: { schemaVersion: 1, game: verified.plan.game, owners }, baseline, baselinePath: evidence.baselinePath, evidence, allReferences };
}

// Historical source-only diagnostics have no candidate or releaseKey. Verify the
// original trees/HTTP bytes directly; never fabricate a candidate-shaped receipt.
function sourcesFromHistory(origin, versions) {
  assert.equal(origin.sourceOnly, true); assert.equal(origin.plan.releaseKey, undefined);
  const { plan } = origin, proof = pinnedJson(origin.proofPath, origin.proofPin);
  assert.equal(proof.schemaVersion, 1); assert.equal(proof.kind, 'downloaded_runtime_source_local_http'); assert.equal(proof.sourceOnly, true);
  assert.equal(proof.status, 'passed'); assert.equal(proof.publishable, false);
  assert.equal(proof.cloudWrites, false); assert.equal(proof.rawUUIDRollbackAuthorized, false);
  assert.deepEqual(Object.keys(proof.recovery).sort(), [...plan.owners].sort());
  const historical = pinnedJson(proof.historical.path, proof.historical.pin);
  assert.equal(historical.status, 'passed'); assert.equal(historical.publishable, false); assert.equal(historical.cloudWrites, false);
  assert.equal(historical.rawUUIDRollbackAuthorized, false);
  assert.deepEqual(Object.keys(historical.recovery).sort(), [...plan.owners].sort());
  assert.equal(realpathSync(proof.work), resolve(proof.work), 'Linked historical evidence root forbidden');
  const baseline = verifyPublishedBaseline(origin.baselinePath, origin.baselinePin, plan, versions);
  const owners = {}, evidence = { owners: {} }, references = [], allReferences = [];
  for (const owner of plan.owners) {
    const row = proof.recovery[owner], directory = join(proof.work, 'recovery', owner, '.open-next');
    assert.equal(row.status, 'passed'); assert.equal(row.runtimeUnchangedDuringSampling, true);
    assert.equal(row.runtimeOrigin, 'downloaded_exact_cloud_version'); assert.equal(row.versionId, versions[owner]);
    assert.equal(realpathSync(directory), resolve(directory), 'Linked historical source forbidden');
    const tree = pinnedJson(join(proof.work, `recovery-${owner}-inventory.json`), row.artifactSHA256);
    assert.deepEqual(artifactFiles(directory), tree, 'Historical source tree changed');
    const parent = historical.recovery[owner], oldDirectory = join(historical.work, 'recovery', owner, '.open-next');
    assert.equal(parent.status, 'passed'); assert.equal(parent.runtimeUnchanged, true);
    assert.equal(realpathSync(oldDirectory), resolve(oldDirectory), 'Linked original source forbidden');
    const oldTree = pinnedJson(join(historical.work, `recovery-${owner}-inventory.json`), parent.artifactSHA256);
    assert.deepEqual(artifactFiles(oldDirectory), oldTree, 'Original historical source changed');
    assert.deepEqual(tree.filter(file => file.path !== 'worker.js'), oldTree.filter(file => file.path !== 'worker.js'), 'Source-only import may replace only the runtime');
    assert(tree.every(file => !(file.path === 'assets' || file.path.startsWith('assets/')) || file.type !== 'link'), 'Linked historical asset forbidden');
    const observations = new Map();
    assert(row.observations.length > 0 && row.observations.length <= 5000);
    assert.equal(row.responses, row.observations.length);
    for (const observation of row.observations) {
      const path = observation.path;
      assert(typeof path === 'string' && !observations.has(path), 'Invalid/duplicate historical HTTP path');
      assert.match(observation.bodyFile, /^[0-9]+\.body$/);
      const file = join(proof.work, `recovery-${owner}-http`, observation.bodyFile);
      assert.equal(realpathSync(file), file, 'Linked historical HTTP body forbidden');
      assert(statSync(file).isFile() && statSync(file).size <= 16 * 1024 * 1024, 'Historical body budget exceeded');
      const body = readFileSync(file);
      assert.equal(body.length, observation.bytes, 'Historical HTTP body changed'); assert.equal(digest(body), observation.sha256, 'Historical HTTP body changed');
      assert(!observation.headers['set-cookie']);
      const auth = owner === 'main' && path === '/api/auth/get-session';
      assert.equal(observation.status, auth ? 404 : 200);
      if (auth) { assert.equal(JSON.parse(body).code, 'ACCOUNT_FEATURES_DISABLED'); assert.match(observation.headers['cache-control'], /no-store/); }
      observations.set(path, { ...observation, body });
      allReferences.push({ owner, ...observation, body });
    }
    const statics = tree.filter(file => file.type === 'file' && (file.path.startsWith('assets/_next/static/') || file.path.startsWith(`assets/_games/${plan.game}/_next/static/`)));
    assert(statics.length > 0);
    for (const file of statics) {
      const path = '/' + file.path.slice(7).split('/').map(encodeURIComponent).join('/');
      assert.equal(observations.get(path)?.sha256, file.sha256, 'Historical HTTP lacks source static asset');
    }
    const paths = ['/sitemap.xml'];
    if (owner === 'main') {
      assert.equal(observations.get(`/data/${plan.game}/raw-guides.json`)?.sha256, baseline.contentSHA256, 'Historical Main JSON is not current A');
      assert.equal(digest(readFileSync(join(directory, `assets/data/${plan.game}/raw-guides.json`))), baseline.contentSHA256, 'Historical Main source contains a different baseline');
      paths.push('/api/auth/get-session');
    } else {
      assert.match(origin.sampleGuide, /^[a-z0-9-]+$/);
      paths.push(...['zh', 'en', 'ja'].map(lang => `/${lang}/${plan.game}/guides/${origin.sampleGuide}`));
    }
    for (const path of paths) {
      const reference = observations.get(path); assert(reference, 'Historical source lacks required dynamic HTTP');
      references.push({ owner, ...reference });
    }
    const runtime = join(directory, 'worker.js'); assert.equal(realpathSync(runtime), runtime, 'Linked historical runtime forbidden');
    assert.equal(digest(readFileSync(runtime)), row.runtimeModuleSHA256, 'Historical source runtime pin changed');
    owners[owner] = { directory, versionId: versions[owner], artifactSHA256: row.artifactSHA256 };
    evidence.owners[owner] = { runtimeModuleSHA256: digest(readFileSync(runtime)) };
  }
  return { profile: { schemaVersion: 1, game: plan.game, owners }, baseline, baselinePath: origin.baselinePath, evidence, references, allReferences };
}

function checkInputs({ verified, recovery, assets }, versions) {
  return withVerificationPass(() => readInputs({ verified, recovery, assets }, versions));
}

function readInputs({ verified, recovery, assets }, versions) {
  assertReleaseScope(verified.plan);
  const original = verifyAssetEvidence(assets.path, assets.pin, verified.plan.game);
  assert.equal(original.capture.summary.versionId, versions[verified.plan.game], 'Game asset source is not current');
  assert.equal(original.evidence.main.source.versionId, versions.main, 'Main asset source is not current');
  if (verified.kind === 'cross_game_main_source') {
    assert.deepEqual(assets, verified.assets);
    return reboundSourceInputs(verified, versions);
  }
  if (verified.kind === 'published_candidate_source') {
    assert.deepEqual(assets, verified.assets);
    return publishedSourceInputs(verified, versions);
  }
  if (verified.kind === 'recovered_candidate_source') {
    assert.deepEqual(assets, verified.assets);
    return recoveredSourceInputs(verified, versions);
  }
  if (verified.kind === 'historical_local_recovery') {
    assert.deepEqual(assets, verified.assets, 'Historical asset source mismatch');
    return sourcesFromHistory(verified, versions);
  }
  assert.equal(verified.kind, undefined, 'Unknown source origin');
  assert.deepEqual(pinnedJson(join(verified.directory, 'receipt.json'), verified.retentionPin), verified.receipt, 'Retained source context changed');
  return sourcesFromRecovery(recovery, verified, versions);
}

async function currentBytes({ plan, sources, versions, reader, request, directory }) {
  const scope = assertReleaseScope(plan), modules = {}, runtimeSources = {};
  for (const owner of scope.owners) {
    const live = await reader.module(scope.serviceFor(owner), versions[owner], sources.profile.owners[owner].moduleProof);
    assert.equal(live.moduleSHA256, sources.evidence.owners[owner].runtimeModuleSHA256, 'Current cloud runtime differs from catalog source');
    assert.equal(digest(live.code), live.moduleSHA256);
    writeFileSync(join(directory, `${owner}-current.multipart`), live.archive, { flag: 'wx', mode: 0o600 });
    modules[owner] = live.moduleSHA256;
    if (live.provenanceMode) runtimeSources[owner] = { mode: live.provenanceMode, ...(live.moduleProof ? { moduleProof: live.moduleProof } : {}) };
  }
  const path = `/data/${plan.game}/raw-guides.json`, origin = exactPreviewOrigin('gachia', versions.main);
  const response = await request(origin + path, { method: 'GET', credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200); assert(!response.headers.has('set-cookie'));
  assert.equal(response.headers.get('content-type')?.split(';')[0], 'application/json');
  const body = await boundedBody(response);
  assert.equal(digest(body), sources.baseline.contentSHA256, 'Published content changed; catalog must follow A, not import O');
  writeFileSync(join(directory, 'published.body'), body, { flag: 'wx', mode: 0o600 });
  const observations = [], policy = value => (value ?? '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean).sort();
  for (const reference of sources.references ?? []) {
    const sourceOrigin = exactPreviewOrigin(scope.serviceFor(reference.owner), versions[reference.owner]);
    const response = await request(sourceOrigin + reference.path, { method: 'GET', credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(30000) });
    const bytes = await boundedBody(response), bodyFile = `history-${observations.length}.body`;
    writeFileSync(join(directory, bodyFile), bytes, { flag: 'wx', mode: 0o600 });
    observations.push({ owner: reference.owner, origin: sourceOrigin, path: reference.path, status: response.status,
      headers: Object.fromEntries(response.headers), bytes: bytes.length, sha256: digest(bytes), bodyFile });
    const mime = response.headers.get('content-type')?.split(';')[0];
    // Exact previews intentionally replace public robots with noindex/deny-all.
    if (sources.strictPreview) validatePreviewResponse({ path: reference.path, response, bytes, reference });
    else {
      assert.equal(response.status, reference.status); assert(!response.headers.has('set-cookie'));
      assert.equal(mime, reference.headers['content-type']?.split(';')[0]);
      assert.deepEqual(policy(response.headers.get('cache-control')), policy(reference.headers['cache-control']), 'Historical source cache policy changed');
      if (mime === 'text/html') assert.deepEqual(pageFingerprint(bytes.toString(), reference.status), pageFingerprint(reference.body.toString(), reference.status), 'Historical rendered source is not current');
      else assert.equal(digest(bytes), reference.sha256, 'Historical source response differs from current');
    }
    if (mime === 'text/html') assert.deepEqual(publicRobots(bytes.toString()), publicRobots(reference.body.toString()));
  }
  save(join(directory, 'current.json'), { modules, runtimeSources, observations, contentSHA256: digest(body) });
  return { modules, ...(Object.keys(runtimeSources).length ? { runtimeSources } : {}), contentSHA256: digest(body), origin, path, status: response.status, headers: Object.fromEntries(response.headers), observations };
}

// The catalog is a private index of already verified inputs, not a new approval.
// Its fixed game/Main UUID key never advances itself after a deployment.
export async function registerSourceCatalog({ root, directory, verified, recovery, reader, request = fetch }) {
  const origin = { plan: { game: verified.plan.game, owners: verified.plan.owners, changed: verified.plan.changed, ...(verified.plan.added ? { added: verified.plan.added } : {}),
    releaseKey: verified.plan.releaseKey, preview: verified.plan.preview, sourceSHA256: verified.plan.sourceSHA256 },
    receipt: verified.receipt, directory: verified.directory, retentionPin: verified.retentionPin };
  return registerOrigin({ root, directory, origin, assets: { path: verified.receipt.evidencePath, pin: verified.receipt.evidencePin }, recovery, reader, request });
}

export async function registerHistoricalSourceCatalog({ root, directory, origin, reader, request = fetch }) {
  assert.equal(origin.kind, 'historical_local_recovery');
  return registerOrigin({ root, directory, origin, assets: origin.assets, reader, request });
}

export async function registerPublishedSourceCatalog({ root, directory, origin, reader, request = fetch }) {
  assert.equal(origin.kind, 'published_candidate_source');
  return registerOrigin({ root, directory, origin, assets: origin.assets, reader, request });
}

export async function registerRecoveredSourceCatalog({ root, directory, origin, reader, request = fetch }) {
  assert.equal(origin.kind, 'recovered_candidate_source');
  return registerOrigin({ root, directory, origin, assets: origin.assets, reader, request });
}

export async function registerReboundSourceCatalog({ root, directory, origin, reader, request = fetch }) {
  assert.equal(origin.kind, 'cross_game_main_source');
  return registerOrigin({ root, directory, origin, assets: origin.assets, reader, request });
}

// Verify a pinned historical entry locally without pretending it is still live.
// Rebinding accepts only original origins, so evidence graphs cannot recurse.
export function readPinnedSourceCatalog({ path, pin }) {
  privateFile(path);
  const manifest = pinnedJson(path, pin), directory = resolve(path, '..'), root = resolve(directory, '../..');
  assert.equal(manifest.schemaVersion, 1); assert.equal(manifest.kind, 'verified_local_source_catalog');
  const scope = assertReleaseScope(manifest.origin.plan);
  assert.equal(manifest.game, scope.game);
  assert.notEqual(manifest.origin.kind, 'cross_game_main_source', 'Use the original game source, not a rebound entry');
  assert.equal(path, join(root, manifest.game, `${manifest.versions[manifest.game]}-${manifest.versions.main}`, 'manifest.json'));
  privateDirectory(root); privateDirectory(join(root, manifest.game)); privateDirectory(directory);
  assert.equal(manifest.cloudWrites, false); assert.equal(manifest.productionReady, false);
  assertTopology(manifest.before, manifest.after);
  assert.deepEqual(Object.keys(manifest.versions).sort(), [...scope.owners].sort());
  for (const owner of scope.owners) assert.equal(activeVersion(manifest.before, scope.serviceFor(owner)), manifest.versions[owner]);
  assert.equal(manifest.sourcePath, join(directory, 'sources.json')); privateFile(manifest.sourcePath);
  const sources = checkInputs({ verified: manifest.origin, recovery: manifest.recovery, assets: manifest.assets }, manifest.versions);
  assert.deepEqual(pinnedJson(manifest.sourcePath, manifest.sourcePin), sources.profile);
  assert.equal(manifest.current.contentSHA256, sources.baseline.contentSHA256);
  assert.deepEqual(manifest.current.modules, Object.fromEntries(scope.owners.map(owner => [owner, sources.evidence.owners[owner].runtimeModuleSHA256])));
  return { manifest, sources };
}

async function registerOrigin({ root, directory, origin: verified, assets, recovery, reader, request }) {
  privateDirectory(root, true); privateDirectory(directory, true);
  const diagnostic = { status: 'running', game: verified.plan.game, cloudWrites: false };
  try {
    const before = await reader.snapshot(); assertTopology(before, before);
    const target = entryPath(root, verified.plan, before);
    const sources = checkInputs({ verified, recovery, assets }, target.versions);
    const current = await currentBytes({ plan: verified.plan, sources, versions: target.versions, reader, request, directory });
    const after = await reader.snapshot(); assertTopology(before, after);
    checkInputs({ verified, recovery, assets }, target.versions);
    // Existing entries are never replaced, including incomplete prior registrations.
    privateDirectory(join(root, verified.plan.game), true);
    mkdirSync(target.directory, { mode: 0o700 });
    const sourcePath = join(target.directory, 'sources.json'), sourcePin = save(sourcePath, sources.profile);
    const manifest = { schemaVersion: 1, kind: 'verified_local_source_catalog', game: verified.plan.game, versions: target.versions,
      assets, recovery, origin: verified,
      sourcePath, sourcePin, current, before, after, observedAt: new Date().toISOString(),
      cloudWrites: false, productionReady: false, note: 'References require retained local evidence; not a self-contained backup or cloud release approval.' };
    const manifestPath = join(target.directory, 'manifest.json'), manifestPin = save(manifestPath, manifest);
    diagnostic.status = 'passed';
    return { status: 'current_sources_registered', game: manifest.game, versions: target.versions, manifestPath, manifestPin,
      evidencePath: assets.path, evidencePin: assets.pin, sourcePath, sourcePin, cloudWrites: false, productionReady: false };
  } catch (error) { diagnostic.status = 'failed'; diagnostic.error = error.message; throw new Error(`${error.message}; diagnostics: ${join(directory, 'diagnostic.json')}`, { cause: error }); }
  finally { save(join(directory, 'diagnostic.json'), diagnostic); }
}

// Recheck a pinned selection's transitive local inputs, including rebound origins.
// This is not a fresh network selection or permission to use it as a rebound parent.
export function verifySelectedSourceCatalog(selection, plan) {
  return verifiedInPass(verifySelectedSourceCatalog, JSON.stringify([selection, plan]), () => readSelectedSourceCatalog(selection, plan));
}

function readSelectedSourceCatalog(selection, plan) {
  privateFile(selection.manifestPath);
  const manifest = pinnedJson(selection.manifestPath, selection.manifestPin);
  assert.equal(manifest.schemaVersion, 1); assert.equal(manifest.kind, 'verified_local_source_catalog');
  assert.equal(manifest.game, plan.game); assert.equal(manifest.origin.plan.game, plan.game);
  assert.equal(manifest.cloudWrites, false); assert.equal(manifest.productionReady, false);
  assert.deepEqual(manifest.versions, selection.versions);
  assert.equal(manifest.sourcePath, join(dirname(selection.manifestPath), 'sources.json'));
  assert.equal(manifest.sourcePath, selection.sourcePath); assert.equal(manifest.sourcePin, selection.sourcePin);
  assert.deepEqual(manifest.assets, { path: selection.evidencePath, pin: selection.evidencePin });
  const sources = checkInputs({ verified: manifest.origin, recovery: manifest.recovery, assets: manifest.assets }, manifest.versions);
  privateFile(selection.sourcePath);
  assert.deepEqual(pinnedJson(selection.sourcePath, selection.sourcePin), sources.profile);
  return manifest;
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

export function verifyPreservedGuides(preservation, plan) {
  privateFile(preservation.path);
  const proof = pinnedJson(preservation.path, preservation.pin);
  assert.equal(proof.kind, 'current_main_preserved_guides'); assert.equal(proof.schemaVersion, 1);
  assert.equal(proof.game, plan.game); assert.equal(proof.sourceCommit, plan.sourceCommit);
  const other = plan.game === 'genshin' ? 'nte' : 'genshin';
  assert.equal(proof.otherGame, other);
  assert.deepEqual(proof.paths, [`packages/data/games/${other}/raw-guides.json`, `apps/web/public/data/${other}/raw-guides.json`]);
  const catalog = verifySelectedSourceCatalog(proof.selection, plan);
  assert.equal(proof.mainVersionId, catalog.versions.main);
  assertTopology(proof.before, proof.after);
  assert.equal(activeVersion(proof.after, 'gachia'), proof.mainVersionId);
  const source = pinnedJson(proof.selection.sourcePath, proof.selection.sourcePin);
  const body = readFileSync(join(source.owners.main.directory, `assets/data/${other}/raw-guides.json`));
  assert.equal(digest(body), proof.sha256, 'Preserved Main source bytes changed');
  privateFile(proof.bodyPath);
  assert(readFileSync(proof.bodyPath).equals(body), 'Preserved public response changed');
  assert.equal(proof.response.path, `/data/${other}/raw-guides.json`);
  assert.equal(proof.response.status, 200); assert(!proof.response.headers['set-cookie']);
  assert.equal(proof.response.headers['content-type']?.split(';')[0], 'application/json');
  return { proof, body };
}

// Main embeds both games. Freeze the non-target game's current published bytes,
// not Git's original import or another game's unpublished CMS drafts.
export async function preparePublishedCandidate({ repo, directory, runs, commit = 'HEAD', root, evidenceDirectory, reader, request = fetch }) {
  const plan = inspectCandidate({ repo, directory, commit });
  const selection = await selectSourceCatalog({ root, directory: join(evidenceDirectory, 'selection'), plan, reader, request });
  const before = await reader.snapshot(); assertTopology(before, before);
  assert.equal(activeVersion(before, 'gachia'), selection.versions.main);
  assert.equal(activeVersion(before, `gachia-game-${plan.game}`), selection.versions[plan.game]);
  const other = plan.game === 'genshin' ? 'nte' : 'genshin';
  const source = pinnedJson(selection.sourcePath, selection.sourcePin);
  const body = readFileSync(join(source.owners.main.directory, `assets/data/${other}/raw-guides.json`));
  const path = `/data/${other}/raw-guides.json`;
  const response = await request('https://gachia.com' + path, { method: 'GET', credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200); assert(!response.headers.has('set-cookie'));
  assert.equal(response.headers.get('content-type')?.split(';')[0], 'application/json');
  const observed = await boundedBody(response);
  assert(observed.equals(body), 'Current Main non-target guides differ from the verified source');
  const after = await reader.snapshot(); assertTopology(before, after);
  const bodyPath = join(evidenceDirectory, 'preserved.body');
  writeFileSync(bodyPath, body, { flag: 'wx', mode: 0o600 });
  const proof = { schemaVersion: 1, kind: 'current_main_preserved_guides', game: plan.game, otherGame: other,
    sourceCommit: plan.sourceCommit, mainVersionId: selection.versions.main, sha256: digest(body),
    paths: [`packages/data/games/${other}/raw-guides.json`, `apps/web/public/data/${other}/raw-guides.json`],
    selection, before, after, bodyPath, observedAt: new Date().toISOString(),
    response: { path, status: response.status, headers: Object.fromEntries(response.headers) }, cloudWrites: false };
  const proofPath = join(evidenceDirectory, 'preserved.json'), proofPin = save(proofPath, proof);
  verifyPreservedGuides({ path: proofPath, pin: proofPin }, plan);
  return prepareCandidate({ repo, directory, runs, commit: plan.sourceCommit, preservedGuides: { path: proofPath, pin: proofPin } });
}
