import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { activeVersion, assertTopology } from './desktop-cloud-release.mjs';
import { assertUploadedVersion, multipartModule, normalizedBindings } from './desktop-cloud-transport.mjs';
import { digest, pinnedJson, verifyAssetEvidence } from './desktop-release-assets.mjs';
import { capturePublishedBaseline, verifyPublishedBaseline } from './desktop-published-baseline.mjs';
import { readPublishedCandidate } from './desktop-source-advance.mjs';
import { readRecoveredCandidate } from './desktop-recovered-source.mjs';
import { readPinnedSourceCatalog, registerReboundSourceCatalog } from './desktop-source-catalog.mjs';
import { verifySavedPreview } from './desktop-release-readiness.mjs';
import { assertReleaseScope } from './desktop-release-scope.mjs';
import { pageFingerprint, verifyVersionPreview } from './desktop-version-preview.mjs';
import { publicRobots } from './desktop-public-acceptance.mjs';
import { assertModuleVersionIdentity, readUploadedModuleReceipt } from './desktop-version-provenance.mjs';

const json = value => JSON.stringify(value, null, 2) + '\n';
const save = (path, value) => { const raw = json(value); writeFileSync(path, raw, { flag: 'wx', mode: 0o600 }); return digest(raw); };

function inputs(input) {
  const target = readPinnedSourceCatalog(input.source), donor = readPinnedSourceCatalog(input.mainSource);
  const { game } = target.manifest, other = donor.manifest.game;
  assert.notEqual(game, other, 'Main donor must be the other game');
  assert(['published_candidate_source', 'recovered_candidate_source'].includes(donor.manifest.origin.kind), 'Main requires a completed local publication or compatible recovery');
  assert.notEqual(target.manifest.versions.main, donor.manifest.versions.main, 'Main UUID did not change');
  const changed = { gachia: donor.manifest.versions.main, [`gachia-game-${other}`]: donor.manifest.versions[other] };
  assertTopology(target.manifest.after, donor.manifest.before, changed);
  const versions = { [game]: target.manifest.versions[game], main: donor.manifest.versions.main };
  const plan = { game, owners: [game, 'main'], sourceSHA256: target.sources.baseline.importSHA256 };
  const profile = { schemaVersion: 1, game, owners: { [game]: target.sources.profile.owners[game], main: donor.sources.profile.owners.main } };
  const evidence = { owners: { [game]: target.sources.evidence.owners[game], main: donor.sources.evidence.owners.main } };
  assert.equal(digest(readFileSync(join(profile.owners.main.directory, `assets/data/${game}/raw-guides.json`))), target.sources.baseline.contentSHA256,
    'New Main changed target content; source-only rebinding cannot adopt it');
  const targetAssets = verifyAssetEvidence(target.manifest.assets.path, target.manifest.assets.pin, game);
  const mainAssets = verifyAssetEvidence(donor.manifest.assets.path, donor.manifest.assets.pin, other);
  const assets = { schemaVersion: 1, game, gameAssets: targetAssets.evidence.gameAssets, main: mainAssets.evidence.main };
  const moduleProofs = Object.fromEntries(Object.entries(profile.owners).filter(([, row]) => row.moduleProof).map(([owner, row]) => [owner, row.moduleProof]));
  if (Object.keys(moduleProofs).length) assets.moduleProofs = moduleProofs;
  const normalize = reference => {
    assert(!reference.headers['set-cookie']); assert.equal(digest(reference.body), reference.sha256);
    return { path: reference.path, status: reference.status, headers: reference.headers, sha256: reference.sha256,
      ...(reference.headers['content-type']?.startsWith('text/html') ? { fingerprint: pageFingerprint(reference.body.toString()), expectedRobots: publicRobots(reference.body.toString()) } : {}) };
  };
  // Recovery trees may include forward-only candidate chunks. Only the pinned
  // current-game capture claims those statics exist on the unchanged cloud UUID.
  const capturedStatics = new Map(targetAssets.capture.files.map(file => ['/_next/static/' + file.path.split('/').map(encodeURIComponent).join('/'), file.sha256]));
  const gameRefs = target.sources.allReferences.filter(row => row.owner === game &&
    (!row.path.includes('/_next/static/') || capturedStatics.has(row.path))).map(normalize);
  assert(gameRefs.some(row => row.path === '/sitemap.xml'), 'Target source lacks sitemap');
  const guides = gameRefs.filter(row => new RegExp(`^/zh/${game}/guides/[a-z0-9-]+$`).test(row.path));
  assert(guides.length > 0, 'Target source lacks guide coverage');
  for (const guide of guides) for (const lang of ['en', 'ja']) assert(gameRefs.some(row => row.path === guide.path.replace('/zh/', `/${lang}/`)), 'Target source lacks locale');
  for (const file of targetAssets.capture.files) {
    assert.equal(gameRefs.find(row => row.path === '/_next/static/' + file.path.split('/').map(encodeURIComponent).join('/'))?.sha256, file.sha256,
      'Target source lacks captured static coverage');
  }
  const mainRefs = donor.sources.allReferences.filter(row => row.owner === 'main').map(normalize);
  const path = `/data/${game}/raw-guides.json`;
  const preserved = mainRefs.filter(row => row.path === path);
  assert(preserved.length <= 1, 'Ambiguous target Main reference');
  if (preserved.length) assert.equal(preserved[0].sha256, target.sources.baseline.contentSHA256, 'Preserved target Main reference changed A');
  else mainRefs.push({ path, status: 200, headers: target.sources.baseline.headers, sha256: target.sources.baseline.contentSHA256 });
  return { target, donor, plan, versions, profile, evidence, assets, references: { [game]: gameRefs, main: mainRefs } };
}

function checkVersion(owner, version, context) {
  const scope = assertReleaseScope(context.plan), service = scope.serviceFor(owner), snapshot = context.donor.manifest.before;
  const versionId = context.versions[owner];
  assert.equal(version.id, versionId); assert.equal(version.metadata.has_preview, true);
  const moduleProof = context.profile.owners[owner].moduleProof;
  if (moduleProof) assertModuleVersionIdentity(readUploadedModuleReceipt(moduleProof, { service, versionId,
    moduleSHA256: context.evidence.owners[owner].runtimeModuleSHA256 }).version, version);
  else if (owner !== 'main') assert.equal(version.resources.script.etag, context.assets.gameAssets.scriptEtag, 'Rebound legacy script ETag changed');
  assert.deepEqual(normalizedBindings(version.resources.bindings), normalizedBindings(snapshot.bindings[service]));
  for (const key of ['compatibility_date', 'compatibility_flags']) assert.deepEqual(version.resources.script_runtime[key], snapshot.settings[service][key]);
  if (owner === 'main') {
    const origin = context.donor.manifest.origin, candidate = origin.kind === 'recovered_candidate_source' ? readRecoveredCandidate(origin.input) : readPublishedCandidate(origin.input), record = candidate.manifest.owners.main;
    assertUploadedVersion(version, versionId, pinnedJson(join(candidate.directory, 'main/upload.json'), record.configSHA256), snapshot.bindings.gachia);
  }
}

export function reboundSourceInputs(origin, versions) {
  assert.equal(origin.kind, 'cross_game_main_source'); assert.equal(origin.sourceOnly, true);
  const context = inputs(origin.input), proof = pinnedJson(origin.proofPath, origin.proofPin);
  assert.deepEqual(origin.plan, context.plan); assert.equal(origin.plan.releaseKey, undefined);
  assert.deepEqual(versions, context.versions); assert.deepEqual(proof.input, origin.input);
  assert.equal(proof.schemaVersion, 1); assert.equal(proof.kind, origin.kind); assert.equal(proof.status, 'passed');
  assert.equal(proof.cloudWrites, false); assert.equal(proof.sourceOnly, true);
  assert.equal(proof.targetStaticScope, 'pinned_current_game_capture_not_forward_recovery_chunks');
  assertTopology(context.donor.manifest.before, proof.before); assertTopology(proof.before, proof.after);
  const baseline = verifyPublishedBaseline(proof.baselinePath, proof.baselinePin, context.plan, versions);
  assertTopology(proof.before, baseline.before); assertTopology(proof.before, baseline.after);
  assert.equal(baseline.contentSHA256, context.target.sources.baseline.contentSHA256, 'Target A changed');
  assert.deepEqual(proof.assets, origin.assets);
  assert.deepEqual(verifyAssetEvidence(origin.assets.path, origin.assets.pin, context.plan.game).evidence, context.assets);
  const references = [];
  assert.deepEqual(Object.keys(proof.owners).sort(), [...context.plan.owners].sort());
  for (const owner of context.plan.owners) {
    const row = proof.owners[owner], directory = dirname(origin.proofPath), refs = context.references[owner];
    checkVersion(owner, pinnedJson(join(directory, `${owner}-version.json`), row.versionPin), context);
    assert.equal(digest(readFileSync(join(directory, `${owner}.multipart`))), row.multipartPin);
    verifySavedPreview(join(directory, `${owner}-http`), { service: assertReleaseScope(context.plan).serviceFor(owner), versionId: versions[owner], evidenceSHA256: row.previewPin }, refs);
    for (const [i, reference] of refs.entries()) {
      const body = readFileSync(join(directory, `${owner}-http/${i}.body`));
      if (reference.fingerprint) assert.deepEqual(publicRobots(body.toString()), reference.expectedRobots, 'Target HTML robots changed');
      references.push({ owner, ...reference, body });
    }
  }
  return { profile: context.profile, evidence: context.evidence, baseline, baselinePath: proof.baselinePath, references, allReferences: references, strictPreview: true };
}

// No candidate/run/releaseKey is invented. The game remains at its original UUID;
// only a proven, completed other-game publication/recovery can supply Main.
export async function rebindSourceCatalog({ input, root, directory, reader, request = fetch }) {
  mkdirSync(directory, { mode: 0o700 });
  const diagnostic = { status: 'running', sourceOnly: true, cloudWrites: false };
  try {
    const context = inputs(input), { plan, versions } = context, scope = assertReleaseScope(plan);
    const before = await reader.snapshot(); assertTopology(context.donor.manifest.before, before);
    for (const owner of scope.owners) assert.equal(activeVersion(before, scope.serviceFor(owner)), versions[owner]);
    const baseline = await capturePublishedBaseline({ plan, importBytes: readFileSync(join(dirname(context.target.sources.baselinePath), 'import.body')),
      directory: join(directory, 'baseline'), observe: reader.snapshot, request });
    assert.equal(baseline.contentSHA256, context.target.sources.baseline.contentSHA256, 'Target A changed');
    const owners = {};
    for (const owner of scope.owners) {
      const service = scope.serviceFor(owner), version = await reader.version(service, versions[owner]); checkVersion(owner, version, context);
      const module = await reader.module(service, versions[owner], context.profile.owners[owner].moduleProof);
      assert.equal(module.moduleSHA256, context.evidence.owners[owner].runtimeModuleSHA256); assert.equal(digest(module.code), module.moduleSHA256);
      assert.equal((await multipartModule(module.archive)).moduleSHA256, module.moduleSHA256);
      writeFileSync(join(directory, `${owner}.multipart`), module.archive, { flag: 'wx', mode: 0o600 });
      const preview = await verifyVersionPreview({ service, versionId: versions[owner], references: context.references[owner], directory: join(directory, `${owner}-http`), request });
      owners[owner] = { versionPin: save(join(directory, `${owner}-version.json`), version), multipartPin: digest(module.archive), previewPin: preview.evidenceSHA256 };
    }
    const after = await reader.snapshot(); assertTopology(before, after); inputs(input);
    const assets = { path: join(directory, 'asset-evidence.json'), pin: save(join(directory, 'asset-evidence.json'), context.assets) };
    const kind = 'cross_game_main_source', proofPath = join(directory, 'source-proof.json');
    const proofPin = save(proofPath, { schemaVersion: 1, kind, status: 'passed', input, before, after, owners, assets, ...baseline,
      targetStaticScope: 'pinned_current_game_capture_not_forward_recovery_chunks', sourceOnly: true, cloudWrites: false });
    const origin = { kind, sourceOnly: true, input, plan, assets, proofPath, proofPin };
    const result = await registerReboundSourceCatalog({ root, directory: join(directory, 'register'), origin, reader, request });
    diagnostic.status = 'passed'; return { ...result, sourceOnly: true, newPublicationAuthorized: false };
  } catch (error) { diagnostic.status = 'failed'; diagnostic.error = error.message; throw error; }
  finally { save(join(directory, 'diagnostic.json'), diagnostic); }
}
