import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { digest } from './desktop-release-assets.mjs';
import { isolatedEnvironment } from './desktop-publish.mjs';
import { assertUploadMetadata, normalizedBindings } from './desktop-cloud-transport.mjs';
import { activeVersion } from './desktop-cloud-release.mjs';
import { parseWrangler } from './game-release.mjs';
import { liveOwnerConfig } from './live-owner-artifact.mjs';
import { unifiedService } from './unified-release-assets.mjs';

const CONFIG_PINS = { main: 'b1693ed74f4428f9180e877643d3455c43aef29161dc03ed223c3f4c64b973ff',
  genshin: '71044abce9df463b547e471016b62f83715aba87c764d394bdd9336e0724add2' };

// These targets authorize credential-free sealing, not an upload or activation.
export function unifiedTransportTarget(owner, text) {
  let target;
  if (['azur-promilia', 'nte', 'lvmeng'].includes(owner)) target = liveOwnerConfig(owner, text);
  else {
    assert(Object.hasOwn(CONFIG_PINS, owner), 'Unreviewed transport owner');
    assert.equal(digest(text), CONFIG_PINS[owner], 'Transport source configuration requires review');
    const config = parseWrangler(text);
    if (owner === 'genshin') delete config.env;
    target = { config, environment: '', mode: 'production' };
  }
  assert.equal(target.config.name, unifiedService(owner));
  const tags = ['main', 'azur-promilia', 'lvmeng'].includes(owner) ? [`cf:service=${unifiedService(owner)}`] : [];
  if (owner === 'lvmeng') tags.push('cf:environment=production');
  return { ...target, tags };
}

export function unifiedTransportTool(workspace) {
  const require = createRequire(join(workspace, 'apps/web/package.json'));
  const packagePath = require.resolve('wrangler/package.json'), pkg = JSON.parse(readFileSync(packagePath));
  assert.equal(pkg.version, '4.148.0', 'Unreviewed transport Wrangler');
  const bin = realpathSync(join(dirname(packagePath), 'bin/wrangler.js'));
  const cli = realpathSync(join(dirname(packagePath), 'wrangler-dist/cli.js'));
  return { version: pkg.version, bin, cli, binSHA256: digest(readFileSync(bin)), cliSHA256: digest(readFileSync(cli)) };
}

export function verifyUnifiedTool(tool) {
  assert.equal(tool.version, '4.148.0');
  assert.equal(realpathSync(tool.bin), tool.bin); assert.equal(realpathSync(tool.cli), tool.cli);
  assert.equal(digest(readFileSync(tool.bin)), tool.binSHA256, 'Wrangler launcher changed');
  assert.equal(digest(readFileSync(tool.cli)), tool.cliSHA256, 'Wrangler implementation changed');
}

// A pinned historical receipt owns its tool location. Today's checkout may
// legitimately have a newer lockfile; never substitute it for the sealed tool.
export function unifiedRecordedTransportWorkspace(tool) {
  verifyUnifiedTool(tool);
  const marker = '/node_modules/';
  const boundary = tool.bin.indexOf(marker);
  assert(boundary > 0, 'Recorded transport tool must belong to a workspace');
  const workspace = tool.bin.slice(0, boundary);
  assert.equal(realpathSync(workspace), workspace);
  assert.deepEqual(unifiedTransportTool(workspace), tool, 'Recorded workspace resolves a different transport tool');
  return workspace;
}

export function unifiedUploadConfig(target, module, assets, exact) {
  return { ...target.config, main: module, assets: { ...target.config.assets, directory: assets },
    ...(exact ? { no_bundle: true, minify: false } : {}) };
}

export function unifiedRuntimeConfig(target) {
  const selected = target.environment ? target.config.env[target.environment] : {};
  return { ...target.config, ...selected };
}

export function assertUnifiedUploadMetadata(metadata, target) {
  assertUploadMetadata(metadata, unifiedRuntimeConfig(target));
  // versions upload --dry-run has no asset JWT; a credential-bearing archive
  // must never be accepted as evidence from this no-cloud-write operation.
  assert.deepEqual(metadata.annotations, {}, 'Dry-run annotations must be empty');
  assert.deepEqual(Object.keys(metadata).sort(), ['main_module', 'bindings', 'compatibility_date', 'compatibility_flags', 'keep_bindings', 'annotations'].sort(),
    'Unexpected transport metadata fields');
}

export function assertUnifiedOwnerSettings(owner, target, metadata, snapshot) {
  const service = unifiedService(owner), settings = snapshot.settings[service], runtime = unifiedRuntimeConfig(target);
  assert.equal(target.config.name, service); activeVersion(snapshot, service); assertUnifiedUploadMetadata(metadata, target);
  assert.equal(settings.compatibility_date, runtime.compatibility_date); assert.deepEqual(settings.compatibility_flags, runtime.compatibility_flags);
  assert.deepEqual(settings.tags, target.tags, 'Unified live service/environment grouping drift');
  assert.equal(snapshot.subdomains[service].enabled, true); assert.equal(snapshot.subdomains[service].previews_enabled, true, 'Exact previews must already be enabled');
  const expected = [...metadata.bindings];
  if (owner === 'main') for (const name of ['BETTER_AUTH_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'INDEXNOW_AUTH_TOKEN']) expected.push({ name, type: 'secret_text' });
  assert.deepEqual(normalizedBindings(settings.bindings), normalizedBindings(expected), 'Unified live bindings differ from sealed configuration');
  assert.deepEqual(normalizedBindings(snapshot.bindings[service]), normalizedBindings(settings.bindings), 'Inconsistent cloud binding observation');
}

export function unifiedConfigSemantics(tool, configPath, environment) {
  verifyUnifiedTool(tool);
  const require = createRequire(tool.cli), { unstable_readConfig } = require(tool.cli);
  const parsed = unstable_readConfig({ config: configPath, env: environment });
  const source = readFileSync(tool.cli, 'utf8'), start = source.indexOf('function hasDefinedEnvironments(config2) {');
  const end = source.indexOf('function warnOnErrorUpdatingServiceAndEnvironmentTags()', start);
  assert(start >= 0 && end > start, 'Wrangler tag helper changed; review required');
  // Exercise the pinned implementation, including its normalized environment.
  const applyTags = new Function('SERVICE_TAG_PREFIX', 'ENVIRONMENT_TAG_PREFIX', 'logger',
    source.slice(start, end) + '; return applyServiceAndEnvironmentTags;')('cf:service=', 'cf:environment=', { warn: message => assert.fail(message) });
  return { name: parsed.name, environment: parsed.targetEnvironment, definedEnvironments: parsed.definedEnvironments,
    vars: parsed.vars, tags: applyTags(parsed, []) };
}

export function unifiedDryRun(tool, { config, environment, outfile, exact, cwd, home, log }) {
  verifyUnifiedTool(tool);
  assert(!existsSync(outfile) && !existsSync(log), 'Dry-run evidence exists; no retry');
  const args = ['versions', 'upload', '--dry-run', ...(exact ? ['--no-bundle'] : []),
    '--config', config, '--env', environment, '--outfile', outfile];
  try {
    const output = execFileSync(process.execPath, [tool.bin, ...args], { cwd, env: isolatedEnvironment(home, { WRANGLER_HIDE_BANNER: 'true', WRANGLER_SEND_ERROR_REPORTS: 'false' }),
      maxBuffer: 16 * 1024 * 1024, timeout: 300000, stdio: ['ignore', 'pipe', 'pipe'] });
    writeFileSync(log, output, { flag: 'wx', mode: 0o600 });
  } catch (error) {
    writeFileSync(log, Buffer.concat([error.stdout ?? Buffer.alloc(0), error.stderr ?? Buffer.alloc(0)]), { flag: 'wx', mode: 0o600 });
    throw Error(`Unified dry-run failed; no retry. See ${log}`);
  }
  return { executable: process.execPath, args, credentials: false, cloudWrites: false };
}
