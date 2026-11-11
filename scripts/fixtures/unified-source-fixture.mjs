import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SERVICES } from '../desktop-cloud-release.mjs';
import { artifactFiles } from '../desktop-publish.mjs';
import { digest } from '../desktop-release-assets.mjs';
import { captureUploadedModule } from '../desktop-version-provenance.mjs';
import { UNIFIED_SOURCE_OWNERS } from '../unified-historical-sources.mjs';
import { unifiedMainPublicReferences } from '../unified-main-public.mjs';
import { unifiedService } from '../unified-release-assets.mjs';
import { captureUnifiedSourceModule, captureUnifiedUploadedModule } from '../unified-version-identity.mjs';
import { exactUnifiedPreviewOrigin, unifiedPreviewReferences } from '../unified-version-preview.mjs';

export const sourceFixtureUUID = n => `1234abcd-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const sourceFixtureJSON = value => JSON.stringify(value, null, 2) + '\n';
export async function unifiedSourceFixture(t, { originalMain = false } = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'unified-source-next-'))); t.after(() => rmSync(root, { recursive: true, force: true }));
  const save = (file, value) => { const text = sourceFixtureJSON(value); writeFileSync(file, text); return { path: file, pin: digest(text) }; };
  const baseline = { services: Object.fromEntries(SERVICES.map((service, i) => [service, { id: sourceFixtureUUID(i + 100), versions: [{ version_id: sourceFixtureUUID(i + 1), percentage: 100 }] }])),
    bindings: { gachia: [] }, settings: {}, subdomains: {}, scripts: SERVICES, routes: [], domains: [] };
  const owners = {}, versions = {}, transportPin = 'a'.repeat(64);
  for (const owner of UNIFIED_SOURCE_OWNERS) {
    const service = unifiedService(owner), versionId = owner === 'main' && !originalMain ? sourceFixtureUUID(200) : baseline.services[service].versions[0].version_id;
    const directory = join(root, owner); mkdirSync(directory);
    const artifact = join(directory, 'artifact'); mkdirSync(join(artifact, 'assets/_next/static'), { recursive: true });
    mkdirSync(join(artifact, '.build')); writeFileSync(join(artifact, '.build/open-next.config.edge.mjs'), 'export default {}');
    writeFileSync(join(artifact, 'assets/BUILD_ID'), owner);
    const code = `published ${owner}`, form = new FormData(); form.set('worker.js', new Blob([code]), 'worker.js');
    const archive = Buffer.from(await new Response(form).arrayBuffer()), modulePath = join(directory, 'module.multipart'); writeFileSync(modulePath, archive);
    writeFileSync(join(artifact, 'worker.js'), owner === 'main' ? 'unbundled candidate' : code);
    writeFileSync(join(artifact, 'assets/_next/static/old.js'), 'old static');
    if (owner !== 'main') {
      mkdirSync(join(artifact, `assets/_games/${owner}/_next/static`), { recursive: true });
      writeFileSync(join(artifact, `assets/_games/${owner}/_next/static/old.js`), 'old static');
    } else writeFileSync(join(artifact, 'assets/_next/static/new.js'), 'new static');
    const version = { id: versionId, number: 7, metadata: { has_preview: true }, resources: { script: { etag: 'e'.repeat(64) }, bindings: [] } };
    const args = { service, versionId, moduleSHA256: digest(code), directory: join(directory, 'capture'),
      readVersion: async () => version, readContent: async () => ({ archive, etag: 'e'.repeat(64) }) };
    let moduleProof, mode, moduleContext;
    if ((owner === 'main' && !originalMain) || ['genshin', 'nte'].includes(owner)) {
      const log = join(directory, 'upload.log'); writeFileSync(log, `Worker Version ID: ${versionId}\nVersion Preview URL: ${exactUnifiedPreviewOrigin(service, versionId)}\n`);
      moduleContext = owner === 'main' ? { role: 'candidate', transportPin, configPin: 'b'.repeat(64) }
        : { role: 'candidate', releaseKey: 'c'.repeat(64), configSHA256: 'b'.repeat(64) };
      moduleProof = await (owner === 'main' ? captureUnifiedUploadedModule : captureUploadedModule)({ ...args, context: moduleContext, uploadPath: modulePath, uploadLogPath: log });
      mode = owner === 'main' ? 'unified_upload_time_module_receipt' : 'original_upload_time_receipt_fresh_immutable_identity';
    } else {
      moduleProof = await captureUnifiedSourceModule({ ...args, archiveProof: { path: modulePath, pin: digest(archive) }, transportPin });
      mode = 'fresh_etag_bound_source_capture';
    }
    owners[owner] = { owner, service, versionId, version, directory: artifact, modulePath, archiveSHA256: digest(archive), moduleSHA256: digest(code),
      moduleProof, mode, ...(moduleContext && owner === 'main' ? { moduleContext } : { proofTransportPin: transportPin }) };
    versions[service] = version;
  }
  const pairs = ['ananta/raw-guides.json', 'genshin/raw-guides.json', 'nte/raw-guides.json', ...Array.from({ length: 87 }, (_, i) => `fixture-${i}/raw-characters.json`)];
  const sources = pairs.map(pair => {
    const text = sourceFixtureJSON([{ id: 'existing', title: pair.startsWith('ananta/') ? 'published editorial increment' : 'preserved public A' }]);
    const file = join(owners.main.directory, 'assets/data', pair); mkdirSync(join(file, '..'), { recursive: true }); writeFileSync(file, text);
    return { sourcePath: `packages/data/games/${pair}`, text, sha256: digest(text) };
  });
  for (let i = 0; i < 25; i++) {
    const text = `export const ranks = ${i + 1}\n`;
    sources.push({ sourcePath: `packages/data/games/fixture-code-${i}/tier-lists.ts`, text, sha256: digest(text) });
  }
  sources.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));
  for (const row of Object.values(owners)) row.artifactSHA256 = digest(sourceFixtureJSON(artifactFiles(row.directory)));
  const paths = ['/sitemap.xml', '/robots.txt', '/api/auth/get-session', '/zh/ananta/guides/download-install-guide', '/en/ananta/guides/download-install-guide',
    ...pairs.map(pair => '/data/' + pair), '/_next/static/old.js', '/_next/static/new.js'];
  const html = '<html><head><title>Guide</title><meta name="description" content="Guide"><link rel="canonical" href="https://gachia.com/zh/ananta/guides/download-install-guide"></head><body><main><h1>Guide</h1><p>published editorial increment</p></main></body></html>';
  const bodies = paths.map(path => Buffer.from(path.startsWith('/data/') ? readFileSync(join(owners.main.directory, 'assets', path))
    : path.includes('/guides/') ? html : path === '/sitemap.xml' ? '<urlset></urlset>' : path === '/robots.txt' ? 'User-agent: *\nAllow: /\n'
      : path.startsWith('/api/') ? '{"code":"ACCOUNT_FEATURES_DISABLED"}' : path.includes('old.js') ? 'old static' : 'new static'));
  const references = paths.map((path, i) => ({ path, bodyFile: `${i}.body`, bytes: bodies[i].length, sha256: digest(bodies[i]), status: path.startsWith('/api/') ? 404 : 200,
    headers: { 'content-type': path.endsWith('.js') ? 'application/javascript' : path.startsWith('/data/') || path.startsWith('/api/') ? 'application/json'
      : path.includes('/guides/') ? 'text/html' : path.endsWith('.xml') ? 'application/xml' : 'text/plain',
    'cache-control': path.startsWith('/api/') ? 'private, no-store' : 'public, max-age=0, must-revalidate' } }));
  const publicReferences = unifiedMainPublicReferences(unifiedPreviewReferences(references, (_, i) => bodies[i], 'streaming-v2'), (_, i) => bodies[i]);
  const prefix = readFileSync(new URL('./cloudflare-robots-prefix-2026-11-01.txt', import.meta.url));
  const request = async (url, options) => {
    if (options.method !== 'GET') throw Error('Only read-only observations permitted');
    const i = paths.indexOf(new URL(url).pathname); if (i < 0) throw Error('Unexpected public path');
    return new Response(paths[i] === '/robots.txt' ? Buffer.concat([prefix, bodies[i]]) : bodies[i], { status: references[i].status, headers: references[i].headers });
  };
  const current = structuredClone(baseline); current.services.gachia = { id: sourceFixtureUUID(201), versions: [{ version_id: owners.main.versionId, percentage: 100 }] };
  const spec = { kind: 'unified_completed_main_source_spec', publication: { path: join(root, 'completed-publication.json'), pin: 'd'.repeat(64) },
    releaseKey: 'c'.repeat(64), transportPin, planSHA256: 'f'.repeat(64), baseline, deploymentId: sourceFixtureUUID(201), owners, sources, pairs, publicReferences };
  return { root, save, spec, current, versions, request, reader: { snapshot: async () => structuredClone(current), version: async (service, id) => {
    if (versions[service]?.id !== id) throw Error('Unknown immutable version'); return structuredClone(versions[service]);
  } } };
}
