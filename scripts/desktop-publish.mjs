import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { appendFileSync, cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { verifyWorkerArtifact } from './verify-worker-artifact.mjs';
import { verifyPreservedGuides } from './desktop-source-catalog.mjs';
import { verifiedInPass, withVerificationPass } from './desktop-release-assets.mjs';
import { CMS_GUIDE_ORIGIN, GUIDE_TEXT_FIELDS, validateNewGuide } from './desktop-guide-contract.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const SHA = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40}$/;
const EDITABLE = new Set(GUIDE_TEXT_FIELDS);
const ROOT = join(homedir(), 'Library/Application Support/GachiaCMS');
// The existing game configs use URL.pathname for tracing roots. Keep the frozen
// source outside Application Support so spaces cannot become literal "%20" paths.
const RUNS = join(homedir(), '.gachia-cms-releases');
const json = value => JSON.stringify(value, null, 2) + '\n';
const git = (repo, args) => execFileSync('git', args, { cwd: repo, maxBuffer: 64 * 1024 * 1024 });

function regular(file) {
  assert.equal(realpathSync(file), resolve(file), 'Symlink paths are forbidden');
  const stat = lstatSync(file);
  assert(stat.isFile() && stat.size <= 16 * 1024 * 1024, 'Expected a bounded regular file');
  return readFileSync(file);
}

export function validateGuideOverlay(originalText, candidateText, game = 'genshin') {
  const original = JSON.parse(originalText), candidate = JSON.parse(candidateText);
  assert(Array.isArray(original) && Array.isArray(candidate) && original.length <= candidate.length, 'Guide deletions require a separate contract');
  const identities = rows => {
    const seen = new Set();
    for (const row of rows) {
      assert(row && typeof row.id === 'string' && /^[a-z0-9-]+$/.test(row.id) && !seen.has(row.id), 'Invalid guide identity');
      seen.add(row.id);
    }
    return seen;
  };
  const oldIds = identities(original); identities(candidate);
  // Keep the legacy prefix and relative order of already accepted CMS additions.
  assert.deepEqual(candidate.filter(row => oldIds.has(row.id)).map(row => row.id), original.map(row => row.id), 'Guide identity/order/media/metadata must stay fixed');
  const changed = [], added = [], byId = new Map(original.map(row => [row.id, row]));
  let newSuffix = false, last = '';
  candidate.forEach((next, i) => {
    const row = byId.get(next.id);
    if (!row || row.cmsOrigin === CMS_GUIDE_ORIGIN) {
      validateNewGuide(next, game); newSuffix = true;
      assert(next.id > last, 'CMS guide suffix must have deterministic identity order'); last = next.id;
    } else assert(!newSuffix && original[i]?.id === next.id, 'Guide identity/order/media/metadata must stay fixed');
    if (!row) { added.push(next.id); changed.push(next.id); return; }
    const fixed = value => Object.fromEntries(Object.entries(value).filter(([key]) => !EDITABLE.has(key)));
    assert.deepEqual(fixed(next), fixed(row), 'Only existing guide text fields may change; identity/order/media/metadata must stay fixed');
    for (const field of EDITABLE) if (!Object.is(row[field], next[field])) {
      assert(typeof next[field] === 'string', 'Edited text must be a string; no deletion/null/object');
    }
    if (!Object.is(JSON.stringify(row), JSON.stringify(next))) {
      // JSON object key order alone is not a content change.
      if ([...EDITABLE].some(field => !Object.is(row[field], next[field]))) changed.push(row.id);
    }
  });
  return { original, candidate, changed, added };
}

export function inspectCandidate({ repo, directory, commit = 'HEAD' }) {
  const sourceCommit = git(repo, ['rev-parse', '--verify', `${commit}^{commit}`]).toString().trim();
  assert(COMMIT.test(sourceCommit), 'Exact source commit required');
  const manifestBytes = regular(join(directory, 'manifest.json'));
  const manifest = JSON.parse(manifestBytes);
  assert(['genshin', 'nte'].includes(manifest.game), 'Unsupported CMS content scope');
  const game = manifest.game, sourcePath = `packages/data/games/${game}/raw-guides.json`;
  const mirrorPath = `apps/web/public/data/${game}/raw-guides.json`;
  assert.equal(manifest.sourcePath, sourcePath, 'Unexpected source path');
  assert.equal(typeof manifest.preview, 'boolean', 'Explicit preview intent required');
  assert.equal(manifest.preparedOn, 'desktop');
  const source = git(repo, ['show', `${sourceCommit}:${sourcePath}`]);
  const mirror = git(repo, ['show', `${sourceCommit}:${mirrorPath}`]);
  assert(source.equals(mirror), 'Committed source/public mirror drift');
  assert.equal(hash(source), manifest.sourceSHA256, 'Candidate is stale against the selected source commit');
  const candidateBytes = regular(join(directory, 'raw-guides.json'));
  assert.equal(hash(candidateBytes), manifest.candidateSHA256, 'Candidate digest mismatch');
  const releaseKey = hash(JSON.stringify({ game, source: hash(source), candidate: hash(candidateBytes), preview: manifest.preview }));
  assert.equal(manifest.releaseKey, releaseKey, 'Release identity mismatch');
  const overlay = validateGuideOverlay(source.toString(), candidateBytes.toString(), game);
  if (overlay.added.length) {
    assert.equal(manifest.guideContract, 'additive-v1', 'Explicit additive guide contract required');
    assert.deepEqual(manifest.added, overlay.added, 'Added guide inventory mismatch');
  } else assert(!manifest.added?.length, 'Invented guide additions');
  assert.deepEqual([...manifest.changed].sort(), [...overlay.changed].sort(), 'Changed-record inventory mismatch');
  const ownership = JSON.parse(git(repo, ['show', `${sourceCommit}:packages/core/route-ownership.json`]));
  assert(ownership.games[game]?.pages.includes('guides') && ownership.games[game]?.details.includes('guides'), 'Guide routing contract changed');
  return { schemaVersion: 1, releaseKey, sourceCommit, game, preview: manifest.preview,
    candidateManifestSHA256: hash(manifestBytes), sourceSHA256: hash(source), candidateSHA256: hash(candidateBytes),
    changed: overlay.changed, ...(overlay.added.length ? { added: overlay.added, guideContract: 'additive-v1' } : {}), sourcePaths: [sourcePath, mirrorPath],
    // Main serves the public JSON even when the guide HTML belongs to the game Worker.
    owners: [game, 'main'], services: [`gachia-game-${game}`, 'gachia'],
    status: overlay.changed.length ? (manifest.preview ? 'preview_candidate' : 'editorial_candidate') : 'no_changes',
    productionReady: false, cloudWrites: false,
    pending: ['current old-asset provenance for BOTH owners', 'reviewed local cloud executor', 'exact cloud-version preview acceptance', 'fresh topology and promotion authorization'],
  };
}

function sourceEntries(repo, commit) {
  return git(repo, ['ls-tree', '-rz', commit]).toString().split('\0').filter(Boolean).map(entry => {
    const match = entry.match(/^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/s);
    assert(match, 'Source links/submodules are not supported by the local release snapshot');
    const relative = match[3];
    assert(!relative.startsWith('/') && relative.split('/').every(part => part && part !== '..' && part !== '.'), 'Unsafe source path');
    assert(!relative.split('/').some(part => ['.git', 'node_modules', '.env', '.env.local'].includes(part)), 'Private/runtime files cannot be source inputs');
    return relative;
  });
}

function sourceDigest(workspace, paths) {
  return hash(JSON.stringify(paths.map(relative => [relative, hash(regular(join(workspace, relative)))])));
}

export function prepareCandidate({ repo, directory, runs, commit = 'HEAD', preservedGuides }) {
  const plan = inspectCandidate({ repo, directory, commit });
  assert.notEqual(plan.status, 'no_changes', 'No content changes: do not build/upload an unchanged import');
  assert(!/[^A-Za-z0-9_./-]/.test(resolve(runs)), 'Current frozen game configs require a build directory without URL-encoded characters');
  const paths = sourceEntries(repo, plan.sourceCommit);
  const preserved = preservedGuides ? verifyPreservedGuides(preservedGuides, plan) : undefined;
  if (preserved) {
    const [source, mirror] = preserved.proof.paths.map(path => git(repo, ['show', `${plan.sourceCommit}:${path}`]));
    assert(source.equals(mirror), 'Non-target committed source/public mirror drift');
    validateGuideOverlay(source.toString(), preserved.body.toString(), preserved.proof.otherGame);
  }
  mkdirSync(runs, { recursive: true, mode: 0o700 });
  const runId = `${plan.releaseKey.slice(0, 16)}-${randomBytes(6).toString('hex')}`;
  const run = join(runs, runId), workspace = join(run, 'source');
  mkdirSync(run, { mode: 0o700 }); mkdirSync(workspace, { mode: 0o700 });
  git(repo, ['archive', '--format=tar', `--output=${join(run, 'source.tar')}`, plan.sourceCommit]);
  execFileSync('tar', ['-xf', join(run, 'source.tar'), '-C', workspace]);
  const content = regular(join(directory, 'raw-guides.json'));
  assert.equal(hash(content), plan.candidateSHA256, 'Candidate changed during preparation');
  for (const relative of plan.sourcePaths) writeFileSync(join(workspace, relative), content);
  if (preserved) for (const relative of preserved.proof.paths) writeFileSync(join(workspace, relative), preserved.body);
  const frozen = { ...plan, ...(preservedGuides ? { preservedGuides } : {}), runId, sourceFiles: paths, sourceTreeSHA256: sourceDigest(workspace, paths) };
  const text = json(frozen);
  writeFileSync(join(run, 'plan.json'), text, { flag: 'wx', mode: 0o600 });
  writeFileSync(join(run, 'state.json'), json({ status: 'prepared', owners: {}, cloudWrites: false }), { flag: 'wx', mode: 0o600 });
  return { runId, directory: run, planSHA256: hash(text), plan: frozen };
}

export function verifyPrepared(run, pin) {
  return withVerificationPass(() => verifiedInPass(verifyPrepared, JSON.stringify([resolve(run), pin]), () => readPrepared(run, pin)));
}

function readPrepared(run, pin) {
  assert(SHA.test(pin), 'External plan SHA-256 required');
  const bytes = regular(join(run, 'plan.json'));
  assert.equal(hash(bytes), pin, 'Plan changed');
  const plan = JSON.parse(bytes);
  assert.deepEqual(plan.owners, [plan.game, 'main'], 'Missing affected owner');
  const allowed = new Set(plan.sourceFiles);
  const walk = (relative = '') => {
    for (const entry of readdirSync(join(run, 'source', relative), { withFileTypes: true })) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory() && (entry.name === 'node_modules' ||
        /^(?:apps|packages)\/[^/]+\/(?:\.next|\.open-next|\.wrangler|\.turbo)$/.test(name))) continue;
      if (entry.isDirectory()) walk(name);
      else assert(allowed.has(name) || name.endsWith('.tsbuildinfo'), `Unexpected build input: ${name}`);
    }
  };
  walk();
  assert.equal(sourceDigest(join(run, 'source'), plan.sourceFiles), plan.sourceTreeSHA256, 'Frozen source changed');
  for (const relative of plan.sourcePaths) assert.equal(hash(regular(join(run, 'source', relative))), plan.candidateSHA256, 'Candidate/source binding lost');
  if (plan.preservedGuides) {
    const { proof, body } = verifyPreservedGuides(plan.preservedGuides, plan);
    for (const relative of proof.paths) assert(regular(join(run, 'source', relative)).equals(body), 'Non-target published guides were not preserved');
  }
  return plan;
}

export async function runOwnerStages(owners, execute, record) {
  for (const owner of owners) {
    await record(owner, 'running');
    try { await record(owner, 'built', await execute(owner)); }
    catch (error) { await record(owner, 'failed'); throw error; }
  }
}

export function isolatedEnvironment(home, extra = {}) {
  return { PATH: process.env.PATH, HOME: home, LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8',
    NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', WRANGLER_SEND_METRICS: 'false',
    CI: 'true', ...extra };
}

function command(file, args, { cwd, env, log }) {
  return new Promise((accept, reject) => {
    const child = spawn(file, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', chunk => appendFileSync(log, chunk));
    child.stderr.on('data', chunk => appendFileSync(log, chunk));
    child.once('error', reject);
    child.once('exit', code => code === 0 ? accept() : reject(new Error(`Local command failed (${code}); inspect ${log}`)));
  });
}

const runLockLeases = new WeakMap();

export function assertRunLock(run, lease) {
  assert(lease && runLockLeases.get(lease) === realpathSync(run), 'Live lock lease for this run required');
}

export async function withRunLock(run, execute) {
  const canonical = realpathSync(run), lease = Object.freeze({});
  const lock = join(run, 'operation.lock');
  writeFileSync(lock, json({ pid: process.pid, startedAt: new Date().toISOString() }), { flag: 'wx', mode: 0o600 });
  runLockLeases.set(lease, canonical);
  try { return await execute(lease); } finally { runLockLeases.delete(lease); unlinkSync(lock); }
}

export async function buildCandidate(run, pin) {
  return withRunLock(run, () => buildUnlocked(run, pin));
}

async function buildUnlocked(run, pin) {
  const plan = verifyPrepared(run, pin), workspace = join(run, 'source');
  const state = JSON.parse(regular(join(run, 'state.json')));
  assert.equal(state.status, 'prepared', 'No automatic retry/overwrite of a started release run');
  const save = () => { writeFileSync(join(run, 'state.json.tmp'), json(state), { mode: 0o600 }); renameSync(join(run, 'state.json.tmp'), join(run, 'state.json')); };
  state.status = 'building'; save();
  const home = join(run, 'home'); mkdirSync(home, { mode: 0o700 });
  const env = isolatedEnvironment(home);
  try {
    const store = execFileSync('pnpm', ['store', 'path'], { encoding: 'utf8' }).trim();
    await command('pnpm', ['install', '--frozen-lockfile', '--offline', '--ignore-scripts', '--prod=false', '--store-dir', store],
      { cwd: workspace, env, log: join(run, 'install.log') });
    await runOwnerStages(plan.owners, async owner => {
      verifyPrepared(run, pin);
      const app = owner === 'main' ? 'web' : `game-${owner}`, cwd = join(workspace, 'apps', app);
      const mode = owner === 'nte' ? 'live' : 'production';
      const buildEnv = { ...env, ...(owner === 'main' ? {} : { [`${owner.toUpperCase()}_DEPLOYMENT_MODE`]: mode }),
        CLOUDFLARE_ENV: '', SKIP_NEXT_APP_BUILD: 'false', SKIP_WRANGLER_CONFIG_CHECK: 'false' };
      const log = join(run, `${owner}-build.log`);
      await command(process.execPath, [join(workspace, 'scripts/require-app-runtime.mjs')], { cwd, env: buildEnv, log });
      await command('pnpm', ['exec', 'opennextjs-cloudflare', 'build', '--config', 'wrangler.jsonc', '--env', ''], { cwd, env: buildEnv, log });
      if (owner !== 'main') await command(process.execPath, [join(workspace, 'scripts/game-release.mjs'), 'prepare-assets', '--game', owner, '--environment', 'production'], { cwd, env: buildEnv, log });
      verifyPrepared(run, pin);
      const artifact = join(cwd, '.open-next');
      const portability = verifyWorkerArtifact(artifact);
      if (owner === 'main') assert.equal(hash(regular(join(artifact, 'assets', `data/${plan.game}/raw-guides.json`))), plan.candidateSHA256, 'Main public data is not the candidate');
      const seal = join(run, 'artifacts', owner); mkdirSync(dirname(seal), { recursive: true, mode: 0o700 });
      cpSync(artifact, seal, { recursive: true, verbatimSymlinks: true, errorOnExist: true, force: false });
      const inventory = artifactFiles(seal);
      writeFileSync(join(run, `${owner}-artifact.json`), json(inventory), { flag: 'wx', mode: 0o600 });
      return { portability, artifactSHA256: hash(json(inventory)), releaseKey: plan.releaseKey, previewOnly: true };
    }, async (owner, status, result) => {
      state.owners[owner] = { status, ...(result ?? {}) }; save();
      appendFileSync(join(run, 'events.jsonl'), JSON.stringify({ at: new Date().toISOString(), owner, status }) + '\n');
    });
    state.status = 'built_local_only'; save();
    return state;
  } catch (error) { state.status = 'failed'; state.error = error.message; save(); throw error; }
}

export function artifactFiles(root) {
  return verifiedInPass(artifactFiles, resolve(root), () => readArtifactFiles(root));
}

function readArtifactFiles(root) {
  verifyWorkerArtifact(root);
  const files = [];
  const walk = (relative = '') => {
    for (const entry of readdirSync(join(root, relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) { files.push({ path: name, type: 'directory' }); walk(name); }
      else if (entry.isSymbolicLink()) files.push({ path: name, type: 'link', target: readlinkSync(join(root, name)) });
      else files.push({ path: name, type: 'file', sha256: hash(readFileSync(join(root, name))) });
    }
  };
  walk(); return files;
}

export function verifyBuilt(run, pin) {
  const plan = verifyPrepared(run, pin);
  const state = JSON.parse(regular(join(run, 'state.json')));
  assert.equal(state.status, 'built_local_only', 'Both owners must finish before preview');
  for (const owner of plan.owners) {
    assert.equal(state.owners[owner]?.status, 'built', 'Missing owner build');
    assert.equal(state.owners[owner].releaseKey, plan.releaseKey, 'Owner release identity mismatch');
    const manifest = regular(join(run, `${owner}-artifact.json`));
    assert.equal(hash(manifest), state.owners[owner].artifactSHA256, 'Artifact inventory changed');
    assert.deepEqual(artifactFiles(join(run, 'artifacts', owner)), JSON.parse(manifest), 'Artifact tree changed');
  }
  if (plan.preservedGuides) {
    const { proof } = verifyPreservedGuides(plan.preservedGuides, plan);
    assert.equal(hash(regular(join(run, 'artifacts/main/assets/data', proof.otherGame, 'raw-guides.json'))), proof.sha256, 'Built Main lost non-target published guides');
  }
  return plan;
}

export function localAssetPath(root, urlPath) {
  assert(urlPath.startsWith('/') && !urlPath.startsWith('//'), 'Expected a local asset URL');
  const parts = urlPath.slice(1).split('/').map(part => decodeURIComponent(part));
  assert(parts.every(part => part && part !== '.' && part !== '..' && !/[\\/\x00-\x1f]/.test(part)), 'Unsafe decoded asset path');
  return join(root, ...parts);
}

export async function withLocalWorker(cwd, config, home, log, accept) {
  const child = spawn('pnpm', ['exec', 'wrangler', 'dev', '--local', '--ip', '127.0.0.1', '--port', '0', '--inspector-port', '0', '--env', '', '--config', config],
    { cwd, env: isolatedEnvironment(home), stdio: ['ignore', 'pipe', 'pipe'], detached: true });
  let timer;
  try {
    const origin = await new Promise((yes, no) => {
      let output = '';
      timer = setTimeout(() => no(Error('Loopback Worker readiness timed out')), 90000);
      const collect = chunk => {
        appendFileSync(log, chunk);
        output = (output + chunk.toString()).slice(-32768);
        const match = output.match(/Ready on (http:\/\/127\.0\.0\.1:\d+)/);
        if (match) yes(match[1]);
      };
      child.stdout.on('data', collect); child.stderr.on('data', collect);
      child.once('error', no); child.once('exit', code => no(Error(`Loopback Worker exited (${code})`)));
    });
    clearTimeout(timer);
    return await accept(origin);
  } finally {
    clearTimeout(timer);
    if (child.pid && child.exitCode === null && child.signalCode === null) {
      const exited = new Promise(done => child.once('exit', done));
      try { process.kill(-child.pid, 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
      const kill = setTimeout(() => { try { process.kill(-child.pid, 'SIGKILL'); } catch {} }, 5000);
      await exited; clearTimeout(kill);
    }
  }
}

export async function previewCandidate(run, pin, retained) {
  return withRunLock(run, () => previewUnlocked(run, pin, retained));
}

async function previewUnlocked(run, pin, retained) {
  const plan = verifyBuilt(run, pin), workspace = join(run, 'source');
  const assetsModule = retained ? await import('./desktop-release-assets.mjs') : null;
  const retainedSet = retained ? assetsModule.verifyRetainedCandidate(run, pin, retained.id, retained.pin) : null;
  const directory = join(run, `preview-${randomBytes(6).toString('hex')}`);
  mkdirSync(directory, { mode: 0o700 });
  const report = { releaseKey: plan.releaseKey, status: 'running', scope: 'isolated real Worker HTTP; not cloud-version or production acceptance', owners: {}, cloudWrites: false };
  if (retainedSet) report.retained = { id: retained.id, pin: retained.pin };
  const { parseWrangler } = await import(pathToFileURL(join(workspace, 'scripts/game-release.mjs')));
  const candidate = JSON.parse(regular(join(workspace, plan.sourcePaths[0])));
  try {
    await runOwnerStages(plan.owners, async owner => {
      const app = owner === 'main' ? 'web' : `game-${owner}`, artifact = retainedSet ? join(retainedSet.directory, owner, '.open-next') : join(run, 'artifacts', owner);
      const original = parseWrangler(readFileSync(join(workspace, 'apps', app, 'wrangler.jsonc'), 'utf8'));
      // Never carry live IDs, service references, routes, triggers or credentials
      // into the rehearsal config. Any storage here is disposable local storage.
      const config = { name: `cms-local-${owner}`, main: join(artifact, 'worker.js'),
        assets: { directory: join(artifact, 'assets'), binding: 'ASSETS' },
        compatibility_date: original.compatibility_date, compatibility_flags: original.compatibility_flags,
        vars: { ...original.vars }, ...(owner === 'main' ? {
          d1_databases: [{ binding: 'DB', database_name: 'cms-local-only', database_id: '00000000-0000-0000-0000-000000000000' }],
          r2_buckets: [{ binding: 'IMAGES', bucket_name: 'cms-local-only' }],
        } : {}) };
      const configPath = join(directory, `${owner}.json`);
      writeFileSync(configPath, json(config), { mode: 0o600 });
      return withLocalWorker(join(workspace, 'apps', app), configPath, join(run, 'home'), join(directory, `${owner}.log`), async origin => {
        const observations = [];
        report.owners[owner].observations = observations;
        const get = async (path, expected = 200) => {
          const response = await fetch(new URL(path, origin), { redirect: 'manual', signal: AbortSignal.timeout(30000) });
          const bytes = Buffer.from(await response.arrayBuffer());
          const index = observations.length;
          writeFileSync(join(directory, `${owner}-${index}.body`), bytes, { mode: 0o600 });
          observations.push({ path, status: response.status, headers: Object.fromEntries(response.headers), sha256: hash(bytes), bytes: bytes.length, bodyFile: `${owner}-${index}.body` });
          assert.equal(response.status, expected, `${owner} ${path}: unexpected status`);
          return bytes;
        };
        if (owner === 'main') {
          assert.equal(hash(await get(`/data/${plan.game}/raw-guides.json`)), plan.candidateSHA256, 'Main HTTP mirror is not the CMS candidate');
          await get('/sitemap.xml');
          const disabled = JSON.parse((await get('/api/auth/get-session', 404)).toString());
          assert.equal(disabled.code, 'ACCOUNT_FEATURES_DISABLED');
          assert.match(observations.at(-1).headers['cache-control'] ?? '', /no-store/);
        } else {
          const xml = (await get('/sitemap.xml')).toString();
          assert.match(xml, /https:\/\/gachia\.com\//);
          await get('/robots.txt');
          for (const id of plan.changed) {
            const row = candidate.find(item => item.id === id);
            const page = (await get(`/zh/${plan.game}/guides/${id}`)).toString();
            const escaped = row.title.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;');
            assert(page.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1].includes(escaped), 'CMS title missing from rendered heading');
            assert(page.includes(`<link rel="canonical" href="https://gachia.com/zh/${plan.game}/guides/${id}"`), 'Canonical changed');
            const jsonld = [...page.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
            assert(jsonld.length > 0, 'Missing JSON-LD');
            jsonld.forEach(match => JSON.parse(match[1]));
            if (plan.added?.includes(id)) {
              assert(xml.includes(`<loc>https://gachia.com/zh/${plan.game}/guides/${id}</loc>`), 'New Chinese guide missing from sitemap');
              for (const locale of ['zh', 'en', 'ja']) {
                const list = (await get(`/${locale}/${plan.game}/guides`)).toString();
                assert(list.includes(`href="/${locale}/${plan.game}/guides/${id}"`), 'New guide missing from guide list');
                if (locale !== 'zh') {
                  const fallback = (await get(`/${locale}/${plan.game}/guides/${id}`)).toString();
                  assert.match(fallback, /<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/, 'Incomplete translation must be noindex');
                  assert(fallback.includes('data-guide-fallback') && fallback.includes(escaped), 'Missing readable source-language fallback');
                  assert(!xml.includes(`<loc>https://gachia.com/${locale}/${plan.game}/guides/${id}</loc>`), 'Incomplete translation leaked into sitemap');
                }
              }
            }
            const assets = [...new Set([...page.matchAll(/(?:src|href)="([^"?]+\.(?:js|css))(?:\?[^"]*)?"/g)].map(match => match[1]))].filter(value => value.startsWith('/'));
            assert(assets.length > 0, 'Missing rendered static assets');
            for (const asset of assets) {
              const bytes = await get(asset);
              assert.equal(hash(bytes), hash(regular(localAssetPath(join(artifact, 'assets'), asset))), 'Rendered asset bytes differ from the built artifact');
            }
          }
        }
        if (retainedSet) {
          const { evidence, capture } = assetsModule.verifyAssetEvidence(retainedSet.receipt.evidencePath, retainedSet.receipt.evidencePin, plan.game);
          const files = owner === 'main' ? evidence.main.files : capture.files;
          const prefixes = owner === 'main' ? ['/_next/static/'] : ['/_next/static/', `/_games/${owner}/_next/static/`];
          for (const file of files) for (const prefix of prefixes) {
            const path = prefix + file.path.split('/').map(encodeURIComponent).join('/');
            assert.equal(hash(await get(path)), file.sha256, 'Retained historical HTTP bytes differ');
          }
        }
        return { releaseKey: plan.releaseKey, observations };
      });
    }, async (owner, status, result) => {
      report.owners[owner] = { ...report.owners[owner], status: status === 'built' ? 'passed' : status, ...(result ?? {}) };
      writeFileSync(join(directory, 'result.json'), json(report), { mode: 0o600 });
    });
    verifyBuilt(run, pin);
    if (retainedSet) assetsModule.verifyRetainedCandidate(run, pin, retained.id, retained.pin);
    report.status = 'passed';
  } catch (error) { report.status = 'failed'; report.error = error.message; throw error; }
  finally { writeFileSync(join(directory, 'result.json'), json(report), { mode: 0o600 }); }
  return { directory, ...report };
}

const renewalArgs = ['--recovery', '--recovery-pin', '--journal-pin', '--receipt-pin', '--release-key'];
export const maintenanceActions = {
  'prepare-evidence': ['--repo'],
  'source-rebind': ['--source', '--source-pin', '--main-source', '--main-source-pin'],
  'source-advance': ['--repo', '--bundle', '--bundle-pin', '--promotion-journal-pin'],
  'source-recover': ['--repo', ...renewalArgs, '--renewal', '--renewal-pin', '--promotion-journal-pin', '--recovery-journal-pin'],
  'source-register': ['--retention', '--retention-pin', '--evidence', '--evidence-pin'],
  'source-select': [],
  'assets-refresh': ['--evidence', '--evidence-pin'],
  'recovery-local-prepare': ['--retention', '--retention-pin', '--baseline', '--baseline-pin', '--source', '--source-pin'],
  'baseline-capture': ['--repo', '--retention', '--retention-pin'],
  'baseline-bind': ['--retention', '--retention-pin', '--evidence', '--evidence-pin', '--baseline', '--baseline-pin'],
  'evidence-renew': [...renewalArgs, '--mode'],
  'cloud-promote-renewed': [...renewalArgs, '--renewal', '--renewal-pin'],
  'manual-recover': [...renewalArgs, '--renewal', '--renewal-pin', '--promotion-journal-pin'],
};

export const maintenanceArgumentKeys = action => [...(action === 'source-rebind' ? [] : ['--run', '--pin']), ...maintenanceActions[action]];

export function options(args) {
  const [action, ...rest] = args;
  if (action === 'project-inventory') { assert.equal(rest.length, 0, 'Project inventory accepts no targets/options'); return { action }; }
  if (Object.hasOwn(maintenanceActions, action)) {
    const expected = maintenanceArgumentKeys(action), result = { action };
    for (let i = 0; i < rest.length; i += 2) {
      const key = rest[i], value = rest[i + 1];
      assert(expected.includes(key) && value && !value.startsWith('-') && !Object.hasOwn(result, key), 'Unknown/duplicate/missing option');
      result[key] = value;
    }
    assert(expected.every(key => result[key]), 'Required arguments missing');
    if (result['--run']) assert(/^[a-f0-9]{16}-[a-f0-9]{12}$/.test(result['--run']), 'Invalid local run ID');
    for (const key of expected) {
      if (key.endsWith('-pin') || key === '--pin' || key === '--release-key') assert(SHA.test(result[key]), 'Invalid SHA-256 argument');
      if (['--recovery', '--retention', '--renewal', '--bundle'].includes(key)) assert(/^[a-f0-9]{16}$/.test(result[key]), 'Invalid evidence ID');
    }
    if (result['--mode']) assert(['promote', 'recover'].includes(result['--mode']), 'Invalid renewal mode');
    return result;
  }
  assert(['inspect', 'prepare', 'build', 'verify', 'preview', 'retain', 'verify-retained', 'preview-retained', 'cloud-check', 'cloud-prepare', 'cloud-verify', 'cloud-upload-preview', 'cloud-reconcile', 'recovery-check', 'promotion-check', 'recovery-prepare-cloud', 'recovery-verify-cloud', 'recovery-upload-preview', 'recovery-receipt-check', 'cloud-promote'].includes(action), 'Only reviewed desktop actions are available; raw production promotion remains blocked');
  const result = { action };
  for (let i = 0; i < rest.length; i += 2) {
    const key = rest[i], value = rest[i + 1];
    assert(['--repo', '--release-key', '--commit', '--run', '--pin', '--evidence', '--evidence-pin', '--retention', '--retention-pin', '--bundle', '--bundle-pin', '--journal-pin', '--recovery', '--recovery-pin', '--receipt-pin'].includes(key) && value && !value.startsWith('-') && !Object.hasOwn(result, key), 'Unknown/duplicate/missing option');
    result[key] = value;
  }
  const expected = ['inspect', 'prepare'].includes(action) ? ['--repo', '--release-key'] : ['--run', '--pin'];
  if (['retain', 'recovery-check', 'promotion-check', 'recovery-prepare-cloud'].includes(action)) expected.push('--evidence', '--evidence-pin');
  if (action.endsWith('-retained') || ['cloud-check', 'cloud-prepare', 'recovery-check'].includes(action)) expected.push('--retention', '--retention-pin');
  if (['cloud-verify', 'cloud-upload-preview', 'cloud-reconcile', 'promotion-check', 'recovery-prepare-cloud'].includes(action)) expected.push('--bundle', '--bundle-pin');
  if (['recovery-verify-cloud', 'recovery-upload-preview', 'recovery-receipt-check', 'cloud-promote'].includes(action)) expected.push('--recovery', '--recovery-pin');
  if (['promotion-check', 'cloud-promote'].includes(action)) expected.push('--journal-pin');
  if (['cloud-upload-preview', 'recovery-upload-preview', 'recovery-receipt-check', 'cloud-promote'].includes(action)) expected.push('--release-key');
  if (['recovery-receipt-check', 'cloud-promote'].includes(action)) expected.push('--receipt-pin');
  assert(expected.every(key => result[key]), 'Required arguments missing');
  assert(Object.keys(result).every(key => key === 'action' || expected.includes(key) || (key === '--commit' && expected.includes('--repo'))), 'Unexpected option for action');
  if (result['--commit']) assert(COMMIT.test(result['--commit']), 'Use an exact commit hash');
  return result;
}

async function main() {
  const opts = options(process.argv.slice(2));
  assert(process.platform === 'darwin' && !process.env.CI && !process.env.GITHUB_ACTIONS, 'Only the installed Mac may prepare releases');
  assert(existsSync(join(ROOT, 'settings.json')), 'Install the desktop CMS first');
  const { readRetryFetch } = await import('./desktop-version-preview.mjs');
  globalThis.fetch = readRetryFetch(globalThis.fetch);
  if (opts.action === 'project-inventory') {
    const { preparationReader } = await import('./desktop-local-evidence.mjs');
    const token = readFileSync(join(homedir(), '.wrangler/config/default.toml'), 'utf8').match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
    console.log(json(await preparationReader(token).project()));
  } else if (opts.action === 'source-rebind') {
    const { preparationReader } = await import('./desktop-local-evidence.mjs');
    const { rebindSourceCatalog } = await import('./desktop-source-rebind.mjs');
    const token = readFileSync(join(homedir(), '.wrangler/config/default.toml'), 'utf8').match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
    console.log(json(await rebindSourceCatalog({ input: { source: { path: resolve(opts['--source']), pin: opts['--source-pin'] },
      mainSource: { path: resolve(opts['--main-source']), pin: opts['--main-source-pin'] } }, root: join(RUNS, 'source-catalog'),
      directory: join(RUNS, `source-rebind-${randomBytes(8).toString('hex')}`), reader: preparationReader(token) })));
  } else if (['inspect', 'prepare'].includes(opts.action)) {
    assert(SHA.test(opts['--release-key']), 'Invalid release key');
    const input = { repo: resolve(opts['--repo']), directory: join(ROOT, 'publish', opts['--release-key']), commit: opts['--commit'] ?? 'HEAD' };
    if (opts.action === 'inspect') console.log(json(inspectCandidate(input)));
    else {
      const { preparePublishedCandidate } = await import('./desktop-source-catalog.mjs');
      const { preparationReader } = await import('./desktop-local-evidence.mjs');
      const token = readFileSync(join(homedir(), '.wrangler/config/default.toml'), 'utf8').match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
      const prepared = await preparePublishedCandidate({ ...input, runs: RUNS, root: join(RUNS, 'source-catalog'),
        evidenceDirectory: join(RUNS, `source-inputs-${randomBytes(8).toString('hex')}`), reader: preparationReader(token) });
      const { plan, ...summary } = prepared;
      console.log(json({ ...summary, releaseKey: plan.releaseKey, owners: plan.owners, cloudWrites: false }));
    }
  } else {
    assert(/^[a-f0-9]{16}-[a-f0-9]{12}$/.test(opts['--run']), 'Invalid local run ID');
    const run = join(RUNS, opts['--run']);
    if (opts.action === 'prepare-evidence') {
      const { prepareEvidence } = await import('./desktop-evidence-preparation.mjs');
      const { preparationReader } = await import('./desktop-local-evidence.mjs');
      const token = readFileSync(join(homedir(), '.wrangler/config/default.toml'), 'utf8').match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
      console.log(json(await prepareEvidence({ run, pin: opts['--pin'], repo: resolve(opts['--repo']),
        root: join(RUNS, 'source-catalog'), reader: preparationReader(token) })));
    } else if (['source-advance', 'source-recover'].includes(opts.action)) {
      await withRunLock(run, async () => {
        const { advanceSourceCatalog, recoverSourceCatalog } = await import('./desktop-source-advance.mjs');
        const { preparationReader } = await import('./desktop-local-evidence.mjs');
        const token = readFileSync(join(homedir(), '.wrangler/config/default.toml'), 'utf8').match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
        const input = { run, pin: opts['--pin'], promotionJournalPin: opts['--promotion-journal-pin'], repo: resolve(opts['--repo']),
          ...(opts.action === 'source-advance' ? { id: opts['--bundle'], bundlePin: opts['--bundle-pin'] } : {
            recoveryId: opts['--recovery'], recoveryBundlePin: opts['--recovery-pin'], journalPin: opts['--journal-pin'], receiptPin: opts['--receipt-pin'], releaseKey: opts['--release-key'],
            renewalId: opts['--renewal'], renewalPin: opts['--renewal-pin'], recoveryJournalPin: opts['--recovery-journal-pin'] }) };
        console.log(json(await (opts.action === 'source-advance' ? advanceSourceCatalog : recoverSourceCatalog)({ input, root: join(RUNS, 'source-catalog'),
          directory: join(run, `${opts.action}-${randomBytes(8).toString('hex')}`), reader: preparationReader(token) })));
      });
    } else if (['source-register', 'source-select'].includes(opts.action)) {
      await withRunLock(run, async () => {
        const { preparationReader } = await import('./desktop-local-evidence.mjs');
        const { registerSourceCatalog, selectSourceCatalog } = await import('./desktop-source-catalog.mjs');
        const token = readFileSync(join(homedir(), '.wrangler/config/default.toml'), 'utf8').match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
        const reader = preparationReader(token), root = join(RUNS, 'source-catalog');
        const directory = join(run, `${opts.action}-${randomBytes(8).toString('hex')}`);
        if (opts.action === 'source-register') {
          const { verifyRetainedCandidate } = await import('./desktop-release-assets.mjs');
          const check = () => ({ ...verifyRetainedCandidate(run, opts['--pin'], opts['--retention'], opts['--retention-pin']), retentionPin: opts['--retention-pin'] });
          const result = await registerSourceCatalog({ root, directory, verified: check(), reader,
            recovery: { path: resolve(opts['--evidence']), pin: opts['--evidence-pin'] } });
          check(); console.log(json(result));
        } else {
          const plan = verifyPrepared(run, opts['--pin']);
          const result = await selectSourceCatalog({ root, directory, plan, reader });
          verifyPrepared(run, opts['--pin']); console.log(json(result));
        }
      });
    } else if (['assets-refresh', 'recovery-local-prepare'].includes(opts.action)) {
      await withRunLock(run, async () => {
        const { preparationReader, refreshAssetEvidence, prepareLocalRecovery } = await import('./desktop-local-evidence.mjs');
        const token = readFileSync(join(homedir(), '.wrangler/config/default.toml'), 'utf8').match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
        const reader = preparationReader(token);
        const directory = join(run, `${opts.action}-${randomBytes(8).toString('hex')}`);
        if (opts.action === 'assets-refresh') {
          const plan = verifyBuilt(run, opts['--pin']);
          const result = await refreshAssetEvidence({ plan, evidencePath: resolve(opts['--evidence']), evidencePin: opts['--evidence-pin'], directory, reader });
          verifyBuilt(run, opts['--pin']); console.log(json(result));
        } else {
          const { verifyRetainedCandidate } = await import('./desktop-release-assets.mjs');
          const check = () => ({ ...verifyRetainedCandidate(run, opts['--pin'], opts['--retention'], opts['--retention-pin']), retentionPin: opts['--retention-pin'] });
          const result = await prepareLocalRecovery({ run, verified: check(), baselinePath: resolve(opts['--baseline']), baselinePin: opts['--baseline-pin'],
            sourcePath: resolve(opts['--source']), sourcePin: opts['--source-pin'], directory, reader });
          check(); console.log(json(result));
        }
      });
    } else if (['baseline-capture', 'baseline-bind'].includes(opts.action)) {
      await withRunLock(run, async () => {
        const { verifyRetainedCandidate } = await import('./desktop-release-assets.mjs');
        const verified = { ...verifyRetainedCandidate(run, opts['--pin'], opts['--retention'], opts['--retention-pin']), retentionPin: opts['--retention-pin'] };
        const { capturePublishedBaseline, bindPublishedBaseline, verifyPublishedBaseline } = await import('./desktop-published-baseline.mjs');
        if (opts.action === 'baseline-bind') {
          console.log(json(await bindPublishedBaseline({ evidencePath: resolve(opts['--evidence']), evidencePin: opts['--evidence-pin'],
            baselinePath: resolve(opts['--baseline']), baselinePin: opts['--baseline-pin'], verified,
            destination: join(run, `bound-recovery-${randomBytes(8).toString('hex')}.json`) })));
        } else {
          const { desktopCloudSnapshot } = await import('./desktop-cloud-release.mjs');
          const token = readFileSync(join(homedir(), '.wrangler/config/default.toml'), 'utf8').match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
          assert(COMMIT.test(verified.plan.sourceCommit));
          const captured = await capturePublishedBaseline({ plan: verified.plan,
            importBytes: git(resolve(opts['--repo']), ['show', `${verified.plan.sourceCommit}:packages/data/games/${verified.plan.game}/raw-guides.json`]),
            directory: join(run, `published-baseline-${randomBytes(8).toString('hex')}`), observe: () => desktopCloudSnapshot(token), request: fetch });
          verifyPublishedBaseline(captured.baselinePath, captured.baselinePin, verified.plan,
            Object.fromEntries(verified.plan.owners.map(owner => [owner, verified.receipt.owners[owner].previousVersion])));
          console.log(json({ ...captured, cloudWrites: false }));
        }
      });
    } else if (['evidence-renew', 'cloud-promote-renewed', 'manual-recover'].includes(opts.action)) {
      const input = { run, pin: opts['--pin'], recoveryId: opts['--recovery'], recoveryBundlePin: opts['--recovery-pin'],
        journalPin: opts['--journal-pin'], receiptPin: opts['--receipt-pin'], releaseKey: opts['--release-key'],
        renewalId: opts['--renewal'], renewalPin: opts['--renewal-pin'], mode: opts['--mode'], promotionJournalPin: opts['--promotion-journal-pin'],
        token: readFileSync(join(homedir(), '.wrangler/config/default.toml'), 'utf8').match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1] };
      if (opts.action === 'evidence-renew') {
        const { renewDesktopEvidence } = await import('./desktop-evidence-renewal.mjs'); console.log(json(await renewDesktopEvidence(input)));
      } else if (opts.action === 'manual-recover') {
        const { recoverDesktopRelease } = await import('./desktop-manual-recovery.mjs'); console.log(json(await recoverDesktopRelease(input)));
      } else {
        const { promoteDesktopRelease } = await import('./desktop-promotion-transport.mjs'); console.log(json(await promoteDesktopRelease(input)));
      }
    } else if (['recovery-upload-preview', 'recovery-receipt-check', 'cloud-promote'].includes(opts.action)) {
      const input = { run, pin: opts['--pin'], recoveryId: opts['--recovery'], recoveryBundlePin: opts['--recovery-pin'],
        releaseKey: opts['--release-key'], receiptPin: opts['--receipt-pin'], journalPin: opts['--journal-pin'] };
      if (opts.action === 'recovery-receipt-check') {
        const { verifyRecoveryReceipt } = await import('./desktop-recovery-receipt.mjs');
        const checked = verifyRecoveryReceipt(input);
        console.log(json({ status: checked.receipt.status, releaseKey: checked.receipt.releaseKey, recoveryPin: checked.recoveryPin, cloudWrites: false, productionAuthorized: false }));
      } else {
        input.token = readFileSync(join(homedir(), '.wrangler/config/default.toml'), 'utf8').match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
        if (opts.action === 'recovery-upload-preview') {
          const { uploadRecoveryPreview } = await import('./desktop-cloud-transport.mjs');
          console.log(json(await uploadRecoveryPreview(input)));
        } else {
          const { promoteDesktopRelease } = await import('./desktop-promotion-transport.mjs');
          console.log(json(await promoteDesktopRelease(input)));
        }
      }
    } else if (['recovery-prepare-cloud', 'recovery-verify-cloud'].includes(opts.action)) {
      const { prepareRecoveryCloud, verifyRecoveryCloud } = await import('./desktop-recovery-cloud.mjs');
      if (opts.action === 'recovery-prepare-cloud') {
        const { desktopCloudSnapshot } = await import('./desktop-cloud-release.mjs');
        const token = readFileSync(join(homedir(), '.wrangler/config/default.toml'), 'utf8').match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
        const snapshot = await desktopCloudSnapshot(token);
        console.log(json(await prepareRecoveryCloud({ run, pin: opts['--pin'], id: opts['--bundle'], bundlePin: opts['--bundle-pin'], evidencePath: resolve(opts['--evidence']), evidencePin: opts['--evidence-pin'], snapshot })));
      } else {
        const verified = verifyRecoveryCloud({ run, pin: opts['--pin'], recoveryId: opts['--recovery'], recoveryBundlePin: opts['--recovery-pin'] });
        console.log(json({ status: 'sealed_local_recovery_verified', releaseKey: verified.manifest.releaseKey, owners: verified.manifest.owners, cloudWrites: false, cloudRecoveryAccepted: false, productionReady: false }));
      }
    } else if (['cloud-reconcile', 'recovery-check', 'promotion-check'].includes(opts.action)) {
      await withRunLock(run, async () => {
        const { readReleaseJournal, reconcileJournal, acceptedPreviewJournal, verifySavedPreview, verifyRecoveryCompatibility, saveReadiness } = await import('./desktop-release-readiness.mjs');
        const { verifyRetainedCandidate, pinnedJson } = await import('./desktop-release-assets.mjs');
        let result;
        if (opts.action === 'recovery-check') {
          const verified = verifyRetainedCandidate(run, opts['--pin'], opts['--retention'], opts['--retention-pin']);
          result = verifyRecoveryCompatibility(resolve(opts['--evidence']), opts['--evidence-pin'], { ...verified, retentionPin: opts['--retention-pin'] });
        } else {
          const { verifyCloudBundle } = await import('./desktop-cloud-transport.mjs');
          const verified = verifyCloudBundle({ run, pin: opts['--pin'], id: opts['--bundle'], bundlePin: opts['--bundle-pin'] });
          const { plan, manifest } = verified;
          const identity = { releaseKey: plan.releaseKey, planSHA256: opts['--pin'], retentionId: manifest.retentionId, retentionPin: manifest.retentionPin };
          const journalPath = join(run, `cloud-${manifest.retentionId}.jsonl`);
          if (opts.action === 'cloud-reconcile') {
            const { desktopCloudSnapshot, assertTopology, reconcileRelease } = await import('./desktop-cloud-release.mjs');
            const token = readFileSync(join(homedir(), '.wrangler/config/default.toml'), 'utf8').match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
            const current = await desktopCloudSnapshot(token, fetch, { allowSplit: true });
            const journals = [];
            for (const [path, keys] of [[journalPath, identity], [join(run, `promotion-${manifest.retentionId}.jsonl`), { releaseKey: plan.releaseKey }]]) {
              if (!existsSync(path)) continue;
              const journal = readReleaseJournal(path, keys); assertTopology(manifest.snapshot, journal.rows[0].baseline);
              journals.push({ path, ...reconcileJournal(journal, current) });
            }
            result = { status: 'read_only_reconciliation', noJournal: journals.length === 0, journals, baselineComparison: reconcileRelease(manifest.snapshot, current), current, cloudWrites: false, promotionAuthorized: false };
          } else {
            assert.equal(plan.preview, false, 'Rehearsal candidates cannot continue to promotion');
            const journal = readReleaseJournal(journalPath, identity, opts['--journal-pin']);
            const accepted = acceptedPreviewJournal(journal, verified), proofs = [];
            for (const owner of plan.owners) {
              const record = manifest.owners[owner], references = pinnedJson(join(verified.directory, owner, 'references.json'), record.referencesSHA256);
              proofs.push(verifySavedPreview(join(run, `cloud-preview-${manifest.id}`, `${owner}-http`), accepted[record.service], references));
            }
            const retained = verifyRetainedCandidate(run, opts['--pin'], manifest.retentionId, manifest.retentionPin);
            const recovery = verifyRecoveryCompatibility(resolve(opts['--evidence']), opts['--evidence-pin'], { ...retained, retentionPin: manifest.retentionPin });
            result = { status: 'local_continuation_evidence_verified', proofs, recovery, productionReady: false, cloudWrites: false, blockers: ['exact_cloud_recovery_preview_required', 'production_promotion_transport_not_registered', 'fresh_remote_version_and_topology_recheck_required'] };
          }
        }
        result = { schemaVersion: 1, runId: opts['--run'], planSHA256: opts['--pin'], checkedAt: new Date().toISOString(), ...result };
        const path = join(run, `${opts.action}-${randomBytes(6).toString('hex')}.json`);
        console.log(json(saveReadiness(path, result)));
      });
    } else if (['cloud-prepare', 'cloud-verify', 'cloud-upload-preview'].includes(opts.action)) {
      const { prepareCloudBundle, verifyCloudBundle, uploadCloudPreview } = await import('./desktop-cloud-transport.mjs');
      const input = { run, pin: opts['--pin'], id: opts['--bundle'], bundlePin: opts['--bundle-pin'] };
      const credential = () => readFileSync(join(homedir(), '.wrangler/config/default.toml'), 'utf8').match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
      if (opts.action === 'cloud-prepare') {
        const { desktopCloudSnapshot } = await import('./desktop-cloud-release.mjs');
        const snapshot = await desktopCloudSnapshot(credential());
        console.log(json(await prepareCloudBundle({ ...input, retentionId: opts['--retention'], retentionPin: opts['--retention-pin'], snapshot })));
      } else if (opts.action === 'cloud-verify') {
        const verified = verifyCloudBundle(input);
        console.log(json({ status: 'sealed_cloud_bundle_verified', releaseKey: verified.plan.releaseKey, owners: verified.manifest.owners, cloudWrites: false, productionReady: false }));
      } else console.log(json(await uploadCloudPreview({ ...input, releaseKey: opts['--release-key'], token: credential() })));
    } else if (opts.action === 'cloud-check') {
      await withRunLock(run, async () => {
        const { verifyRetainedCandidate } = await import('./desktop-release-assets.mjs');
        const { desktopCloudSnapshot, activeVersion, assertTopology } = await import('./desktop-cloud-release.mjs');
        const { plan, receipt } = verifyRetainedCandidate(run, opts['--pin'], opts['--retention'], opts['--retention-pin']);
        const token = readFileSync(join(homedir(), '.wrangler/config/default.toml'), 'utf8').match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
        const snapshot = await desktopCloudSnapshot(token); assertTopology(snapshot, snapshot);
        for (const owner of plan.owners) assert.equal(activeVersion(snapshot, owner === 'main' ? 'gachia' : `gachia-game-${owner}`), receipt.owners[owner].previousVersion, 'Old resource evidence is stale');
        const directory = join(run, `cloud-check-${randomBytes(6).toString('hex')}`); mkdirSync(directory, { mode: 0o700 });
        writeFileSync(join(directory, 'snapshot.json'), json(snapshot), { flag: 'wx', mode: 0o600 });
        const result = { directory, checkedAt: new Date().toISOString(), releaseKey: plan.releaseKey, planSHA256: opts['--pin'], retentionPin: opts['--retention-pin'],
          status: 'current_versions_match_retained_evidence', snapshotSHA256: hash(json(snapshot)), cloudWrites: false, productionReady: false,
          blockers: [...(plan.preview ? ['preview_candidate_not_publishable'] : []), 'production_promotion_not_registered', 'exact_cloud_version_preview_not_performed'] };
        writeFileSync(join(directory, 'result.json'), json(result), { flag: 'wx', mode: 0o600 });
        console.log(json(result));
      });
    } else if (opts.action === 'retain') {
      const { retainCandidate } = await import('./desktop-release-assets.mjs');
      console.log(json(await retainCandidate(run, opts['--pin'], resolve(opts['--evidence']), opts['--evidence-pin'])));
    } else if (opts.action === 'verify-retained') {
      const { verifyRetainedCandidate } = await import('./desktop-release-assets.mjs');
      const { receipt } = verifyRetainedCandidate(run, opts['--pin'], opts['--retention'], opts['--retention-pin']);
      console.log(json({ status: 'retained_artifacts_verified', releaseKey: receipt.releaseKey, cloudWrites: false }));
    } else if (opts.action === 'preview-retained') {
      console.log(json(await previewCandidate(run, opts['--pin'], { id: opts['--retention'], pin: opts['--retention-pin'] })));
    } else if (opts.action === 'verify') {
      const plan = verifyBuilt(run, opts['--pin']);
      console.log(json({ status: 'local_artifact_integrity_verified', releaseKey: plan.releaseKey, sourceCommit: plan.sourceCommit, owners: plan.owners, cloudWrites: false }));
    } else console.log(json(opts.action === 'build' ? await buildCandidate(run, opts['--pin']) : await previewCandidate(run, opts['--pin'])));
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
