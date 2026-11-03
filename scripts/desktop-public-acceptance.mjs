import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { digest, pinnedJson } from './desktop-release-assets.mjs';
import { boundedBody, pageFingerprint, sampleReadOnly } from './desktop-version-preview.mjs';

// Reviewed Router HTML policy and the exact currently observed Cloudflare
// managed robots prefix. A managed-rule change requires a fresh review.
const GAME_HTML_CACHE = 'private, no-cache, no-store, max-age=0, must-revalidate';
const ROBOTS_PREFIX_BYTES = 2676;
const ROBOTS_PREFIX_SHA256 = '3073d1e371afb3271c7666148766fedc5145f7d8440f7114062db79b7bd58add';

export function publicRobots(html) {
  return [...html.matchAll(/<meta\b[^>]*\bname=["'](?:robots|googlebot)["'][^>]*>/gi)].map(match => match[0]).sort();
}

export function loadPublicReferences(directory, referencesPin) {
  return pinnedJson(join(directory, 'references.json'), referencesPin).map((reference, i) => {
    if (!reference.headers['content-type']?.startsWith('text/html')) return reference;
    const body = readFileSync(join(directory, `${i}.body`)); assert.equal(digest(body), reference.sha256, 'Public reference HTML changed');
    return { ...reference, expectedRobots: publicRobots(body.toString()) };
  });
}

export function publicReferences(owner, references, game = owner === 'main' ? 'genshin' : owner) {
  assert(['genshin', 'nte'].includes(game), 'Unreviewed public game');
  assert(owner === game || owner === 'main', 'Public owner/game mismatch');
  const mapped = new Map();
  for (const reference of references) {
    const path = reference.path;
    assert(path.startsWith('/') && !path.startsWith('//') && !/[\\?#]/.test(path), 'Unsafe public path');
    let publicPath = path;
    if (owner !== 'main') {
      if (path === '/robots.txt') continue; // Main owns the public robots document.
      if (path === '/sitemap.xml') publicPath = `/sitemaps/${game}/index.xml`;
      else if (path.startsWith('/_next/static/')) publicPath = `/_games/${game}` + path;
      else assert(path.startsWith(`/_games/${game}/_next/static/`) || new RegExp(`^/(zh|en|ja)/${game}/guides/[^/]+$`).test(path), 'Unexpected game public route');
    } else {
      const other = game === 'genshin' ? 'nte' : 'genshin';
      const preserved = path === `/data/${other}/raw-guides.json` && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(reference.preservedMainVersion ?? '');
      assert(preserved || path.startsWith('/_next/static/') || [`/data/${game}/raw-guides.json`, '/sitemap.xml', '/robots.txt', '/api/auth/get-session'].includes(path), 'Unexpected Main public route');
    }
    assert.equal(new URL(publicPath, 'https://gachia.com').pathname, publicPath, 'Public path normalization forbidden');
    if (mapped.has(publicPath)) assert.equal(mapped.get(publicPath).sha256, reference.sha256, 'Conflicting public asset references');
    else mapped.set(publicPath, { ...reference, path: publicPath, headers: { ...reference.headers,
      ...(owner !== 'main' && reference.headers['content-type']?.startsWith('text/html') ? { 'cache-control': GAME_HTML_CACHE } : {}) } });
  }
  assert(mapped.size > 0 && mapped.size <= 2500, 'Invalid public coverage');
  return [...mapped.values()];
}

export function validatePublicResponse(response, body, reference) {
  assert.equal(response.status, reference.status, 'Public HTTP status changed');
  assert(!response.headers.has('set-cookie'), 'Public response sets a cookie');
  const mime = response.headers.get('content-type')?.split(';')[0];
  assert.equal(mime, reference.headers['content-type']?.split(';')[0], 'Public MIME changed');
  const policy = value => (value ?? '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean).sort();
  assert.deepEqual(policy(response.headers.get('cache-control')), policy(reference.headers['cache-control']), 'Public cache policy changed');
  if (mime === 'text/html' || mime === 'application/xml' || reference.path === '/robots.txt') assert(!/\bnoindex\b/i.test(response.headers.get('x-robots-tag') ?? ''), 'Public discovery must be indexable');
  if (mime === 'text/html') {
    const html = body.toString();
    assert(Array.isArray(reference.expectedRobots), 'Sealed HTML robots evidence required');
    assert.deepEqual(publicRobots(html), reference.expectedRobots, 'Public HTML robots policy changed');
    assert.deepEqual(pageFingerprint(html), reference.fingerprint, 'Public rendered content differs');
  }
  else if (reference.path === '/robots.txt') {
    assert.equal(digest(body.subarray(0, ROBOTS_PREFIX_BYTES)), ROBOTS_PREFIX_SHA256, 'Managed robots prefix changed');
    assert.equal(digest(body.subarray(ROBOTS_PREFIX_BYTES)), reference.sha256, 'Site robots body changed');
  } else assert.equal(digest(body), reference.sha256, 'Public bytes differ');
}

// HTTP evidence only. The promotion protocol separately binds live versions
// and protected topology before and after these requests; this cannot cut over.
export async function verifyPublicHTTP({ owner, game, references, directory, request = fetch }) {
  const rows = publicReferences(owner, references, game), result = { status: 'running', origin: 'https://gachia.com', owner, observations: [] };
  mkdirSync(directory, { mode: 0o700 });
  try {
    await sampleReadOnly(rows, async (reference, index) => {
      const response = await request(result.origin + reference.path, { method: 'GET', credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(30000) });
      const body = await boundedBody(response), bodyFile = `${index}.body`;
      writeFileSync(join(directory, bodyFile), body, { flag: 'wx', mode: 0o600 });
      result.observations[index] = { path: reference.path, status: response.status, headers: Object.fromEntries(response.headers), sha256: digest(body), bodyFile, bytes: body.length };
      validatePublicResponse(response, body, reference);
    });
    result.status = 'passed';
  } catch (error) { result.status = 'failed'; result.error = error.message; throw error; }
  finally { result.observations = result.observations.filter(Boolean); writeFileSync(join(directory, 'result.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); }
  return { ...result, evidenceSHA256: digest(readFileSync(join(directory, 'result.json'))) };
}
