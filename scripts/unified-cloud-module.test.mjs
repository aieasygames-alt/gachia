import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { digest } from './desktop-release-assets.mjs';
import { parseWrangler } from './game-release.mjs';
import { unifiedService, UNIFIED_OWNERS } from './unified-release-assets.mjs';
import { assertUnifiedOwnerSettings, assertUnifiedUploadMetadata, unifiedConfigSemantics, unifiedDryRun, unifiedRuntimeConfig,
  unifiedTransportTarget, unifiedTransportTool, unifiedUploadConfig, verifyUnifiedTool } from './unified-cloud-module.mjs';

const repo = resolve(new URL('..', import.meta.url).pathname);
const configText = owner => readFileSync(join(repo, 'apps', owner === 'main' ? 'web' : `game-${owner}`, 'wrangler.jsonc'), 'utf8');
function directory(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'unified-module-')));
  t.after(() => rmSync(root, { recursive: true, force: true })); return root;
}

for (const owner of UNIFIED_OWNERS) {
  test(`${owner}: exact config and installed Wrangler preserve runtime and grouping`, t => {
    const root = directory(t), target = unifiedTransportTarget(owner, configText(owner)), file = join(root, 'upload.json');
    const config = unifiedUploadConfig(target, join(root, 'worker.js'), join(root, 'assets'), true);
    writeFileSync(file, JSON.stringify(config));
    const parsed = unifiedConfigSemantics(unifiedTransportTool(repo), file, target.environment);
    assert.equal(parsed.name, unifiedService(owner)); assert.equal(parsed.environment, owner === 'lvmeng' ? 'production' : '');
    assert.deepEqual(parsed.vars, unifiedRuntimeConfig(target).vars); assert.deepEqual(parsed.tags, target.tags);
    assert.equal(config.no_bundle, true); assert.equal(config.minify, false);
    assert.equal(Object.hasOwn(config, 'env'), ['main', 'azur-promilia', 'lvmeng'].includes(owner));
    if (owner !== 'main') assert.equal(parsed.vars[`${owner.toUpperCase().replaceAll('-', '_')}_DEPLOYMENT_MODE`], owner === 'nte' ? 'live' : 'production');
  });
  test(`${owner}: unreviewed config cannot acquire routes, bindings or a preview mode`, () => {
    const text = configText(owner);
    for (const mutate of [c => { c.routes = ['*/*']; }, c => { c.vars.EXTRA = 'unknown'; },
      c => { c.compatibility_date = '2027-01-01'; }, c => { c.services = []; }, c => { c.env.extra = {}; }]) {
      const config = parseWrangler(text);
      mutate(config); assert.throws(() => unifiedTransportTarget(owner, JSON.stringify(config)));
    }
  });
  test(`${owner}: fresh settings retain exact runtime, grouping, bindings and preview policy`, () => {
    const target = unifiedTransportTarget(owner, configText(owner)), runtime = unifiedRuntimeConfig(target), service = unifiedService(owner);
    const bindings = [{ name: 'ASSETS', type: 'assets' }, ...Object.entries(runtime.vars).map(([name, text]) => ({ name, text, type: 'plain_text' })),
      ...(runtime.d1_databases ?? []).map(b => ({ name: b.binding, type: 'd1', id: b.database_id })),
      ...(runtime.r2_buckets ?? []).map(b => ({ name: b.binding, type: 'r2_bucket', bucket_name: b.bucket_name })),
      ...(runtime.services ?? []).map(b => ({ name: b.binding, type: 'service', service: b.service }))];
    const metadata = { main_module: 'worker.js', annotations: {}, compatibility_date: runtime.compatibility_date,
      compatibility_flags: runtime.compatibility_flags, keep_bindings: ['secret_text', 'secret_key'], bindings };
    const live = [...bindings, ...(owner === 'main' ? ['BETTER_AUTH_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'INDEXNOW_AUTH_TOKEN'].map(name => ({ name, type: 'secret_text' })) : [])];
    const snapshot = { services: { [service]: { id: '1234abcd-0000-4000-8000-000000000001', versions: [{ version_id: '1234abcd-0000-4000-8000-000000000002', percentage: 100 }] } },
      settings: { [service]: { compatibility_date: runtime.compatibility_date, compatibility_flags: runtime.compatibility_flags, tags: target.tags, bindings: live } },
      bindings: { [service]: live }, subdomains: { [service]: { enabled: true, previews_enabled: true } } };
    assertUnifiedOwnerSettings(owner, target, metadata, snapshot);
    for (const mutate of [s => { s.settings[service].tags = ['unreviewed']; }, s => { s.settings[service].bindings = []; },
      s => { s.bindings[service] = []; }, s => { s.subdomains[service].previews_enabled = false; },
      s => { s.settings[service].compatibility_date = '2027-01-01'; }, s => { s.services[service].versions[0].percentage = 50; }]) {
      const changed = structuredClone(snapshot); mutate(changed); assert.throws(() => assertUnifiedOwnerSettings(owner, target, metadata, changed));
    }
  });
}

test('transport rejects unknown/staging/router owners', () => {
  for (const owner of ['router', 'gachia-staging', '__proto__', '../main']) assert.throws(() => unifiedTransportTarget(owner, '{}'));
});

test('outbound metadata rejects credentials, extra fields and environment downgrade', () => {
  const target = unifiedTransportTarget('lvmeng', configText('lvmeng'));
  const metadata = { main_module: 'worker.js', annotations: {}, compatibility_date: '2026-07-08', compatibility_flags: ['nodejs_compat'],
    keep_bindings: ['secret_text', 'secret_key'], bindings: [{ name: 'ASSETS', type: 'assets' },
      ...Object.entries(unifiedRuntimeConfig(target).vars).map(([name, text]) => ({ name, text, type: 'plain_text' }))] };
  assertUnifiedUploadMetadata(metadata, target);
  for (const mutate of [m => { m.assets = { jwt: 'must-not-be-accepted' }; }, m => { m.tags = []; },
    m => { m.annotations = { 'workers/message': 'unexpected' }; },
    m => { m.keep_bindings = ['plain_text']; }, m => { m.bindings.push({ name: 'SECRET', type: 'secret_text', text: 'secret' }); },
    m => { m.bindings.find(b => b.name === 'LVMENG_DEPLOYMENT_MODE').text = 'preview'; }]) {
    const changed = structuredClone(metadata); mutate(changed); assert.throws(() => assertUnifiedUploadMetadata(changed, target));
  }
});

test('dry-run command cannot receive credentials, upload, retry or inherit process secrets', t => {
  const root = directory(t), home = join(root, 'home'); mkdirSync(home);
  const bin = join(root, 'wrangler.js'), cli = join(root, 'cli.js');
  writeFileSync(bin, 'process.stdout.write(JSON.stringify({env:process.env,args:process.argv.slice(2)}))'); writeFileSync(cli, '// pinned test tool');
  const tool = { version: '4.148.0', bin, cli, binSHA256: digest(readFileSync(bin)), cliSHA256: digest(readFileSync(cli)) };
  process.env.UNIFIED_TRANSPORT_SECRET_TEST = 'must-not-inherit';
  t.after(() => { delete process.env.UNIFIED_TRANSPORT_SECRET_TEST; });
  const log = join(root, 'dry.log');
  const result = unifiedDryRun(tool, { config: join(root, 'upload.json'), environment: 'production', outfile: join(root, 'exact.multipart'),
    exact: true, cwd: root, home, log });
  const observed = JSON.parse(readFileSync(log));
  assert.equal(observed.env.UNIFIED_TRANSPORT_SECRET_TEST, undefined); assert.equal(observed.env.CLOUDFLARE_API_TOKEN, undefined);
  assert.equal(observed.env.HOME, home); assert.deepEqual(observed.args, result.args);
  assert.equal(observed.env.WRANGLER_HIDE_BANNER, 'true'); assert.equal(observed.env.WRANGLER_SEND_ERROR_REPORTS, 'false');
  assert.deepEqual(result.args.slice(0, 4), ['versions', 'upload', '--dry-run', '--no-bundle']);
  assert.equal(result.credentials, false); assert.equal(result.cloudWrites, false);
  assert.throws(() => unifiedDryRun(tool, { config: '', environment: '', outfile: '', exact: true, cwd: root, home, log }), /evidence exists/);
  writeFileSync(cli, 'changed'); assert.throws(() => verifyUnifiedTool(tool), /implementation changed/);
});
