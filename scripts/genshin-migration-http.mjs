import { sessionReadFileBytes } from './artifact-verification-session.mjs';
import assert from 'node:assert/strict';
import { lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { digest } from './desktop-release-assets.mjs';
import { boundedBody, sampleReadOnly } from './desktop-version-preview.mjs';
import { publicRobots } from './desktop-public-acceptance.mjs';
import { assertGenshinDeliveryData } from './genshin-content-delivery.mjs';
import { unifiedHTMLParserPin, unifiedPageFingerprints, unifiedPreviewPath, validateUnifiedPreviewResponse } from './unified-version-preview.mjs';
import { validateUnifiedMainPublic } from './unified-main-public.mjs';
import { unifiedStaticFiles } from './unified-release-assets.mjs';

export const migrationJSON = value => JSON.stringify(value, null, 2) + '\n';
export const migrationSave = (directory, name, value) => {
  const file = join(directory, name), bytes = migrationJSON(value);
  writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 }); return { path: file, pin: digest(bytes) };
};
export function migrationPinned(proof) {
  assert(proof && /^[a-f0-9]{64}$/.test(proof.pin));
  assert(typeof proof.path === 'string' && isAbsolute(proof.path));
  assert.equal(realpathSync(proof.path), resolve(proof.path), 'Linked migration proof forbidden');
  const stat = lstatSync(proof.path); assert(stat.isFile() && stat.size <= 16 * 1024 * 1024, 'Migration proof bounds exceeded');
  const bytes = readFileSync(proof.path); assert.equal(digest(bytes), proof.pin, 'Migration evidence changed'); return JSON.parse(bytes);
}
export function migrationPreviewOrigin(service, versionId) {
  assert(['gachia-game-genshin', 'gachia-game-nte', 'gachia-game-azur-promilia', 'gachia-game-lvmeng', 'gachia-router', 'gachia'].includes(service));
  assert(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(versionId));
  return `https://${versionId.slice(0, 8)}-${service}.aieasygames.workers.dev`;
}
export function migrationAggregateBases(workspace) {
  return Object.fromEntries(['games.json', 'search-zh.json', 'search-en.json', 'search-ja.json'].map(file => {
    const value = JSON.parse(readFileSync(join(workspace, 'apps/web/public/data-manifest', file)));
    if (file === 'games.json') delete value.games.genshin; else delete value.genshin;
    return ['/data-manifest/' + file, value];
  }));
}
const retiredData = (owner, role, path) => owner === 'main' && role === 'candidate'
  && (/^\/data\/genshin\/raw-[a-z-]+\.json$/.test(path) || path === '/data-client/tier-list-genshin.json');
function validateRetiredData(response, body) {
  assert.equal(response.status, 404); assert(!response.headers.has('set-cookie'));
  assert(/\bno-store\b/.test(response.headers.get('cache-control') ?? ''));
  assert.equal(response.headers.get('content-type')?.split(';')[0], 'text/html');
  assert(publicRobots(body.toString()).some(value => /\bnoindex\b/.test(value)), 'Retired JSON must stay absent and nonindexable');
}
const policy = value => (value ?? '').toLowerCase().split(',').map(value => value.trim()).filter(Boolean).sort();
export const MIGRATION_FINGERPRINT_POLICY = 'rendered-image-preloads-v1';
export function assertMigrationFingerprint(actual, expected, message, comparison = 'exact') {
  if (comparison === 'exact') return assert.deepEqual(actual, expected, message);
  assert.equal(comparison, MIGRATION_FINGERPRINT_POLICY);
  const normalize = value => {
    const images = new Set(value.media.filter(([tag]) => tag === 'img').map(([, attrs]) => Object.fromEntries(attrs).src));
    return { ...value, resources: value.resources.filter(([tag, entries]) => {
      const attrs = Object.fromEntries(entries);
      // React may emit these hints before or after an async stream boundary.
      // Only hints for an exactly protected rendered image are redundant.
      return !(tag === 'link' && attrs.rel === 'preload' && attrs.as === 'image' && images.has(attrs.href)
        && Object.keys(attrs).every(key => ['rel', 'as', 'href', 'fetchpriority'].includes(key))
        && (!Object.hasOwn(attrs, 'fetchpriority') || ['high', 'low', 'auto'].includes(attrs.fetchpriority)));
    }) };
  };
  assert.deepEqual(normalize(actual), normalize(expected), message);
}
function validateMigrationHTML(response, body, reference, preview) {
  assert.equal(response.status, reference.status); assert(!response.headers.has('set-cookie'));
  assert.equal(response.headers.get('content-type')?.split(';')[0], 'text/html');
  assert.deepEqual(policy(response.headers.get('cache-control')), policy(reference.headers['cache-control']), 'Migration HTML cache policy changed');
  assert(response.headers.has('cache-control'));
  if (preview) assert(policy(response.headers.get('x-robots-tag')).includes('noindex'), 'Preview HTML must be noindex');
  else {
    if (reference.status === 200) assert(!/\bnoindex\b/i.test(response.headers.get('x-robots-tag') ?? ''), 'Public HTML must be indexable');
    assert.deepEqual(publicRobots(body.toString()), reference.expectedRobots);
  }
}
export function migrationRequests({ owner, role, artifact, expected, sources, pairs }) {
  const result = [], add = (path, status = 200, sha256) => result.push({ path, status, ...(sha256 ? { sha256 } : {}) });
  for (const path of ['/sitemap.xml', '/robots.txt']) add(path);
  if (owner !== 'genshin') {
    for (const path of ['/zh', '/en', '/ja', '/en/starrail/version', '/zh/ananta/guides/download-install-guide']) add(path);
    add('/api/auth/get-session', 404);
    for (const pair of pairs) {
      const source = sources.find(row => row.sourcePath === 'packages/data/games/' + pair); assert(source);
      const absent = owner === 'main' && role === 'candidate' && pair.startsWith('genshin/');
      add('/data/' + pair, absent ? 404 : 200, absent ? undefined : source.sha256);
    }
    for (const file of ['games.json', 'search-zh.json', 'search-en.json', 'search-ja.json']) add('/data-manifest/' + file);
    if (owner === 'main' && role === 'candidate') add('/data-client/tier-list-genshin.json', 404);
    if (owner === 'router' && role === 'candidate') for (const path of ['/data-client/genshin-platform.json', '/data-client/tier-list-genshin.json']) add(path);
  }
  if (owner !== 'main') {
    for (const locale of ['zh', 'en', 'ja']) for (const page of ['characters', 'weapons', 'items', 'artifacts', 'guides', 'redeem-codes',
      'build', 'calculator', 'compare', 'teams', 'tier-list', 'characters/hu-tao', 'weapons/staff-of-homa', 'items/silk-flower',
      'artifacts/crimson-witch-of-flames', 'guides/banner-schedule-guide']) add(`/${locale}/genshin/${page}`);
  }
  if (owner === 'genshin') {
    for (const [file, bytes] of expected.files) add(expected.contract.prefix + '/' + file, 200, digest(bytes));
  }
  if (owner !== 'router') for (const file of unifiedStaticFiles(artifact, owner)) add('/' + file.path.slice('assets/'.length).split('/').map(encodeURIComponent).join('/'), 200, file.sha256);
  assert.equal(new Set(result.map(row => row.path)).size, result.length);
  return result;
}
export function validateMigrationJSON({ owner, role, path, body, expected, bases }) {
  if (owner === 'router' && role === 'candidate' && (path.startsWith('/data/genshin/') || path.startsWith('/data-client/') || path.startsWith('/data-manifest/'))) {
    assertGenshinDeliveryData(path, body, expected, bases[path]);
  } else if (path.startsWith('/data-manifest/') && owner === 'main' && role === 'candidate') {
    assert.deepEqual(JSON.parse(body), bases[path], 'Main retains stale Genshin index content');
  }
}
// A saved fingerprint is not authority: recompute it and the data contracts
// from every local body before those references may authorize a cloud check.
export function recheckMigrationReferences({ proof, requests, owner, role, expected, bases }) {
  const references = migrationPinned(proof), directory = resolve(proof.path, '..');
  assert.equal(references.length, requests.length); const html = [], htmlRows = [];
  for (const [index, row] of references.entries()) {
    const wanted = requests[index]; assert.equal(row.path, wanted.path); assert.equal(row.status, wanted.status);
    assert.equal(row.bodyFile, `${index}.body`);
    const file = join(directory, row.bodyFile); assert.equal(realpathSync(file), file); assert(lstatSync(file).isFile());
    const body = sessionReadFileBytes(file); assert.equal(body.length, row.bytes); assert.equal(digest(body), row.sha256);
    if (wanted.sha256) assert.equal(row.sha256, wanted.sha256);
    const response = { status: row.status, headers: new Headers(row.headers) }, type = response.headers.get('content-type')?.split(';')[0];
    assert(type); assert(!response.headers.has('set-cookie'));
    if (retiredData(owner, role, row.path)) validateRetiredData(response, body);
    else if (type === 'text/html') {
      validateMigrationHTML(response, body, row, false);
      html.push({ html: body.toString(), status: row.status }); htmlRows.push(row);
    } else if (row.path === '/robots.txt') {
      // The local runtime has no Cloudflare-managed public robots prefix.
      assert.equal(type, 'text/plain'); assert.equal(row.status, 200);
      assert(!/\bnoindex\b/i.test(response.headers.get('x-robots-tag') ?? ''));
    } else {
      validateUnifiedMainPublic(response, body, row);
      if (type === 'application/json') validateMigrationJSON({ owner, role, path: row.path, body, expected, bases });
    }
  }
  if (html.length) unifiedPageFingerprints(html, 'streaming-v2').forEach((fingerprint, index) => {
    assert.deepEqual(fingerprint, htmlRows[index].fingerprint, 'Saved local HTML fingerprint differs from its body');
    if (htmlRows[index].status === 200) assert.deepEqual(fingerprint.canonical, ['https://gachia.com' + htmlRows[index].path]);
  });
  return references;
}
export async function captureMigrationHTTP({ origin, requests, directory, owner, role, expected, bases, request = fetch, preview = false }) {
  mkdirSync(directory, { mode: 0o700 });
  const observations = [], html = [], htmlRows = [];
  try {
    await sampleReadOnly(requests, async (wanted, index) => {
      const response = await request(unifiedPreviewPath(wanted.path, origin), { method: 'GET', redirect: 'error', credentials: 'omit',
        headers: { 'accept-language': wanted.path.match(/^\/(zh|en|ja)(?:\/|$)/)?.[1] ?? 'zh', connection: 'close' }, signal: AbortSignal.timeout(30000) });
      const body = await boundedBody(response), bodyFile = `${index}.body`;
      writeFileSync(join(directory, bodyFile), body, { flag: 'wx', mode: 0o600 });
      const row = { path: wanted.path, status: response.status, headers: Object.fromEntries(response.headers), sha256: digest(body), bytes: body.length, bodyFile };
      observations[index] = row;
      assert.equal(row.status, wanted.status, `${owner}/${role}: ${wanted.path}`); assert(!response.headers.has('set-cookie'));
      const type = response.headers.get('content-type')?.split(';')[0]; assert(type, 'Missing migration MIME');
      if (wanted.sha256) assert.equal(row.sha256, wanted.sha256, `Migration bytes differ: ${wanted.path}`);
      if (type === 'application/json') validateMigrationJSON({ owner, role, path: wanted.path, body, expected, bases });
      if (retiredData(owner, role, wanted.path)) validateRetiredData(response, body);
      else if (type === 'text/html') {
        row.expectedRobots = publicRobots(body.toString());
        html.push({ html: body.toString(), status: row.status }); htmlRows.push(row);
      }
      if (preview) assert(/\bnoindex\b/.test(response.headers.get('x-robots-tag') ?? '') || !['text/html', 'application/xml', 'text/xml'].includes(type));
    }, 8);
    if (html.length) unifiedPageFingerprints(html, 'streaming-v2').forEach((fingerprint, index) => {
      const row = htmlRows[index]; row.fingerprint = fingerprint;
      if (row.status === 200) assert.deepEqual(fingerprint.canonical, ['https://gachia.com' + row.path]);
    });
    const proof = migrationSave(directory, 'references.json', observations);
    return { proof, observations };
  } catch (error) { migrationSave(directory, 'failure.json', { error: error.message, observations: observations.filter(Boolean), cloudWrites: false }); throw error; }
}
export async function verifyMigrationHTTP({ origin, references, directory, owner, role, expected, bases, preview = false, request = fetch }) {
  mkdirSync(directory, { mode: 0o700 }); const observations = [], html = [], htmlReferences = [];
  try {
    await sampleReadOnly(references, async (reference, index) => {
      const response = await request(unifiedPreviewPath(reference.path, origin), { method: 'GET', redirect: 'error', credentials: 'omit',
        headers: { 'accept-language': reference.path.match(/^\/(zh|en|ja)(?:\/|$)/)?.[1] ?? 'zh', connection: 'close' }, signal: AbortSignal.timeout(30000) });
      const body = await boundedBody(response), bodyFile = `${index}.body`;
      writeFileSync(join(directory, bodyFile), body, { flag: 'wx', mode: 0o600 });
      observations[index] = { path: reference.path, status: response.status, headers: Object.fromEntries(response.headers), sha256: digest(body), bytes: body.length, bodyFile };
      // JSON aggregation may reorder object keys when old Main is replaced.
      // Compare the owner projection and every other game structurally instead.
      if (retiredData(owner, role, reference.path)) validateRetiredData(response, body);
      else if (response.headers.get('content-type')?.split(';')[0] === 'text/html') {
        validateMigrationHTML(response, body, reference, preview);
        html.push({ html: body.toString(), status: response.status }); htmlReferences.push(reference);
      }
      else if (owner === 'router' && role === 'candidate' && reference.path.startsWith('/data-manifest/')) {
        assert.equal(response.status, 200); assert.equal(response.headers.get('content-type')?.split(';')[0], 'application/json');
        assert.equal(response.headers.get('cache-control'), 'no-store'); assert(!response.headers.has('set-cookie'));
        validateMigrationJSON({ owner, role, path: reference.path, body, expected, bases });
      } else if (preview) validateUnifiedPreviewResponse({ response, bytes: body, reference, parserVersion: 'streaming-v2' });
      else validateUnifiedMainPublic(response, body, reference);
    }, 8);
    if (html.length) unifiedPageFingerprints(html, 'streaming-v2').forEach((fingerprint, index) => {
      assertMigrationFingerprint(fingerprint, htmlReferences[index].fingerprint, `Migration rendered content/metadata/links/media differ: ${htmlReferences[index].path}`, MIGRATION_FINGERPRINT_POLICY);
    });
    const value = { kind: 'genshin_migration_http_acceptance', status: 'passed', origin, owner, role, preview,
      parserVersion: 'streaming-v2', parserPin: unifiedHTMLParserPin('streaming-v2'), fingerprintPolicy: MIGRATION_FINGERPRINT_POLICY, observations };
    const proof = migrationSave(directory, 'result.json', value);
    return { status: 'passed', evidenceSHA256: proof.pin, ...(preview ? { service: new URL(origin).hostname.includes('-gachia-router.') ? 'gachia-router' : owner === 'main' ? 'gachia' : 'gachia-game-genshin', observationMode: 'cloud_exact_version' } : {}) };
  } catch (error) { migrationSave(directory, 'failure.json', { error: error.message, observations: observations.filter(Boolean), automaticRetry: false }); throw error; }
}

export function recheckMigrationHTTP({ directory, pin, origin, references, owner, role, expected, bases, preview = false }) {
  const result = migrationPinned({ path: join(directory, 'result.json'), pin });
  assert.equal(result.kind, 'genshin_migration_http_acceptance'); assert.equal(result.status, 'passed');
  for (const [key, value] of Object.entries({ origin, owner, role, preview, parserVersion: 'streaming-v2', parserPin: unifiedHTMLParserPin('streaming-v2') })) assert.equal(result[key], value);
  recheckMigrationObservations({ directory, references, owner, role, expected, bases, preview, observations: result.observations, fingerprintPolicy: result.fingerprintPolicy ?? 'exact' });
  return result;
}

export function recheckMigrationObservations({ directory, observations, references, owner, role, expected, bases, preview = false, fingerprintPolicy = 'exact' }) {
  const result = { observations };
  assert.equal(result.observations.length, references.length); const html = [], htmlReferences = [];
  for (const [i, row] of result.observations.entries()) {
    const reference = references[i]; assert.equal(row.path, reference.path); assert.equal(row.bodyFile, `${i}.body`);
    const body = sessionReadFileBytes(join(directory, row.bodyFile)); assert.equal(body.length, row.bytes); assert.equal(digest(body), row.sha256);
    const response = { status: row.status, headers: new Headers(row.headers) };
    if (retiredData(owner, role, row.path)) validateRetiredData(response, body);
    else if (response.headers.get('content-type')?.split(';')[0] === 'text/html') {
      validateMigrationHTML(response, body, reference, preview); html.push({ html: body.toString(), status: row.status }); htmlReferences.push(reference);
    } else if (owner === 'router' && role === 'candidate' && row.path.startsWith('/data-manifest/')) {
      assert.equal(row.status, 200); assert.equal(response.headers.get('content-type')?.split(';')[0], 'application/json');
      assert.equal(response.headers.get('cache-control'), 'no-store'); assert(!response.headers.has('set-cookie'));
      validateMigrationJSON({ owner, role, path: row.path, body, expected, bases });
    } else if (preview) validateUnifiedPreviewResponse({ response, bytes: body, reference, parserVersion: 'streaming-v2' });
    else validateUnifiedMainPublic(response, body, reference);
  }
  if (html.length) unifiedPageFingerprints(html, 'streaming-v2').forEach((fingerprint, i) => assertMigrationFingerprint(fingerprint, htmlReferences[i].fingerprint, 'Saved migration rendered content differs: ' + htmlReferences[i].path, fingerprintPolicy));
}
