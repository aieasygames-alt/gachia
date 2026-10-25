import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { observeBrowserAssets } from './browser-asset-diagnostics.mjs';

test('same-origin failures retain strict rejection and persist the reason and navigation', t => {
  const directory = mkdtempSync(join(tmpdir(), 'asset-diagnostics-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const page = new EventEmitter(), frame = {};
  page.url = () => 'https://gachia.com/ja/roco/weapons/lianjinshu';
  page.mainFrame = () => frame;
  const failures = [];
  observeBrowserAssets(page, 'https://gachia.com', failures, directory, 390);
  const request = (url, type = 'script') => ({ url: () => url, resourceType: () => type, failure: () => ({ errorText: 'net::ERR_CONNECTION_RESET' }), isNavigationRequest: () => false });
  page.emit('request', { isNavigationRequest: () => true, frame: () => frame, url: page.url });
  page.emit('requestfailed', request('https://gachia.com/_next/static/a.js'));
  page.emit('requestfailed', request('https://static.cloudflareinsights.com/beacon.js'));
  page.emit('requestfailed', request('https://gachia.com/image.png', 'image'));
  page.emit('response', { request: () => request('https://gachia.com/a.css', 'stylesheet'), url: () => 'https://gachia.com/a.css', status: () => 404 });
  assert.deepEqual(failures, ['https://gachia.com/_next/static/a.js', 'https://gachia.com/a.css']);
  const rows = readFileSync(join(directory, 'browser-assets-390.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(rows.length, 3);
  assert.equal(rows[1].reason, 'net::ERR_CONNECTION_RESET');
  assert.equal(rows[1].navigation, page.url());
  assert.equal(rows[2].status, 404);
});
