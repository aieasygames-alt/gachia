import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { digest } from './desktop-release-assets.mjs';
import { boundedBody, sampleReadOnly } from './desktop-version-preview.mjs';
import { publicRobots, validatePublicResponse } from './desktop-public-acceptance.mjs';
import { unifiedHTMLParserPin, unifiedPageFingerprints, unifiedPreviewPath } from './unified-version-preview.mjs';

const policy = value => (value ?? '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean).sort();
const mime = headers => new Headers(headers).get('content-type')?.split(';')[0].trim().toLowerCase();

export function unifiedMainPublicReferences(references, readBody) {
  assert(references.length > 0 && references.length <= 2500);
  assert.equal(new Set(references.map(row => row.path)).size, references.length);
  const result = references.map((row, index) => {
    unifiedPreviewPath(row.path, 'https://gachia.com');
    assert(row.path.startsWith('/_next/static/') || /^\/(?:data|data-client|data-manifest)\/.+\.json$/.test(row.path)
      || ['/sitemap.xml', '/robots.txt', '/api/auth/get-session', '/zh/ananta/guides/download-install-guide', '/en/ananta/guides/download-install-guide'].includes(row.path),
    'Unqualified Main public consumer');
    const bytes = readBody(row, index); assert.equal(bytes.length, row.bytes); assert.equal(digest(bytes), row.sha256);
    if (mime(row.headers) !== 'text/html') return { ...row };
    return { ...row, fingerprint: unifiedPageFingerprints([{ html: bytes.toString(), status: row.status }], 'streaming-v2')[0], expectedRobots: publicRobots(bytes.toString()) };
  });
  for (const path of ['/sitemap.xml', '/robots.txt', '/api/auth/get-session', '/data/ananta/raw-guides.json',
    '/data/genshin/raw-guides.json', '/data/nte/raw-guides.json', '/zh/ananta/guides/download-install-guide', '/en/ananta/guides/download-install-guide']) {
    assert(result.some(row => row.path === path), `Missing Main public coverage: ${path}`);
  }
  return result;
}

export function validateUnifiedMainPublic(response, bytes, reference) {
  if (mime(reference.headers) !== 'text/html') {
    validatePublicResponse(response, bytes, reference);
    if (reference.path === '/api/auth/get-session') {
      assert.equal(response.status, 404); assert.equal(JSON.parse(bytes).code, 'ACCOUNT_FEATURES_DISABLED');
      assert(policy(response.headers.get('cache-control')).includes('no-store'));
    }
    return;
  }
  assert.equal(response.status, reference.status, 'Main public HTML status changed');
  assert(!response.headers.has('set-cookie'), 'Main public HTML sets a cookie');
  assert.equal(mime(response.headers), mime(reference.headers));
  assert.deepEqual(policy(response.headers.get('cache-control')), policy(reference.headers['cache-control']), 'Main public cache policy changed');
  if (reference.status !== 404) assert(!/\bnoindex\b/i.test(response.headers.get('x-robots-tag') ?? ''), 'Main public page must be indexable');
  assert.deepEqual(publicRobots(bytes.toString()), reference.expectedRobots, 'Main public robots changed');
  assert.deepEqual(unifiedPageFingerprints([{ html: bytes.toString(), status: response.status }], 'streaming-v2')[0], reference.fingerprint,
    'Main public rendered content, metadata, links or media differ');
}

export async function verifyUnifiedMainPublic({ references, directory, request = fetch }) {
  mkdirSync(directory, { mode: 0o700 });
  const result = { schemaVersion: 1, kind: 'unified_main_public_http', status: 'running', origin: 'https://gachia.com',
    parserVersion: 'streaming-v2', parserPin: unifiedHTMLParserPin('streaming-v2'), observations: [] };
  try {
    await sampleReadOnly(references, async (reference, index) => {
      const response = await request(unifiedPreviewPath(reference.path, result.origin), { method: 'GET', credentials: 'omit', redirect: 'error',
        headers: { 'accept-language': reference.path.match(/^\/(zh|en|ja)\//)?.[1] ?? 'zh', connection: 'close' }, signal: AbortSignal.timeout(30000) });
      const bytes = await boundedBody(response), bodyFile = `${index}.body`;
      writeFileSync(join(directory, bodyFile), bytes, { flag: 'wx', mode: 0o600 });
      result.observations[index] = { path: reference.path, status: response.status, headers: Object.fromEntries(response.headers),
        sha256: digest(bytes), bytes: bytes.length, bodyFile };
      validateUnifiedMainPublic(response, bytes, reference);
    }, 16);
    result.status = 'passed';
  } catch (error) { result.status = 'failed'; result.error = error.message; throw error; }
  finally {
    result.observations = result.observations.filter(Boolean);
    writeFileSync(join(directory, 'result.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  }
  return { ...result, evidenceSHA256: digest(readFileSync(join(directory, 'result.json'))) };
}

export function recheckUnifiedMainPublic(directory, pin, references) {
  const raw = readFileSync(join(directory, 'result.json')); assert.equal(digest(raw), pin);
  const result = JSON.parse(raw); assert.equal(result.schemaVersion, 1); assert.equal(result.kind, 'unified_main_public_http');
  assert.equal(result.status, 'passed'); assert.equal(result.origin, 'https://gachia.com');
  assert.equal(result.parserVersion, 'streaming-v2'); assert.equal(result.parserPin, unifiedHTMLParserPin('streaming-v2'));
  assert.equal(result.observations.length, references.length);
  result.observations.forEach((row, index) => {
    assert.equal(row.path, references[index].path); assert.equal(row.bodyFile, `${index}.body`);
    const bytes = readFileSync(join(directory, row.bodyFile)); assert.equal(bytes.length, row.bytes); assert.equal(digest(bytes), row.sha256);
    validateUnifiedMainPublic({ status: row.status, headers: new Headers(row.headers) }, bytes, references[index]);
  });
  return result;
}
