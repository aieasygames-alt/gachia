import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SERVICES } from '../desktop-cloud-release.mjs';
import { digest } from '../desktop-release-assets.mjs';
import { unifiedGenshinMainDeploymentWriter } from '../unified-genshin-main-deployment.mjs';
import { verifyUnifiedGenshinPublic } from '../unified-genshin-public.mjs';
import { unifiedMainPublicReferences, verifyUnifiedMainPublic } from '../unified-main-public.mjs';
import { executeUnifiedPromotionProtocol } from '../unified-promotion-protocol.mjs';
import { unifiedService } from '../unified-release-assets.mjs';
import { captureUnifiedUploadedModule } from '../unified-version-identity.mjs';
import { exactUnifiedPreviewOrigin, unifiedHTMLParserPin, unifiedPreviewReferences, verifyUnifiedVersionPreview } from '../unified-version-preview.mjs';
import { genshinPublicFixture } from './unified-genshin-public-fixture.mjs';

const OWNERS = ['genshin', 'main'], ROLES = ['recovery', 'candidate'], sha = 'a'.repeat(64);
export const pairUUID = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

// Synthetic responses exercise real modules, HTTP validators, fixed writers and
// completion readers. This fixture never requests the public internet.
export async function genshinMainFixture(t, { fault, baseline: providedBaseline, mainSources, captureArtifact } = {}) {
  const run = realpathSync(mkdtempSync(join(tmpdir(), 'unified-genshin-main-'))); t.after(() => rmSync(run, { recursive: true, force: true }));
  const save = (file, value) => { const text = JSON.stringify(value, null, 2) + '\n'; writeFileSync(file, text); return { path: file, pin: digest(text) }; };
  const directory = join(run, `unified-main-promotion-${randomUUID()}`), renewalDirectory = join(directory, 'renewal'), cloud = join(run, `unified-cloud-preview-${sha}`);
  mkdirSync(renewalDirectory, { recursive: true }); mkdirSync(cloud);
  const baseline = providedBaseline ? structuredClone(providedBaseline) : { services: Object.fromEntries(SERVICES.map((service, i) => [service, { id: pairUUID(10 + i), versions: [{ version_id: pairUUID(1 + i), percentage: 100 }] }])),
    bindings: { gachia: [], 'gachia-game-genshin': [] }, settings: {}, subdomains: {}, scripts: SERVICES, routes: [], domains: [] };
  const accepted = { recovery: {}, candidate: {} }, renewed = { recovery: {}, candidate: {} }, owners = {}, configs = {}, bodies = {}, refs = {}, publicReferences = {};
  for (const [ownerIndex, owner] of OWNERS.entries()) {
    const service = unifiedService(owner), config = { name: service, compatibility_date: '2026-07-08', compatibility_flags: ['nodejs_compat'] };
    configs[owner] = config; owners[owner] = { service, sourceVersionId: baseline.services[service].versions[0].version_id, sourceIdentityPin: sha };
    bodies[owner] = {}; refs[owner] = {};
    for (const [roleIndex, role] of ROLES.entries()) {
      const root = join(cloud, `${role}-${owner}`); mkdirSync(root);
      const versionId = pairUUID(100 + ownerIndex * 10 + roleIndex), code = `sealed ${owner} ${role}`, form = new FormData(); form.set('worker.js', new Blob([code]), 'worker.js');
      const archive = Buffer.from(await new Response(form).arrayBuffer()), outbound = join(root, 'outbound.multipart'), uploadLog = join(root, 'upload.log');
      writeFileSync(outbound, archive); writeFileSync(uploadLog, `Worker Version ID: ${versionId}\nVersion Preview URL: ${exactUnifiedPreviewOrigin(service, versionId)}\n`);
      const assets = { serve_directly: true, raw_run_worker_first: false, base_path: '/', ...(owner === 'main' ? {
        headers: { version: 2, rules: { '/_next/static/*': { set: { 'cache-control': 'public,max-age=31536000,immutable' }, unset: [] } } },
        raw_headers: '/_next/static/*\n  Cache-Control: public,max-age=31536000,immutable\n' } : {}) };
      const version = { id: versionId, number: roleIndex + 1, metadata: { has_preview: true }, resources: { script: { etag: 'e'.repeat(64) }, bindings: [],
        script_runtime: { compatibility_date: config.compatibility_date, compatibility_flags: config.compatibility_flags, usage_model: 'standard', assets } } };
      const moduleProof = await captureUnifiedUploadedModule({ service, versionId, moduleSHA256: digest(code), context: { role, transportPin: sha, configPin: sha },
        directory: join(root, 'module'), uploadPath: outbound, uploadLogPath: uploadLog, readVersion: async () => version, readContent: async () => ({ archive, etag: 'e'.repeat(64) }) });
      let rows, rawBodies, read;
      if (owner === 'genshin') {
        const f = genshinPublicFixture();
        if (role === 'recovery') for (let i = 0; i < 3; i++) { f.replace(i, f.bodies[i].toString().replaceAll('Approved', 'Previous')); f.requirements[i].contains = f.requirements[i].contains.map(text => text.replace('Approved', 'Previous')); }
        rows = f.rows; rawBodies = f.bodies; read = f.read;
        publicReferences[role] ??= {}; publicReferences[role].genshin = f.references();
      } else {
        const data = mainSources && Object.fromEntries(mainSources[role].filter(row => row.sourcePath.endsWith('.json')).map(row => [row.sourcePath.replace('packages/data/games/', '/data/'), row.text]));
        const paths = ['/sitemap.xml', '/robots.txt', '/api/auth/get-session', ...(data ? Object.keys(data) : ['/data/ananta/raw-guides.json', '/data/genshin/raw-guides.json',
          '/data/nte/raw-guides.json', '/data/genshin/raw-characters.json']), '/zh/ananta/guides/download-install-guide', '/en/ananta/guides/download-install-guide', '/_next/static/main.js'];
        rawBodies = paths.map(path => Buffer.from(path.includes('/guides/') ? `<html><head><title>Preserved</title><meta name="description" content="Preserved Main"><link rel="canonical" href="https://gachia.com${path}"></head><body><main>Preserved Main</main></body></html>`
          : path === '/sitemap.xml' ? '<urlset></urlset>' : path === '/robots.txt' ? 'User-agent: *\nAllow: /\n' : path.startsWith('/api/') ? '{"code":"ACCOUNT_FEATURES_DISABLED"}'
            : path.endsWith('.js') ? 'console.log("main")' : data ? data[path] : path.includes('raw-characters') ? `[{"id":"fixture","name":"${role}"}]` : '[]'));
        rows = paths.map((path, index) => ({ path, status: path.startsWith('/api/') ? 404 : 200, bodyFile: `${index}.body`, bytes: rawBodies[index].length, sha256: digest(rawBodies[index]),
          headers: { 'content-type': path.includes('/guides/') ? 'text/html' : path.endsWith('.xml') ? 'application/xml' : path.endsWith('.txt') ? 'text/plain' : path.endsWith('.js') ? 'text/javascript' : 'application/json',
            'cache-control': path.startsWith('/api/') ? 'private, no-store' : path.endsWith('.js') ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate' } }));
        read = row => rawBodies[Number(row.bodyFile.split('.')[0])];
        publicReferences[role] ??= {}; publicReferences[role].main = unifiedMainPublicReferences(rows, read);
      }
      const references = unifiedPreviewReferences(rows, read, 'streaming-v2'); refs[owner][role] = references; bodies[owner][role] = { rows, rawBodies };
      const request = async url => {
        const index = rows.findIndex(row => row.path === new URL(url).pathname); assert(index >= 0);
        return new Response(rows[index].path === '/robots.txt' ? 'User-agent: *\nDisallow: /\n' : rawBodies[index],
          { status: rows[index].status, headers: { ...rows[index].headers, 'x-robots-tag': 'noindex' } });
      };
      const old = await verifyUnifiedVersionPreview({ service, versionId, references, directory: join(root, 'http'), request, parserVersion: 'streaming-v2' });
      const artifactPin = captureArtifact ? await captureArtifact({ owner, role, rows, rawBodies }) : sha;
      const proof = { service, versionId, moduleSHA256: digest(code), artifactPin, moduleProof, versionPin: save(join(root, 'version.json'), version).pin,
        evidenceSHA256: old.evidenceSHA256, acceptedAt: Date.now(), parserVersion: 'streaming-v2', parserPin: unifiedHTMLParserPin('streaming-v2') };
      accepted[role][owner] = proof;
      const fresh = await verifyUnifiedVersionPreview({ service, versionId, references, directory: join(renewalDirectory, `${role}-${owner}`), request, parserVersion: 'streaming-v2' });
      renewed[role][owner] = { ...proof, originalEvidenceSHA256: proof.evidenceSHA256, evidenceSHA256: fresh.evidenceSHA256, acceptedAt: Date.now() };
      owners[owner][role] = { moduleSHA256: digest(code), configPin: sha, artifactPin, referencesPin: sha };
    }
  }
  const value = { preview: false, transportPin: sha, releaseKey: 'b'.repeat(64), changed: ['unified:fixture-character'], ownerOrder: OWNERS,
    owners, baseline, identityObservedAt: Date.now(), preservedOwners: {} };
  const common = { releaseKey: value.releaseKey, transportPin: sha, at: new Date().toISOString() }, rows = [{ ...common, phase: 'baseline', baseline, directory: cloud }];
  for (const role of ROLES) for (const owner of OWNERS) for (const phase of ['upload_intent', 'upload_response', 'upload_returned', 'preview_accepted']) {
    const proof = accepted[role][owner]; rows.push({ ...common, phase, role, owner, ...(phase === 'preview_accepted' ? { proof } : { service: proof.service,
      ...(phase === 'upload_intent' ? { moduleSHA256: proof.moduleSHA256 } : { versionId: proof.versionId }) }) });
  }
  rows.push({ ...common, phase: 'all_cloud_previews_accepted_no_promotion', accepted });
  const uploadJournal = rows.map(row => JSON.stringify(row) + '\n').join(''); writeFileSync(join(run, `unified-preview-${sha}.jsonl`), uploadJournal);
  const previewReceipt = { schemaVersion: 1, kind: 'unified_candidate_recovery_cloud_previews', status: 'all_cloud_previews_accepted_no_promotion', releaseKey: value.releaseKey,
    transportPin: sha, accepted, journalPin: digest(uploadJournal), productionPromoted: false, activationSupported: false };
  const previewPin = save(join(cloud, 'receipt.json'), previewReceipt).pin, previews = { directory: cloud, pin: previewPin, receipt: previewReceipt };
  const renewalPin = save(join(renewalDirectory, 'receipt.json'), { schemaVersion: 1, kind: 'unified_genshin_main_preview_renewal', releaseKey: value.releaseKey,
    transportPin: sha, previewPin, accepted: renewed, cloudWrites: false, productionPromoted: false }).pin;
  const initial = { ...value, accepted: renewed, previewPin, renewalPin, evidenceDirectory: directory, renewalDirectory };
  let current = structuredClone(baseline), observedAt = value.identityObservedAt, result, failure;
  const calls = [], responseFiles = [];
  const expectedVersions = Object.fromEntries(OWNERS.map(owner => [unifiedService(owner), accepted.candidate[owner].versionId]));
  const writer = unifiedGenshinMainDeploymentWriter({ releaseKey: value.releaseKey, versions: Object.fromEntries(OWNERS.map(owner => [owner, accepted.candidate[owner].versionId])),
    token: 'isolated-pair-token', recordResponse: ({ owner, kind, status, headers, bytes }) => {
      const file = join(directory, `deployment-${owner}-${kind}`); writeFileSync(file + '.body', bytes); responseFiles.push(file);
      save(file + '.json', { owner, kind, status, headers, bytes: bytes.length, sha256: digest(bytes) });
    }, request: async (url, options) => {
      const match = new URL(url).pathname.match(/\/scripts\/(gachia(?:-game-genshin)?)\/deployments(?:\/([^/]+))?$/); assert(match);
      const service = match[1], owner = service === 'gachia' ? 'main' : 'genshin', index = OWNERS.indexOf(owner), deploymentId = pairUUID(300 + index);
      calls.push({ owner, method: options.method, url }); assert.equal(options.redirect, 'error');
      if (options.method === 'POST') {
        assert.deepEqual(JSON.parse(options.body), { strategy: 'percentage', versions: [{ version_id: expectedVersions[service], percentage: 100 }] });
        current.services[service] = { id: deploymentId, versions: [{ version_id: expectedVersions[service], percentage: 100 }] };
        if (fault === `${owner}-unknown`) throw Error('Response lost after activation');
      } else assert.equal(match[2], deploymentId);
      return Response.json({ success: true, result: { id: deploymentId, strategy: 'percentage', versions: [{ version_id: expectedVersions[service], percentage: 100 }] } });
    } });
  const references = (owner, role) => refs[owner][role];
  try {
    result = await executeUnifiedPromotionProtocol({ run, verify: async () => ({ ...initial, identityObservedAt: observedAt = Date.now() }), authorize: () => value.releaseKey,
      authorizeWrite: () => ({ authorizedAt: Date.now(), identityObservedAt: observedAt }), confirmWrite: () => {},
      verifyAfterWrite: async () => ({ ...initial, identityObservedAt: Date.now() }), makeTransport: () => ({
        snapshot: async () => structuredClone(current),
        verifyVersions: async () => {
          const remote = { status: 'passed', versions: expectedVersions, recoveryVersions: Object.fromEntries(OWNERS.map(owner => [unifiedService(owner), accepted.recovery[owner].versionId])),
            modules: Object.fromEntries(OWNERS.map(owner => [unifiedService(owner), owners[owner].candidate.moduleSHA256])), observed: ROLES.flatMap(role => OWNERS.map(owner => ({ owner, role,
              service: unifiedService(owner), versionId: accepted[role][owner].versionId, moduleSHA256: accepted[role][owner].moduleSHA256,
              moduleProof: accepted[role][owner].moduleProof, version: JSON.parse(readFileSync(join(cloud, `${role}-${owner}/version.json`))) }))) };
          return { ...remote, evidenceSHA256: save(join(directory, 'remote-0.json'), remote).pin };
        }, promote: writer,
        acceptProduction: async () => {
          const proof = { status: 'passed', releaseKey: value.releaseKey, versions: expectedVersions, owners: {} };
          mkdirSync(join(directory, 'public'));
          for (const owner of OWNERS) {
            const directoryHTTP = join(directory, 'public', owner), references = publicReferences.candidate[owner];
            const checked = await (owner === 'main' ? verifyUnifiedMainPublic : verifyUnifiedGenshinPublic)({ references, directory: directoryHTTP, request: async url => {
              if (fault === `${owner}-public`) throw Error('Public acceptance failed');
              const path = new URL(url).pathname, reference = references.find(row => row.path === path); assert(reference);
              let bytes = bodies[owner].candidate.rawBodies[Number(reference.bodyFile.split('.')[0])];
              if (path === '/robots.txt') bytes = Buffer.concat([readFileSync(new URL('./cloudflare-robots-prefix-2026-11-01.txt', import.meta.url)), bytes]);
              return new Response(bytes, { status: reference.status, headers: reference.headers });
            } });
            proof.owners[owner] = { directory: directoryHTTP, evidenceSHA256: checked.evidenceSHA256, responses: references.length };
          }
          return { ...proof, evidenceSHA256: save(join(directory, 'public-acceptance.json'), proof).pin };
        },
      }) });
  } catch (error) { failure = error; }
  const ci = n => ({ status: 'full_exact_ci_passed', runID: n, commit: String(n).repeat(40), runAttempt: 1 });
  const input = { run, value, previews, references, runtimeConfigs: configs, publicReferences: publicReferences.candidate,
    productionRequest: { path: join(run, 'production.json'), pin: sha }, sourceCI: ci(1), originExecutorCI: ci(2), executorCI: ci(3) };
  let receipt;
  if (result) {
    receipt = { ...result, kind: 'unified_genshin_main_publication_promotion', directory, productionRequest: input.productionRequest,
      preview: { path: join(cloud, 'receipt.json'), pin: previewPin }, sourceCI: input.sourceCI, originExecutorCI: input.originExecutorCI, executorCI: input.executorCI };
    input.proof = save(join(directory, 'receipt.json'), receipt);
  }
  return { input, receipt, failure, directory, renewalDirectory, save, calls, responseFiles, current, initial,
    journalFile: join(run, `unified-promotion-${sha}.jsonl`), changeReceipt: fn => { fn(receipt); input.proof = save(input.proof.path, receipt); } };
}
