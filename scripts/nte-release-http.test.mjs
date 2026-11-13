import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { captureNteHTTP, recheckNteHTTP, recheckNteReferences, verifyNteHTTP } from './nte-release-http.mjs';
import { digest } from './desktop-release-assets.mjs';

function fixture(t) {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'nte-http-')));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const values = { '/data/nte/raw-characters.json': { name: 'Nanally', description: 'Approved published text' } };
  const html = '<!doctype html><html><head><title>Nanally</title><meta name="description" content="NTE character guide"/><meta name="robots" content="index, follow"/><link rel="canonical" href="https://gachia.com/en/nte/characters/nanally/"/></head><body><main><h1>Nanally</h1><p>Approved published text</p><a href="/en/nte/">NTE</a></main></body></html>';
  const request = async url => new Response(new URL(url).pathname.endsWith('.json') ? JSON.stringify(values['/data/nte/raw-characters.json']) : html,
    { headers: { 'content-type': new URL(url).pathname.endsWith('.json') ? 'application/json' : 'text/html', 'cache-control': 'no-store' } });
  const requests = [{ path: '/data/nte/raw-characters.json', status: 200 }, { path: '/en/nte/characters/nanally/', status: 200, contains: ['Approved published text'] }];
  return { directory, values, request, requests, html };
}

test('saved responses reopen and JSON key order does not change content identity', async t => {
  const f = fixture(t), refs = await captureNteHTTP({ origin: 'http://localhost:8787', requests: f.requests, directory: join(f.directory, 'local'), request: f.request,
    jsonValues: new Map(Object.entries(f.values)) });
  const request = async url => new URL(url).pathname.endsWith('.json') ? new Response(JSON.stringify({ description: 'Approved published text', name: 'Nanally' }),
    { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }) : f.request(url);
  const result = await verifyNteHTTP({ origin: 'https://gachia.com', references: refs.references, directory: join(f.directory, 'public'), request });
  recheckNteHTTP({ proof: { path: join(f.directory, 'public/result.json'), pin: result.evidenceSHA256 }, origin: 'https://gachia.com', references: refs.references });
  recheckNteReferences(refs.proof);
});

test('stale source JSON and a missing edited consumer fail local capture', async t => {
  const f = fixture(t);
  await assert.rejects(captureNteHTTP({ origin: 'http://localhost:8787', requests: f.requests, directory: join(f.directory, 'stale'), request: f.request,
    jsonValues: new Map([[f.requests[0].path, { name: 'Old' }]]) }), /Stale local data/);
  await assert.rejects(captureNteHTTP({ origin: 'http://localhost:8787', requests: [{ ...f.requests[1], contains: ['Missing approved text'] }],
    directory: join(f.directory, 'missing'), request: f.request }), /Edited consumer missing/);
});

for (const change of ['json', 'html', 'preview', 'cookie']) test(`${change} mismatch blocks acceptance`, async t => {
  const f = fixture(t), refs = await captureNteHTTP({ origin: 'http://localhost:8787', requests: f.requests, directory: join(f.directory, 'local'), request: f.request });
  const request = async url => {
    const response = await f.request(url), body = await response.text();
    if (change === 'cookie') response.headers.set('set-cookie', 'session=unexpected');
    return new Response(change === 'json' && new URL(url).pathname.endsWith('.json') ? '{"name":"Old"}' : change === 'html' ? body.replace('Approved published text', 'Old text') : body,
      { headers: response.headers });
  };
  await assert.rejects(verifyNteHTTP({ origin: 'https://gachia.com', preview: change === 'preview', references: refs.references, directory: join(f.directory, 'cloud'), request }));
});

test('a recomputed cloud receipt cannot hide modified saved HTML', async t => {
  const f = fixture(t), refs = await captureNteHTTP({ origin: 'http://localhost:8787', requests: f.requests, directory: join(f.directory, 'local'), request: f.request });
  await verifyNteHTTP({ origin: 'https://gachia.com', references: refs.references, directory: join(f.directory, 'cloud'), request: f.request });
  const file = join(f.directory, 'cloud/result.json'), value = JSON.parse(readFileSync(file));
  const bytes = Buffer.from(f.html.replace('Approved published text', 'Tampered text'));
  writeFileSync(join(f.directory, 'cloud/1.body'), bytes); value.observations[1].sha256 = digest(bytes); value.observations[1].bytes = bytes.length;
  writeFileSync(file, JSON.stringify(value));
  assert.throws(() => recheckNteHTTP({ proof: { path: file, pin: digest(readFileSync(file)) }, origin: 'https://gachia.com', references: refs.references }), /rendered content changed/);
});

test('historical not-found fragments require exact bytes and noindex while successful pages remain strictly parsed', async t => {
  const f = fixture(t);
  const html = '<script src="/_games/nte/_next/static/chunks/polyfills-42372ed130431b0a.js" noModule=""></script><meta name="robots" content="noindex"/><title>404: This page could not be found.</title><h1>404</h1><h2>This page could not be found.</h2></body></html>';
  const request = async () => new Response(html, { status: 404, headers: { 'content-type': 'text/html', 'cache-control': 'no-store' } });
  const refs = await captureNteHTTP({ origin: 'http://localhost:8787', requests: [{ path: '/en/nte/items/unknown', status: 404 }], directory: join(f.directory, 'missing'), request });
  assert.equal(refs.references[0].exactMissingPagePin, digest(html)); assert.equal(refs.references[0].fingerprint, undefined);
  await verifyNteHTTP({ origin: 'https://gachia.com', references: refs.references, directory: join(f.directory, 'exact'), request });
  await assert.rejects(verifyNteHTTP({ origin: 'https://gachia.com', references: refs.references, directory: join(f.directory, 'changed'), request: async () => new Response(html.replace('<h1>404', '<h1>Changed'), { status: 404, headers: { 'content-type': 'text/html', 'cache-control': 'no-store' } }) }), /Missing page bytes changed/);
  await assert.rejects(captureNteHTTP({ origin: 'http://localhost:8787', requests: [{ path: '/en/nte/items/unknown', status: 200 }], directory: join(f.directory, 'successful-fragment'), request: async () => new Response(html, { headers: { 'content-type': 'text/html' } }) }), /fingerprint parsing failed/);
  await assert.rejects(captureNteHTTP({ origin: 'http://localhost:8787', requests: [{ path: '/en/nte/items/unknown', status: 404 }], directory: join(f.directory, 'indexable-missing'), request: async () => new Response(html.replace('content="noindex"', 'content="index"'), { status: 404, headers: { 'content-type': 'text/html' } }) }));
});

test('an empty retired Main route must be an explicit no-store noindex 404', async t => {
  const f = fixture(t), request = async () => new Response(null, { status: 404, headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' } });
  const requests = [{ path: '/zh/nte/items/tri-key', status: 404 }];
  const refs = await captureNteHTTP({ origin: 'http://localhost:8787', requests, directory: join(f.directory, 'retired'), request });
  await verifyNteHTTP({ origin: 'https://gachia.com', references: refs.references, directory: join(f.directory, 'retired-public'), request });
  await assert.rejects(captureNteHTTP({ origin: 'http://localhost:8787', requests, directory: join(f.directory, 'unsafe-empty'), request: async () => new Response(null, { status: 404 }) }), /Missing response MIME/);
});
