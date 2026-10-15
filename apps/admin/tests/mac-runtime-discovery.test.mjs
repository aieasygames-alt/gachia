import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, realpathSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { discoverMacRuntime } from '../src/mac-runtime-discovery.mjs';

test('bounded context metadata classifies candidates without leaking URLs, names or credentials', (t) => {
  const home = realpathSync(mkdtempSync(join(tmpdir(), 'gachia-discovery-'))); t.after(() => rmSync(home, { recursive: true, force: true }));
  mkdirSync(join(home, 'Applications/Docker.app'), { recursive: true });
  writeFileSync(join(home, '.docker-config-unused'), 'SECRET');
  for (const [id, data] of [ ['a'.repeat(64), { Name: 'desktop-linux', Endpoints: { docker: { Host: `unix://${home}/.docker/run/docker.sock` } } }],
    ['b'.repeat(64), { Name: 'SECRET', Endpoints: { docker: { Host: 'tcp://user:SECRET@private:1234' } } }] ]) {
    const dir = join(home, '.docker/contexts/meta', id); mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'meta.json'), JSON.stringify(data));
  }
  const report = discoverMacRuntime({ home, platform: 'darwin' });
  assert.equal(report.status, 'candidates_unverified'); assert.equal(report.daemonConnected, false);
  assert.equal(report.contexts[0].endpointClass, 'user_desktop_socket_candidate');
  assert.equal(report.contexts[1].endpointClass, 'unsupported_redacted');
  assert.ok(!JSON.stringify(report).includes('SECRET')); assert.equal(report.capabilities.connect, false);
});
test('symlink and oversized metadata are rejected and platform mismatch reads nothing', (t) => {
  const home = realpathSync(mkdtempSync(join(tmpdir(), 'gachia-discovery-'))); t.after(() => rmSync(home, { recursive: true, force: true }));
  const dir = join(home, '.docker/contexts/meta', 'a'.repeat(64)); mkdirSync(dir, { recursive: true });
  const target = join(home, 'target'); writeFileSync(target, '{}'); symlinkSync(target, join(dir, 'meta.json'));
  assert.ok(discoverMacRuntime({ home, platform: 'darwin' }).issues.includes('context_metadata_rejected'));
  rmSync(join(dir, 'meta.json')); writeFileSync(join(dir, 'meta.json'), 'x'.repeat(16385));
  assert.ok(discoverMacRuntime({ home, platform: 'darwin' }).issues.includes('context_metadata_rejected'));
  assert.equal(discoverMacRuntime({ home: '/no-such-home', platform: 'linux' }).status, 'unsupported_platform');
  writeFileSync(join(dir, 'meta.json'), 'null');
  assert.ok(discoverMacRuntime({ home, platform: 'darwin' }).issues.includes('context_metadata_rejected'));
  writeFileSync(join(dir, 'meta.json'), '[]');
  assert.ok(discoverMacRuntime({ home, platform: 'darwin' }).issues.includes('context_metadata_rejected'));
});
