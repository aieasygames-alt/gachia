import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { digest } from './desktop-release-assets.mjs';
import { boundedBody, sampleReadOnly } from './desktop-version-preview.mjs';
import { publicRobots, validatePublicResponse } from './desktop-public-acceptance.mjs';
import { unifiedHTMLParserPin, unifiedPageFingerprints, unifiedPreviewPath } from './unified-version-preview.mjs';
import { assertMigrationFingerprint, migrationPinned, migrationSave, MIGRATION_FINGERPRINT_POLICY } from './genshin-migration-http.mjs';

const mime = headers => headers.get('content-type')?.split(';')[0].trim().toLowerCase();
const canonical = value => JSON.stringify(Array.isArray(value) ? value.map(row => JSON.parse(canonical(row)))
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, JSON.parse(canonical(value[key]))])) : value);
const policy = value => (value ?? '').toLowerCase().split(',').map(part => part.trim()).filter(Boolean).sort();

function validate(response, body, reference, preview) {
  assert.equal(response.status, reference.status, reference.path); assert(!response.headers.has('set-cookie'));
  assert.equal(mime(response.headers), mime(new Headers(reference.headers)), reference.path);
  if (mime(response.headers) === 'text/html') {
    assert.deepEqual(policy(response.headers.get('cache-control')), policy(reference.headers['cache-control']));
    assert.deepEqual(publicRobots(body.toString()), reference.expectedRobots);
    if (preview) assert(/noindex/.test(response.headers.get('x-robots-tag') ?? ''), 'Exact Worker preview must be noindex');
    else assert.equal(response.headers.get('x-robots-tag') ?? '', reference.headers['x-robots-tag'] ?? '');
  } else if (reference.path === '/robots.txt') {
    if (preview) assert(/Disallow:\s*\//.test(body.toString()) && /noindex/.test(response.headers.get('x-robots-tag') ?? ''));
    else if (digest(body) !== reference.sha256) validatePublicResponse(response, body, reference);
  } else if (reference.jsonPin) {
    assert.equal(digest(canonical(JSON.parse(body))), reference.jsonPin, `Public owner projection changed: ${reference.path}`);
    if (reference.headers['cache-control'] === 'no-store') assert.equal(response.headers.get('cache-control'), 'no-store');
    for (const name of ['x-gachia-content-version', 'x-gachia-nte-content-version']) {
      if (reference.headers[name]) assert.equal(response.headers.get(name), reference.headers[name]);
    }
  } else assert.equal(digest(body), reference.sha256, `Public static bytes changed: ${reference.path}`);
}

export async function captureNteHTTP({ origin, requests, directory, jsonValues = new Map(), request = fetch }) {
  assert(requests.length > 0 && requests.length <= 2500 && new Set(requests.map(row => row.path)).size === requests.length);
  mkdirSync(directory, { mode: 0o700 }); const references = [], pages = [];
  try {
    // Keep file indexes deterministic while allowing bounded read concurrency.
    await sampleReadOnly(requests, async (wanted, index) => {
      const response = await request(unifiedPreviewPath(wanted.path, origin), { method: 'GET', redirect: 'error', credentials: 'omit',
        headers: { 'accept-language': wanted.path.match(/^\/(zh|en|ja)(?:\/|$)/)?.[1] ?? 'zh', connection: 'close' }, signal: AbortSignal.timeout(30000) });
      const body = await boundedBody(response), bodyFile = `${index}.body`;
      writeFileSync(join(directory, bodyFile), body, { flag: 'wx', mode: 0o600 });
      assert.equal(response.status, wanted.status, wanted.path); assert(!response.headers.has('set-cookie')); assert(mime(response.headers));
      if (wanted.sha256) assert.equal(digest(body), wanted.sha256, `Local static bytes changed: ${wanted.path}`);
      const row = { path: wanted.path, status: response.status, headers: Object.fromEntries(response.headers), sha256: digest(body), bytes: body.length, bodyFile };
      if (mime(response.headers) === 'application/json') {
        const value = JSON.parse(body); row.jsonPin = digest(canonical(value));
        if (jsonValues.has(wanted.path)) assert.deepEqual(value, jsonValues.get(wanted.path), `Stale local data: ${wanted.path}`);
      } else if (mime(response.headers) === 'text/html') {
        row.expectedRobots = publicRobots(body.toString());
        const main = body.toString().match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
        for (const text of wanted.contains ?? []) assert(main?.includes(text), `Edited consumer missing: ${wanted.path}`);
        pages.push({ index, html: body.toString(), status: response.status });
      }
      references[index] = row;
    }, 8);
    pages.sort((a, b) => a.index - b.index);
    unifiedPageFingerprints(pages, 'streaming-v2').forEach((value, index) => { references[pages[index].index].fingerprint = value; });
    const proof = migrationSave(directory, 'references.json', references);
    recheckNteReferences(proof); return { proof, references };
  } catch (error) { migrationSave(directory, 'failure.json', { error: error.message, cloudWrites: false }); throw error; }
}

export function recheckNteReferences(proof) {
  const references = migrationPinned(proof), directory = join(proof.path, '..'), html = [], rows = [];
  assert(references.length > 0 && references.length <= 2500 && new Set(references.map(row => row.path)).size === references.length);
  for (const [index, row] of references.entries()) {
    unifiedPreviewPath(row.path, 'https://gachia.com'); assert.equal(row.bodyFile, `${index}.body`);
    const body = readFileSync(join(directory, row.bodyFile)); assert.equal(body.length, row.bytes); assert.equal(digest(body), row.sha256);
    validate({ status: row.status, headers: new Headers(row.headers) }, body, row, false);
    if (row.fingerprint) { html.push({ html: body.toString(), status: row.status }); rows.push(row); }
  }
  if (html.length) unifiedPageFingerprints(html, 'streaming-v2').forEach((fingerprint, index) => assert.deepEqual(fingerprint, rows[index].fingerprint));
  return references;
}

export async function verifyNteHTTP({ origin, references, directory, preview = false, request = fetch, owner = 'nte' }) {
  mkdirSync(directory, { mode: 0o700 }); const observations = [], pages = [];
  try {
    await sampleReadOnly(references, async (reference, index) => {
      const response = await request(unifiedPreviewPath(reference.path, origin), { method: 'GET', credentials: 'omit', redirect: 'error',
        headers: { 'accept-language': reference.path.match(/^\/(zh|en|ja)(?:\/|$)/)?.[1] ?? 'zh', connection: 'close' }, signal: AbortSignal.timeout(30000) });
      const body = await boundedBody(response), bodyFile = `${index}.body`;
      writeFileSync(join(directory, bodyFile), body, { flag: 'wx', mode: 0o600 });
      observations[index] = { path: reference.path, status: response.status, headers: Object.fromEntries(response.headers), bytes: body.length, sha256: digest(body), bodyFile };
      validate(response, body, reference, preview);
      if (reference.fingerprint) pages.push({ index, html: body.toString(), status: response.status });
    }, 8);
    pages.sort((a, b) => a.index - b.index);
    if (pages.length) unifiedPageFingerprints(pages, 'streaming-v2').forEach((fingerprint, index) => assertMigrationFingerprint(fingerprint,
      references[pages[index].index].fingerprint, `NTE rendered content/metadata/links/media changed: ${references[pages[index].index].path}`, MIGRATION_FINGERPRINT_POLICY));
    const value = { schemaVersion: 1, kind: 'nte_http_acceptance', status: 'passed', origin, preview,
      parserPin: unifiedHTMLParserPin('streaming-v2'), fingerprintPolicy: MIGRATION_FINGERPRINT_POLICY, observations };
    const proof = migrationSave(directory, 'result.json', value);
    recheckNteHTTP({ proof, origin, references, preview });
    return { status: 'passed', evidenceSHA256: proof.pin, ...(preview ? { observationMode: 'cloud_exact_version' } : {}) };
  } catch (error) { migrationSave(directory, 'failure.json', { error: error.message, observations: observations.filter(Boolean), automaticRetry: false }); throw error; }
}

// Reopen every saved response, including its headers and parsed page structure.
// A status field or a caller-recomputed receipt pin cannot replace this check.
export function recheckNteHTTP({ proof, origin, references, preview = false }) {
  const value = migrationPinned(proof), directory = join(proof.path, '..');
  assert.equal(value.schemaVersion, 1); assert.equal(value.kind, 'nte_http_acceptance');
  assert.equal(value.status, 'passed'); assert.equal(value.origin, origin); assert.equal(value.preview, preview);
  assert.equal(value.parserPin, unifiedHTMLParserPin('streaming-v2'));
  assert.equal(value.fingerprintPolicy, MIGRATION_FINGERPRINT_POLICY);
  assert.equal(value.observations.length, references.length);
  const pages = [], expected = [];
  for (const [index, reference] of references.entries()) {
    const row = value.observations[index]; assert.equal(row.path, reference.path); assert.equal(row.bodyFile, `${index}.body`);
    const body = readFileSync(join(directory, row.bodyFile)); assert.equal(body.length, row.bytes); assert.equal(digest(body), row.sha256);
    validate({ status: row.status, headers: new Headers(row.headers) }, body, reference, preview);
    if (reference.fingerprint) { pages.push({ html: body.toString(), status: row.status }); expected.push(reference); }
  }
  if (pages.length) unifiedPageFingerprints(pages, 'streaming-v2').forEach((fingerprint, index) =>
    assertMigrationFingerprint(fingerprint, expected[index].fingerprint, `Saved NTE rendered content changed: ${expected[index].path}`, MIGRATION_FINGERPRINT_POLICY));
  return value;
}
