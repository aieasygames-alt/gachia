import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { artifactFiles, localAssetPath, withLocalWorker } from './desktop-publish.mjs';
import { activeVersion, assertTopology, desktopCloudSnapshot, SERVICES } from './desktop-cloud-release.mjs';
import { digest, pinnedJson, verifyAssetEvidence } from './desktop-release-assets.mjs';
import { multipartModule } from './desktop-cloud-transport.mjs';
import { verifyPublishedBaseline } from './desktop-published-baseline.mjs';
import { verifyRecoveryCompatibility } from './desktop-release-readiness.mjs';
import { assertReleaseScope } from './desktop-release-scope.mjs';
import { boundedBody, exactPreviewOrigin, pageFingerprint, sampleReadOnly } from './desktop-version-preview.mjs';
import { publicRobots } from './desktop-public-acceptance.mjs';
import { revalidateVersionModule } from './desktop-version-provenance.mjs';

const json = value => JSON.stringify(value, null, 2) + '\n';
const save = (file, value) => { writeFileSync(file, json(value), { flag: 'wx', mode: 0o600 }); return digest(json(value)); };
const STAGING = ['gachia-router-staging', 'gachia-game-genshin-staging', 'gachia-game-azur-promilia-staging'];
const staticFile = file => file.type === 'file' && /^assets\/(?:_games\/(?:genshin|nte)\/)?_next\/static\//.test(file.path);
const staticURL = file => '/' + file.path.slice(7).split('/').map(encodeURIComponent).join('/');
const sha = /^[a-f0-9]{64}$/;

// This transport has no write method and accepts no caller-selected host/account.
export function preparationReader(token, request = fetch) {
  assert(typeof token === 'string' && token.length > 0, 'Existing Cloudflare login required');
  assert(!(request === fetch && (process.env.CI || process.env.GITHUB_ACTIONS)), 'Live preparation is local-only');
  const read = async (url, options) => {
    const response = await request(url, options);
    assert(response.ok, `Read-only preparation request failed (${new URL(url).pathname}): ${response.status}`);
    return response;
  };
  const get = async (service, suffix) => {
    assert([...SERVICES, ...STAGING].includes(service), 'Unreviewed observed service');
    assert(/^\/(?:deployments|settings|subdomain|versions\/[a-f0-9-]{36})$/.test(suffix), 'Unreviewed read operation');
    const response = await read(`https://api.cloudflare.com/client/v4/accounts/e6472b6c6172a3ac1e1596ef100543ae/workers/scripts/${service}${suffix}`, {
      method: 'GET', redirect: 'error', headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000),
    });
    const body = await response.json(); assert.equal(body.success, true); return body.result;
  };
  return {
    snapshot: () => desktopCloudSnapshot(token, read),
    async version(service, version) {
      exactPreviewOrigin(service, version);
      return get(service, `/versions/${version}`);
    },
    async module(service, version, proof) {
      exactPreviewOrigin(service, version);
      return revalidateVersionModule({ proof, service, versionId: version, readVersion: (name, uuid) => get(name, `/versions/${uuid}`) });
    },
    async project() {
      const protectedSnapshot = await desktopCloudSnapshot(token, read), additionalStaging = {};
      for (const service of STAGING) {
        const settings = await get(service, '/settings');
        settings.bindings = settings.bindings.map(row => row.type === 'secret_text' ? { type: row.type, name: row.name } : row);
        additionalStaging[service] = { deployments: await get(service, '/deployments'), settings, subdomain: await get(service, '/subdomain') };
      }
      return { observedAt: new Date().toISOString(), protectedServices: SERVICES, additionalStaging,
        projectScripts: protectedSnapshot.scripts.filter(name => name === 'gachia' || name.startsWith('gachia-')),
        protectedSnapshot, writeGroups: [['genshin', 'main'], ['nte', 'main']], cloudWrites: false,
        note: 'Additional staging is observed, not added to production promotion protection or write targets.' };
    },
  };
}

async function sample(request, origin, path, directory, bodyFile) {
  const response = await request(origin + path, { method: 'GET', credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(30000) });
  const body = await boundedBody(response);
  writeFileSync(join(directory, bodyFile), body, { flag: 'wx', mode: 0o600 });
  return { body, row: { path, status: response.status, headers: Object.fromEntries(response.headers), bytes: body.length, sha256: digest(body), bodyFile } };
}

// Fixed public static GETs only. A partial body is never saved or accepted.
export async function readPublicStatic(path, request, attempts, timeoutSignal = () => AbortSignal.timeout(30000)) {
  assert(/^\/(?:_games\/(?:genshin|nte)\/)?_next\/static\//.test(path), 'Unreviewed static path');
  localAssetPath('/inventory', path);
  const url = new URL(path, 'https://gachia.com');
  assert.equal(url.origin, 'https://gachia.com'); assert(!url.search && !url.hash);
  for (let attempt = 1; attempt <= 2; attempt++) {
    const signal = timeoutSignal(), row = { attempt, at: new Date().toISOString() };
    assert(!signal.aborted, 'Static read already aborted');
    attempts.push(row); let phase = 'fetch';
    try {
      const response = await request(url.href, { method: 'GET', credentials: 'omit', redirect: 'error', signal });
      // HTTP failures are not transport failures and must never be retried.
      assert.equal(response.status, 200, `Public static HTTP status: ${path}`);
      phase = 'body'; const body = await boundedBody(response);
      Object.assign(row, { outcome: 'received', status: response.status, bytes: body.length, sha256: digest(body) });
      return { response, body };
    } catch (error) {
      const ownTimeout = signal.aborted && signal.reason?.name === 'TimeoutError' && ['TimeoutError', 'AbortError', 'TypeError'].includes(error.name);
      const brokenBody = !signal.aborted && phase === 'body' && error instanceof TypeError && error.message === 'terminated' &&
        ['UND_ERR_SOCKET', 'ECONNRESET', 'EPIPE', 'UND_ERR_RES_CONTENT_LENGTH_MISMATCH'].includes(error.cause?.code);
      const retry = attempt === 1 && (ownTimeout || brokenBody);
      Object.assign(row, { outcome: 'failed', phase, error: error.name, message: error.message,
        ...(error.cause?.code ? { causeCode: error.cause.code } : {}), retry });
      if (!retry) throw error;
    }
  }
}

export async function refreshAssetEvidence({ plan, evidencePath, evidencePin, directory, reader, request = fetch }) {
  const scope = assertReleaseScope(plan), original = verifyAssetEvidence(evidencePath, evidencePin, plan.game);
  mkdirSync(directory, { mode: 0o700 });
  const result = { status: 'running', game: plan.game, releaseKey: plan.releaseKey, cloudWrites: false, observations: [], readAttempts: [] };
  try {
    const before = await reader.snapshot(); assertTopology(before, before);
    assert.equal(activeVersion(before, scope.services[0]), original.capture.summary.versionId, 'Game source is not current');
    assert.equal(activeVersion(before, 'gachia'), original.evidence.main.source.versionId, 'Main source is not current');
    const oldArchive = join(dirname(original.capture.summary.receiptPath), 'worker.multipart');
    const oldModule = await multipartModule(readFileSync(oldArchive));
    const live = await reader.module(scope.services[0], original.capture.summary.versionId, original.evidence.moduleProofs?.[plan.game]);
    assert.equal(live.moduleSHA256, oldModule.moduleSHA256, 'Historical game runtime differs from current cloud version');
    writeFileSync(join(directory, 'game-worker.multipart'), live.archive, { flag: 'wx', mode: 0o600 });
    const samples = [];
    for (const owner of scope.owners) {
      const files = owner === 'main' ? original.evidence.main.files : original.capture.files;
      assert(files.length > 0 && files.length <= 5000);
      for (const file of files) {
        const path = (owner === 'main' ? '/_next/static/' : `/_games/${plan.game}/_next/static/`) + file.path.split('/').map(encodeURIComponent).join('/');
        localAssetPath('/inventory', path);
        samples.push({ owner, file, path });
      }
    }
    await sampleReadOnly(samples, async ({ owner, file, path }, index) => {
      const attempts = []; result.readAttempts[index] = { owner, path, attempts };
      const { response, body } = await readPublicStatic(path, request, attempts), bodyFile = `${index}.body`;
      writeFileSync(join(directory, bodyFile), body, { flag: 'wx', mode: 0o600 });
      const row = { owner, path, status: response.status, headers: Object.fromEntries(response.headers), bytes: body.length,
        sha256: digest(body), bodyFile, readAttempts: attempts };
      result.observations[index] = row;
      assert(!row.headers['set-cookie']);
      assert.equal(row.bytes, Buffer.isBuffer(file.bytes) ? file.bytes.length : file.bytes); assert.equal(row.sha256, file.sha256, 'Current public static bytes differ');
    });
    const after = await reader.snapshot(); assertTopology(before, after);
    verifyAssetEvidence(evidencePath, evidencePin, plan.game);
    const observationPin = save(join(directory, 'observations.json'), result.observations);
    const evidence = { ...original.evidence, freshCapture: { releaseKey: plan.releaseKey, observedAt: new Date().toISOString(), before, after,
      observationsPath: join(directory, 'observations.json'), observationsPin: observationPin, gameModuleSHA256: live.moduleSHA256,
      ...(live.provenanceMode ? { provenanceMode: live.provenanceMode } : {}), cloudWrites: false } };
    const destination = join(directory, 'asset-evidence.json'), pin = save(destination, evidence);
    verifyAssetEvidence(destination, pin, plan.game);
    result.status = 'passed';
    return { evidencePath: destination, evidencePin: pin, responses: result.observations.length, cloudWrites: false, productionReady: false };
  } catch (error) { result.status = 'failed'; result.error = error.message; throw new Error(`${error.message}; diagnostics: ${join(directory, 'diagnostic.json')}`, { cause: error }); }
  finally { result.observations = result.observations.filter(Boolean); result.readAttempts = result.readAttempts.filter(Boolean); save(join(directory, 'diagnostic.json'), result); }
}

function recoveryInputs({ verified, baselinePath, baselinePin, sourcePath, sourcePin }) {
  const { plan, receipt } = verified, scope = assertReleaseScope(plan);
  assert(plan.changed.length > 0 && plan.changed.every(key => /^[a-z0-9-]+$/.test(key)), 'No valid changed guides');
  const versions = Object.fromEntries(scope.owners.map(owner => [owner, receipt.owners[owner].previousVersion]));
  const baseline = verifyPublishedBaseline(baselinePath, baselinePin, plan, versions);
  const sources = pinnedJson(sourcePath, sourcePin);
  assert.equal(sources.schemaVersion, 1); assert.equal(sources.game, plan.game);
  assert.deepEqual(Object.keys(sources.owners).sort(), [...scope.owners].sort());
  for (const owner of scope.owners) {
    const source = sources.owners[owner];
    assert.equal(source.versionId, versions[owner], 'Recovery source is not previous published version');
    assert(sha.test(source.artifactSHA256));
    assert.equal(realpathSync(source.directory), resolve(source.directory), 'Linked recovery root forbidden');
    assert.equal(digest(json(artifactFiles(source.directory))), source.artifactSHA256, 'Recovery source tree changed');
    // Assets can be copied; runtime authority comes from the pinned capture and
    // fresh immutable-version metadata, not an unversioned content download.
    assert(artifactFiles(source.directory).every(file => !file.path.startsWith('assets/') || file.type !== 'link'), 'Linked asset source forbidden');
  }
  return { scope, baseline, sources, versions };
}

export async function prepareLocalRecovery(input) {
  const { verified, directory, reader, request = fetch, serve = withLocalWorker, run } = input;
  const { plan, receipt } = verified;
  const { scope, baseline, sources, versions } = recoveryInputs(input);
  mkdirSync(directory, { mode: 0o700 });
  const result = { status: 'running', releaseKey: plan.releaseKey, owners: {}, cloudWrites: false };
  try {
    const before = await reader.snapshot(); assertTopology(baseline.after, before);
    for (const owner of scope.owners) {
      const artifact = join(directory, owner, '.open-next'); mkdirSync(dirname(artifact), { mode: 0o700 });
      cpSync(sources.owners[owner].directory, artifact, { recursive: true, verbatimSymlinks: true, force: false, errorOnExist: true });
      const live = await reader.module(scope.serviceFor(owner), versions[owner], sources.owners[owner].moduleProof);
      // Never execute a caller-selected old worker or overwrite the source artifact.
      const worker = join(artifact, 'worker.js'); assert.equal(realpathSync(worker), worker, 'Linked runtime forbidden');
      writeFileSync(worker, live.code, { mode: 0o600 });
      writeFileSync(join(directory, `${owner}-worker.multipart`), live.archive, { flag: 'wx', mode: 0o600 });
      const forward = artifactFiles(join(verified.directory, owner, '.open-next')).filter(staticFile);
      assert(forward.length > 0 && forward.length <= 5000, 'Invalid candidate static coverage');
      for (const file of forward) {
        const target = localAssetPath(join(artifact, 'assets'), staticURL(file));
        if (existsSync(target)) assert.equal(digest(readFileSync(target)), file.sha256, 'Immutable recovery asset collision');
        else { mkdirSync(dirname(target), { recursive: true, mode: 0o700 }); cpSync(join(verified.directory, owner, '.open-next', file.path), target, { force: false, errorOnExist: true }); }
      }
      const tree = artifactFiles(artifact), artifactSHA256 = save(join(directory, `${owner}-inventory.json`), tree);
      const config = { name: `cms-recovery-local-${owner}`, main: worker, no_bundle: true,
        compatibility_date: before.settings[scope.serviceFor(owner)].compatibility_date,
        compatibility_flags: before.settings[scope.serviceFor(owner)].compatibility_flags,
        assets: { directory: join(artifact, 'assets'), binding: 'ASSETS' },
        vars: { NEXT_PUBLIC_APP_URL: 'https://gachia.com', ...(owner === 'main' ? { BETTER_AUTH_URL: 'https://gachia.com' } : owner === 'nte' ? { NTE_DEPLOYMENT_MODE: 'live' } : { GENSHIN_DEPLOYMENT_MODE: 'production' }) },
        ...(owner === 'main' ? { d1_databases: [{ binding: 'DB', database_name: 'recovery-local-only', database_id: '00000000-0000-0000-0000-000000000000' }], r2_buckets: [{ binding: 'IMAGES', bucket_name: 'recovery-local-only' }] } : {}) };
      const configPath = join(directory, `${owner}-local.json`); save(configPath, config);
      const dynamic = owner === 'main' ? [`/data/${plan.game}/raw-guides.json`, '/sitemap.xml', '/api/auth/get-session']
        : ['/sitemap.xml', ...plan.changed.flatMap(key => ['zh', 'en', 'ja'].map(lang => `/${lang}/${plan.game}/guides/${key}`))];
      const hashes = new Map(tree.filter(staticFile).map(file => [staticURL(file), file.sha256]));
      const observations = [], auxiliary = []; let sequence = 0;
      result.owners[owner] = { status: 'running', observations, auxiliary };
      await serve(join(run, 'source/apps', owner === 'main' ? 'web' : `game-${owner}`), configPath, join(run, 'home'), join(directory, `${owner}.log`), async origin => {
        for (const path of [...dynamic, ...hashes.keys()]) {
          const index = sequence++;
          const { body, row } = await sample(request, origin, path, directory, `${owner}-${index}.body`);
          (path.startsWith('/api/') ? auxiliary : observations).push(row);
          assert.equal(row.status, path.startsWith('/api/') ? 404 : 200); assert(!row.headers['set-cookie']);
          if (hashes.has(path)) assert.equal(row.sha256, hashes.get(path), 'Recovery local static bytes differ');
          else {
            const { body: remote, row: publicRow } = await sample(request, exactPreviewOrigin(scope.serviceFor(owner), versions[owner]), path, directory, `${owner}-baseline-${index}.body`);
            save(join(directory, `${owner}-baseline-${index}.json`), publicRow);
            assert.equal(publicRow.status, row.status); assert(!publicRow.headers['set-cookie']);
            assert.equal(publicRow.headers['content-type']?.split(';')[0], row.headers['content-type']?.split(';')[0]);
            if (row.headers['content-type']?.startsWith('text/html')) {
              assert.deepEqual(pageFingerprint(body.toString()), pageFingerprint(remote.toString()), 'Recovery content is not current public baseline');
              assert.deepEqual(publicRobots(body.toString()), publicRobots(remote.toString()), 'Recovery HTML robots changed');
            } else assert.equal(digest(remote), row.sha256, 'Recovery baseline response differs');
          }
          if (path.startsWith('/data/')) assert.equal(row.sha256, baseline.contentSHA256, 'Recovery must restore A, not import O');
          if (path.startsWith('/api/')) { assert.equal(JSON.parse(body).code, 'ACCOUNT_FEATURES_DISABLED'); assert.match(row.headers['cache-control'], /no-store/); }
        }
      });
      assert.deepEqual(artifactFiles(artifact), tree, 'Recovery tree changed during sampling');
      result.owners[owner] = { status: 'passed', oldVersionId: versions[owner], artifactSHA256, runtimeModuleSHA256: live.moduleSHA256,
        ...(live.moduleProof ? { moduleProof: live.moduleProof } : {}), ...(live.provenanceMode ? { provenanceMode: live.provenanceMode } : {}), observations, auxiliary };
    }
    assertTopology(before, await reader.snapshot()); recoveryInputs(input);
    const evidence = { status: 'old_runtime_with_old_and_new_static_local_http_verified', directory, releaseKey: plan.releaseKey,
      retentionPin: verified.retentionPin, baselinePath: resolve(input.baselinePath), baselinePin: input.baselinePin,
      cloudWrites: false, rawUuidRollbackAuthorized: false, owners: result.owners };
    const evidencePath = join(directory, 'recovery-evidence.json'), evidencePin = save(evidencePath, evidence);
    const checked = verifyRecoveryCompatibility(evidencePath, evidencePin, verified);
    result.status = 'passed';
    return { evidencePath, evidencePin, ...checked, cloudWrites: false };
  } catch (error) { result.status = 'failed'; result.error = error.message; throw new Error(`${error.message}; diagnostics: ${join(directory, 'diagnostic.json')}`, { cause: error }); }
  finally { save(join(directory, 'diagnostic.json'), result); }
}
