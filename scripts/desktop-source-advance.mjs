import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { artifactFiles } from './desktop-publish.mjs';
import { activeVersion, assertTopology } from './desktop-cloud-release.mjs';
import { assertUploadedVersion, multipartModule, verifyCloudBundle } from './desktop-cloud-transport.mjs';
import { digest, pinnedJson, verifyAssetEvidence } from './desktop-release-assets.mjs';
import { readPreviousGameAssets } from './retain-game-assets.mjs';
import { previousAssetFiles, verifyWebAssetSource } from './retain-web-assets.mjs';
import { capturePublishedBaseline, verifyPublishedBaseline } from './desktop-published-baseline.mjs';
import { readReleaseJournal, verifySavedPreview } from './desktop-release-readiness.mjs';
import { loadPublicReferences, publicReferences, validatePublicResponse } from './desktop-public-acceptance.mjs';
import { verifyVersionPreview } from './desktop-version-preview.mjs';
import { assertReleaseScope } from './desktop-release-scope.mjs';

const json = value => JSON.stringify(value, null, 2) + '\n';
const save = (path, value) => { const raw = json(value); writeFileSync(path, raw, { flag: 'wx', mode: 0o600 }); return digest(raw); };
const sha = /^[a-f0-9]{64}$/;
const staticFile = row => row.type === 'file' && /^assets\/(?:_games\/(?:genshin|nte)\/)?_next\/static\//.test(row.path);

// No age extension: this reads a completed historical publication, never a
// preview/recovery authorization. New requests below establish current identity.
export function readPublishedCandidate(input) {
  const candidate = verifyCloudBundle(input), { plan, manifest } = candidate;
  const scope = assertReleaseScope(plan, manifest.owners);
  assert.equal(plan.preview, false); assert(plan.changed.length > 0);
  const journal = readReleaseJournal(join(input.run, `promotion-${manifest.retentionId}.jsonl`), { releaseKey: plan.releaseKey }, input.promotionJournalPin);
  assert(!journal.damaged, 'Incomplete publication cannot advance sources');
  assert.deepEqual(journal.rows.map(row => row.phase), ['baseline', 'remote_versions_verified', 'promotion_intent', 'promoted', 'promotion_intent', 'promoted', 'production_accepted']);
  const [start, remote] = journal.rows;
  assertTopology(manifest.snapshot, start.baseline);
  assert.deepEqual(Object.keys(start.accepted).sort(), [...scope.services].sort());
  let at = -Infinity;
  for (const row of journal.rows) {
    assert(sha.test(row.previewJournalPin) && sha.test(row.recoveryPin));
    assert.equal(row.previewJournalPin, start.previewJournalPin); assert.equal(row.recoveryPin, start.recoveryPin);
    assert(Date.parse(row.at) >= at && Date.parse(row.at) <= Date.now(), 'Publication chronology changed'); at = Date.parse(row.at);
  }
  const versions = {}, modules = {};
  for (const [i, owner] of scope.owners.entries()) {
    const record = manifest.owners[owner], accepted = start.accepted[record.service];
    assert.equal(accepted.status, 'passed'); assert.equal(accepted.service, record.service);
    assert.equal(accepted.releaseKey, plan.releaseKey); assert.equal(accepted.artifactSHA256, record.artifactSHA256);
    assert.equal(accepted.moduleSHA256, record.moduleSHA256); assert(sha.test(accepted.evidenceSHA256));
    assert.notEqual(accepted.versionId, activeVersion(start.baseline, record.service));
    for (const row of journal.rows.slice(2 + i * 2, 4 + i * 2)) {
      assert.equal(row.owner, owner); assert.equal(row.service, record.service); assert.equal(row.versionId, accepted.versionId);
    }
    versions[record.service] = accepted.versionId; modules[record.service] = record.moduleSHA256;
  }
  assert.equal(remote.proof.status, 'passed'); assert.deepEqual(remote.proof.versions, versions); assert.deepEqual(remote.proof.modules, modules);
  const directory = join(input.run, `promotion-evidence-${manifest.retentionId}`);
  assert.deepEqual(pinnedJson(join(directory, 'remote-versions.json'), remote.proof.evidenceSHA256),
    Object.fromEntries(Object.entries(remote.proof).filter(([key]) => key !== 'evidenceSHA256')));
  const accepted = journal.rows.at(-1).proof;
  assert.equal(accepted.status, 'passed'); assert.equal(accepted.releaseKey, plan.releaseKey); assert.deepEqual(accepted.versions, versions);
  const publicProof = pinnedJson(join(directory, 'public-acceptance.json'), accepted.evidenceSHA256);
  assert.deepEqual({ ...publicProof, evidenceSHA256: accepted.evidenceSHA256 }, accepted);
  assert.deepEqual(Object.keys(publicProof.owners).sort(), [...scope.owners].sort());
  for (const owner of scope.owners) {
    const proof = publicProof.owners[owner]; assert.equal(proof.status, 'passed');
    const references = publicReferences(owner, loadPublicReferences(join(candidate.directory, owner), manifest.owners[owner].referencesSHA256), plan.game);
    const saved = pinnedJson(join(directory, `${owner}-public/result.json`), proof.evidenceSHA256);
    assert.equal(saved.status, 'passed'); assert.equal(saved.owner, owner); assert.equal(saved.origin, 'https://gachia.com');
    assert.equal(proof.responses, references.length); assert.equal(saved.observations.length, references.length);
    for (const [i, reference] of references.entries()) {
      const row = saved.observations[i]; assert.equal(row.path, reference.path); assert.equal(row.bodyFile, `${i}.body`);
      const file = join(directory, `${owner}-public`, row.bodyFile); assert.equal(realpathSync(file), file);
      const body = readFileSync(file); assert.equal(body.length, row.bytes); assert.equal(digest(body), row.sha256);
      validatePublicResponse(new Response(null, { status: row.status, headers: row.headers }), body, reference);
    }
  }
  return { ...candidate, versions };
}

function referencesFor(candidate, owner) {
  const record = candidate.manifest.owners[owner];
  const references = pinnedJson(join(candidate.directory, owner, 'references.json'), record.referencesSHA256);
  assert(new Set(references.map(row => row.path)).size === references.length);
  const tree = artifactFiles(join(candidate.run, 'retained', candidate.manifest.retentionId, owner, '.open-next'));
  const statics = tree.filter(staticFile); assert(statics.length > 0);
  for (const file of statics) {
    const path = '/' + file.path.slice(7).split('/').map(encodeURIComponent).join('/');
    assert.equal(references.find(row => row.path === path)?.sha256, file.sha256, 'Published source lacks static coverage');
  }
  const dynamic = owner === 'main' ? [`/data/${candidate.plan.game}/raw-guides.json`, '/sitemap.xml', '/api/auth/get-session']
    : ['/sitemap.xml', ...candidate.plan.changed.flatMap(key => ['zh', 'en', 'ja'].map(lang => `/${lang}/${candidate.plan.game}/guides/${key}`))];
  for (const path of dynamic) assert(references.some(row => row.path === path), 'Published source lacks dynamic coverage');
  return { tree, references, dynamic };
}

export function publishedSourceInputs(origin, versions) {
  assert.equal(origin.kind, 'published_candidate_source');
  const candidate = { ...readPublishedCandidate(origin.input), run: origin.input.run };
  assert.deepEqual(candidate.plan, origin.plan);
  const proof = pinnedJson(origin.proofPath, origin.proofPin);
  assert.equal(proof.schemaVersion, 1); assert.equal(proof.status, 'passed'); assert.equal(proof.kind, origin.kind); assert.equal(proof.cloudWrites, false);
  assert.deepEqual(proof.input, origin.input); assertTopology(proof.before, proof.after);
  assertTopology(candidate.manifest.snapshot, proof.before, candidate.versions);
  assert.deepEqual(Object.keys(proof.owners).sort(), [...candidate.plan.owners].sort());
  const baseline = verifyPublishedBaseline(proof.baselinePath, proof.baselinePin, candidate.plan, versions);
  assertTopology(proof.before, baseline.after);
  assert.equal(baseline.contentSHA256, candidate.plan.candidateSHA256, 'New source must follow published A, not import O');
  const profile = { schemaVersion: 1, game: candidate.plan.game, owners: {} }, evidence = { owners: {} }, references = [], allReferences = [];
  for (const owner of candidate.plan.owners) {
    const record = candidate.manifest.owners[owner], row = proof.owners[owner], source = referencesFor(candidate, owner);
    assertUploadedVersion(pinnedJson(join(dirname(origin.proofPath), `${owner}-version.json`), row.versionPin), versions[owner],
      pinnedJson(join(candidate.directory, owner, 'upload.json'), record.configSHA256), proof.before.bindings[record.service]);
    assert.equal(candidate.versions[record.service], versions[owner]); assert.equal(activeVersion(proof.before, record.service), versions[owner]);
    const directory = join(dirname(origin.proofPath), owner, '.open-next'); assert.equal(realpathSync(directory), directory);
    const tree = artifactFiles(directory);
    assert.equal(digest(json(tree)), row.artifactSHA256);
    assert.deepEqual(tree.filter(file => file.path !== 'worker.js'), source.tree.filter(file => file.path !== 'worker.js'));
    assert(tree.every(file => !file.path.startsWith('assets/') || file.type !== 'link'), 'Linked published asset forbidden');
    assert.equal(digest(readFileSync(join(directory, 'worker.js'))), record.moduleSHA256); assert.equal(row.runtimeModuleSHA256, record.moduleSHA256);
    verifySavedPreview(join(dirname(origin.proofPath), `${owner}-http`), { service: record.service, versionId: versions[owner], evidenceSHA256: row.previewPin }, source.references);
    for (const reference of source.references.filter(row => source.dynamic.includes(row.path))) {
      const i = source.references.indexOf(reference);
      references.push({ owner, ...reference, body: readFileSync(join(candidate.directory, owner, `${i}.body`)) });
    }
    for (const [i, reference] of source.references.entries()) allReferences.push({ owner, ...reference, body: readFileSync(join(candidate.directory, owner, `${i}.body`)) });
    profile.owners[owner] = { directory, versionId: versions[owner], artifactSHA256: row.artifactSHA256 };
    evidence.owners[owner] = { runtimeModuleSHA256: row.runtimeModuleSHA256 };
  }
  assert.equal(digest(readFileSync(join(profile.owners.main.directory, `assets/data/${candidate.plan.game}/raw-guides.json`))), baseline.contentSHA256);
  assert.deepEqual(proof.assets, origin.assets);
  const assets = verifyAssetEvidence(origin.assets.path, origin.assets.pin, candidate.plan.game);
  assert.equal(assets.capture.summary.workerArchiveSha256, proof.owners[candidate.plan.game].multipartPin);
  assert.equal(assets.evidence.main.previousStatic, join(profile.owners.main.directory, 'assets/_next/static'));
  assert.deepEqual(assets.evidence.main.source, mainProvenance(origin.input, candidate));
  verifyWebAssetSource(assets.evidence.main.source);
  assert.deepEqual(assets.capture.files.map(file => ({ path: file.path, sha256: file.sha256 })),
    previousAssetFiles(join(profile.owners[candidate.plan.game].directory, 'assets/_next/static')).map(file => ({ path: file.path, sha256: file.sha256 })));
  return { profile, evidence, baseline, baselinePath: proof.baselinePath, references, allReferences };
}

function mainProvenance(input, candidate) {
  return { kind: 'published_desktop_candidate', versionId: candidate.versions.gachia, releaseKey: candidate.plan.releaseKey,
    bundlePath: join(input.run, 'cloud-bundles', input.id, 'manifest.json'), bundlePin: input.bundlePin,
    promotionJournalPath: join(input.run, `promotion-${candidate.manifest.retentionId}.jsonl`), promotionJournalPin: input.promotionJournalPin };
}

export async function advanceSourceCatalog({ input, root, directory, reader, request = fetch }) {
  mkdirSync(directory, { mode: 0o700 });
  const diagnostic = { status: 'running', cloudWrites: false };
  try {
    const candidate = { ...readPublishedCandidate(input), run: input.run }, { plan, manifest } = candidate;
    const before = await reader.snapshot(); assertTopology(manifest.snapshot, before, candidate.versions);
    const importBytes = execFileSync('git', ['show', `${plan.sourceCommit}:packages/data/games/${plan.game}/raw-guides.json`], { cwd: input.repo, maxBuffer: 16 * 1024 * 1024 });
    const baseline = await capturePublishedBaseline({ plan, importBytes, directory: join(directory, 'baseline'), observe: reader.snapshot, request });
    assert.equal(baseline.contentSHA256, plan.candidateSHA256);
    const owners = {}, modules = {}, remoteVersions = {};
    for (const owner of plan.owners) {
      const record = manifest.owners[owner], versionId = candidate.versions[record.service], source = referencesFor(candidate, owner);
      const version = await reader.version(record.service, versionId);
      assertUploadedVersion(version, versionId, pinnedJson(join(candidate.directory, owner, 'upload.json'), record.configSHA256), before.bindings[record.service]);
      remoteVersions[owner] = version;
      const module = await reader.module(record.service, versionId); modules[owner] = module;
      assert.equal(module.moduleSHA256, record.moduleSHA256); assert.equal(digest(module.code), record.moduleSHA256);
      assert.equal((await multipartModule(module.archive)).moduleSHA256, record.moduleSHA256);
      writeFileSync(join(directory, `${owner}.multipart`), module.archive, { flag: 'wx', mode: 0o600 });
      const target = join(directory, owner, '.open-next'); mkdirSync(dirname(target), { mode: 0o700 });
      cpSync(join(input.run, 'retained', manifest.retentionId, owner, '.open-next'), target, { recursive: true, verbatimSymlinks: true, force: false, errorOnExist: true });
      assert.equal(realpathSync(join(target, 'worker.js')), join(target, 'worker.js'));
      writeFileSync(join(target, 'worker.js'), module.code, { mode: 0o600 });
      const preview = await verifyVersionPreview({ service: record.service, versionId, references: source.references, directory: join(directory, `${owner}-http`), request });
      owners[owner] = { artifactSHA256: digest(json(artifactFiles(target))), runtimeModuleSHA256: record.moduleSHA256,
        versionPin: save(join(directory, `${owner}-version.json`), version), previewPin: preview.evidenceSHA256, multipartPin: digest(module.archive) };
    }
    const gameDirectory = join(directory, plan.game, '.open-next'), capture = join(directory, 'game-assets'); mkdirSync(capture, { mode: 0o700 });
    cpSync(join(gameDirectory, 'assets/_next/static'), join(capture, 'static'), { recursive: true, verbatimSymlinks: true });
    writeFileSync(join(capture, 'worker.multipart'), modules[plan.game].archive, { flag: 'wx', mode: 0o600 });
    const files = previousAssetFiles(join(capture, 'static')), service = manifest.owners[plan.game].service;
    const versionId = candidate.versions[service], scriptEtag = remoteVersions[plan.game].resources.script.etag;
    const observed = { versionId, deploymentId: before.services[service].id, scriptEtag, percentage: 100 };
    const inventory = { service, versionId, logSha256: owners[plan.game].previewPin, nextStaticPaths: files.map(file => '/_next/static/' + file.path) };
    save(join(capture, 'inventory.json'), inventory);
    const bound = path => ({ path, bytes: readFileSync(join(capture, path)).length, sha256: digest(readFileSync(join(capture, path))) });
    const receiptPath = join(capture, 'receipt.json');
    save(receiptPath, { schemaVersion: 1, game: plan.game, service, ...observed, before: observed, after: observed,
      capturedAt: new Date().toISOString(), sourceCommit: 'not_attested', cloudAssetManifestCompleteness: 'not_asserted',
      workerArchive: bound('worker.multipart'), inventory: bound('inventory.json'), staticDirectory: 'static', files });
    const evidencePath = join(directory, 'asset-evidence.json'), mainStatic = join(directory, 'main/.open-next/assets/_next/static');
    const evidencePin = save(evidencePath, { schemaVersion: 1, game: plan.game,
      gameAssets: readPreviousGameAssets(receiptPath, { game: plan.game, rollbackVersion: versionId }).summary,
      main: { source: mainProvenance(input, candidate), previousStatic: mainStatic, files: previousAssetFiles(mainStatic) } });
    assert.deepEqual(readPublishedCandidate(input), Object.fromEntries(Object.entries(candidate).filter(([key]) => key !== 'run')));
    const after = await reader.snapshot(); assertTopology(before, after);
    const assets = { path: evidencePath, pin: evidencePin }, kind = 'published_candidate_source';
    const proofPath = join(directory, 'source-proof.json');
    const proofPin = save(proofPath, { schemaVersion: 1, kind, status: 'passed', input, before, after, owners, assets, ...baseline, cloudWrites: false });
    const origin = { kind, input, plan, proofPath, proofPin, assets };
    const { registerPublishedSourceCatalog } = await import('./desktop-source-catalog.mjs');
    const result = await registerPublishedSourceCatalog({ root, directory: join(directory, 'register'), origin, reader, request });
    diagnostic.status = 'passed'; return { ...result, publishedReleaseKey: plan.releaseKey, sourceOnly: true, newPublicationAuthorized: false };
  } catch (error) { diagnostic.status = 'failed'; diagnostic.error = error.message; throw error; }
  finally { save(join(directory, 'diagnostic.json'), diagnostic); }
}
