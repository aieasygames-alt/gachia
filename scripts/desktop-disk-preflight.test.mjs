import assert from 'node:assert/strict';
import test from 'node:test';
import { assertDiskBudget, DISK_RESERVE, GiB } from './desktop-disk-preflight.mjs';

test('disk budget is checked on the destination filesystem, preserves reserve and warns at the boundary', () => {
  const warnings = [], check = availableBytes => assertDiskBudget({ path: '/destination', operation: 'test',
    probe: path => { assert.equal(path, '/destination'); return { filesystem: '/destination-device', availableBytes }; }, warn: message => warnings.push(message) });
  assert.throws(() => check(DISK_RESERVE - 1), /Insufficient disk/);
  assert.equal(check(DISK_RESERVE).availableBytes, DISK_RESERVE);
  assert.equal(warnings.length, 1);
  check(10 * GiB); assert.equal(warnings.length, 1);
  assert.throws(() => assertDiskBudget({ path: '/', operation: 'build', estimatedBytes: 6 * GiB,
    probe: () => ({ filesystem: '/', availableBytes: 11 * GiB }) }), /14.00 GiB required/);
});

test('invalid or failing probes never assume available capacity', () => {
  for (const value of [null, {}, { filesystem: '/', availableBytes: NaN }, { filesystem: '/', availableBytes: -1 }]) {
    assert.throws(() => assertDiskBudget({ path: '/', operation: 'test', probe: () => value }), /probe failed/);
  }
  assert.throws(() => assertDiskBudget({ path: '/', operation: 'test', probe: () => { throw Error('unreadable'); } }), /unreadable/);
});
