import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { appendFileSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { digest, pinnedJson, verifyRetainedCandidate } from './desktop-release-assets.mjs';
import { isolatedEnvironment, withLocalWorker, withRunLock } from './desktop-publish.mjs';
import { activeVersion, assertTopology, desktopCloudSnapshot, executeReleaseProtocol } from './desktop-cloud-release.mjs';
import { boundedBody, exactPreviewOrigin, pageFingerprint, verifyVersionPreview } from './desktop-version-preview.mjs';
import { assertReleaseScope } from './desktop-release-scope.mjs';
import { captureUploadedModule, revalidateUploadedModule } from './desktop-version-provenance.mjs';

const ACCOUNT = 'e6472b6c6172a3ac1e1596ef100543ae';
const CONFIG_PINS = { main: 'b1693ed74f4428f9180e877643d3455c43aef29161dc03ed223c3f4c64b973ff', genshin: '71044abce9df463b547e471016b62f83715aba87c764d394bdd9336e0724add2', nte: '24a9c035334cd7cd8fd9587ed36d8fbac2b2d4a685b0ee8277b92f3ca7724ebf' };
const json = value => JSON.stringify(value, null, 2) + '\n';
const save = (path, value) => writeFileSync(path, json(value), { flag: 'wx', mode: 0o600 });
const serviceFor = owner => owner === 'main' ? 'gachia' : `gachia-game-${owner}`;
const expectedSecrets = ['BETTER_AUTH_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'INDEXNOW_AUTH_TOKEN'];

export function guideDataHashes(plan) {
  assertReleaseScope(plan);
  const result = new Map([[`/data/${plan.game}/raw-guides.json`, plan.candidateSHA256]]);
  if (plan.preservedGuides) {
    const preserved = pinnedJson(plan.preservedGuides.path, plan.preservedGuides.pin);
    assert.equal(preserved.otherGame, plan.game === 'genshin' ? 'nte' : 'genshin');
    result.set(`/data/${preserved.otherGame}/raw-guides.json`, preserved.sha256);
  }
  return result;
}

function configuredBindings(config) {
  return [{ name: 'ASSETS', type: 'assets' }, ...Object.entries(config.vars).map(([name, text]) => ({ name, text, type: 'plain_text' })),
    ...(config.d1_databases ?? []).map(b => ({ name: b.binding, type: 'd1', id: b.database_id })),
    ...(config.r2_buckets ?? []).map(b => ({ name: b.binding, type: 'r2_bucket', bucket_name: b.bucket_name })),
    ...(config.services ?? []).map(b => ({ name: b.binding, type: 'service', service: b.service }))];
}

export function normalizedBindings(bindings) {
  assert(Array.isArray(bindings), 'Missing binding inventory');
  const result = bindings.map(binding => {
    const { name, type } = binding;
    const allowed = { assets: ['name', 'type'], secret_text: ['name', 'type'], plain_text: ['name', 'type', 'text'],
      d1: ['name', 'type', 'id', 'database_id'], r2_bucket: ['name', 'type', 'bucket_name'], service: ['name', 'type', 'service', 'environment'] }[type];
    assert(allowed && Object.keys(binding).every(key => allowed.includes(key)), 'Unreviewed binding shape');
    if (type === 'd1') {
      assert(!binding.id || !binding.database_id || binding.id === binding.database_id, 'Conflicting D1 IDs');
      return { name, type, id: binding.database_id ?? binding.id };
    }
    if (type === 'service') { assert(!binding.environment || binding.environment === 'production', 'Wrong self-reference environment'); return { name, type, service: binding.service }; }
    return binding;
  }).sort((a, b) => a.name.localeCompare(b.name));
  assert.equal(new Set(result.map(b => b.name)).size, result.length, 'Duplicate bindings');
  return result;
}

export function assertOwnerSettings(owner, config, snapshot) {
  assert(Object.hasOwn(CONFIG_PINS, owner), 'Unreviewed owner configuration');
  const service = serviceFor(owner), settings = snapshot.settings[service];
  assert.equal(config.name, service); activeVersion(snapshot, service);
  if (owner === 'nte') assert.equal(config.vars.NTE_DEPLOYMENT_MODE, 'live', 'NTE releases require live runtime');
  assert.equal(config.compatibility_date, settings.compatibility_date);
  assert.deepEqual(config.compatibility_flags, settings.compatibility_flags);
  assert.deepEqual(settings.tags, owner === 'main' ? ['cf:service=gachia'] : [], 'Service/environment tag drift');
  assert.equal(snapshot.subdomains[service].enabled, true);
  assert.equal(snapshot.subdomains[service].previews_enabled, true, 'Version Preview URLs must already be enabled');
  const expected = configuredBindings(config);
  if (owner === 'main') {
    expected.push(...expectedSecrets.map(name => ({ name, type: 'secret_text' })));
  }
  assert.deepEqual(normalizedBindings(settings.bindings), normalizedBindings(expected), 'Live bindings differ from the frozen configuration');
}

export async function multipartModule(bytes) {
  assert(bytes.length > 0 && bytes.length <= 16 * 1024 * 1024, 'Worker multipart budget exceeded');
  const boundary = bytes.subarray(0, bytes.indexOf('\r\n')).toString().slice(2);
  assert(/^[\w-]{1,200}$/.test(boundary), 'Invalid multipart boundary');
  const form = await new Response(bytes, { headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } }).formData();
  const modules = [...form].filter(([name]) => name !== 'metadata');
  assert.equal(modules.length, 1, 'Additional Worker modules require a reviewed contract');
  assert.equal(modules[0][0], 'worker.js', 'Unexpected module identity');
  const code = Buffer.from(await modules[0][1].arrayBuffer());
  const metadata = form.get('metadata');
  return { code, moduleSHA256: digest(code), metadata: metadata ? JSON.parse(typeof metadata === 'string' ? metadata : await metadata.text()) : null };
}

export function assertUploadMetadata(metadata, config) {
  assert.equal(metadata.main_module, 'worker.js');
  assert.equal(metadata.compatibility_date, config.compatibility_date);
  assert.deepEqual(metadata.compatibility_flags, config.compatibility_flags);
  assert.deepEqual(metadata.keep_bindings, ['secret_text', 'secret_key'], 'Upload must preserve existing secrets, not arbitrary variables');
  assert.deepEqual(normalizedBindings(metadata.bindings), normalizedBindings(configuredBindings(config)), 'Outbound multipart bindings differ from reviewed configuration');
  for (const key of ['migrations', 'containers', 'routes', 'observability', 'logpush']) assert(!metadata[key], `Unexpected upload metadata: ${key}`);
}

export function assertUploadedVersion(version, versionId, config, bindings) {
  assert.equal(version.id, versionId); assert.equal(version.metadata.has_preview, true);
  const runtime = version.resources.script_runtime;
  assert.equal(runtime.compatibility_date, config.compatibility_date);
  assert.deepEqual(runtime.compatibility_flags, config.compatibility_flags);
  assert.equal(runtime.usage_model, 'standard');
  const assets = { serve_directly: true, raw_run_worker_first: false, base_path: '/' };
  if (config.name === 'gachia') Object.assign(assets, {
    headers: { version: 2, rules: { '/_next/static/*': { set: { 'cache-control': 'public,max-age=31536000,immutable' }, unset: [] } } },
    raw_headers: '/_next/static/*\n  Cache-Control: public,max-age=31536000,immutable\n',
  });
  assert.deepEqual(runtime.assets, assets, 'Cloud asset routing/cache settings changed');
  assert.deepEqual(normalizedBindings(version.resources.bindings), normalizedBindings(bindings), 'Uploaded version bindings changed');
}

function wranglerTool(workspace) {
  const require = createRequire(join(workspace, 'apps/web/package.json'));
  const packagePath = require.resolve('wrangler/package.json'), pkg = JSON.parse(readFileSync(packagePath));
  assert.equal(pkg.version, '4.148.0', 'Unreviewed Wrangler version');
  const bin = realpathSync(join(dirname(packagePath), 'bin/wrangler.js'));
  const cli = realpathSync(join(dirname(packagePath), 'wrangler-dist/cli.js'));
  return { bin, cli, binSHA256: digest(readFileSync(bin)), cliSHA256: digest(readFileSync(cli)), version: pkg.version };
}

function invoke(tool, args, { cwd, home, log, token }) {
  assert.equal(digest(readFileSync(tool.bin)), tool.binSHA256, 'Wrangler launcher changed');
  assert.equal(digest(readFileSync(tool.cli)), tool.cliSHA256, 'Wrangler implementation changed');
  const env = isolatedEnvironment(home, token ? { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: ACCOUNT } : {});
  try {
    const output = execFileSync(process.execPath, [tool.bin, ...args], { cwd, env, maxBuffer: 16 * 1024 * 1024, timeout: 300000 });
    writeFileSync(log, output, { flag: 'wx', mode: 0o600 }); return output.toString();
  } catch (error) {
    writeFileSync(log, Buffer.concat([error.stdout ?? Buffer.alloc(0), error.stderr ?? Buffer.alloc(0)]), { flag: 'wx', mode: 0o600 });
    throw Error(`Wrangler operation failed; no retry. See ${log}`);
  }
}

// This helper can only dry-run; it never receives credentials or selects upload.
export async function sealCloudModule({ run, owner, artifact, directory, temp, snapshot }) {
  assert(Object.hasOwn(CONFIG_PINS, owner), 'Unreviewed owner');
  const workspace = join(run, 'source'), app = owner === 'main' ? 'web' : `game-${owner}`, tool = wranglerTool(workspace);
  const { parseWrangler } = await import(pathToFileURL(join(workspace, 'scripts/game-release.mjs')));
  const raw = readFileSync(join(workspace, 'apps', app, 'wrangler.jsonc'));
  assert.equal(digest(raw), CONFIG_PINS[owner], 'Frozen configuration requires review');
  const original = parseWrangler(raw.toString()); assertOwnerSettings(owner, original, snapshot);
  const config = { ...original, account_id: ACCOUNT, main: join(artifact, 'worker.js'), assets: { ...original.assets, directory: join(artifact, 'assets') } };
  if (owner !== 'main') delete config.env;
  const ownerDir = join(directory, owner); mkdirSync(ownerDir, { mode: 0o700 });
  const configPath = join(temp, `${owner}.json`), multipart = join(temp, `${owner}.multipart`);
  save(configPath, config);
  invoke(tool, ['versions', 'upload', '--dry-run', '--config', configPath, '--env', '', '--outfile', multipart], { cwd: join(workspace, 'apps', app), home: join(run, 'home'), log: join(temp, `${owner}-compile.log`) });
  const compiled = await multipartModule(readFileSync(multipart)); assertUploadMetadata(compiled.metadata, config);
  writeFileSync(join(ownerDir, 'worker.js'), compiled.code, { flag: 'wx', mode: 0o600 });
  const uploadConfig = { ...config, main: join(ownerDir, 'worker.js'), minify: false, no_bundle: true }; save(join(ownerDir, 'upload.json'), uploadConfig);
  const exact = join(temp, `${owner}-exact.multipart`);
  invoke(tool, ['versions', 'upload', '--dry-run', '--no-bundle', '--config', join(ownerDir, 'upload.json'), '--env', '', '--outfile', exact], { cwd: temp, home: join(run, 'home'), log: join(temp, `${owner}-exact.log`) });
  const roundTrip = await multipartModule(readFileSync(exact)); assert.equal(roundTrip.moduleSHA256, compiled.moduleSHA256, 'No-bundle changed Worker bytes'); assertUploadMetadata(roundTrip.metadata, uploadConfig);
  return { uploadConfig, moduleSHA256: compiled.moduleSHA256, tool };
}

export async function prepareCloudBundle({ run, pin, retentionId, retentionPin, snapshot }) {
  return withRunLock(run, async () => {
    const { plan, receipt, directory: retained } = verifyRetainedCandidate(run, pin, retentionId, retentionPin);
    assertReleaseScope(plan);
    assertTopology(snapshot, snapshot);
    const workspace = join(run, 'source'), tool = wranglerTool(workspace);
    const { parseWrangler } = await import(pathToFileURL(join(workspace, 'scripts/game-release.mjs')));
    const id = randomBytes(8).toString('hex'), directory = join(run, 'cloud-bundles', id), temp = join(run, `transport-temp-${id}`);
    mkdirSync(directory, { recursive: true, mode: 0o700 }); mkdirSync(temp, { mode: 0o700 });
    const owners = {};
    for (const owner of plan.owners) {
      const app = owner === 'main' ? 'web' : `game-${owner}`, artifact = join(retained, owner, '.open-next');
      const configText = readFileSync(join(workspace, 'apps', app, 'wrangler.jsonc'));
      assert.equal(digest(configText), CONFIG_PINS[owner], 'Frozen configuration requires a new review');
      const original = parseWrangler(configText.toString()); assertOwnerSettings(owner, original, snapshot);
      assert.equal(activeVersion(snapshot, serviceFor(owner)), receipt.owners[owner].previousVersion, 'Stale old-asset version');
      // Main retains its reviewed env declaration so Wrangler preserves the live
      // cf:service tag. Games have no live grouping tag: remove env entirely.
      const config = { ...original, account_id: ACCOUNT, main: join(artifact, 'worker.js'), assets: { ...original.assets, directory: join(artifact, 'assets') } };
      if (owner !== 'main') delete config.env;
      const ownerDir = join(directory, owner); mkdirSync(ownerDir, { mode: 0o700 });
      const configPath = join(temp, `${owner}.json`), bundle = join(temp, `${owner}.multipart`);
      save(configPath, config);
      invoke(tool, ['versions', 'upload', '--dry-run', '--config', configPath, '--env', '', '--outfile', bundle], { cwd: join(workspace, 'apps', app), home: join(run, 'home'), log: join(temp, `${owner}-compile.log`) });
      const compiled = await multipartModule(readFileSync(bundle)); assertUploadMetadata(compiled.metadata, config);
      writeFileSync(join(ownerDir, 'worker.js'), compiled.code, { flag: 'wx', mode: 0o600 });
      const uploadConfig = { ...config, main: join(ownerDir, 'worker.js'), minify: false, no_bundle: true };
      save(join(ownerDir, 'upload.json'), uploadConfig);
      // A second actual Wrangler dry-run proves --no-bundle uploads exactly the
      // sealed bytes; it must not silently regenerate the accepted program.
      const exact = join(temp, `${owner}-exact.multipart`);
      invoke(tool, ['versions', 'upload', '--dry-run', '--no-bundle', '--config', join(ownerDir, 'upload.json'), '--env', '', '--outfile', exact], { cwd: temp, home: join(run, 'home'), log: join(temp, `${owner}-exact.log`) });
      const roundTrip = await multipartModule(readFileSync(exact)); assert.equal(roundTrip.moduleSHA256, compiled.moduleSHA256, 'No-bundle changed Worker bytes');
      assertUploadMetadata(roundTrip.metadata, uploadConfig);
      const local = { name: `cms-transport-local-${owner}`, main: join(ownerDir, 'worker.js'), no_bundle: true, compatibility_date: config.compatibility_date,
        compatibility_flags: config.compatibility_flags, assets: config.assets, vars: config.vars,
        ...(owner === 'main' ? { d1_databases: [{ binding: 'DB', database_name: 'local-only', database_id: '00000000-0000-0000-0000-000000000000' }], r2_buckets: [{ binding: 'IMAGES', bucket_name: 'local-only' }] } : {}) };
      const localConfig = join(temp, `${owner}-local.json`); save(localConfig, local);
      const paths = owner === 'main' ? [`/data/${plan.game}/raw-guides.json`, '/sitemap.xml', '/robots.txt', '/api/auth/get-session']
        : ['/sitemap.xml', '/robots.txt', ...plan.changed.flatMap(key => ['zh', 'en', 'ja'].map(lang => `/${lang}/${plan.game}/guides/${key}`))];
      const dataHashes = guideDataHashes(plan);
      if (owner === 'main' && plan.preservedGuides) {
        const preserved = pinnedJson(plan.preservedGuides.path, plan.preservedGuides.pin);
        const path = `/data/${preserved.otherGame}/raw-guides.json`;
        assert.equal(activeVersion(snapshot, 'gachia'), preserved.mainVersionId);
        paths.push(path);
      }
      const inventory = pinnedJson(join(retained, `${owner}-inventory.json`), receipt.owners[owner].artifactSHA256);
      const staticFiles = inventory.filter(row => row.type === 'file' && (row.path.startsWith('assets/_next/static/') || row.path.startsWith(`assets/_games/${plan.game}/_next/static/`)));
      const staticHashes = new Map(staticFiles.map(row => ['/' + row.path.slice(7).split('/').map(encodeURIComponent).join('/'), row.sha256]));
      paths.push(...staticHashes.keys());
      const references = await withLocalWorker(join(workspace, 'apps', app), localConfig, join(run, 'home'), join(temp, `${owner}-local.log`), async origin => {
        const rows = [];
        for (const path of paths) {
          const response = await fetch(origin + path, { redirect: 'error', signal: AbortSignal.timeout(30000) });
          const body = await boundedBody(response); assert.equal(response.status, path.startsWith('/api/auth/') ? 404 : 200);
          const row = { path, status: response.status, headers: Object.fromEntries(response.headers), sha256: digest(body) };
          if (owner === 'main' && plan.preservedGuides && path.startsWith('/data/') && path !== `/data/${plan.game}/raw-guides.json`) {
            row.preservedMainVersion = pinnedJson(plan.preservedGuides.path, plan.preservedGuides.pin).mainVersionId;
          }
          if (staticHashes.has(path)) assert.equal(row.sha256, staticHashes.get(path), 'Local static HTTP bytes differ from retained inventory');
          if (row.headers['content-type']?.startsWith('text/html')) row.fingerprint = pageFingerprint(body.toString());
          if (path.startsWith('/data/')) assert.equal(row.sha256, dataHashes.get(path), 'Main mirror differs from pinned guide content');
          if (path.startsWith('/api/auth/')) { assert.equal(JSON.parse(body).code, 'ACCOUNT_FEATURES_DISABLED'); assert.match(row.headers['cache-control'], /no-store/); }
          writeFileSync(join(ownerDir, `${rows.length}.body`), body, { flag: 'wx', mode: 0o600 }); rows.push(row);
        }
        return rows;
      });
      save(join(ownerDir, 'references.json'), references);
      owners[owner] = { service: serviceFor(owner), moduleSHA256: compiled.moduleSHA256, configSHA256: digest(json(uploadConfig)), referencesSHA256: digest(json(references)), artifactSHA256: receipt.owners[owner].artifactSHA256, paths: references.length };
    }
    verifyRetainedCandidate(run, pin, retentionId, retentionPin);
    const manifest = { schemaVersion: 1, id, planSHA256: pin, retentionId, retentionPin, releaseKey: plan.releaseKey, owners, snapshot, tool, previewCandidate: plan.preview, cloudWrites: false };
    save(join(directory, 'manifest.json'), manifest);
    return { id, directory, bundlePin: digest(json(manifest)), owners, cloudWrites: false };
  });
}

export function verifyCloudBundle({ run, pin, id, bundlePin }) {
  assert(/^[a-f0-9]{16}$/.test(id), 'Invalid cloud bundle ID');
  const directory = join(run, 'cloud-bundles', id), manifest = pinnedJson(join(directory, 'manifest.json'), bundlePin);
  assert.equal(manifest.id, id); assert.equal(manifest.planSHA256, pin);
  const retained = verifyRetainedCandidate(run, pin, manifest.retentionId, manifest.retentionPin);
  assert.equal(manifest.releaseKey, retained.plan.releaseKey); assert.equal(manifest.previewCandidate, retained.plan.preview);
  assertReleaseScope(retained.plan, manifest.owners);
  for (const [owner, record] of Object.entries(manifest.owners)) {
    assert.equal(record.service, serviceFor(owner)); assert.equal(record.artifactSHA256, retained.receipt.owners[owner].artifactSHA256);
    assert.equal(digest(readFileSync(join(directory, owner, 'worker.js'))), record.moduleSHA256, 'Sealed module changed');
    const config = pinnedJson(join(directory, owner, 'upload.json'), record.configSHA256);
    assert.equal(config.main, join(directory, owner, 'worker.js'));
    assert.equal(config.assets.directory, join(retained.directory, owner, '.open-next/assets'));
    assertOwnerSettings(owner, config, manifest.snapshot);
    const references = pinnedJson(join(directory, owner, 'references.json'), record.referencesSHA256);
    assert.equal(record.paths, references.length);
    references.forEach((r, i) => assert.equal(digest(readFileSync(join(directory, owner, `${i}.body`))), r.sha256, 'Local network reference changed'));
    if (owner === 'main') for (const [path, sha256] of guideDataHashes(retained.plan)) {
      const rows = references.filter(row => row.path === path);
      assert.equal(rows.length, 1, 'Main guide reference missing or duplicated');
      assert.equal(rows[0].sha256, sha256, 'Main guide reference differs from frozen content');
      if (path !== `/data/${retained.plan.game}/raw-guides.json`) assert.equal(rows[0].preservedMainVersion,
        pinnedJson(retained.plan.preservedGuides.path, retained.plan.preservedGuides.pin).mainVersionId);
    }
  }
  return { ...retained, directory, manifest };
}

export function uploadReadOptions(token, binary = false) {
  assert.equal(typeof binary, 'boolean');
  // Multipart transfers are up to 16 MiB; recovery uses the same budget as candidates.
  return { method: 'GET', redirect: 'error', headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(binary ? 180000 : 30000) };
}

export async function readUploadVersion({ service, versionId, token, binary = false, allowPendingVersion = false,
  request = fetch, pause = ms => new Promise(resolve => setTimeout(resolve, ms)), onVisibilityWait = () => {} }) {
  exactPreviewOrigin(service, versionId);
  const suffix = binary ? `/content/v2?version=${versionId}` : `/versions/${versionId}`;
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/${service}${suffix}`;
  const readAttempts = [];
  for (let attempt = 0; ; attempt++) {
    const options = uploadReadOptions(token, binary), started = Date.now();
    try {
      const response = await request(url, options);
      // Only the first metadata read after a confirmed upload can lag visibility.
      // This 404 grace never retries uploads, content GETs, or later identity checks.
      if (allowPendingVersion && !binary && response.status === 404 && attempt < 4) {
        await boundedBody(response);
        const delayMs = 5000 * 2 ** attempt;
        onVisibilityWait({ at: new Date().toISOString(), service, versionId, status: 404, attempt: attempt + 1, delayMs });
        await pause(delayMs);
        continue;
      }
      assert(response.ok, `Upload version read failed: ${response.status}`);
      const bytes = await boundedBody(response);
      readAttempts.push({ status: 'downloaded', elapsedMs: Date.now() - started, bytes: bytes.length });
      if (binary) return { archive: bytes, etag: response.headers.get('etag'), readAttempts };
      const body = JSON.parse(bytes.toString()); assert.equal(body.success, true); return body.result;
    } catch (error) {
      const ownTimeout = options.signal.aborted && options.signal.reason?.name === 'TimeoutError'
        && ['TimeoutError', 'AbortError'].includes(error.name);
      readAttempts.push({ status: 'failed', elapsedMs: Date.now() - started, errorName: error.name, ownTimeout });
      // Only a fixed, upload-time binary GET can get one fresh transfer timer.
      if (!binary || !ownTimeout || attempt === 1) throw error;
    }
  }
}

export async function uploadCloudPreview({ run, pin, id, bundlePin, releaseKey, token }) {
  assert(process.platform === 'darwin' && !process.env.CI && !process.env.GITHUB_ACTIONS, 'Cloud publishing is desktop-only');
  const verified = verifyCloudBundle({ run, pin, id, bundlePin });
  const scope = assertReleaseScope(verified.plan, verified.manifest.owners);
  assert.equal(verified.plan.preview, false, 'Never upload rehearsal/preview candidates');
  assert(verified.plan.changed.length > 0 && releaseKey === verified.plan.releaseKey, 'Explicit changed editorial release required');
  const directory = join(run, `cloud-preview-${id}`); mkdirSync(directory, { mode: 0o700 });
  const api = (service, versionId, binary = false, allowPendingVersion = false) => {
    assert(scope.services.includes(service), 'Release service/game mismatch');
    return readUploadVersion({ service, versionId, token, binary, allowPendingVersion,
      onVisibilityWait: row => appendFileSync(join(directory, 'version-visibility.jsonl'), JSON.stringify(row) + '\n', { mode: 0o600 }) });
  };
  const recheck = () => verifyCloudBundle({ run, pin, id, bundlePin });
  let firstSnapshot = true;
  const transport = {
    // Return observed state even after drift, so the protocol can persist an
    // honest reconciliation instead of losing it to a preemptive assertion.
    snapshot: async () => {
      const current = await desktopCloudSnapshot(token, fetch, { allowSplit: true });
      if (firstSnapshot) { assertTopology(verified.manifest.snapshot, current); firstSnapshot = false; }
      return current;
    },
    upload: async args => {
      recheck(); const record = verified.manifest.owners[args.owner];
      assert.equal(args.service, record.service); assert.equal(args.artifactSHA256, record.artifactSHA256);
      const outfile = join(directory, `${args.owner}-uploaded.multipart`);
      const output = invoke(verified.manifest.tool, ['versions', 'upload', '--no-bundle', '--config', join(verified.directory, args.owner, 'upload.json'), '--env', '', '--outfile', outfile],
        { cwd: directory, home: join(run, 'home'), log: join(directory, `${args.owner}-upload.log`), token });
      const matches = [...output.matchAll(/Worker Version ID:\s*([a-f0-9-]{36})/g)]; assert.equal(matches.length, 1, 'Unknown upload result; reconcile, never retry');
      const versionId = matches[0][1], origin = exactPreviewOrigin(args.service, versionId);
      assert(output.includes(`Version Preview URL: ${origin}`), 'Cloud did not return the expected exact-version URL');
      const form = await multipartModule(readFileSync(outfile));
      assert.equal(form.moduleSHA256, record.moduleSHA256, 'Uploaded form differs from sealed module');
      assertUploadMetadata(form.metadata, pinnedJson(join(verified.directory, args.owner, 'upload.json'), record.configSHA256));
      const version = await api(args.service, versionId, false, true);
      assertUploadedVersion(version, versionId, pinnedJson(join(verified.directory, args.owner, 'upload.json'), record.configSHA256), verified.manifest.snapshot.bindings[args.service]);
      const moduleProof = await captureUploadedModule({ service: args.service, versionId, moduleSHA256: record.moduleSHA256,
        context: { role: 'candidate', releaseKey, configSHA256: record.configSHA256 }, directory: join(directory, `${args.owner}-module`), uploadPath: outfile,
        uploadLogPath: join(directory, `${args.owner}-upload.log`),
        expectedVersion: version, readVersion: api, readContent: (service, uuid) => api(service, uuid, true) });
      save(join(directory, `${args.owner}-version.json`), version); recheck();
      return { versionId, releaseKey, artifactSHA256: record.artifactSHA256, moduleSHA256: record.moduleSHA256, moduleProof };
    },
    preview: async args => {
      recheck(); const record = verified.manifest.owners[args.owner];
      const references = pinnedJson(join(verified.directory, args.owner, 'references.json'), record.referencesSHA256);
      const proof = await verifyVersionPreview({ service: args.service, versionId: args.versionId, references, directory: join(directory, `${args.owner}-http`) });
      await revalidateUploadedModule({ proof: args.moduleProof, service: args.service, versionId: args.versionId, moduleSHA256: record.moduleSHA256,
        context: { role: 'candidate', releaseKey, configSHA256: record.configSHA256 }, readVersion: api }); recheck();
      return { ...args, status: proof.status, evidenceSHA256: proof.evidenceSHA256 };
    },
  };
  return executeReleaseProtocol({ run, pin, retentionId: verified.manifest.retentionId, retentionPin: verified.manifest.retentionPin,
    authorize: async () => releaseKey, transport, previewOnly: true });
}

export function assertEditorialRecovery(plan, releaseKey) {
  assert.equal(plan.preview, false, 'Never upload rehearsal/preview recovery');
  assertReleaseScope(plan);
  assert(Array.isArray(plan.changed) && plan.changed.length > 0, 'Changed editorial release required');
  assert(/^[a-f0-9]{64}$/.test(releaseKey) && releaseKey === plan.releaseKey, 'Explicit matching releaseKey required');
}

// Production entry point: dependencies are fixed here, never supplied by CLI.
export async function uploadRecoveryPreview(input) {
  assert(process.platform === 'darwin' && !process.env.CI && !process.env.GITHUB_ACTIONS, 'Cloud publishing is desktop-only');
  const { verifyRecoveryCloud } = await import('./desktop-recovery-cloud.mjs');
  const { run, token } = input;
  const readVersion = (service, versionId, binary = false, allowPendingVersion = false) => readUploadVersion({ service, versionId, token, binary, allowPendingVersion });
  return executeRecoveryUpload({ input, verify: () => {
    const verified = verifyRecoveryCloud(input);
    assertEditorialRecovery(verified.candidate.plan, input.releaseKey);
    assert(typeof token === 'string' && token.length > 0, 'Cloudflare credential required');
    return verified;
  }, transport: {
    snapshot: () => desktopCloudSnapshot(token, fetch, { allowSplit: true }),
    upload: async ({ owner, row, verified, directory }) => {
      const outfile = join(directory, `${owner}.multipart`);
      const output = invoke(row.tool, ['versions', 'upload', '--no-bundle', '--config', join(verified.directory, owner, 'upload.json'), '--env', '', '--outfile', outfile],
        { cwd: directory, home: join(run, 'home'), log: join(directory, `${owner}-upload.log`), token });
      const matches = [...output.matchAll(/Worker Version ID:\s*([a-f0-9-]{36})/g)];
      assert.equal(matches.length, 1, 'Unknown recovery upload result; never retry');
      return { versionId: matches[0][1] };
    },
    inspect: async ({ owner, row, versionId, verified, directory }) => {
      const origin = exactPreviewOrigin(row.service, versionId);
      assert(readFileSync(join(directory, `${owner}-upload.log`), 'utf8').includes(`Version Preview URL: ${origin}`), 'Missing exact recovery preview URL');
      const config = pinnedJson(join(verified.directory, owner, 'upload.json'), row.configSHA256);
      const form = await multipartModule(readFileSync(join(directory, `${owner}.multipart`)));
      assert.equal(form.moduleSHA256, row.moduleSHA256); assertUploadMetadata(form.metadata, config);
      const version = await readUploadVersion({ service: row.service, versionId, token, allowPendingVersion: true,
        onVisibilityWait: value => appendFileSync(join(directory, 'version-visibility.jsonl'), JSON.stringify(value) + '\n', { mode: 0o600 }) });
      assertUploadedVersion(version, versionId, config, verified.manifest.snapshot.bindings[row.service]);
      const moduleProof = await captureUploadedModule({ service: row.service, versionId, moduleSHA256: row.moduleSHA256,
        context: { role: 'recovery', releaseKey: input.releaseKey, configSHA256: row.configSHA256 }, directory: join(directory, `${owner}-module`),
        uploadPath: join(directory, `${owner}.multipart`), uploadLogPath: join(directory, `${owner}-upload.log`), expectedVersion: version, readVersion,
        readContent: (service, uuid) => readVersion(service, uuid, true) });
      save(join(directory, `${owner}-version.json`), version);
      return { versionSHA256: digest(json(version)), moduleProof };
    },
    preview: async ({ owner, row, versionId, verified, directory, inspected }) => {
      const references = pinnedJson(join(verified.directory, owner, 'references.json'), row.referencesSHA256);
      const proof = await verifyVersionPreview({ service: row.service, versionId, references, directory: join(directory, `${owner}-http`) });
      await revalidateUploadedModule({ proof: inspected.moduleProof, service: row.service, versionId, moduleSHA256: row.moduleSHA256,
        context: { role: 'recovery', releaseKey: input.releaseKey, configSHA256: row.configSHA256 }, readVersion });
      return proof;
    },
  } });
}

// Injected transports are for isolated protocol tests, not authorization inputs.
// The retention-scoped journal survives failure and blocks cross-process replay.
export async function executeRecoveryUpload({ input, verify, transport }) {
  const { run, releaseKey } = input;
  return withRunLock(run, async () => {
    const verified = structuredClone(await verify());
    assertEditorialRecovery(verified.candidate.plan, releaseKey);
    const scope = assertReleaseScope(verified.candidate.plan, verified.manifest.owners);
    for (const owner of scope.owners) {
      assert.equal(activeVersion(verified.manifest.snapshot, scope.serviceFor(owner)), verified.manifest.owners[owner].sourceVersionId,
        'Recovery source is not active baseline');
    }
    const recheck = async () => {
      const fresh = await verify(); assertEditorialRecovery(fresh.candidate.plan, releaseKey);
      assert.deepEqual(fresh, verified, 'Recovery evidence changed');
    };
    const retentionId = verified.candidate.manifest.retentionId;
    assert(/^[a-f0-9]{16}$/.test(retentionId));
    assert(/^[a-f0-9]{16}$/.test(input.recoveryId));
    assert(/^[a-f0-9]{64}$/.test(input.recoveryBundlePin));
    const journal = join(run, `recovery-cloud-${retentionId}.jsonl`);
    writeFileSync(journal, '', { flag: 'wx', mode: 0o600 });
    const record = row => appendFileSync(journal, JSON.stringify({ at: new Date().toISOString(), releaseKey,
      recoveryBundlePin: input.recoveryBundlePin, ...row }) + '\n', { flush: true });
    const directory = join(run, `recovery-cloud-${retentionId}`), baseline = verified.manifest.snapshot;
    const owners = {}; let pendingOperation;
    record({ phase: 'baseline', baseline, candidatePin: verified.manifest.candidatePin });
    try {
      mkdirSync(directory, { mode: 0o700 });
      for (const owner of verified.candidate.plan.owners) {
        await recheck(); assertTopology(baseline, await transport.snapshot());
        const row = verified.manifest.owners[owner], service = row.service;
        assert.equal(service, serviceFor(owner));
        assert.equal(activeVersion(baseline, service), row.sourceVersionId, 'Recovery source is not active baseline');
        pendingOperation = { owner, service };
        record({ phase: 'upload_intent', ...pendingOperation, moduleSHA256: row.moduleSHA256 });
        const context = { owner, row, verified, directory };
        const { versionId } = await transport.upload(context);
        exactPreviewOrigin(service, versionId);
        pendingOperation.versionId = versionId;
        record({ phase: 'upload_returned', ...pendingOperation });
        assert.notEqual(versionId, row.sourceVersionId, 'Raw old UUID is not compatible recovery');
        const inspected = await transport.inspect({ ...context, versionId });
        assert(/^[a-f0-9]{64}$/.test(inspected.versionSHA256));
        await recheck(); assertTopology(baseline, await transport.snapshot());
        const proof = await transport.preview({ ...context, versionId, inspected });
        assert.equal(proof.status, 'passed');
        assert.equal(proof.service, service); assert.equal(proof.versionId, versionId);
        assert(/^[a-f0-9]{64}$/.test(proof.evidenceSHA256));
        await recheck(); assertTopology(baseline, await transport.snapshot());
        owners[owner] = { service, versionId, sourceVersionId: row.sourceVersionId, candidateArtifactSHA256: row.candidateArtifactSHA256,
          moduleSHA256: row.moduleSHA256, recoveryArtifactSHA256: row.recoveryArtifactSHA256, versionSHA256: inspected.versionSHA256,
          ...(inspected.moduleProof ? { moduleProof: inspected.moduleProof } : {}), evidenceSHA256: proof.evidenceSHA256, acceptedAt: Date.now() };
        record({ phase: 'preview_accepted', owner, proof: owners[owner] }); pendingOperation = undefined;
      }
      await recheck(); assertTopology(baseline, await transport.snapshot());
      record({ phase: 'complete', owners });
      const receipt = { schemaVersion: 1, status: 'exact_cloud_recovery_previews_accepted', releaseKey, retentionId,
        recoveryId: input.recoveryId, recoveryBundlePin: input.recoveryBundlePin, candidatePin: verified.manifest.candidatePin,
        journalSHA256: digest(readFileSync(journal)), owners };
      save(join(directory, 'receipt.json'), receipt);
      return { ...receipt, directory, receiptPin: digest(json(receipt)), productionPromoted: false };
    } catch (error) {
      record({ phase: 'stopped', pendingOperation, accepted: owners, error: error.message });
      try { record({ phase: 'observed_after_failure', snapshot: await transport.snapshot(), pendingOperation }); }
      catch (failure) { record({ phase: 'observation_unavailable', error: failure.message }); }
      throw error;
    }
  });
}
