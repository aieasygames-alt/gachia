import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm, rename } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { auditShadowNetwork, evidenceSampler, inspectShadowFlightFailure } from './shadow-consistency-audit.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const built = process.argv.includes('--built');
const split = process.argv.includes('--split');
const extended = process.argv.includes('--extended');
if (extended && !split) throw new Error('--extended requires --split');
const owners = split ? ['main', 'genshin', 'nte'] : ['genshin', 'nte'];
const directory = resolve(root, process.argv[2] ?? `reports/payload-t04-loopback-${new Date().toISOString().replace(/[:.]/g, '-')}`);
await mkdir(directory, { recursive: false });
const temp = await mkdtemp(join(tmpdir(), 'gachia-t04-'));
const fixturePath = join(temp, 'fixture.json');
let fixture = JSON.parse(await readFile(resolve(root, extended ? 'reports/payload-real-slice-2026-11-01/navigation-a.json' : split ? 'reports/payload-next-phase-2026-11-01/shadow-split-fixture.json' : 'reports/shadow-fixture-2026-10-31.json'), 'utf8'));
let releaseKey = fixture.release.releaseKey;
const sampler = evidenceSampler(directory);
const children = new Set();
const streams = [];
const results = { startedAt: new Date().toISOString(), releaseKey, runtimeMode: built ? 'next-start' : 'next-dev', publishable: false, scope: split ? 'Main/NTE split plus Genshin, synthetic only' : 'two-owner local synthetic fixture only', stages: [] };
const origins = { ...(split ? { main: 'http://127.0.0.1:3333' } : {}), cms: 'http://127.0.0.1:3100', genshin: 'http://127.0.0.1:3317', nte: 'http://127.0.0.1:3322' };
const baseEnv = Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'USER', 'SHELL'].filter(key => process.env[key]).map(key => [key, process.env[key]]));
const env = { ...baseEnv, NEXT_TELEMETRY_DISABLED: '1', CMS_LOCAL_ONLY: '1', CMS_SHADOW_READER: '1', CMS_LOCAL_NAMESPACE: `t04-${randomBytes(8).toString('hex')}`,
  PAYLOAD_SECRET: randomBytes(48).toString('hex'), SHADOW_FIXTURE_PATH: fixturePath, CONTENT_SHADOW_LOCAL_ONLY: '1',
  MAIN_SHADOW_READER: '1', GENSHIN_SHADOW_READER: '1', NTE_SHADOW_READER: '1', CONTENT_CMS_SHADOW_ORIGIN: origins.cms, CONTENT_CMS_SHADOW_RELEASE_KEY: releaseKey };
async function replaceFixture(data) { await writeFile(fixturePath + '.tmp', JSON.stringify(data)); await rename(fixturePath + '.tmp', fixturePath); }
async function freePort(port) {
  const server = createServer(); server.listen(port, '127.0.0.1'); await once(server, 'listening'); await new Promise(resolve => server.close(resolve));
}
function start(name, override = {}) {
  const cwd = resolve(root, name === 'cms' ? 'services/content-cms' : name === 'main' ? 'apps/web' : `apps/game-${name}`);
  const args = [resolve(cwd, 'node_modules/next/dist/bin/next'), built ? 'start' : 'dev', ...(!built && name === 'cms' ? ['--webpack'] : []), '--hostname', '127.0.0.1', '--port', new URL(origins[name]).port];
  const child = spawn(process.execPath, args, { cwd, env: { ...env, ...override }, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const output = createWriteStream(resolve(directory, `${name}-${children.size}-${Date.now()}.log`)); streams.push(output);
  child.stdout.pipe(output, { end: false }); child.stderr.pipe(output, { end: false }); children.add(child);
  return child;
}
async function stop(child) {
  if (!children.has(child)) return;
  try { process.kill(-child.pid, 'SIGTERM'); } catch {}
  await Promise.race([once(child, 'exit').catch(() => {}), new Promise(resolve => setTimeout(resolve, 5000))]);
  try { process.kill(-child.pid, 'SIGKILL'); } catch {}
  children.delete(child);
}
async function ready(name, child, expected = 200) {
  const path = name === 'cms' ? `/api/shadow/releases/${releaseKey}` : `/shadow/${releaseKey}/cache`;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (child.exitCode !== null) throw new Error(`${name} exited early: ${child.exitCode}`);
    try { const response = await fetch(origins[name] + path, { signal: AbortSignal.timeout(2000) }); await response.arrayBuffer(); if (response.status === expected) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`${name} did not become ready`);
}
async function publicUnaffected(label) {
  for (const owner of owners) {
    const response = await sampler.sample(`${label}-${owner}-public`, `${origins[owner]}${owner === 'main' ? '/zh/nte/items' : `/zh/${owner}/characters`}`);
    assert.equal(response.status, 200); assert.ok(!response.text.includes('data-shadow-release='));
    assert.equal(response.headers['x-shadow-release'], undefined);
    const sitemap = await sampler.sample(`${label}-${owner}-public-sitemap`, `${origins[owner]}/sitemap.xml`);
    assert.equal(sitemap.status, 200); assert.ok(!sitemap.text.includes('/shadow/'));
  }
}
function pageFor(owner) { return Object.values(fixture.snapshots).flatMap(snapshot => snapshot.pages).find(page => page.owner === owner); }
function mediaFor(owner) { return results.stages.flatMap(stage => stage.owners ?? []).findLast(row => row.owner === owner && row.releaseKey === releaseKey && row.mediaPath)?.mediaPath; }
async function failClosed(label) {
  for (const owner of owners) {
    const page = pageFor(owner);
    const media = mediaFor(owner); assert.ok(media);
    for (const [kind, path] of [['page', `/shadow/${releaseKey}${page.path}`], ['sitemap', `/shadow/${releaseKey}/sitemap.xml`], ['media', media], ['cache', `/shadow/${releaseKey}/cache`]]) {
      const response = await sampler.sample(`${label}-${owner}-${kind}`, origins[owner] + path);
      assert.ok(response.status >= 500, `${label}/${owner}/${kind}: expected failure, got ${response.status}`);
      assert.equal(response.headers['x-shadow-release'], undefined);
      assert.ok(!response.text.includes('data-shadow-release='));
      assert.ok(!response.text.includes(page.body));
      assert.match(response.headers['cache-control'], /no-store/);
    }
    if (extended) {
      const flight = await sampler.sample(`${label}-${owner}-flight`, `${origins[owner]}/shadow/${releaseKey}${page.path}`, { headers: { RSC: '1' } });
      inspectShadowFlightFailure(flight, page);
    }
  }
  results.stages.push({ name: label, passed: true });
}
let interrupted = false;
process.on('SIGINT', () => { interrupted = true; for (const child of children) { try { process.kill(-child.pid, 'SIGTERM'); } catch {} } });
try {
  for (const origin of Object.values(origins)) await freePort(Number(new URL(origin).port));
  await replaceFixture(fixture);
  let cms = start('cms'); await ready('cms', cms);
  let ownerProcesses = Object.fromEntries(owners.map(owner => [owner, start(owner)]));
  await Promise.all(owners.map(owner => ready(owner, ownerProcesses[owner])));
  await sampler.sample('cms-release', `${origins.cms}/api/shadow/releases/${releaseKey}`);
  for (const key of Object.values(fixture.release.snapshots)) await sampler.sample('cms-snapshot', `${origins.cms}/api/shadow/snapshots/${key}`);
  results.stages.push({ name: 'healthy', owners: await auditShadowNetwork({ fixture, origins, owners, sampler }) });
  await publicUnaffected('healthy');
  for (const owner of owners) {
    const wrong = await sampler.sample(`wrong-key-${owner}`, `${origins[owner]}/shadow/${'0'.repeat(64)}/cache`); assert.equal(wrong.status, 503);
    const remote = await sampler.sample(`remote-host-${owner}`, `${origins[owner]}/shadow/${releaseKey}/cache`, { headers: { host: 'gachia.com' } }); assert.equal(remote.status, 404);
  }
  if (split) {
    for (const [owner, wrongOwner] of [['main', 'nte'], ['nte', 'main']]) {
      const response = await sampler.sample(`wrong-owner-${owner}`, origins[owner] + `/shadow/${releaseKey}` + pageFor(wrongOwner).path);
      assert.equal(response.status, 404); assert.ok(!response.text.includes('data-shadow-release='));
      assert.ok(!response.text.includes(pageFor(wrongOwner).body));
    }
    results.stages.push({ name: 'main-nte-split-owner-isolation', passed: true });
  }
  const remoteCMS = await sampler.sample('remote-host-cms', `${origins.cms}/api/shadow/releases/${releaseKey}`, { headers: { host: 'gachia.com' } }); assert.equal(remoteCMS.status, 404);
  const partial = structuredClone(fixture); delete partial.snapshots[partial.release.snapshots.nte];
  await replaceFixture(partial); await failClosed('missing-nte-snapshot');
  const partialMap = structuredClone(fixture); delete partialMap.release.snapshots.nte;
  await replaceFixture(partialMap); await failClosed('partial-release-map');
  const tampered = structuredClone(fixture); tampered.snapshots[tampered.release.snapshots.nte].pages[0].body = 'Tampered and not approved';
  await replaceFixture(tampered); await failClosed('tampered-nte-snapshot');
  await replaceFixture(fixture); await stop(cms); await failClosed('cms-offline'); await publicUnaffected('cms-offline');
  cms = start('cms'); await ready('cms', cms);
  results.stages.push({ name: 'restored', owners: await auditShadowNetwork({ fixture, origins, owners, sampler, label: 'restored' }) });
  if (extended) {
    const { auditShadowBrowser, auditNteLegacyNetwork } = await import('./shadow-extended-audit.mjs');
    const semantics = JSON.parse(await readFile(resolve(root, 'reports/payload-real-slice-2026-11-01/final/semantics.json'), 'utf8'));
    results.stages.push({ name: 'real-legacy-nte-http-not-cms-parity', rows: await auditNteLegacyNetwork({ semantics, origins, sampler }) });
    results.stages.push({ name: 'browser-release-a', owners: await auditShadowBrowser({ fixture, origins, owners, sampler, label: 'version-a' }) });
    const previous = fixture, previousKey = releaseKey;
    const next = JSON.parse(await readFile(resolve(root, 'reports/payload-real-slice-2026-11-01/navigation-b.json'), 'utf8'));
    for (const owner of owners) {
      const response = await sampler.sample(`unpinned-next-${owner}`, `${origins[owner]}/shadow/${next.release.releaseKey}/cache`);
      assert.equal(response.status, 503);
    }
    await replaceFixture(next);
    await failClosed('artifact-transition-before-repin');
    await Promise.all(Object.values(ownerProcesses).map(stop));
    fixture = next; releaseKey = next.release.releaseKey; env.CONTENT_CMS_SHADOW_RELEASE_KEY = releaseKey;
    ownerProcesses = Object.fromEntries(owners.map(owner => [owner, start(owner)]));
    await Promise.all(owners.map(owner => ready(owner, ownerProcesses[owner])));
    results.stages.push({ name: 'release-b-repinned', owners: await auditShadowNetwork({ fixture, origins, owners, sampler, label: 'version-b' }) });
    for (const owner of owners) {
      const response = await sampler.sample(`old-release-rejected-${owner}`, `${origins[owner]}/shadow/${previousKey}/cache`);
      assert.equal(response.status, 503);
    }
    results.stages.push({ name: 'browser-release-b', owners: await auditShadowBrowser({ fixture, origins, owners, sampler, label: 'version-b' }) });
    const mixed = structuredClone(next);
    mixed.snapshots[next.release.snapshots.nte] = previous.snapshots[previous.release.snapshots.nte];
    await replaceFixture(mixed); await failClosed('mixed-release-snapshot');
    await replaceFixture(next);
    results.stages.push({ name: 'release-b-recovered', owners: await auditShadowNetwork({ fixture, origins, owners, sampler, label: 'version-b-restored' }) });
    results.transition = { from: previousKey, to: releaseKey, method: 'local process restart and explicit env repin', activationCoordinator: false, staleClientRevocationVerified: false };
  }
  await Promise.all(Object.values(ownerProcesses).map(stop));
  ownerProcesses = Object.fromEntries(owners.map(owner => [owner, start(owner, { [`${owner.toUpperCase()}_SHADOW_READER`]: '0' })]));
  await Promise.all(owners.map(owner => ready(owner, ownerProcesses[owner], 404)));
  for (const owner of owners) {
    for (const path of [`/shadow/${releaseKey}/cache`, `/shadow/${releaseKey}/sitemap.xml`, `/shadow/${releaseKey}${pageFor(owner).path}`, mediaFor(owner)]) {
      const response = await sampler.sample(`disabled-${owner}`, origins[owner] + path); assert.equal(response.status, 404); assert.equal(response.headers['x-shadow-release'], undefined);
    }
  }
  await publicUnaffected('disabled');
  await stop(cms); cms = start('cms', { CMS_SHADOW_READER: '0' }); await ready('cms', cms, 404);
  const disabledCMS = await sampler.sample('disabled-cms', `${origins.cms}/api/shadow/releases/${releaseKey}`); assert.equal(disabledCMS.status, 404);
  results.stages.push({ name: 'disabled-and-public-isolation', passed: true });
  if (interrupted) throw new Error('Interrupted');
  results.passed = true;
} catch (error) {
  results.passed = false; results.error = error.stack; process.exitCode = 1;
} finally {
  await Promise.all([...children].map(stop));
  for (const stream of streams) stream.end();
  await rm(temp, { recursive: true, force: true });
  results.finishedAt = new Date().toISOString(); results.records = sampler.records;
  await writeFile(resolve(directory, 'result.json'), JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify({ directory, passed: results.passed, samples: sampler.records.length, error: results.error }, null, 2));
}
