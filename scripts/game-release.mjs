import { createHash, randomUUID } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { verifyLocalWorker } from './game-release-smoke.mjs';
import { verifyAppRuntime } from './require-app-runtime.mjs';
import { readPreviousGameAssets, retainPreviousGameAssets } from './retain-game-assets.mjs';
import { rejectProductionMutation } from './production-release.mjs';
import { prepareGenshinContentAssets } from './genshin-content-assets.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const TARGETS = Object.freeze({
  nte: { variable: 'NTE_DEPLOYMENT_MODE', productionMode: 'live' },
  'azur-promilia': { variable: 'AZUR_PROMILIA_DEPLOYMENT_MODE', productionMode: 'production' },
});
const UUID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const digest = (value) => createHash('sha256').update(value).digest('hex');

export function parseWrangler(text) {
  if (Buffer.byteLength(text) > 1024 * 1024) throw new Error('Wrangler config exceeds size limit');
  const tree = ts.parseJsonText('wrangler.jsonc', text);
  if (tree.parseDiagnostics.length) throw new Error('Invalid Wrangler JSONC');
  const visit = (node, depth = 0) => {
    if (depth > 64) throw new Error('Wrangler config exceeds nesting limit');
    if (ts.isObjectLiteralExpression(node)) {
      const keys = new Set();
      for (const property of node.properties) {
        const key = property.name?.text;
        if (typeof key !== 'string' || keys.has(key)) throw new Error('Invalid or duplicate Wrangler key');
        keys.add(key);
      }
    }
    ts.forEachChild(node, (child) => visit(child, depth + 1));
  };
  visit(tree);
  const parsed = ts.parseConfigFileTextToJson('wrangler.jsonc', text);
  if (parsed.error || !parsed.config || Array.isArray(parsed.config)) throw new Error('Invalid Wrangler config');
  return parsed.config;
}

export function createReleasePlan({ game, environment, rollbackVersion, allowUnsupportedNextForVerification = false }, text) {
  if (!Object.hasOwn(TARGETS, game)) throw new Error('Unsupported game: expected nte or azur-promilia');
  if (!['staging', 'production'].includes(environment)) throw new Error('Explicit staging or production environment required');
  if (rollbackVersion !== undefined && !UUID.test(rollbackVersion)) throw new Error('Invalid rollback version UUID');
  const policy = TARGETS[game];
  const config = parseWrangler(text);
  const productionService = `gachia-game-${game}`;
  const stagingService = `${productionService}-staging`;
  const staging = config.env?.staging;
  if (config.name !== productionService || config.vars?.[policy.variable] !== policy.productionMode) {
    throw new Error('Production service or indexing mode does not match the allowlist');
  }
  // Validate both sides even when deploying only one; never inherit a missing preview target.
  if (staging?.name !== stagingService || staging.vars?.[policy.variable] !== 'preview') {
    throw new Error('Staging must explicitly name its isolated service and preview indexing mode');
  }
  for (const target of [config, staging]) {
    if (target.routes?.length || target.route || target.services?.length || target.d1_databases?.length || target.r2_buckets?.length) {
      throw new Error('Routes or service/data bindings require a separate release review');
    }
    if (target.vars?.NEXT_PUBLIC_APP_URL !== 'https://gachia.com') throw new Error('Unexpected public canonical origin');
  }
  if (config.main !== '.open-next/worker.js' || config.assets?.directory !== '.open-next/assets' || config.assets?.binding !== 'ASSETS') {
    throw new Error('Unexpected Worker or asset entrypoint');
  }
  for (const key of ['main', 'assets', 'build']) {
    if (Object.hasOwn(staging, key) || (key === 'build' && Object.hasOwn(config, key))) {
      throw new Error(`Custom ${key} overrides require a separate release review`);
    }
  }
  const isProduction = environment === 'production';
  const env = isProduction ? '' : 'staging';
  const mode = isProduction ? policy.productionMode : 'preview';
  return {
    schemaVersion: 1, game, environment,
    app: `apps/game-${game}`,
    service: isProduction ? productionService : stagingService,
    wranglerEnvironment: env,
    indexingMode: mode,
    configurationSha256: digest(text),
    compatibilityException: allowUnsupportedNextForVerification ? 'local_verification_only_unsupported_next' : null,
    buildEnvironment: { [policy.variable]: mode, CLOUDFLARE_ENV: env, SKIP_NEXT_APP_BUILD: 'false', SKIP_WRANGLER_CONFIG_CHECK: 'false' },
    commands: {
      build: ['exec', 'opennextjs-cloudflare', 'build', ...(allowUnsupportedNextForVerification ? ['--dangerouslyUseUnsupportedNextVersion'] : []), '--config', 'wrangler.jsonc', '--env', env],
      verify: ['exec', 'wrangler', 'deploy', '--dry-run', '--config', 'wrangler.jsonc', '--env', env],
      deploy: isProduction ? null : ['exec', 'opennextjs-cloudflare', 'deploy', '--config', 'wrangler.jsonc', '--env', env],
    },
    effects: { targetWorkerAndAssets: true, productionTraffic: isProduction, routerDeployment: false },
    currentVersion: { status: 'not_observed', value: null },
    candidateVersion: { status: 'not_observed', value: null },
    rollbackVersion: { status: rollbackVersion ? 'operator_supplied_unverified' : 'not_supplied', value: rollbackVersion ?? null },
    cloudVerification: 'not_performed',
    productionGate: 'generic_production_deploy_retired_use_production_release_plan',
  };
}

export function readReleasePlan(options, root = ROOT) {
  if (!Object.hasOwn(TARGETS, options.game)) throw new Error('Unsupported game: expected nte or azur-promilia');
  const plan = createReleasePlan(options, readFileSync(resolve(root, `apps/game-${options.game}/wrangler.jsonc`), 'utf8'));
  if (options.previousAssetsReceipt) {
    plan.previousAssets = readPreviousGameAssets(resolve(root, options.previousAssetsReceipt), options).summary;
  }
  return plan;
}

export function readAssetPlan(options, root = ROOT) {
  if (!['genshin', 'lvmeng'].includes(options.game)) return readReleasePlan(options, root);
  if (!['staging', 'production'].includes(options.environment)) throw new Error('Explicit asset environment required');
  const app = `apps/game-${options.game}`;
  const config = parseWrangler(readFileSync(resolve(root, app, 'wrangler.jsonc'), 'utf8'));
  if (config.name !== `gachia-game-${options.game}` || config.assets?.directory !== '.open-next/assets') {
    throw new Error('Unexpected game asset target');
  }
  // This local-only capability does not register either game for deploy/verify.
  return { game: options.game, app };
}

export function checkExecutionPermission(plan, { action }) {
  if (!['verify', 'deploy'].includes(action)) throw new Error('Unknown execution action');
  if (action === 'deploy' && plan.compatibilityException) throw new Error('Unsupported Next exception is restricted to local verification, never deployment');
  if (action === 'deploy' && plan.environment === 'production') {
    rejectProductionMutation(plan.game, 'deploy');
  }
}

export function checkSourcePermission(plan, { action }, { dirty, commit, expectedCommit = commit }) {
  if (action === 'deploy' && (dirty || commit !== expectedCommit)) {
    throw new Error('Game deployment requires a clean committed source tree; local verification remains available');
  }
}

export function prepareNamespacedAssets(plan, root = ROOT) {
  const assets = resolve(root, plan.app, '.open-next/assets');
  const target = resolve(assets, '_games', plan.game, '_next');
  let files = 0;
  // Direct staging origins have no Router to strip /_games/<id>. Preserve both
  // paths; only duplicate the small generated _next tree, not images or game data.
  function copy(source, destination) {
    mkdirSync(destination, { recursive: true });
    for (const entry of readdirSync(source, { withFileTypes: true })) {
      if (entry.isDirectory()) copy(resolve(source, entry.name), resolve(destination, entry.name));
      else if (entry.isFile()) { copyFileSync(resolve(source, entry.name), resolve(destination, entry.name)); files++; }
      else throw new Error('Generated assets must contain only regular files and directories');
    }
  }
  copy(resolve(assets, '_next'), target);
  if (!files) throw new Error('No generated assets to publish');
  const content = plan.game === 'genshin' ? prepareGenshinContentAssets(root) : undefined;
  return { files, prefix: `/_games/${plan.game}/_next`, originalPathsPreserved: true, ...(content ? { content } : {}) };
}

export function verifyBuiltIndexing(plan, root = ROOT) {
  const app = resolve(root, plan.app);
  const routes = JSON.parse(readFileSync(resolve(app, '.next/routes-manifest.json'), 'utf8'));
  const robots = readFileSync(resolve(app, '.next/server/app/robots.txt.body'), 'utf8');
  const homeFile = resolve(app, `.next/server/app/zh/${plan.game}.html`);
  const home = existsSync(homeFile) ? readFileSync(homeFile, 'utf8') : null;
  if (home === null) {
    const paths = JSON.parse(readFileSync(resolve(app, '.next/server/app-paths-manifest.json'), 'utf8'));
    if (!paths[`/[lang]/${plan.game}/page`]) throw new Error('Neither a static nor a dynamic game homepage was built');
  }
  const globalHeaders = routes.headers?.filter((rule) => rule.source === '/(.*)').flatMap((rule) => rule.headers) ?? [];
  const noindexHeader = globalHeaders.some((header) => header.key.toLowerCase() === 'x-robots-tag' && /noindex/i.test(header.value));
  const blockedRobots = /^Disallow:\s*\/\s*$/m.test(robots);
  const noindexMeta = /<meta\b(?=[^>]*\bname=["']robots["'])(?=[^>]*\bcontent=["'][^"']*\bnoindex\b)[^>]*>/i;
  const preview = plan.environment === 'staging';
  if (noindexHeader !== preview || blockedRobots !== preview || (home !== null && noindexMeta.test(home) !== preview)) {
    throw new Error('Built artifact indexing does not match the planned environment');
  }
  if (!preview && !robots.includes(`https://gachia.com/sitemaps/${plan.game}/index.xml`)) {
    throw new Error('Production robots is missing its public sitemap');
  }
  let htmlPages = 0;
  function checkHtml(directory) {
    for (const item of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, item.name);
      if (item.isDirectory()) checkHtml(path);
      else if (item.name.endsWith('.html')) {
        htmlPages++;
        if (preview && !noindexMeta.test(readFileSync(path, 'utf8'))) throw new Error(`Preview HTML lacks noindex: ${item.name}`);
      }
    }
  }
  checkHtml(resolve(app, '.next/server/app'));
  const worker = readFileSync(resolve(app, '.open-next/worker.js'));
  return { status: 'static_indexing_checked_runtime_smoke_required', htmlPages, homepageRendering: home === null ? 'dynamic' : 'static', workerEntrypointSha256: digest(worker), scope: 'indexing_and_entrypoint_not_full_artifact_attestation' };
}

export async function executeRelease(plan, options, dependencies) {
  checkExecutionPermission(plan, options);
  const { run, refreshPlan, verifyArtifacts, save = () => {} } = dependencies;
  const record = {
    schemaVersion: 1, releaseId: randomUUID(), action: options.action, plan,
    status: 'planned', events: [], cloudVerification: 'not_performed',
  };
  let deploymentStarted = false;
  const transition = (status) => {
    record.status = status;
    record.events.push({ status, at: new Date().toISOString() });
    save(record);
  };
  const revalidate = () => {
    if (JSON.stringify(refreshPlan()) !== JSON.stringify(plan)) throw new Error('Release inputs changed; generate a new plan');
  };
  try {
    revalidate();
    transition('building');
    await run(plan.commands.build, plan.buildEnvironment);
    revalidate();
    transition('checking_artifacts');
    record.artifacts = await verifyArtifacts();
    revalidate();
    transition(options.action === 'verify' ? 'bundle_verifying' : 'deploying');
    deploymentStarted = options.action === 'deploy';
    await run(plan.commands[options.action], plan.buildEnvironment);
    transition(options.action === 'verify' ? 'bundle_verified_not_deployed' : 'deployment_command_succeeded_verification_pending');
    return record;
  } catch (error) {
    transition(deploymentStarted ? 'deployment_failed_needs_reconciliation' : 'failed_before_deployment');
    error.releaseRecord = record;
    throw error;
  }
}

export function parseArguments(argv) {
  const [action, ...args] = argv;
  if (!['plan', 'verify', 'deploy', 'prepare-assets', 'status'].includes(action)) throw new Error('Usage: game-release.mjs plan|verify|deploy|prepare-assets --game <id> --environment staging|production; status --record <path>');
  const options = { action };
  const keys = { '--game': 'game', '--environment': 'environment', '--confirm': 'confirmation', '--rollback-version': 'rollbackVersion', '--record': 'record', '--previous-assets-receipt': 'previousAssetsReceipt' };
  for (let i = 0; i < args.length; i += 2) {
    if (args[i] === '--allow-unsupported-next-for-verification') {
      if (action !== 'verify' || options.allowUnsupportedNextForVerification) throw new Error('Compatibility exception is only allowed once for verify');
      options.allowUnsupportedNextForVerification = true;
      i--;
      continue;
    }
    const key = keys[args[i]];
    const value = args[i + 1];
    if (!key || Object.hasOwn(options, key) || !value || value.startsWith('--')) throw new Error('Unknown, duplicate or missing option');
    options[key] = value;
  }
  if (action === 'status') {
    if (!options.record || Object.keys(options).length !== 2) throw new Error('status requires only --record');
  } else if (options.record || !options.game || !options.environment) throw new Error('Explicit --game and --environment are required');
  if (action === 'prepare-assets' && options.previousAssetsReceipt) throw new Error('Previous assets require the controlled plan/verify/deploy entrypoint');
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.action === 'deploy' && options.environment === 'production') rejectProductionMutation(options.game, 'deploy');
  if (options.action === 'status') {
    const record = JSON.parse(readFileSync(resolve(options.record), 'utf8'));
    if (record.schemaVersion !== 1 || !record.releaseId || !record.plan?.service || !Array.isArray(record.events)) throw new Error('Invalid local release record');
    console.log(JSON.stringify({ ...record, observation: 'local_record_only_not_live_cloud_state' }, null, 2));
    return;
  }
  if (options.action === 'prepare-assets') {
    console.log(JSON.stringify({ status: 'local_assets_prepared_not_deployed', ...prepareNamespacedAssets(readAssetPlan(options)) }, null, 2));
    return;
  }
  const plan = readReleasePlan(options);
  if (options.action === 'plan') {
    console.log(JSON.stringify({ status: 'planned_not_executed', ...plan }, null, 2));
    return;
  }
  checkExecutionPermission(plan, options);
  const records = resolve(ROOT, '.release-records');
  mkdirSync(records, { recursive: true, mode: 0o700 });
  const lock = resolve(records, `${plan.game}.lock`);
  // One app's build directory is shared by both environments. Do not auto-remove stale locks.
  writeFileSync(lock, JSON.stringify({ pid: process.pid, game: plan.game, environment: plan.environment }), { flag: 'wx', mode: 0o600 });
  const path = resolve(records, `${plan.game}-${randomUUID()}.json`);
  console.error(`Local release record: ${path}`);
  try {
    const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
    const dirty = Boolean(execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).trim());
    checkSourcePermission(plan, options, { dirty });
    const record = await executeRelease(plan, options, {
      refreshPlan: () => {
        if (options.action === 'deploy') {
          checkSourcePermission(plan, options, {
            expectedCommit: commit,
            commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
            dirty: Boolean(execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).trim()),
          });
        }
        return readReleasePlan(options);
      },
      verifyArtifacts: async () => ({ runtimePolicy: verifyAppRuntime(resolve(ROOT, plan.app)), namespacedAssets: prepareNamespacedAssets(plan), previousAssets: retainPreviousGameAssets(plan, ROOT), ...verifyBuiltIndexing(plan), runtime: await verifyLocalWorker(plan, ROOT) }),
      save: (record) => {
        writeFileSync(`${path}.tmp`, `${JSON.stringify({ ...record, input: { commit, dirty, scope: 'head_and_config_not_full_source_attestation' } }, null, 2)}\n`, { mode: 0o600 });
        renameSync(`${path}.tmp`, path);
      },
      run: (args, env) => {
        const result = spawnSync('pnpm', args, { cwd: resolve(ROOT, plan.app), env: { ...process.env, ...env }, stdio: 'inherit', shell: false });
        if (result.error || result.status !== 0) throw new Error(`Release command ${args[2]} failed (exit ${result.status}, signal ${result.signal ?? 'none'})`);
      },
    });
    console.log(JSON.stringify({ status: record.status, service: plan.service, record: path, cloudVerification: record.cloudVerification }, null, 2));
  } finally {
    unlinkSync(lock);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
