import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore } from '../src/store.mjs';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('two SQLite connections cannot reserve concurrent previews and reconciliation keeps the fence', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'gachia-preview-reserve-'));
  const first = openStore(join(dir, 'state.sqlite')); const second = openStore(join(dir, 'state.sqlite'));
  t.after(() => { first.close(); second.close(); rmSync(dir, { recursive: true, force: true }); });
  const record = { id: 'first', status: 'starting', reviewId: 'synthetic-review' };
  first.reserveApplicationPreview(record);
  for (const status of ['starting', 'running', 'checking', 'stopping', 'needs_reconciliation', 'unknown', null]) {
    first.saveApplicationPreview({ ...record, status });
    assert.throws(() => second.reserveApplicationPreview({ ...record, id: 'second' }), (error) => error.status === 409);
    assert.equal(second.applicationPreviews().length, 1);
  }
  first.saveApplicationPreview({ ...record, status: 'stopped' });
  second.reserveApplicationPreview({ ...record, id: 'second' });
  assert.throws(() => first.reserveApplicationPreview({ ...record, id: 'third' }), (error) => error.status === 409);
  assert.equal(first.applicationPreviews().length, 2);
});

test('independent processes race one reservation and cannot overwrite the winning owner', { timeout: 20000 }, async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'gachia-preview-process-')); const file = join(dir, 'state.sqlite');
  const store = openStore(file); const children = [];
  t.after(async () => {
    for (const child of children) {
      if (child.exitCode === null && child.signalCode === null) { child.kill(); await once(child, 'exit'); }
    }
    store.close(); rmSync(dir, { recursive: true, force: true });
  });
  const moduleUrl = new URL('../src/store.mjs', import.meta.url).href;
  const code = `
    import { openStore } from ${JSON.stringify(moduleUrl)};
    const store = openStore(process.argv[1]); const owner = process.argv[2];
    process.on('message', (command) => {
      try {
        if (command === 'reserve') {
          store.reserveApplicationPreview({id: owner, ownerInstanceId: owner, status: 'starting', reviewId: 'review', workspaceId: 'workspace', packetDigest: 'digest'});
          process.send({status: 'reserved', owner});
        } else if (command === 'overwrite') {
          const record = store.applicationPreviews()[0];
          store.updateOwnedApplicationPreview({...record, status: 'stopped'}, owner);
          process.send({status: 'updated'});
        } else if (command === 'close') { store.close(); process.disconnect(); }
      } catch (error) { process.send({status: 'denied', code: error.status, owner}); }
    });
    process.send({status: 'ready'});
  `;
  for (const owner of ['process-one', 'process-two']) {
    const child = spawn(process.execPath, ['--input-type=module', '-e', code, file, owner], { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    children.push(child);
    assert.equal((await once(child, 'message'))[0].status, 'ready');
  }
  const results = children.map((child) => once(child, 'message'));
  children.forEach((child) => child.send('reserve'));
  const observed = (await Promise.all(results)).map(([message]) => message);
  assert.equal(observed.filter((item) => item.status === 'reserved').length, 1);
  assert.equal(observed.filter((item) => item.status === 'denied' && item.code === 409).length, 1);
  const winner = observed.find((item) => item.status === 'reserved').owner;
  const loser = children[observed.findIndex((item) => item.status === 'denied')];
  const rejected = once(loser, 'message'); loser.send('overwrite');
  assert.equal((await rejected)[0].code, 409);
  assert.equal(store.applicationPreviews().length, 1);
  assert.equal(store.applicationPreviews()[0].ownerInstanceId, winner);
  assert.equal(store.applicationPreviews()[0].status, 'starting');
  const exits = children.map((child) => once(child, 'exit'));
  children.forEach((child) => child.send('close'));
  assert.ok((await Promise.all(exits)).every(([code]) => code === 0));
  assert.throws(() => store.reserveApplicationPreview({id: 'third', status: 'starting'}), (error) => error.status === 409);
});

test('owned previews cannot be overwritten by generic saves or a different instance', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'gachia-preview-owner-')); const first = openStore(join(dir, 'state.sqlite')); const second = openStore(join(dir, 'state.sqlite'));
  t.after(() => { first.close(); second.close(); rmSync(dir, { recursive: true, force: true }); });
  const record = { id: 'owned', status: 'starting', ownerInstanceId: 'first-instance', reviewId: 'review', workspaceId: 'workspace', packetDigest: 'digest' };
  first.reserveApplicationPreview(record);
  for (const action of [() => second.saveApplicationPreview({ ...record, status: 'interrupted' }),
    () => second.saveApplicationPreview({ id: record.id, status: 'interrupted' }),
    () => second.updateOwnedApplicationPreview({ ...record, status: 'stopped' }, 'other-instance'),
    () => first.updateOwnedApplicationPreview({ ...record, packetDigest: 'changed' }, record.ownerInstanceId)]) {
    assert.throws(action, (error) => error.status === 409);
    assert.deepEqual(first.applicationPreviews()[0], record);
  }
  first.updateOwnedApplicationPreview({ ...record, status: 'stopped' }, record.ownerInstanceId);
  assert.equal(second.applicationPreviews()[0].status, 'stopped');
});
