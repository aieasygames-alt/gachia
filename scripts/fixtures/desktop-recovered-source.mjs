import assert from 'node:assert/strict';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fixture as publishedFixture } from './desktop-published-source.mjs';
import { artifactFiles } from '../desktop-publish.mjs';
import { digest, verifyRetainedCandidate } from '../desktop-release-assets.mjs';
import { prepareLocalRecovery } from '../desktop-local-evidence.mjs';
import { capturePublishedBaseline } from '../desktop-published-baseline.mjs';
import { executeReleaseProtocol, executePromotionContinuation } from '../desktop-cloud-release.mjs';
import { executeRecoveryUpload } from '../desktop-cloud-transport.mjs';
import { verifyRecoveryCloud } from '../desktop-recovery-cloud.mjs';
import { verifyPromotionEvidence, readPromotionEvidenceForRenewal } from '../desktop-recovery-receipt.mjs';
import { executeEvidenceRenewal, verifyRenewedEvidence } from '../desktop-evidence-renewal.mjs';
import { executeVerifiedManualRecovery, verifyRecoveryPromotionJournal } from '../desktop-manual-recovery.mjs';
import { createPromotionTransport } from '../desktop-promotion-transport.mjs';
import { pageFingerprint, verifyVersionPreview } from '../desktop-version-preview.mjs';
import { publicReferences } from '../desktop-public-acceptance.mjs';

const json = value => JSON.stringify(value, null, 2) + '\n';
const put = (path, bytes) => { mkdirSync(dirname(path), { recursive: true, mode: 0o700 }); writeFileSync(path, bytes, { mode: 0o600 }); return digest(bytes); };
const save = (path, value) => put(path, json(value));

// Full sealed disk chain and the real protocol/transport composition; only the
// Cloudflare API and Worker responses are simulated. No credentials are used.
export async function fixture(t, game = 'genshin', options = {}) {
  const f = await publishedFixture(t, game, { ...options, content: json([{ id: 'one', title: 'B', content: 'Candidate B' }]) });
  const { run, pin, root } = f, plan = verifyRetainedCandidate(run, pin, f.manifest.retentionId, f.manifest.retentionPin).plan;
  const retained = { ...verifyRetainedCandidate(run, pin, f.manifest.retentionId, f.manifest.retentionPin), retentionPin: f.manifest.retentionPin };
  const baseline = f.manifest.snapshot, published = json([{ id: 'one', title: 'A', content: 'Published A' }]);
  const html = path => `<html><head><title>A</title><link rel="canonical" href="https://gachia.com${path}"/><meta name="description" content="A"/><script type="application/ld+json">{"name":"A"}</script></head><body><h1>A</h1>Published A</body></html>`;
  for (const service of Object.keys(baseline.services)) {
    baseline.settings[service].bindings ??= baseline.bindings[service];
    baseline.subdomains[service] ??= { enabled: true, previews_enabled: true };
  }
  baseline.scripts.sort();
  // These settings are part of the pinned cloud bundle, not a later drift.
  f.input.bundlePin = save(join(run, 'cloud-bundles', f.input.id, 'manifest.json'), f.manifest);
  const current = structuredClone(baseline), profile = { schemaVersion: 1, game, owners: {} };
  for (const owner of plan.owners) {
    const directory = join(root, 'old', owner);
    cpSync(join(retained.directory, owner, '.open-next'), directory, { recursive: true });
    if (owner === 'main') put(join(directory, `assets/data/${game}/raw-guides.json`), published);
    profile.owners[owner] = { directory, versionId: baseline.services[owner === 'main' ? 'gachia' : `gachia-game-${game}`].versions[0].version_id, artifactSHA256: digest(json(artifactFiles(directory))) };
  }
  const sourcePath = join(root, 'old-sources.json'), sourcePin = save(sourcePath, profile);
  let localConfig;
  const baselineRequest = async url => {
    const path = new URL(url).pathname;
    if (path.startsWith('/api/')) return new Response('{"code":"ACCOUNT_FEATURES_DISABLED"}', { status: 404, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
    const body = path.startsWith('/data/') ? published : path === '/sitemap.xml' ? '<urlset/>' : path.includes('/_next/static/') ? readFileSync(join(localConfig.assets.directory, path)) : html(path);
    return new Response(body, { headers: { 'content-type': path.startsWith('/data/') ? 'application/json' : path === '/sitemap.xml' ? 'application/xml' : path.includes('/guides/') ? 'text/html' : 'text/javascript', 'cache-control': 'public, max-age=0' } });
  };
  const oldCode = Buffer.from('downloaded old runtime'), oldForm = new FormData(); oldForm.set('worker.js', new Blob([oldCode]), 'worker.js');
  const oldArchive = Buffer.from(await new Response(oldForm).arrayBuffer());
  const baselineProof = await capturePublishedBaseline({ plan, importBytes: Buffer.from(f.original), directory: join(root, 'baseline'), observe: async () => structuredClone(baseline), request: baselineRequest });
  const recovery = await prepareLocalRecovery({ run, verified: retained, ...baselineProof, sourcePath, sourcePin, directory: join(root, 'compatible-recovery'),
    reader: { snapshot: async () => structuredClone(baseline), module: async () => ({ code: oldCode, moduleSHA256: digest(oldCode), archive: oldArchive }) }, request: baselineRequest,
    serve: async (_cwd, config, _home, _log, accept) => { localConfig = JSON.parse(readFileSync(config)); return accept('http://127.0.0.1:12345'); } });
  const local = JSON.parse(readFileSync(recovery.evidencePath)), recoveryId = 'b'.repeat(16), directory = join(run, 'recovery-bundles', recoveryId);
  const toolPath = join(root, 'fixture-wrangler.js'); put(toolPath, 'fixture only; never execute');
  const tool = { version: '4.148.0', bin: toolPath, cli: toolPath, binSHA256: digest(readFileSync(toolPath)), cliSHA256: digest(readFileSync(toolPath)) };
  const owners = {}, cloud = new Map(), recoveryResponses = new Map();
  for (const [i, owner] of plan.owners.entries()) {
    const record = f.manifest.owners[owner], service = record.service;
    const candidateId = f.current.services[service].versions[0].version_id;
    cloud.set(`${service}/${candidateId}`, { version: await f.reader.version(service), module: await f.reader.module(service) });
    const code = Buffer.from(`recovery sealed ${owner}`), moduleSHA256 = put(join(directory, owner, 'worker.js'), code);
    const config = { ...JSON.parse(readFileSync(join(run, 'cloud-bundles', f.input.id, owner, 'upload.json'))), main: join(directory, owner, 'worker.js'), assets: { directory: join(local.directory, owner, '.open-next/assets') } };
    const refs = [...local.owners[owner].observations, ...local.owners[owner].auxiliary].map((row, index) => {
      const body = readFileSync(join(local.directory, row.bodyFile)); put(join(directory, owner, `${index}.body`), body);
      const ref = { path: row.path, status: row.status, headers: row.headers, sha256: row.sha256,
        ...(row.headers['content-type'] === 'text/html' ? { fingerprint: pageFingerprint(body.toString()), expectedRobots: [] } : {}) };
      recoveryResponses.set(`${service}:${ref.path}`, { body, ref }); return ref;
    });
    owners[owner] = { service, sourceVersionId: profile.owners[owner].versionId, candidateArtifactSHA256: record.artifactSHA256,
      recoveryArtifactSHA256: local.owners[owner].artifactSHA256, moduleSHA256, configSHA256: save(join(directory, owner, 'upload.json'), config), referencesSHA256: save(join(directory, owner, 'references.json'), refs), paths: refs.length, tool };
    const versionId = `22222222-0000-0000-0000-${String(i + 200).padStart(12, '0')}`, version = structuredClone(await f.reader.version(service));
    version.id = versionId; version.resources.script.etag = moduleSHA256;
    const form = new FormData(); form.set('worker.js', new Blob([code]), 'worker.js');
    cloud.set(`${service}/${versionId}`, { version, module: { code, moduleSHA256, archive: Buffer.from(await new Response(form).arrayBuffer()) } });
  }
  const sealed = { schemaVersion: 1, kind: 'sealed_local_recovery', id: recoveryId, planSHA256: pin, candidateId: f.input.id, candidatePin: f.input.bundlePin, releaseKey: plan.releaseKey,
    evidencePath: recovery.evidencePath, evidencePin: recovery.evidencePin, snapshot: baseline, previewCandidate: false, owners, cloudWrites: false, cloudRecoveryAccepted: false };
  const input = { run, pin, id: f.input.id, bundlePin: f.input.bundlePin, repo: f.input.repo, recoveryId, recoveryBundlePin: save(join(directory, 'manifest.json'), sealed), releaseKey: plan.releaseKey, token: 'test-only' };
  const calls = []; let failMain = false;
  const response = (row, preview) => new Response(row.body, { status: row.ref.status, headers: { ...row.ref.headers, ...(preview ? { 'x-robots-tag': 'noindex' } : {}) } });
  const request = async (url, opts) => {
    calls.push({ method: opts.method, url }); const u = new URL(url), path = u.pathname;
    if (u.hostname === 'api.cloudflare.com') {
      const [service, operation, versionId] = path.split('/workers/scripts/')[1]?.split('/') ?? [];
      if (opts.method === 'POST') {
        assert.equal(operation, 'deployments');
        if (failMain && service === 'gachia') return new Response('', { status: 503 });
        const body = JSON.parse(opts.body); assert(cloud.has(`${service}/${body.versions[0].version_id}`));
        current.services[service] = { id: `33333333-0000-0000-0000-${String(calls.length).padStart(12, '0')}`, strategy: body.strategy, versions: body.versions };
        return Response.json({ success: true, result: current.services[service] });
      }
      assert.equal(opts.method, 'GET'); let value;
      if (operation === 'versions') value = cloud.get(`${service}/${versionId}`).version;
      else if (operation === 'content') return new Response(cloud.get(`${service}/${u.searchParams.get('version')}`).module.archive);
      else if (operation === 'deployments') value = { deployments: [current.services[service]] };
      else if (operation === 'settings') value = current.settings[service];
      else if (operation === 'subdomain') value = current.subdomains[service];
      else if (path.endsWith('/workers/scripts')) value = current.scripts.map(id => ({ id }));
      else if (path.endsWith('/workers/routes')) value = current.routes;
      else if (path.endsWith('/workers/domains')) value = current.domains;
      else assert.fail(url);
      return Response.json({ success: true, result: value });
    }
    assert.equal(opts.method, 'GET'); assert.equal(opts.credentials, 'omit'); assert.equal(opts.redirect, 'error');
    if (u.hostname === 'gachia.com') {
      for (const owner of plan.owners) {
        const refs = JSON.parse(readFileSync(join(directory, owner, 'references.json'))), mapped = publicReferences(owner, refs, game);
        const ref = mapped.find(row => row.path === path);
        if (ref) {
          const originalPath = owner === 'main' ? path : path.startsWith('/sitemaps/') ? '/sitemap.xml' : path.replace(`/_games/${game}`, '');
          return response({ body: recoveryResponses.get(`${owners[owner].service}:${originalPath}`).body, ref }, false);
        }
      }
      assert.fail(url);
    }
    const service = u.hostname.includes(`gachia-game-${game}`) ? `gachia-game-${game}` : 'gachia';
    const rows = u.hostname.startsWith('22222222-') ? recoveryResponses : f.responses;
    return response(rows.get(`${service}:${path}`), true);
  };
  // Replace the fixture's synthetic successful publication with the actual
  // preview-only journal, then a real protocol-level partial promotion.
  rmSync(f.journalPath); rmSync(join(run, `promotion-evidence-${retained.receipt.id ?? f.manifest.retentionId}`), { recursive: true, force: true });
  const previewDir = join(run, `cloud-preview-${input.id}`); mkdirSync(previewDir);
  await executeReleaseProtocol({ run, pin, retentionId: f.manifest.retentionId, retentionPin: f.manifest.retentionPin, previewOnly: true, authorize: () => plan.releaseKey,
    transport: { snapshot: async () => structuredClone(baseline), upload: async ({ owner }) => { const row = f.manifest.owners[owner]; return { versionId: f.current.services[row.service].versions[0].version_id, releaseKey: plan.releaseKey, artifactSHA256: row.artifactSHA256, moduleSHA256: row.moduleSHA256 }; },
      preview: async args => ({ ...args, ...await verifyVersionPreview({ service: args.service, versionId: args.versionId, references: JSON.parse(readFileSync(join(run, 'cloud-bundles', input.id, args.owner, 'references.json'))), directory: join(previewDir, `${args.owner}-http`), request }) }) } });
  input.journalPin = digest(readFileSync(join(run, `cloud-${f.manifest.retentionId}.jsonl`)));
  const uploaded = await executeRecoveryUpload({ input, verify: () => verifyRecoveryCloud(input), transport: { snapshot: async () => structuredClone(baseline),
    upload: async ({ owner, row }) => ({ versionId: [...cloud].find(([key]) => key.startsWith(`${row.service}/22222222`))[1].version.id }),
    inspect: async ({ owner, row, versionId, directory: out }) => ({ versionSHA256: save(join(out, `${owner}-version.json`), cloud.get(`${row.service}/${versionId}`).version) }),
    preview: async ({ owner, row, versionId, directory: out }) => verifyVersionPreview({ service: row.service, versionId, references: JSON.parse(readFileSync(join(directory, owner, 'references.json'))), directory: join(out, `${owner}-http`), request }) } });
  input.receiptPin = uploaded.receiptPin;
  const evidence = verifyPromotionEvidence(input); failMain = true;
  await assert.rejects(executePromotionContinuation({ run, retentionId: f.manifest.retentionId, verify: () => verifyPromotionEvidence(input), authorize: () => plan.releaseKey,
    transport: createPromotionTransport({ run, evidence, candidateDirectory: join(run, 'cloud-bundles', input.id), recoveryDirectory: directory, recoveryManifest: sealed, token: input.token, request }) }), /Deployment response 503/);
  failMain = false; input.promotionJournalPin = digest(readFileSync(f.journalPath));
  const renewal = await executeEvidenceRenewal({ input: { ...input, mode: 'recover' }, readEvidence: readPromotionEvidenceForRenewal, readSealed: verifyRecoveryCloud,
    makeTransport: args => createPromotionTransport({ ...args, request }), preview: args => verifyVersionPreview({ ...args, request }) });
  input.renewalId = renewal.id; input.renewalPin = renewal.renewalPin;
  const verify = async () => { const value = await verifyRenewedEvidence(input, 'recover'); verifyRecoveryPromotionJournal(input, value); return value; };
  const completed = await executeVerifiedManualRecovery({ input, verify, request }); input.recoveryJournalPin = completed.journalSHA256;
  const reader = { snapshot: async () => structuredClone(current), version: async (s, v) => structuredClone(cloud.get(`${s}/${v}`).version), module: async (s, v) => cloud.get(`${s}/${v}`).module };
  const sourceInput = { ...input }; delete sourceInput.token; delete sourceInput.id; delete sourceInput.bundlePin;
  return { ...f, plan, published, local, sealed, input: sourceInput, current, cloud, reader, request, calls, renewal, completed,
    args: { input: sourceInput, root: join(root, 'catalog'), directory: join(run, 'recover-source'), reader, request } };
}
