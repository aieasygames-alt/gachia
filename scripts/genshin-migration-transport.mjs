import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { desktopCloudSnapshot } from './desktop-cloud-release.mjs';
import { assertUploadedVersion, assertUploadMetadata, multipartModule, normalizedBindings } from './desktop-cloud-transport.mjs';
import { digest } from './desktop-release-assets.mjs';
import { isolatedEnvironment } from './desktop-publish.mjs';
import { assertModuleVersionIdentity, scriptETag } from './desktop-version-provenance.mjs';
import { boundedBody } from './desktop-version-preview.mjs';
import { migrationExpectedBindings } from './genshin-migration-prepare.mjs';
import { assertMigrationRouterMetadata, migrationRouterModule, readMigrationRouterVersion } from './genshin-migration-router.mjs';
import { migrationPinned, migrationPreviewOrigin, migrationSave, verifyMigrationHTTP } from './genshin-migration-http.mjs';
import { migrationGenshinStepReferences } from './genshin-migration-source-advance.mjs';
import { unifiedProductionRead } from './unified-production-transport.mjs';
import { verifyUnifiedTool } from './unified-cloud-module.mjs';
import { unifiedOwnerDeploymentWriter } from './unified-owner-deployment.mjs';
import { captureUnifiedUploadedModule, readUnifiedVersion, revalidateUnifiedUploadedModule } from './unified-version-identity.mjs';
import { nteExpectedBindings } from './nte-release-config.mjs';
import { verifyNteHTTP } from './nte-release-http.mjs';

export function migrationUploadResponse(output, service) {
  const versions = [...output.matchAll(/Worker Version ID:\s*([a-f0-9-]{36})/g)].map(row => row[1]);
  assert.equal(versions.length, 1, 'Unknown migration upload; reconcile without retry');
  assert(output.includes('Version Preview URL: ' + migrationPreviewOrigin(service, versions[0]))); return { versionId: versions[0] };
}
// Separate fixed Router writer. The ordinary editorial writer still rejects it.
export function migrationRouterDeploymentWriter({ releaseKey, versionId, token, recordResponse, request = fetch }) {
  migrationPreviewOrigin('gachia-router', versionId); assert(/^[a-f0-9]{64}$/.test(releaseKey)); let attempted = false;
  return async args => {
    assert.equal(args.owner, 'router'); assert.equal(args.service, 'gachia-router'); assert.equal(args.versionId, versionId); assert.equal(args.releaseKey, releaseKey);
    assert(!attempted, 'Router deployment cannot be retried'); attempted = true;
    const endpoint = 'https://api.cloudflare.com/client/v4/accounts/e6472b6c6172a3ac1e1596ef100543ae/workers/scripts/gachia-router/deployments';
    const versions = [{ version_id: versionId, percentage: 100 }];
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json', connection: 'close' };
    let response;
    try { response = await request(endpoint, { method: 'POST', redirect: 'error', headers, signal: AbortSignal.timeout(30000), body: JSON.stringify({ strategy: 'percentage', versions }) }); }
    catch { throw Error('Router deployment outcome unknown; reconcile read-only, never retry'); }
    const raw = await boundedBody(response); await recordResponse({ kind: 'creation', status: response.status, headers: Object.fromEntries(response.headers), bytes: raw });
    assert(response.ok, `Router deployment HTTP ${response.status}; do not retry`);
    const body = JSON.parse(raw); assert.equal(body.success, true); assert(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(body.result?.id));
    if (body.result.versions) assert.deepEqual(body.result.versions, versions);
    if (body.result.strategy) assert.equal(body.result.strategy, 'percentage');
    const checked = await request(endpoint + '/' + body.result.id, { method: 'GET', redirect: 'error', headers, signal: AbortSignal.timeout(30000) });
    const checkedRaw = await boundedBody(checked); await recordResponse({ kind: 'verification', status: checked.status, headers: Object.fromEntries(checked.headers), bytes: checkedRaw });
    assert(checked.ok); const value = JSON.parse(checkedRaw); assert.equal(value.success, true); assert.equal(value.result.id, body.result.id);
    assert.equal(value.result.strategy, 'percentage'); assert.deepEqual(value.result.versions, versions);
    return { service: 'gachia-router', versionId, deploymentId: body.result.id, releaseKey };
  };
}

// Only the fixed desktop wrapper supplies the independently verified bundle.
// No request field can replace a reader, validator, module or write operation.
/** @param {{evidence:any, releaseKey:string, token:string, directory:string, previewRequest?:any, publicRequest?:any, knownRouterRecovery?:{versionId:string, releaseKey:string}, knownMainRecovery?:{versionId:string, releaseKey:string}}} input */
export function genshinMigrationTransport({ evidence, releaseKey, token, directory, previewRequest = unifiedProductionRead, publicRequest = unifiedProductionRead, knownRouterRecovery, knownMainRecovery }) {
  const { value, expected, bases } = evidence, uploads = new Map(), writers = new Map();
  const nte = ['nte_migration_bundle', 'nte_independent_bundle'].includes(value.kind);
  if (knownRouterRecovery) {
    assert.equal(value.kind, 'nte_migration_bundle');
    assert(/^[a-f0-9]{64}$/.test(knownRouterRecovery.releaseKey));
    uploads.set('router:recovery', { versionId: knownRouterRecovery.versionId });
  }
  if (knownMainRecovery) { assert.equal(value.kind, 'nte_migration_bundle'); assert(!knownRouterRecovery); assert(/^[a-f0-9]{64}$/.test(knownMainRecovery.releaseKey)); uploads.set('main:recovery', { versionId: knownMainRecovery.versionId }); }
  const transportPin = args => args.role === 'recovery' && args.owner === 'router' && knownRouterRecovery ? knownRouterRecovery.releaseKey
    : args.role === 'recovery' && args.owner === 'main' && knownMainRecovery ? knownMainRecovery.releaseKey : releaseKey;
  const verifyHTTP = nte ? verifyNteHTTP : verifyMigrationHTTP;
  const readVersion = (service, versionId) => service === 'gachia-router'
    ? readMigrationRouterVersion({ versionId, token, request: unifiedProductionRead }) : readUnifiedVersion({ service, versionId, token, request: unifiedProductionRead });
  const rowFor = args => {
    assert((nte ? ['nte', 'router', 'main'] : ['genshin', 'router', 'main']).includes(args.owner)); assert(['recovery', 'candidate'].includes(args.role));
    const owner = value.owners[args.owner]; assert.equal(args.service, owner.service); assert.deepEqual(args.sealed, owner[args.role]);
    const local = join(evidence.directory, args.owner, args.role), output = join(directory, args.owner + '-' + args.role);
    const config = migrationPinned({ path: join(local, 'upload.json'), pin: args.sealed.configPin });
    assert.equal(digest(readFileSync(join(local, 'module/worker.js'))), args.sealed.moduleSHA256);
    return { local, output, config };
  };
  const references = (owner, role) => migrationPinned({ path: join(evidence.directory, owner, role, 'local-http/responses/references.json'), pin: value.owners[owner][role].referencesPin });
  const checkVersion = (args, version, config) => {
    const bindings = nte ? nteExpectedBindings(value.baseline, args.owner, args.role, value.kind === 'nte_migration_bundle') : migrationExpectedBindings(value.baseline, args.owner, args.role);
    if (args.owner !== 'router') assertUploadedVersion(version, args.versionId, config, bindings);
    else {
      assert.equal(version.id, args.versionId); assert.equal(version.metadata.has_preview, true);
      const runtime = version.resources.script_runtime;
      assert.equal(runtime.compatibility_date, config.compatibility_date); assert.deepEqual(runtime.compatibility_flags ?? [], config.compatibility_flags ?? []);
      assert.equal(runtime.usage_model, 'standard'); assert.equal(runtime.assets, undefined);
      assert.deepEqual(normalizedBindings(version.resources.bindings), bindings);
    }
  };
  let acceptanceCount = 0;
  const acceptPublic = async (owner, refs, role = 'candidate') => verifyHTTP({ origin: 'https://gachia.com', references: refs,
    directory: join(directory, `public-${acceptanceCount++}-${owner}`), owner, role, expected, bases, request: publicRequest });
  return {
    snapshot: () => desktopCloudSnapshot(token, unifiedProductionRead, { allowSplit: true }),
    upload: async args => {
      const { local, output } = rowFor(args), key = args.owner + ':' + args.role; assert(!uploads.has(key)); uploads.set(key, { attempted: true });
      verifyUnifiedTool(value.tool); mkdirSync(output); mkdirSync(join(output, 'home'));
      const command = ['versions', 'upload', '--no-bundle', '--config', join(local, 'upload.json'), '--env', '', '--outfile', join(output, 'uploaded.multipart')];
      migrationSave(output, 'invocation.json', { executable: process.execPath, args: command, credentials: true, trafficMutation: false });
      let raw;
      try {
        raw = execFileSync(process.execPath, [value.tool.bin, ...command], { cwd: output, env: isolatedEnvironment(join(output, 'home'), {
          CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: 'e6472b6c6172a3ac1e1596ef100543ae', WRANGLER_HIDE_BANNER: 'true', WRANGLER_SEND_ERROR_REPORTS: 'false' }),
          timeout: 300000, maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
      } catch (error) { writeFileSync(join(output, 'upload.log'), Buffer.concat([error.stdout ?? Buffer.alloc(0), error.stderr ?? Buffer.alloc(0)]), { flag: 'wx', mode: 0o600 }); throw Error('Migration upload outcome unknown; no retry: ' + output); }
      writeFileSync(join(output, 'upload.log'), raw, { flag: 'wx', mode: 0o600 }); const result = migrationUploadResponse(raw.toString(), args.service);
      uploads.set(key, result); return result;
    },
    inspect: async args => {
      const { output, config } = rowFor(args); assert.equal(uploads.get(args.owner + ':' + args.role)?.versionId, args.versionId);
      const form = await multipartModule(readFileSync(join(output, 'uploaded.multipart'))); assert.equal(form.moduleSHA256, args.sealed.moduleSHA256);
      (args.owner === 'router' ? assertMigrationRouterMetadata : assertUploadMetadata)(form.metadata, config);
      const version = await readVersion(args.service, args.versionId); checkVersion(args, version, config);
      const versionPin = migrationSave(output, 'version.json', version).pin;
      let moduleProof;
      const context = { role: args.role, transportPin: transportPin(args), configPin: args.sealed.configPin };
      if (args.owner !== 'router') moduleProof = await captureUnifiedUploadedModule({ service: args.service, versionId: args.versionId,
        moduleSHA256: args.sealed.moduleSHA256, context, directory: join(output, 'module'), uploadPath: join(output, 'uploaded.multipart'), uploadLogPath: join(output, 'upload.log'),
        readVersion, expectedVersion: version, readContent: (service, versionId) => readUnifiedVersion({ service, versionId, token, binary: true, request: unifiedProductionRead }) });
      else {
        mkdirSync(join(output, 'module'));
        const before = await readVersion(args.service, args.versionId); assertModuleVersionIdentity(version, before);
        const content = await readMigrationRouterVersion({ versionId: args.versionId, token, binary: true, request: unifiedProductionRead });
        writeFileSync(join(output, 'module/download.multipart'), content.archive, { flag: 'wx', mode: 0o600 });
        assert.equal(scriptETag(content.etag), before.resources.script.etag); const downloaded = await migrationRouterModule(content.archive);
        assert.equal(downloaded.name, 'worker.js'); assert.equal(downloaded.moduleSHA256, args.sealed.moduleSHA256); assert(downloaded.code.equals(form.code));
        const after = await readVersion(args.service, args.versionId); assertModuleVersionIdentity(before, after);
        moduleProof = migrationSave(join(output, 'module'), 'receipt.json', { kind: 'genshin_migration_router_upload_module', service: args.service, versionId: args.versionId, context,
          moduleSHA256: args.sealed.moduleSHA256, before, after, etag: content.etag, archivePin: digest(content.archive) });
      }
      return { versionId: args.versionId, moduleSHA256: args.sealed.moduleSHA256, moduleProof, versionPin };
    },
    preview: async args => {
      const { output } = rowFor(args); const proof = await verifyHTTP({ origin: migrationPreviewOrigin(args.service, args.versionId), references: references(args.owner, args.role),
        directory: join(output, 'preview'), owner: args.owner, role: args.role, expected, bases, preview: true, request: previewRequest });
      return { ...proof, service: args.service, versionId: args.versionId };
    },
    revalidate: async args => {
      const { output, config } = rowFor(args); const version = await readVersion(args.service, args.versionId); checkVersion(args, version, config);
      assertModuleVersionIdentity(migrationPinned({ path: join(output, 'version.json'), pin: args.inspected.versionPin }), version);
      if (args.owner !== 'router') await revalidateUnifiedUploadedModule({ proof: args.inspected.moduleProof, service: args.service, versionId: args.versionId,
        moduleSHA256: args.sealed.moduleSHA256, context: { role: args.role, transportPin: transportPin(args), configPin: args.sealed.configPin }, readVersion });
      else {
        const proof = migrationPinned(args.inspected.moduleProof); assert.equal(proof.kind, 'genshin_migration_router_upload_module');
        assert.equal(proof.service, args.service); assert.equal(proof.versionId, args.versionId); assert.equal(proof.moduleSHA256, args.sealed.moduleSHA256);
        assert.deepEqual(proof.context, { role: args.role, transportPin: transportPin(args), configPin: args.sealed.configPin });
        assertModuleVersionIdentity(proof.before, proof.after); assertModuleVersionIdentity(proof.before, version); assert.equal(scriptETag(proof.etag), version.resources.script.etag);
        const bytes = readFileSync(join(output, 'module/download.multipart')); assert.equal(digest(bytes), proof.archivePin);
        assert.equal((await migrationRouterModule(bytes)).moduleSHA256, args.sealed.moduleSHA256);
      }
    },
    promote: async args => {
      assert.equal(args.releaseKey, releaseKey); assert.equal(args.versionId, uploads.get(args.owner + ':candidate')?.versionId);
      if (!writers.has(args.owner)) {
        const recordResponse = row => { writeFileSync(join(directory, `deployment-${args.owner}-${row.kind}.body`), row.bytes, { flag: 'wx', mode: 0o600 });
          migrationSave(directory, `deployment-${args.owner}-${row.kind}.json`, { kind: row.kind, status: row.status, headers: row.headers, sha256: digest(row.bytes), bytes: row.bytes.length }); };
        const input = { owner: args.owner, releaseKey, versionId: args.versionId, token, request: fetch, recordResponse };
        writers.set(args.owner, args.owner === 'router' ? migrationRouterDeploymentWriter(input) : unifiedOwnerDeploymentWriter(input));
      }
      return writers.get(args.owner)(args);
    },
    acceptStep: async ({ owner }) => {
      if (nte && owner === 'nte') return acceptPublic('nte', migrationPinned(value.stepReferences));
      if (owner === 'genshin') {
        // The original Router already enforces this public GET freshness policy.
        return acceptPublic('genshin', migrationGenshinStepReferences(evidence));
      }
      return acceptPublic('router', owner === 'router' ? references('router', 'candidate') : migrationPinned(value.finalReferences));
    },
    acceptProduction: async ({ deployed }) => {
      const proof = await acceptPublic('router', migrationPinned(value.finalReferences));
      return { ...proof, versions: Object.fromEntries(Object.entries(deployed).map(([owner, version]) => [value.owners[owner].service, version])) };
    },
  };
}
