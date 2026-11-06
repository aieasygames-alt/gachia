import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SERVICES } from '../desktop-cloud-release.mjs';
import { digest } from '../desktop-release-assets.mjs';
import { unifiedMainDeploymentWriter } from '../unified-main-deployment.mjs';
import { unifiedMainPublicReferences, verifyUnifiedMainPublic } from '../unified-main-public.mjs';
import { executeUnifiedPromotionProtocol } from '../unified-promotion-protocol.mjs';
import { captureUnifiedUploadedModule } from '../unified-version-identity.mjs';
import { exactUnifiedPreviewOrigin, unifiedHTMLParserPin, unifiedPreviewReferences, verifyUnifiedVersionPreview } from '../unified-version-preview.mjs';

const sha = 'a'.repeat(64), uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const defaultPaths = ['/sitemap.xml', '/robots.txt', '/api/auth/get-session', '/data/ananta/raw-guides.json', '/data/genshin/raw-guides.json', '/data/nte/raw-guides.json',
  '/zh/ananta/guides/download-install-guide', '/en/ananta/guides/download-install-guide'];
const json = value => JSON.stringify(value, null, 2) + '\n';
export async function unifiedMainFixture(t, baselineOverride, sources, { generation = 0 } = {}) {
  const paths = sources ? sources.spec.publicReferences.map(row => row.path) : defaultPaths;
  const run = realpathSync(mkdtempSync(join(tmpdir(), 'unified-main-completed-'))); t.after(() => rmSync(run, { recursive: true, force: true }));
  const save = (file, value) => { const text = json(value); writeFileSync(file, text); return { path: file, pin: digest(text) }; };
  const directory = join(run, `unified-main-promotion-${randomUUID()}`), renewalDirectory = join(directory, 'renewal'), cloud = join(run, 'cloud');
  mkdirSync(renewalDirectory, { recursive: true }); mkdirSync(cloud);
  const config = { name: 'gachia', compatibility_date: '2026-07-08', compatibility_flags: ['nodejs_compat'] };
  const assets = { serve_directly: true, raw_run_worker_first: false, base_path: '/',
    headers: { version: 2, rules: { '/_next/static/*': { set: { 'cache-control': 'public,max-age=31536000,immutable' }, unset: [] } } },
    raw_headers: '/_next/static/*\n  Cache-Control: public,max-age=31536000,immutable\n' };
  const baseline = baselineOverride ?? { services: Object.fromEntries(SERVICES.map((service, i) => [service, { id: uuid(i + 10), versions: [{ version_id: uuid(i + 1), percentage: 100 }] }])),
    bindings: { gachia: [] }, settings: {}, subdomains: {}, scripts: SERVICES, routes: [], domains: [] };
  const roleReferences = {}, roleBodies = {}, accepted = { recovery: {}, candidate: {} }, renewed = { recovery: {}, candidate: {} }, targets = {}, versions = {};
  for (const [i, role] of ['recovery', 'candidate'].entries()) {
    const root = join(cloud, `${role}-main`); mkdirSync(root);
    const versionId = uuid(100 + i + generation * 100), code = `sealed ${role}${generation ? ` batch ${generation}` : ''}`, form = new FormData(); form.set('worker.js', new Blob([code]), 'worker.js');
    const archive = Buffer.from(await new Response(form).arrayBuffer()), outbound = join(root, 'outbound.multipart'), log = join(root, 'upload.log');
    writeFileSync(outbound, archive); writeFileSync(log, `Worker Version ID: ${versionId}\nVersion Preview URL: ${exactUnifiedPreviewOrigin('gachia', versionId)}\n`);
    const version = { id: versionId, number: i + 1, metadata: { has_preview: true }, resources: { script: { etag: 'e'.repeat(64) }, bindings: [],
      script_runtime: { compatibility_date: config.compatibility_date, compatibility_flags: config.compatibility_flags, usage_model: 'standard', assets } } };
    versions[role] = version;
    const moduleProof = await captureUnifiedUploadedModule({ service: 'gachia', versionId, moduleSHA256: digest(code),
      context: { role, transportPin: sha, configPin: sha }, directory: join(root, 'module'), uploadPath: outbound, uploadLogPath: log,
      readVersion: async () => version, readContent: async () => ({ archive, etag: 'e'.repeat(64) }) });
    const html = `<html><head><title>Guide</title><meta name="description" content="Install guide"><link rel="canonical" href="https://gachia.com/zh/ananta/guides/download-install-guide"></head><body><main><h1>Guide</h1><p>${role}</p></main></body></html>`;
    const bodies = paths.map(path => Buffer.from(path.includes('/guides/') ? html : path.startsWith('/api/') ? '{"code":"ACCOUNT_FEATURES_DISABLED"}'
      : path === '/sitemap.xml' ? '<urlset></urlset>' : path === '/robots.txt' ? 'User-agent: *\nAllow: /\n'
        : sources ? readFileSync(join(sources.spec.owners.main.directory, 'assets', path)) : '[]'));
    const rows = paths.map((path, n) => ({ path, status: path.startsWith('/api/') ? 404 : 200, bytes: bodies[n].length, sha256: digest(bodies[n]), bodyFile: `${n}.body`,
      headers: { 'content-type': path.includes('/guides/') ? 'text/html' : path.endsWith('.xml') ? 'application/xml' : path.endsWith('.txt') ? 'text/plain'
        : path.endsWith('.js') ? 'application/javascript' : 'application/json',
        'cache-control': path.startsWith('/api/') ? 'private, no-store' : 'public, max-age=0, must-revalidate' } }));
    const references = unifiedPreviewReferences(rows, (_, n) => bodies[n], 'streaming-v2'); roleReferences[role] = references; roleBodies[role] = { rows, bodies };
    const request = async url => {
      const n = paths.indexOf(new URL(url).pathname); return new Response(paths[n] === '/robots.txt' ? 'User-agent: *\nDisallow: /\n' : bodies[n],
        { status: rows[n].status, headers: { ...rows[n].headers, 'x-robots-tag': 'noindex' } });
    };
    const originalHTTP = await verifyUnifiedVersionPreview({ service: 'gachia', versionId, references, directory: join(root, 'http'), request, parserVersion: 'streaming-v2' });
    const proof = { service: 'gachia', versionId, moduleSHA256: digest(code), artifactPin: sha, versionPin: save(join(root, 'version.json'), version).pin, moduleProof,
      evidenceSHA256: originalHTTP.evidenceSHA256, acceptedAt: Date.now(), parserVersion: 'streaming-v2', parserPin: unifiedHTMLParserPin('streaming-v2') };
    accepted[role].main = proof;
    const fresh = await verifyUnifiedVersionPreview({ service: 'gachia', versionId, references, directory: join(renewalDirectory, role), request, parserVersion: 'streaming-v2' });
    renewed[role].main = { ...proof, originalEvidenceSHA256: proof.evidenceSHA256, evidenceSHA256: fresh.evidenceSHA256, acceptedAt: Date.now() };
    targets[role] = { moduleSHA256: digest(code), configPin: sha, artifactPin: sha, referencesPin: sha };
  }
  const previews = { directory: cloud, pin: sha, receipt: { accepted } };
  const releaseKey = 'b'.repeat(64), value = { preview: false, transportPin: sha, releaseKey, changed: ['unified:record'], ownerOrder: ['main'], baseline,
    identityObservedAt: Date.now(), owners: { main: { service: 'gachia', sourceVersionId: baseline.services.gachia.versions[0].version_id, sourceIdentityPin: sha, ...targets } } };
  const renewalPin = save(join(renewalDirectory, 'receipt.json'), { schemaVersion: 1, kind: 'unified_main_preview_renewal', releaseKey, transportPin: sha,
    previewPin: previews.pin, accepted: renewed, cloudWrites: false, productionPromoted: false }).pin;
  const initial = { ...value, previewPin: previews.pin, renewalPin, accepted: renewed, evidenceDirectory: directory, renewalDirectory };
  const publicReferences = unifiedMainPublicReferences(roleReferences.candidate, (_, n) => roleBodies.candidate.bodies[n]);
  let current = structuredClone(baseline);
  const candidate = accepted.candidate.main.versionId, deploymentId = uuid(200);
  const result = await executeUnifiedPromotionProtocol({ run, verify: async () => initial, authorize: () => releaseKey, makeTransport: () => ({
    snapshot: async () => current,
    verifyVersions: async () => {
      const proof = { status: 'passed', versions: { gachia: candidate }, modules: { gachia: targets.candidate.moduleSHA256 }, recoveryVersions: { gachia: accepted.recovery.main.versionId },
        observed: ['recovery', 'candidate'].map(role => ({ role, versionId: accepted[role].main.versionId, version: versions[role],
          moduleSHA256: accepted[role].main.moduleSHA256, moduleProof: accepted[role].main.moduleProof })) };
      return { ...proof, evidenceSHA256: save(join(directory, 'remote-0.json'), proof).pin };
    },
    promote: unifiedMainDeploymentWriter({ releaseKey, versionId: candidate, token: 'fixture-token', recordResponse: ({ kind, status, headers, bytes }) => {
      writeFileSync(join(directory, `deployment-${kind}.body`), bytes); save(join(directory, `deployment-${kind}.json`), { kind, status, headers, sha256: digest(bytes), bytes: bytes.length });
    }, request: async (_url, options) => {
      if (options.method === 'POST') { current = structuredClone(baseline); current.services.gachia = { id: deploymentId, versions: [{ version_id: candidate, percentage: 100 }] }; }
      return Response.json({ success: true, result: { id: deploymentId, strategy: 'percentage', versions: [{ version_id: candidate, percentage: 100 }] } });
    } }),
    acceptProduction: async () => {
      const prefix = readFileSync(new URL('./cloudflare-robots-prefix-2026-11-01.txt', import.meta.url));
      const http = join(directory, 'public'), checked = await verifyUnifiedMainPublic({ references: publicReferences, directory: http, request: async url => {
        const n = paths.indexOf(new URL(url).pathname), bytes = roleBodies.candidate.bodies[n];
        return new Response(paths[n] === '/robots.txt' ? Buffer.concat([prefix, bytes]) : bytes,
          { status: roleBodies.candidate.rows[n].status, headers: roleBodies.candidate.rows[n].headers });
      } });
      const proof = { status: 'passed', releaseKey, versions: { gachia: candidate }, owners: { main: { directory: http, evidenceSHA256: checked.evidenceSHA256, responses: publicReferences.length } } };
      return { ...proof, evidenceSHA256: save(join(directory, 'public-acceptance.json'), proof).pin };
    },
  }) });
  const ci = n => ({ status: 'full_exact_ci_passed', runID: n, commit: String(n).repeat(40), runAttempt: 1 });
  const sourceCI = ci(1), originExecutorCI = ci(2), executorCI = ci(3), productionRequest = { path: join(run, 'production.json'), pin: sha };
  const receipt = { ...result, directory, productionRequest, preview: { path: join(cloud, 'receipt.json'), pin: previews.pin }, sourceCI, originExecutorCI, executorCI };
  const input = { run, proof: save(join(directory, 'receipt.json'), receipt), value, previews, references: (_owner, role) => roleReferences[role], publicReferences,
    runtimeConfig: config, productionRequest, sourceCI, originExecutorCI, executorCI };
  return { input, save, directory, renewalDirectory, receipt, roleBodies, paths, versions, config, deploymentId,
    changeReceipt: fn => { fn(receipt); input.proof = save(input.proof.path, receipt); } };
}
