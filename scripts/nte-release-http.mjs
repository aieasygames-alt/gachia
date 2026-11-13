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
const readBody = response => response.status === 404 && response.body === null ? Buffer.alloc(0) : boundedBody(response);
const MISSING_PAGE_POLICY = 'next-nte-not-found-route-echo-v1';
const LEGACY_MAIN_MISSING_PATHS = Object.freeze([
  ...['artifacts', 'character-materials', 'characters', 'guides', 'materials', 'redeem-codes', 'regions', 'weapons'].map(name => `/data/genshin/raw-${name}.json`),
  ...['anomalies', 'builds', 'character-materials', 'characters', 'disk-sets', 'gacha-system', 'guides', 'image-sources', 'materials', 'redeem-codes', 'regions', 'weapons'].map(name => `/data/nte/raw-${name}.json`),
  '/data-client/genshin-platform.json', '/data-client/tier-list-genshin.json', '/data-client/nte-platform.json',
]);

// Old Main's global not-found cache also echoes the first retired data URL.
// Keep the archived reference SHA unchanged: try only the finite retired URL
// set in the c array, requiring every other response byte to match that SHA.
export function legacyMainMissingPageMatches(body, reference) {
  if (!LEGACY_MAIN_MISSING_PATHS.includes(reference.path) || reference.status !== 404 || reference.missingPageIdentityPin !== reference.sha256) return false;
  for (const replacement of LEGACY_MAIN_MISSING_PATHS) {
    let roots = 0;
    const normalized = body.toString().replace(/<script>self\.__next_f\.push\((\[[\s\S]*?\])\)<\/script>/g, (script, argument) => {
      const chunk = JSON.parse(argument); if (chunk[0] !== 1 || typeof chunk[1] !== 'string') return script;
      let changed = false;
      const payload = chunk[1].split('\n').map(line => {
        if (!line.startsWith('0:') || !line.includes('"p":""') || !line.includes('"/_not-found"')) return line;
        const root = JSON.parse(line.slice(2));
        if (root.p !== '' || !Array.isArray(root.c) || root.c[0] !== '' || !LEGACY_MAIN_MISSING_PATHS.includes(root.c.join('/')) || !Array.isArray(root.f) || !JSON.stringify(root.f).includes('"/_not-found"')) return line;
        assert.equal(++roots, 1, 'Duplicate Main not-found bootstrap'); assert.equal(chunk.length, 2);
        root.c = replacement.split('/'); changed = true; return '0:' + JSON.stringify(root);
      }).join('\n');
      return changed ? '<script>self.__next_f.push(' + JSON.stringify([1, payload]) + ')</script>' : script;
    });
    if (roots === 1 && digest(normalized) === reference.missingPageIdentityPin) return true;
  }
  return false;
}

// The historical Next not-found cache can echo the first material request in
// its RSC bootstrap `c` array. The exact same archived module then emits a
// different echoed path in another isolate. Keep every other byte and every
// bootstrap field, including the not-found tree, in the comparison.
export function nteMissingPageIdentity(body) {
  let roots = 0;
  const normalized = body.toString().replace(/<script>self\.__next_f\.push\((\[[\s\S]*?\])\)<\/script>/g, (script, argument) => {
    const chunk = JSON.parse(argument);
    if (chunk[0] !== 1 || typeof chunk[1] !== 'string') return script;
    assert.equal(chunk.length, 2);
    let changed = false;
    const payload = chunk[1].split('\n').map(line => {
      if (!line.startsWith('0:')) return line;
      // Other app-route bootstraps can span several RSC script chunks. They
      // are compared exactly and must not be parsed as standalone root JSON.
      if (!line.includes('"p":"/_games/nte"') || !line.includes('"/_not-found"')) return line;
      const root = JSON.parse(line.slice(2));
      if (root.p !== '/_games/nte' || !Array.isArray(root.c) || root.c[2] !== 'nte' || root.c[3] !== 'items') return line;
      // App-route notFound() responses use their own route tree and retain
      // exact identity. Only the archived global /_not-found cache has this echo.
      if (!Array.isArray(root.f) || !JSON.stringify(root.f).includes('"/_not-found"')) return line;
      assert.equal(++roots, 1, 'Duplicate NTE not-found bootstrap');
      assert.equal(root.c.length, 5); assert.equal(root.c[0], '');
      assert(/^(zh|en|ja)$/.test(root.c[1]) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(root.c[4]), 'Invalid NTE not-found route echo');
      changed = true;
      root.c = ['', '__locale__', 'nte', 'items', '__not_found_material__'];
      return '0:' + JSON.stringify(root);
    }).join('\n');
    return changed ? '<script>self.__next_f.push(' + JSON.stringify([1, payload]) + ')</script>' : script;
  });
  return digest(normalized);
}

function validate(response, body, reference, preview) {
  assert.equal(response.status, reference.status, reference.path); assert(!response.headers.has('set-cookie'));
  assert.equal(mime(response.headers), mime(new Headers(reference.headers)), reference.path);
  if (!mime(response.headers)) {
    assert.equal(response.status, 404); assert.equal(body.length, 0);
    assert.equal(response.headers.get('cache-control'), 'no-store'); assert(/noindex/i.test(response.headers.get('x-robots-tag') ?? ''));
  }
  if (mime(response.headers) === 'text/html') {
    assert.deepEqual(policy(response.headers.get('cache-control')), policy(reference.headers['cache-control']));
    assert.deepEqual(publicRobots(body.toString()), reference.expectedRobots);
    if (preview) assert(/noindex/.test(response.headers.get('x-robots-tag') ?? ''), 'Exact Worker preview must be noindex');
    else assert.equal(response.headers.get('x-robots-tag') ?? '', reference.headers['x-robots-tag'] ?? '');
    if (reference.status === 404) {
      // Historical NTE/Main not-found HTML is not always a complete document.
      // Preserve the full response identity, with only the explicitly versioned
      // historical Next material route echo normalization when captured.
      assert.equal(reference.exactMissingPagePin, reference.sha256);
      if (reference.missingPagePolicy !== undefined) {
        assert.equal(reference.missingPagePolicy, MISSING_PAGE_POLICY);
        assert(/^[a-f0-9]{64}$/.test(reference.missingPageIdentityPin));
        assert(nteMissingPageIdentity(body) === reference.missingPageIdentityPin || legacyMainMissingPageMatches(body, reference), `Missing page content changed: ${reference.path}`);
      } else assert.equal(digest(body), reference.exactMissingPagePin, `Missing page bytes changed: ${reference.path}`);
      assert.equal(reference.fingerprint, undefined);
      assert(/noindex/i.test([...publicRobots(body.toString()), response.headers.get('x-robots-tag') ?? ''].join(' ')));
    } else assert(reference.fingerprint, 'Successful HTML requires a complete rendered-page fingerprint');
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
      const body = await readBody(response), bodyFile = `${index}.body`;
      writeFileSync(join(directory, bodyFile), body, { flag: 'wx', mode: 0o600 });
      assert.equal(response.status, wanted.status, wanted.path); assert(!response.headers.has('set-cookie'));
      assert(mime(response.headers) || (response.status === 404 && body.length === 0 && response.headers.get('cache-control') === 'no-store'
        && /noindex/i.test(response.headers.get('x-robots-tag') ?? '')), `Missing response MIME: ${wanted.path}`);
      if (wanted.sha256) assert.equal(digest(body), wanted.sha256, `Local static bytes changed: ${wanted.path}`);
      const row = { path: wanted.path, status: response.status, headers: Object.fromEntries(response.headers), sha256: digest(body), bytes: body.length, bodyFile };
      if (mime(response.headers) === 'application/json') {
        const value = JSON.parse(body); row.jsonPin = digest(canonical(value));
        if (jsonValues.has(wanted.path)) assert.deepEqual(value, jsonValues.get(wanted.path), `Stale local data: ${wanted.path}`);
      } else if (mime(response.headers) === 'text/html') {
        row.expectedRobots = publicRobots(body.toString());
        const main = body.toString().match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
        for (const text of wanted.contains ?? []) assert(main?.includes(text), `Edited consumer missing: ${wanted.path}`);
        if (response.status === 404) {
          row.exactMissingPagePin = row.sha256;
          row.missingPagePolicy = MISSING_PAGE_POLICY;
          row.missingPageIdentityPin = nteMissingPageIdentity(body);
        }
        else pages.push({ index, html: body.toString(), status: response.status });
      }
      references[index] = row;
    }, 8);
    pages.sort((a, b) => a.index - b.index);
    if (pages.length) unifiedPageFingerprints(pages, 'streaming-v2').forEach((value, index) => { references[pages[index].index].fingerprint = value; });
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
      const body = await readBody(response), bodyFile = `${index}.body`;
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

// A failed preview remains failed. Reopen its captured subset only to establish
// the exact known stop; it never substitutes for a new complete cloud preview.
export function recheckNteFailedHTTP({ proof, references, preview = true }) {
  const value = migrationPinned(proof), directory = join(proof.path, '..');
  assert.equal(value.automaticRetry, false); assert(typeof value.error === 'string');
  assert(Array.isArray(value.observations) && value.observations.length > 0 && value.observations.length <= references.length);
  const seen = new Set(), pages = [], expected = [];
  for (const row of value.observations) {
    assert(/^\d+\.body$/.test(row.bodyFile)); const index = Number(row.bodyFile.slice(0, -5)), reference = references[index];
    assert(reference && !seen.has(index)); seen.add(index); assert.equal(row.path, reference.path);
    const body = readFileSync(join(directory, row.bodyFile)); assert.equal(body.length, row.bytes); assert.equal(digest(body), row.sha256);
    validate({ status: row.status, headers: new Headers(row.headers) }, body, reference, preview);
    if (reference.fingerprint) { pages.push({ html: body.toString(), status: row.status }); expected.push(reference); }
  }
  if (pages.length) unifiedPageFingerprints(pages, 'streaming-v2').forEach((fingerprint, index) => assertMigrationFingerprint(fingerprint, expected[index].fingerprint, 'Failed preview captured content changed', MIGRATION_FINGERPRINT_POLICY));
  return value;
}
