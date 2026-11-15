import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { desktopCloudSnapshot } from './desktop-cloud-release.mjs';
import { assertUploadedVersion, assertUploadMetadata, multipartModule } from './desktop-cloud-transport.mjs';
import { digest } from './desktop-release-assets.mjs';
import { isolatedEnvironment } from './desktop-publish.mjs';
import { publicReferences } from './desktop-public-acceptance.mjs';
import { unifiedDryRun, unifiedRuntimeConfig, unifiedTransportTarget, unifiedTransportTool, verifyUnifiedTool } from './unified-cloud-module.mjs';
import { unifiedOwnerDeploymentWriter } from './unified-owner-deployment.mjs';
import { exactUnifiedPreviewOrigin } from './unified-version-preview.mjs';
import { unifiedProductionRead } from './unified-production-transport.mjs';
import { readUnifiedVersion, captureUnifiedUploadedModule, revalidateUnifiedUploadedModule } from './unified-version-identity.mjs';
import { migrationPinned } from './genshin-migration-http.mjs';
import { verifyNteHTTP } from './nte-release-http.mjs';

const ACCOUNT = 'e6472b6c6172a3ac1e1596ef100543ae';
const owner = 'lvmeng', service = 'gachia-game-lvmeng';
const save = (file, value) => { const raw = JSON.stringify(value, null, 2) + '\n'; writeFileSync(file, raw, { flag: 'wx', mode: 0o600 }); return digest(raw); };
const target = evidence => unifiedTransportTarget(owner, readFileSync(join(evidence.workspace, 'apps/game-lvmeng/wrangler.jsonc'), 'utf8'));
const rowFor = (evidence, args) => {
  assert.equal(args.owner, owner); assert.equal(args.service, service); assert(['candidate', 'recovery'].includes(args.role));
  const sealed = evidence.value.owners[owner][args.role]; assert.deepEqual(args.sealed, sealed);
  const local = join(evidence.directory, owner, args.role), config = migrationPinned({ path: join(local, 'upload.json'), pin: sealed.configPin });
  assert.equal(digest(readFileSync(join(local, 'module/worker.js'))), sealed.moduleSHA256);
  return { local, sealed, config };
};

export function lvmengIndependentTransport({ evidence, releaseKey, token, directory, previewRequest = unifiedProductionRead, publicRequest = unifiedProductionRead }) {
  assert(typeof token === 'string' && token.length > 0); const uploads = new Map(), writers = new Map();
  const references = role => migrationPinned({ path: join(evidence.directory, owner, role, 'local-http/responses/references.json'), pin: evidence.value.owners[owner][role].referencesPin });
  const publicReferencesFor = role => [...publicReferences(owner, references(role), owner), { path: '/robots.txt', status: 200, routerSitemap: 'https://gachia.com/sitemaps/lvmeng/index.xml' }];
  const readVersion = (name, versionId) => readUnifiedVersion({ service: name, versionId, token, request: unifiedProductionRead });
  return {
    snapshot: () => desktopCloudSnapshot(token, unifiedProductionRead, { allowSplit: true }),
    upload: async args => {
      const { local, sealed } = rowFor(evidence, args), tool = evidence.value.tool; verifyUnifiedTool(tool); assert(!uploads.has(args.role)); uploads.set(args.role, { attempted: true });
      const output = join(directory, owner + '-' + args.role); mkdirSync(output, { mode: 0o700 }); mkdirSync(join(output, 'home'), { mode: 0o700 });
      const outfile = join(output, 'uploaded.multipart'), log = join(output, 'upload.log'), command = ['versions', 'upload', '--no-bundle', '--config', join(local, 'upload.json'), '--env', 'production', '--outfile', outfile];
      save(join(output, 'invocation.json'), { executable: process.execPath, args: command, credentials: true, trafficMutation: false });
      let raw; try { raw = execFileSync(process.execPath, [tool.bin, ...command], { cwd: output, env: isolatedEnvironment(join(output, 'home'), { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: ACCOUNT, WRANGLER_HIDE_BANNER: 'true', WRANGLER_SEND_ERROR_REPORTS: 'false' }), timeout: 300000, maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }); writeFileSync(log, raw, { flag: 'wx', mode: 0o600 }); }
      catch (error) { writeFileSync(log, Buffer.concat([error.stdout ?? Buffer.alloc(0), error.stderr ?? Buffer.alloc(0)]), { flag: 'wx', mode: 0o600 }); throw Error('Lvmeng upload outcome unknown; no retry'); }
      const match = raw.toString().match(/Worker Version ID:\s*([a-f0-9-]{36})/); assert(match); const versionId = match[1]; assert(raw.toString().includes(`Version Preview URL: ${exactUnifiedPreviewOrigin(service, versionId)}`)); uploads.set(args.role, { versionId }); return { versionId };
    },
    inspect: async args => {
      const { local, sealed, config } = rowFor(evidence, args), output = join(directory, owner + '-' + args.role), form = await multipartModule(readFileSync(join(output, 'uploaded.multipart')));
      assert.equal(form.moduleSHA256, sealed.moduleSHA256); assertUploadMetadata(form.metadata, config); const version = await readVersion(service, args.versionId);
      assertUploadedVersion(version, args.versionId, unifiedRuntimeConfig(target(evidence)), evidence.value.baseline.bindings[service]);
      const versionPin = save(join(output, 'version.json'), version), moduleProof = await captureUnifiedUploadedModule({ service, versionId: args.versionId, moduleSHA256: sealed.moduleSHA256, context: { role: args.role, transportPin: releaseKey, configPin: sealed.configPin }, directory: join(output, 'module'), uploadPath: join(output, 'uploaded.multipart'), uploadLogPath: join(output, 'upload.log'), expectedVersion: version, readVersion, readContent: (name, id) => readUnifiedVersion({ service: name, versionId: id, token, binary: true, request: unifiedProductionRead }) });
      return { versionId: args.versionId, moduleSHA256: sealed.moduleSHA256, moduleProof, versionPin };
    },
    preview: async args => {
      const output = join(directory, owner + '-' + args.role, 'preview');
      const proof = await verifyNteHTTP({ origin: exactUnifiedPreviewOrigin(service, args.versionId), references: references(args.role), directory: output, preview: true, request: previewRequest });
      return { ...proof, service, versionId: args.versionId };
    },
    revalidate: async args => {
      const { sealed } = rowFor(evidence, args), version = await readVersion(service, args.versionId); assertUploadedVersion(version, args.versionId, unifiedRuntimeConfig(target(evidence)), evidence.value.baseline.bindings[service]);
      await revalidateUnifiedUploadedModule({ proof: args.inspected.moduleProof, service, versionId: args.versionId, moduleSHA256: sealed.moduleSHA256, context: { role: args.role, transportPin: releaseKey, configPin: sealed.configPin }, readVersion });
    },
    promote: async args => {
      assert.equal(args.owner, owner); assert.equal(args.service, service); assert.equal(args.releaseKey, releaseKey); assert.equal(args.versionId, uploads.get('candidate')?.versionId); assert(!writers.has(owner));
      const recordResponse = row => { writeFileSync(join(directory, `deployment-${owner}-${row.kind}.body`), row.bytes, { flag: 'wx', mode: 0o600 }); save(join(directory, `deployment-${owner}-${row.kind}.json`), { kind: row.kind, status: row.status, headers: row.headers, sha256: digest(row.bytes), bytes: row.bytes.length }); };
      const writer = unifiedOwnerDeploymentWriter({ owner, releaseKey, versionId: args.versionId, token, request: fetch, recordResponse }); writers.set(owner, writer); return writer(args);
    },
    acceptProduction: async ({ deployed }) => {
      const proof = await verifyNteHTTP({ origin: 'https://gachia.com', references: publicReferencesFor('candidate'), directory: join(directory, 'public'), request: publicRequest });
      return { ...proof, versions: { [service]: deployed[owner] } };
    },
  };
}
