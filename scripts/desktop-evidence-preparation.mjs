import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, readdirSync, readlinkSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { artifactFiles, validateGuideOverlay, verifyBuilt, withRunLock } from './desktop-publish.mjs';
import { activeVersion, assertTopology } from './desktop-cloud-release.mjs';
import { digest, pinnedJson, retainCandidateWithLock, verifyAssetEvidence, verifyRetainedCandidate } from './desktop-release-assets.mjs';
import { refreshAssetEvidence, prepareLocalRecovery } from './desktop-local-evidence.mjs';
import { selectSourceCatalog, verifySelectedSourceCatalog } from './desktop-source-catalog.mjs';
import { capturePublishedBaseline, verifyPublishedBaseline } from './desktop-published-baseline.mjs';
import { verifyRecoveryCompatibility } from './desktop-release-readiness.mjs';
import { multipartModule } from './desktop-cloud-transport.mjs';

const json = value => JSON.stringify(value, null, 2) + '\n';
const save = (path, value) => { const bytes = json(value); writeFileSync(path, bytes, { flag: 'wx', mode: 0o600 }); return digest(bytes); };
const STEPS = ['inputs', 'sources', 'assets', 'retention', 'baseline', 'recovery', 'revalidation'];
const PENDING = ['preview-retained', 'cloud-check', 'cloud-prepare / cloud-verify', 'candidate exact-version cloud preview acceptance',
  'recovery exact-version cloud preview acceptance', 'fresh topology / authorization / promotion / public acceptance'];

function noCloudJournal(run) {
  assert(!readdirSync(run).some(name => /^(?:cloud-|recovery-cloud-|promotion-|manual-recovery-).*\.jsonl$/.test(name)),
    'Run already has a cloud-write journal; reconcile it instead of preparing new evidence');
}

// Pin every saved response, auxiliary account check, runtime, log and intermediate result.
function attemptFiles(directory, relative = '') {
  return readdirSync(join(directory, relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
    const path = relative ? `${relative}/${entry.name}` : entry.name;
    if (!relative && ['manifest.json', 'files.json'].includes(path)) return [];
    if (entry.isDirectory()) return [{ path, type: 'directory' }, ...attemptFiles(directory, path)];
    if (entry.isSymbolicLink()) return [{ path, type: 'link', target: readlinkSync(join(directory, path)) }];
    assert(entry.isFile(), 'Unexpected evidence entry');
    return [{ path, type: 'file', sha256: digest(readFileSync(join(directory, path))) }];
  });
}

function selectedIdentity(value) {
  return Object.fromEntries(['game', 'versions', 'manifestPath', 'manifestPin', 'sourcePath', 'sourcePin', 'evidencePath', 'evidencePin'].map(key => [key, value[key]]));
}

function changedFromPublished(run, plan, baselinePath) {
  const candidate = readFileSync(join(run, 'source/packages/data/games', plan.game, 'raw-guides.json'), 'utf8');
  const published = readFileSync(join(dirname(baselinePath), 'published.body'), 'utf8');
  assert(validateGuideOverlay(published, candidate).changed.length > 0, 'Candidate is unchanged from current published A');
}

async function checkLocal(manifest) {
  const { run, planPin, sources, assets, retention, baseline, recovery } = manifest;
  const plan = verifyBuilt(run, planPin);
  assert.equal(plan.preview, false, 'Real non-preview candidate required');
  assert(plan.changed.length > 0, 'Changed guides required'); noCloudJournal(run);
  assert.equal(manifest.releaseKey, plan.releaseKey); assert.equal(manifest.game, plan.game);
  assert.equal(manifest.status, 'local_prepublication_evidence_prepared');
  assert.equal(manifest.cloudWrites, false); assert.equal(manifest.productionReady, false);
  assert.equal(manifest.cloudRecoveryAccepted, false); assert.deepEqual(manifest.pending, PENDING);
  const catalog = verifySelectedSourceCatalog(sources, plan);
  assert.deepEqual(catalog.versions, sources.versions); assert.equal(catalog.game, plan.game);
  assert.equal(catalog.sourcePath, sources.sourcePath); assert.equal(catalog.sourcePin, sources.sourcePin);
  assert.deepEqual(catalog.assets, { path: sources.evidencePath, pin: sources.evidencePin });
  const source = pinnedJson(sources.sourcePath, sources.sourcePin);
  for (const owner of plan.owners) {
    assert.equal(source.owners[owner].versionId, sources.versions[owner]);
    assert.equal(digest(json(artifactFiles(source.owners[owner].directory))), source.owners[owner].artifactSHA256, 'Source tree changed');
  }
  verifyAssetEvidence(sources.evidencePath, sources.evidencePin, plan.game);
  const refreshed = verifyAssetEvidence(assets.evidencePath, assets.evidencePin, plan.game), fresh = refreshed.evidence.freshCapture;
  assert.equal(fresh.releaseKey, plan.releaseKey); assert.equal(fresh.cloudWrites, false);
  assertTopology(manifest.before, fresh.before); assertTopology(manifest.before, fresh.after);
  assert.equal(activeVersion(fresh.after, `gachia-game-${plan.game}`), sources.versions[plan.game]);
  assert.equal(activeVersion(fresh.after, 'gachia'), sources.versions.main);
  const module = await multipartModule(readFileSync(join(dirname(assets.evidencePath), 'game-worker.multipart')));
  assert.equal(module.moduleSHA256, fresh.gameModuleSHA256);
  assert.equal(module.moduleSHA256, catalog.current.modules[plan.game]);
  const rows = pinnedJson(fresh.observationsPath, fresh.observationsPin), expected = [];
  for (const owner of plan.owners) for (const file of owner === 'main' ? refreshed.evidence.main.files : refreshed.capture.files) {
    expected.push({ owner, path: (owner === 'main' ? '/_next/static/' : `/_games/${plan.game}/_next/static/`) + file.path.split('/').map(encodeURIComponent).join('/'),
      sha256: file.sha256, bytes: Buffer.isBuffer(file.bytes) ? file.bytes.length : file.bytes });
  }
  assert.equal(rows.length, expected.length);
  rows.forEach((row, i) => {
    assert.deepEqual({ owner: row.owner, path: row.path, sha256: row.sha256, bytes: row.bytes }, expected[i]);
    assert.equal(row.status, 200); assert(!row.headers['set-cookie']); assert.equal(row.bodyFile, `${i}.body`);
    const body = readFileSync(join(dirname(fresh.observationsPath), row.bodyFile));
    assert.equal(body.length, row.bytes); assert.equal(digest(body), row.sha256, 'Fresh static response changed');
  });
  const verified = { ...verifyRetainedCandidate(run, planPin, retention.id, retention.retentionPin), retentionPin: retention.retentionPin };
  assert.equal(verified.receipt.evidencePath, assets.evidencePath); assert.equal(verified.receipt.evidencePin, assets.evidencePin);
  const published = verifyPublishedBaseline(baseline.baselinePath, baseline.baselinePin, plan, sources.versions);
  changedFromPublished(run, plan, baseline.baselinePath);
  assert.equal(published.contentSHA256, catalog.current.contentSHA256); assertTopology(manifest.before, published.before);
  assertTopology(manifest.before, published.after); assertTopology(manifest.before, manifest.after);
  verifyRecoveryCompatibility(recovery.evidencePath, recovery.evidencePin, verified);
  const restored = pinnedJson(recovery.evidencePath, recovery.evidencePin);
  assert.equal(restored.baselinePath, baseline.baselinePath); assert.equal(restored.baselinePin, baseline.baselinePin);
  return plan;
}

export async function verifyEvidencePreparation(path, pin) {
  const manifest = pinnedJson(path, pin), directory = dirname(path);
  assert.equal(manifest.schemaVersion, 1); assert.equal(manifest.kind, 'local_prepublication_evidence');
  assert.equal(manifest.directory, directory); assert.equal(realpathSync(directory), resolve(directory));
  assert.equal(manifest.filesPath, join(directory, 'files.json'));
  assert.deepEqual(pinnedJson(manifest.filesPath, manifest.filesPin), attemptFiles(directory), 'Preparation evidence files changed');
  await checkLocal(manifest);
  const journal = readFileSync(join(directory, 'stages.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
  assert.deepEqual(journal.map(row => [row.stage, row.status]), STEPS.flatMap(stage => [[stage, 'running'], [stage, 'passed']]));
  return { ...manifest, manifestPath: path, manifestPin: pin };
}

export async function prepareEvidence({ run, pin, repo, root, reader, request = fetch, serve }) {
  return withRunLock(run, async lease => {
    assert.equal(realpathSync(run), resolve(run), 'Linked run forbidden');
    const directory = join(run, `evidence-preparation-${randomBytes(8).toString('hex')}`);
    mkdirSync(directory, { mode: 0o700 });
    let stage;
    const record = status => appendFileSync(join(directory, 'stages.jsonl'), JSON.stringify({ stage, status, at: new Date().toISOString() }) + '\n', { mode: 0o600 });
    const step = async (name, execute) => {
      stage = name; record('running'); const result = await execute();
      save(join(directory, `${name}.json`), result); record('passed'); return result;
    };
    try {
      let importBytes;
      const plan = await step('inputs', async () => {
        noCloudJournal(run); const plan = verifyBuilt(run, pin);
        assert.equal(plan.preview, false, 'Real non-preview candidate required');
        assert(plan.changed.length > 0, 'Changed guides required');
        assert(/^[a-f0-9]{40}$/.test(plan.sourceCommit), 'Exact import commit required');
        importBytes = execFileSync('git', ['show', `${plan.sourceCommit}:packages/data/games/${plan.game}/raw-guides.json`], { cwd: repo, maxBuffer: 16 * 1024 * 1024 });
        assert.equal(digest(importBytes), plan.sourceSHA256, 'Import provenance changed'); return plan;
      });
      const before = await reader.snapshot(); assertTopology(before, before);
      const sources = await step('sources', () => selectSourceCatalog({ root, directory: join(directory, 'source-selection'), plan, reader, request }));
      const assets = await step('assets', () => refreshAssetEvidence({ plan, evidencePath: sources.evidencePath, evidencePin: sources.evidencePin,
        directory: join(directory, 'asset-capture'), reader, request }));
      const retention = await step('retention', () => retainCandidateWithLock(run, pin, assets.evidencePath, assets.evidencePin, lease));
      const baseline = await step('baseline', async () => {
        const result = await capturePublishedBaseline({ plan, importBytes, directory: join(directory, 'published-baseline'), observe: () => reader.snapshot(), request });
        changedFromPublished(run, plan, result.baselinePath); return result;
      });
      const verified = { ...verifyRetainedCandidate(run, pin, retention.id, retention.retentionPin), retentionPin: retention.retentionPin };
      const recovery = await step('recovery', () => prepareLocalRecovery({ run, verified, ...baseline, sourcePath: sources.sourcePath, sourcePin: sources.sourcePin,
        directory: join(directory, 'local-recovery'), reader, request, ...(serve ? { serve } : {}) }));
      const manifest = { schemaVersion: 1, kind: 'local_prepublication_evidence', status: 'local_prepublication_evidence_prepared', directory,
        run: resolve(run), planPin: pin, game: plan.game, releaseKey: plan.releaseKey, before, sources, assets, retention, baseline, recovery,
        cloudWrites: false, productionReady: false, cloudRecoveryAccepted: false, pending: PENDING };
      await step('revalidation', async () => {
        const selected = await selectSourceCatalog({ root, directory: join(directory, 'source-revalidation'), plan, reader, request });
        assert.deepEqual(selectedIdentity(selected), selectedIdentity(sources), 'Selected sources changed during preparation');
        manifest.after = await reader.snapshot(); await checkLocal(manifest); return selected;
      });
      save(join(directory, 'diagnostic.json'), { status: 'passed', cloudWrites: false });
      manifest.filesPath = join(directory, 'files.json'); manifest.filesPin = save(manifest.filesPath, attemptFiles(directory));
      const manifestPath = join(directory, 'manifest.json');
      const manifestPin = save(manifestPath, manifest);
      return { status: manifest.status, directory, manifestPath, manifestPin, run: resolve(run), planPin: pin, releaseKey: plan.releaseKey,
        sources, assets, retention: { id: retention.id, retentionPin: retention.retentionPin }, baseline, recovery,
        productionReady: false, cloudWrites: false, cloudRecoveryAccepted: false, pending: PENDING };
    } catch (error) {
      record('failed');
      save(join(directory, 'failure.json'), { status: 'failed', stage, error: error.message, cloudWrites: false });
      throw new Error(`${error.message}; preparation diagnostics: ${directory}`, { cause: error });
    }
  });
}
