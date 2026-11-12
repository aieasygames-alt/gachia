import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { artifactFiles, withLocalWorker } from './desktop-publish.mjs';
import { assertDiskBudget, GiB, treeBytes } from './desktop-disk-preflight.mjs';
import { digest } from './desktop-release-assets.mjs';
import { activeVersion, assertTopology } from './desktop-cloud-release.mjs';
import { assertUploadMetadata, multipartModule, normalizedBindings } from './desktop-cloud-transport.mjs';
import { parseWrangler } from './game-release.mjs';
import { genshinContentAssets } from './genshin-content-assets.mjs';
import { verifyGenshinMigrationBuild } from './genshin-migration-build.mjs';
import { genshinMigrationActiveSources } from './genshin-migration-source.mjs';
import { GENSHIN_MIGRATION_ORDER, genshinMigrationConfig } from './genshin-production-migration.mjs';
import { prepareGenshinMigrationRecovery, verifyGenshinMigrationRecovery } from './genshin-migration-recovery.mjs';
import { captureMigrationHTTP, migrationAggregateBases, migrationJSON, migrationPinned, migrationRequests, migrationSave, recheckMigrationReferences } from './genshin-migration-http.mjs';
import { assertMigrationRouterMetadata, readMigrationRouterSource } from './genshin-migration-router.mjs';
import { prepareUnifiedAssetPair, verifyUnifiedAssetPair } from './unified-release-assets.mjs';
import { readUnifiedSourceOwner } from './unified-source-advance.mjs';
import { unifiedConfigSemantics, unifiedDryRun, unifiedTransportTool, verifyUnifiedTool } from './unified-cloud-module.mjs';

const serviceFor = { genshin: 'gachia-game-genshin', nte: 'gachia-game-nte', router: 'gachia-router', main: 'gachia' };
const appFor = { genshin: 'game-genshin', router: 'router', main: 'web' };
const treePin = directory => digest(migrationJSON(artifactFiles(directory)));
export { localConfig as migrationLocalConfig, seal as sealMigrationOwner };
export function migrationRuntimeConfig(workspace, owner, role) {
  const raw = readFileSync(join(workspace, 'apps', appFor[owner], 'wrangler.jsonc'), 'utf8');
  const candidate = genshinMigrationConfig(owner, raw);
  const config = role === 'candidate' ? candidate : parseWrangler(raw);
  if (owner === 'genshin') delete config.env;
  return config;
}
export function migrationExpectedBindings(baseline, owner, role) {
  const bindings = structuredClone(baseline.bindings[serviceFor[owner]]);
  if (role === 'candidate' && owner !== 'genshin') {
    bindings.push({ name: 'GENSHIN_CONTENT_ENABLED', type: 'plain_text', text: 'true' });
    if (owner === 'main') bindings.push({ name: 'GENSHIN_CONTENT', type: 'service', service: serviceFor.genshin });
  }
  return normalizedBindings(bindings);
}
function assertBaselineConfiguration(workspace, baseline) {
  assertTopology(baseline, baseline);
  for (const owner of GENSHIN_MIGRATION_ORDER) {
    const config = migrationRuntimeConfig(workspace, owner, 'recovery'), settings = baseline.settings[serviceFor[owner]];
    const actual = [{ name: 'ASSETS', type: 'assets' }, ...Object.entries(config.vars).map(([name, text]) => ({ name, text, type: 'plain_text' })),
      ...(config.services ?? []).map(row => ({ name: row.binding, type: 'service', service: row.service })),
      ...(config.d1_databases ?? []).map(row => ({ name: row.binding, type: 'd1', id: row.database_id })),
      ...(config.r2_buckets ?? []).map(row => ({ name: row.binding, type: 'r2_bucket', bucket_name: row.bucket_name }))];
    if (owner === 'router') actual.shift();
    const secrets = owner === 'main' ? ['BETTER_AUTH_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'INDEXNOW_AUTH_TOKEN'] : owner === 'router' ? ['GENSHIN_CANARY_TOKEN'] : [];
    actual.push(...secrets.map(name => ({ name, type: 'secret_text' })));
    assert.deepEqual(normalizedBindings(settings.bindings), normalizedBindings(actual));
    assert.deepEqual(normalizedBindings(baseline.bindings[serviceFor[owner]]), normalizedBindings(actual));
    assert.equal(settings.compatibility_date, config.compatibility_date);
    assert.deepEqual(settings.compatibility_flags ?? [], config.compatibility_flags ?? []);
    assert.deepEqual(settings.tags, owner === 'genshin' ? [] : ['cf:service=' + serviceFor[owner]]);
    assert.deepEqual(baseline.subdomains[serviceFor[owner]], { enabled: true, previews_enabled: true });
  }
}
function configForSeal(workspace, owner, role, artifact, module) {
  const config = migrationRuntimeConfig(workspace, owner, role);
  return { ...config, main: module, ...(owner === 'router' ? {} : { assets: { ...config.assets, directory: join(artifact, 'assets') } }) };
}
async function seal({ workspace, directory, owner, role, artifact, tool, runtimeConfig = undefined }) {
  const local = join(directory, owner, role), temp = join(local, 'seal'); mkdirSync(temp, { mode: 0o700 }); mkdirSync(join(temp, 'home'), { mode: 0o700 });
  const moduleDir = join(local, 'module'); mkdirSync(moduleDir, { mode: 0o700 });
  const modulePath = join(moduleDir, 'worker.js');
  if (role === 'recovery') writeFileSync(modulePath, readFileSync(join(artifact, 'worker.js')), { flag: 'wx', mode: 0o600 });
  if (owner === 'router' && role === 'candidate') writeFileSync(join(temp, 'worker.ts'), `export { default } from ${JSON.stringify(join(workspace, 'apps/router/src/index.ts'))};\n`, { flag: 'wx' });
  const main = role === 'recovery' ? modulePath : owner === 'router' ? join(temp, 'worker.ts') : join(artifact, 'worker.js');
  const base = runtimeConfig ? { ...runtimeConfig, main, ...(owner === 'router' ? {} : { assets: { ...runtimeConfig.assets, directory: join(artifact, 'assets') } }) }
    : configForSeal(workspace, owner, role, artifact, main);
  const config = { ...base, ...(role === 'recovery' ? { no_bundle: true, minify: false } : {}) }, configPath = join(temp, 'compile.json');
  migrationSave(temp, 'compile.json', config);
  unifiedDryRun(tool, { config: configPath, environment: '', outfile: join(temp, 'compiled.multipart'), exact: role === 'recovery', cwd: temp, home: join(temp, 'home'), log: join(temp, 'compile.log') });
  const compiled = await multipartModule(readFileSync(join(temp, 'compiled.multipart')));
  (owner === 'router' ? assertMigrationRouterMetadata : assertUploadMetadata)(compiled.metadata, config);
  if (role === 'candidate') writeFileSync(modulePath, compiled.code, { flag: 'wx', mode: 0o600 });
  else assert(readFileSync(modulePath).equals(compiled.code), 'Archived recovery was rebundled');
  if (owner === 'router' && role === 'candidate') writeFileSync(join(artifact, 'worker.js'), compiled.code, { flag: 'wx', mode: 0o600 });
  const exactConfig = { ...config, main: modulePath, no_bundle: true, minify: false };
  const proof = migrationSave(local, 'upload.json', exactConfig);
  const tags = unifiedConfigSemantics(tool, proof.path, '').tags;
  assert.deepEqual(tags, ['genshin', 'nte'].includes(owner) ? [] : ['cf:service=' + serviceFor[owner]]);
  unifiedDryRun(tool, { config: proof.path, environment: '', outfile: join(temp, 'exact.multipart'), exact: true, cwd: temp, home: join(temp, 'home'), log: join(temp, 'exact.log') });
  const exact = await multipartModule(readFileSync(join(temp, 'exact.multipart')));
  assert.equal(exact.moduleSHA256, compiled.moduleSHA256); (owner === 'router' ? assertMigrationRouterMetadata : assertUploadMetadata)(exact.metadata, exactConfig);
  return { moduleSHA256: compiled.moduleSHA256, configPin: proof.pin, artifactPin: owner === 'router' ? digest(readFileSync(join(artifact, 'worker.js'))) : treePin(artifact) };
}
function localConfig(config, owner, artifact, module) {
  const result = { name: 'migration-' + owner, main: module, no_bundle: true, compatibility_date: config.compatibility_date,
    compatibility_flags: config.compatibility_flags ?? [], vars: config.vars,
    services: (config.services ?? []).map(row => ({ binding: row.binding, service: row.service === serviceFor.main ? 'migration-main' : row.service === serviceFor.genshin ? 'migration-genshin' : 'migration-unused' })) };
  if (owner !== 'router') result.assets = { binding: 'ASSETS', directory: join(artifact, 'assets') };
  if (owner === 'main') Object.assign(result, { d1_databases: [{ binding: 'DB', database_name: 'migration-local-only', database_id: '00000000-0000-0000-0000-000000000000' }], r2_buckets: [{ binding: 'IMAGES', bucket_name: 'migration-local-only' }] });
  return result;
}
async function captureReferences({ workspace, directory, owners, index, sources, expected, bases, tool }) {
  const pairs = JSON.parse(readFileSync(join(workspace, 'packages/data/raw-content-review.json'))).pairs;
  let finalReferences;
  const tasks = [...GENSHIN_MIGRATION_ORDER.flatMap(owner => ['recovery', 'candidate'].map(role => ({ owner, role, final: false }))), { owner: 'router', role: 'candidate', final: true }];
  for (const { owner, role, final } of tasks) {
    const local = join(directory, owner, role), http = final ? join(directory, 'final-http') : join(local, 'local-http'); mkdirSync(http); mkdirSync(join(http, 'home'));
    const selected = {};
    for (const dependency of GENSHIN_MIGRATION_ORDER) {
      // Router previews happen before Main cutover. Main previews happen after
      // Router cutover; Main's role determines only its own runtime.
      const dependencyRole = final ? 'candidate' : dependency === owner ? role : dependency === 'genshin' ? 'candidate' : 'recovery';
      const target = join(directory, dependency, dependencyRole), artifact = join(target, 'artifact');
      const config = localConfig(migrationRuntimeConfig(workspace, dependency, dependencyRole), dependency, artifact, join(target, 'module/worker.js'));
      migrationSave(http, dependency + '.json', config); selected[dependency] = config;
    }
    writeFileSync(join(http, 'unused.mjs'), 'export default {fetch(){return new Response("Unconfigured local-only dependency",{status:503})}};\n', { flag: 'wx' });
    migrationSave(http, 'unused.json', { name: 'migration-unused', main: join(http, 'unused.mjs'), compatibility_date: '2026-07-08' });
    const artifact = join(local, 'artifact');
    const requests = migrationRequests({ owner, role, artifact, expected, sources, pairs });
    let captured;
    await withLocalWorker(join(workspace, 'apps/web'), join(http, owner + '.json'), join(http, 'home'), join(http, 'worker.log'), async origin => {
      captured = await captureMigrationHTTP({ origin, requests, directory: join(http, 'responses'), owner, role, expected, bases });
    }, { wranglerEntrypoint: tool.bin, additionalConfigs: [...GENSHIN_MIGRATION_ORDER.filter(row => row !== owner).map(row => join(http, row + '.json')), join(http, 'unused.json')] });
    if (final) finalReferences = captured.proof;
    else owners[owner][role].referencesPin = captured.proof.pin;
  }
  return finalReferences;
}

// Credential-free preparation. The production wrapper must independently open
// published history and exact CI before this sealed bundle can be activated.
export async function prepareGenshinMigration({ build, routerSource, baseline, directory }) {
  const built = verifyGenshinMigrationBuild(build.directory, build.pin), workspace = built.source.workspace;
  const { index, sources } = genshinMigrationActiveSources(built.receipt.sourceIndex), router = await readMigrationRouterSource(routerSource);
  assertBaselineConfiguration(workspace, baseline);
  for (const row of Object.values(index.owners)) { assert.equal(activeVersion(baseline, row.service), row.versionId); await readUnifiedSourceOwner(row); }
  assert.equal(activeVersion(baseline, serviceFor.router), router.value.versionId);
  directory = resolve(directory); assert.equal(realpathSync(dirname(directory)), dirname(directory)); assert(!existsSync(directory));
  assertDiskBudget({ path: directory, operation: 'initial migration compatible artifact pairs', estimatedBytes: GiB + ['main', 'genshin'].reduce((sum, owner) => sum + treeBytes(index.owners[owner].directory) + treeBytes(built.receipt.artifacts[owner].directory), 0) * 2 });
  mkdirSync(directory, { mode: 0o700 });
  try {
    const tool = unifiedTransportTool(workspace), owners = {}, expected = genshinContentAssets(workspace), bases = migrationAggregateBases(workspace);
    for (const owner of GENSHIN_MIGRATION_ORDER) {
      mkdirSync(join(directory, owner));
      for (const role of ['candidate', 'recovery']) mkdirSync(join(directory, owner, role));
      const forward = join(directory, owner, 'candidate/artifact'), recovery = join(directory, owner, 'recovery/artifact');
      if (owner === 'router') {
        mkdirSync(forward); mkdirSync(recovery); writeFileSync(join(recovery, 'worker.js'), router.code, { flag: 'wx' });
      } else {
        const old = index.owners[owner], runtime = (await readUnifiedSourceOwner(old)).code;
        const input = { source: workspace, previous: old.directory, candidate: built.receipt.artifacts[owner].directory, forward, recovery, runtime };
        if (owner === 'genshin') prepareGenshinMigrationRecovery(input); else prepareUnifiedAssetPair({ ...input, owner });
      }
      owners[owner] = { service: serviceFor[owner], sourceVersionId: activeVersion(baseline, serviceFor[owner]),
        sourceIdentityPin: digest(migrationJSON(owner === 'router' ? router.version : index.owners[owner].version)) };
      for (const role of ['recovery', 'candidate']) owners[owner][role] = await seal({ workspace, directory, owner, role, artifact: join(directory, owner, role, 'artifact'), tool });
    }
    const finalReferences = await captureReferences({ workspace, directory, owners, index, sources, expected, bases, tool });
    const value = { kind: 'genshin_initial_migration_sealed_bundle', schemaVersion: 1, build, routerSource, baseline, owners, tool,
      sourceCommit: built.receipt.sourceCommit, sourceIndex: built.receipt.sourceIndex, active: built.receipt.active, contentVersion: expected.manifest.version, finalReferences,
      cloudWrites: false, productionReady: false };
    const proof = migrationSave(directory, 'bundle.json', value); await verifyGenshinMigrationBundle(proof); return { proof, value };
  } catch (error) { migrationSave(directory, 'failure.json', { error: error.message, cloudWrites: false, automaticRetry: false }); throw error; }
}
export async function verifyGenshinMigrationBundle(proof) {
  const value = migrationPinned(proof), directory = dirname(proof.path);
  assert.equal(proof.path, join(directory, 'bundle.json')); assert(!existsSync(join(directory, 'failure.json')));
  assert.equal(value.schemaVersion, 1); assert.equal(value.kind, 'genshin_initial_migration_sealed_bundle'); assert.equal(value.cloudWrites, false); assert.equal(value.productionReady, false);
  const built = verifyGenshinMigrationBuild(value.build.directory, value.build.pin), workspace = built.source.workspace;
  assert.equal(value.sourceCommit, built.receipt.sourceCommit); assert.deepEqual(value.sourceIndex, built.receipt.sourceIndex); assert.deepEqual(value.active, built.receipt.active);
  const { index, sources } = genshinMigrationActiveSources(value.sourceIndex), router = await readMigrationRouterSource(value.routerSource);
  assertBaselineConfiguration(workspace, value.baseline); verifyUnifiedTool(value.tool); assert.deepEqual(value.tool, unifiedTransportTool(workspace));
  assert.deepEqual(Object.keys(value.owners).sort(), [...GENSHIN_MIGRATION_ORDER].sort());
  const expected = genshinContentAssets(workspace); assert.equal(expected.manifest.version, value.contentVersion);
  assert.equal(value.finalReferences.path, join(directory, 'final-http/responses/references.json'));
  const bases = migrationAggregateBases(workspace), pairs = JSON.parse(readFileSync(join(workspace, 'packages/data/raw-content-review.json'))).pairs;
  const finalReferences = recheckMigrationReferences({ proof: value.finalReferences,
    requests: migrationRequests({ owner: 'router', role: 'candidate', expected, sources, pairs }), owner: 'router', role: 'candidate', expected, bases });
  assert(finalReferences.length > 100);
  for (const [i, row] of finalReferences.entries()) {
    assert.equal(row.bodyFile, `${i}.body`); const body = readFileSync(join(directory, 'final-http/responses', row.bodyFile));
    assert.equal(body.length, row.bytes); assert.equal(digest(body), row.sha256);
  }
  for (const owner of GENSHIN_MIGRATION_ORDER) {
    const row = value.owners[owner]; assert.equal(row.service, serviceFor[owner]); assert.equal(row.sourceVersionId, activeVersion(value.baseline, row.service));
    assert.equal(row.sourceIdentityPin, digest(migrationJSON(owner === 'router' ? router.version : index.owners[owner].version)));
    if (owner !== 'router') {
      const old = index.owners[owner], runtime = (await readUnifiedSourceOwner(old)).code;
      const input = { source: workspace, previous: old.directory, candidate: built.receipt.artifacts[owner].directory,
        forward: join(directory, owner, 'candidate/artifact'), recovery: join(directory, owner, 'recovery/artifact'), runtime };
      if (owner === 'genshin') verifyGenshinMigrationRecovery(input); else verifyUnifiedAssetPair({ ...input, owner, runtimeSHA256: digest(runtime) });
    }
    for (const role of ['recovery', 'candidate']) {
      const local = join(directory, owner, role), artifact = join(local, 'artifact'), sealed = row[role];
      assert.equal(sealed.artifactPin, owner === 'router' ? digest(readFileSync(join(artifact, 'worker.js'))) : treePin(artifact));
      assert.equal(digest(readFileSync(join(local, 'module/worker.js'))), sealed.moduleSHA256);
      const config = migrationPinned({ path: join(local, 'upload.json'), pin: sealed.configPin });
      assert.deepEqual(config, { ...configForSeal(workspace, owner, role, artifact, join(local, 'module/worker.js')), no_bundle: true, minify: false });
      const outbound = await multipartModule(readFileSync(join(local, 'seal/exact.multipart')));
      assert.equal(outbound.moduleSHA256, sealed.moduleSHA256); (owner === 'router' ? assertMigrationRouterMetadata : assertUploadMetadata)(outbound.metadata, config);
      if (role === 'recovery') assert.equal(sealed.moduleSHA256, owner === 'router' ? router.moduleSHA256 : index.owners[owner].moduleSHA256);
      const requests = migrationRequests({ owner, role, artifact, expected, sources, pairs });
      const references = recheckMigrationReferences({ proof: { path: join(local, 'local-http/responses/references.json'), pin: sealed.referencesPin },
        requests, owner, role, expected, bases });
      for (const [i, reference] of references.entries()) {
        assert.equal(reference.path, requests[i].path); assert.equal(reference.status, requests[i].status); assert.equal(reference.bodyFile, `${i}.body`);
        const body = readFileSync(join(local, 'local-http/responses', reference.bodyFile));
        assert.equal(digest(body), reference.sha256); assert.equal(body.length, reference.bytes);
        if (requests[i].sha256) assert.equal(reference.sha256, requests[i].sha256);
      }
    }
  }
  return { directory, value, built, workspace, index, sources, expected, bases: migrationAggregateBases(workspace) };
}
