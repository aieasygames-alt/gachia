import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest } from './desktop-release-assets.mjs';
import { boundedBody, sampleReadOnly } from './desktop-version-preview.mjs';
import { UNIFIED_OWNERS, unifiedService } from './unified-release-assets.mjs';

const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const SHA = /^[a-f0-9]{64}$/;
const json = value => JSON.stringify(value, null, 2) + '\n';
const parser = fileURLToPath(new URL('./unified-html-fingerprint.py', import.meta.url));
const streamingParser = fileURLToPath(new URL('./unified-html-streaming-fingerprint.py', import.meta.url));
function parserPath(version) {
  assert(['legacy-v1', 'streaming-v2'].includes(version), 'Unreviewed HTML parser version');
  return version === 'legacy-v1' ? parser : streamingParser;
}
export function unifiedHTMLParserPin(version = 'legacy-v1') {
  parserPath(version);
  const legacy = digest(readFileSync(parser));
  return version === 'legacy-v1' ? legacy : digest(JSON.stringify({ legacy, streaming: digest(readFileSync(streamingParser)) }));
}

export function exactUnifiedPreviewOrigin(service, versionId) {
  assert(UNIFIED_OWNERS.some(owner => unifiedService(owner) === service), 'Unreviewed unified preview service');
  assert(UUID.test(versionId), 'Exact unified version UUID required');
  return `https://${versionId.slice(0, 8)}-${service}.aieasygames.workers.dev`;
}

export function unifiedPreviewPath(path, origin) {
  assert(typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') && !path.includes('\\'), 'Preview origin escape');
  const url = new URL(path, origin);
  assert(url.origin === origin && url.pathname === path && !url.search && !url.hash, 'Noncanonical preview path');
  return url.href;
}

export function unifiedPageFingerprints(rows, parserVersion = 'legacy-v1') {
  const executable = parserPath(parserVersion);
  assert(Array.isArray(rows) && rows.length > 0 && rows.length <= 2500 &&
    rows.every(row => row && typeof row.html === 'string' && Buffer.byteLength(row.html) <= 16 * 1024 * 1024));
  const result = [];
  let batch = [], bytes = 2;
  const flush = () => {
    const output = execFileSync('python3', ['-B', executable], { input: `[${batch.join(',')}]`, timeout: 30000,
      maxBuffer: 32 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] });
    const parsed = JSON.parse(output.toString()); assert(Array.isArray(parsed)); assert.equal(parsed.length, batch.length);
    result.push(...parsed); batch = []; bytes = 2;
  };
  // Bound aggregate parsing work without changing either versioned parser.
  // An individually valid large page is processed alone, never truncated.
  for (const row of rows) {
    const encoded = JSON.stringify(row), size = Buffer.byteLength(encoded);
    if (batch.length && (batch.length >= 32 || bytes + 1 + size > 4 * 1024 * 1024)) flush();
    bytes += size + (batch.length ? 1 : 0); batch.push(encoded);
  }
  if (batch.length) flush();
  return result;
}

const mime = headers => new Headers(headers).get('content-type')?.split(';')[0].trim().toLowerCase();
const policy = value => (value ?? '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean).sort();

export function unifiedPreviewReferences(references, readBody, parserVersion = 'legacy-v1') {
  parserPath(parserVersion);
  assert(Array.isArray(references) && references.length > 0 && references.length <= 2500, 'Invalid unified preview coverage');
  assert.equal(new Set(references.map(row => row.path)).size, references.length, 'Duplicate preview reference');
  const html = [], indices = [], result = references.map((row, index) => {
    unifiedPreviewPath(row.path, 'https://gachia.com');
    assert(SHA.test(row.sha256) && Number.isSafeInteger(row.bytes) && row.bytes > 0 && row.bytes <= 16 * 1024 * 1024);
    const body = readBody(row, index); assert.equal(body.length, row.bytes); assert.equal(digest(body), row.sha256, 'Reference body changed');
    const headers = new Headers(row.headers); assert(!headers.has('set-cookie'), 'Reference sets a cookie');
    assert(mime(headers), 'Missing reference MIME');
    if (mime(headers) === 'text/html') { html.push({ html: body.toString(), status: row.status }); indices.push(index); }
    return { ...row };
  });
  if (html.length) unifiedPageFingerprints(html, parserVersion).forEach((fingerprint, i) => { result[indices[i]].fingerprint = fingerprint; });
  assert(result.some(row => mime(row.headers) === 'text/html'), 'Missing HTML preview coverage');
  for (const path of ['/sitemap.xml', '/robots.txt']) assert(result.some(row => row.path === path), 'Missing preview discovery coverage');
  return result;
}

export function validateUnifiedPreviewResponse({ response, bytes, reference, parserVersion = 'legacy-v1' }) {
  parserPath(parserVersion);
  const path = reference.path;
  assert.equal(response.status, reference.status, `Unified preview HTTP status: ${path}`);
  assert(!response.headers.has('set-cookie'), 'Unified preview sets a cookie');
  const type = mime(response.headers); assert.equal(type, mime(reference.headers), 'Unified preview MIME changed');
  if (path !== '/robots.txt') assert.deepEqual(policy(response.headers.get('cache-control')), policy(reference.headers['cache-control']), 'Unified preview cache policy changed');
  if (type === 'text/html' || ['application/xml', 'text/xml'].includes(type) || path === '/robots.txt') {
    assert(policy(response.headers.get('x-robots-tag')).includes('noindex'), 'Unified preview discovery must be noindex');
  }
  if (type === 'text/html') {
    assert(reference.fingerprint && response.headers.get('cache-control'), 'Missing HTML reference/cache policy');
    assert.deepEqual(unifiedPageFingerprints([{ html: bytes.toString(), status: response.status }], parserVersion)[0], reference.fingerprint,
      `Unified preview rendered content/metadata/links/media differ: ${path}`);
  } else if (path === '/robots.txt') {
    assert.equal(bytes.toString().replaceAll('\r\n', '\n'), 'User-agent: *\nDisallow: /\n', 'Preview robots must exactly prohibit all crawling');
  } else assert.equal(digest(bytes), reference.sha256, `Unified preview bytes differ: ${path}`);
}

export async function verifyUnifiedVersionPreview({ service, versionId, references, directory, request = fetch, observationMode = 'cloud_exact_version', parserVersion = 'legacy-v1' }) {
  const origin = exactUnifiedPreviewOrigin(service, versionId);
  assert(['cloud_exact_version', 'loopback_exact_host'].includes(observationMode));
  assert(references.length > 0 && references.length <= 2500 && new Set(references.map(row => row.path)).size === references.length);
  references.forEach(row => unifiedPreviewPath(row.path, origin));
  mkdirSync(directory, { mode: 0o700 });
  const result = { schemaVersion: 1, kind: 'unified_exact_version_preview', status: 'running', service, versionId, origin, observationMode,
    parserPin: unifiedHTMLParserPin(parserVersion), ...(parserVersion === 'legacy-v1' ? {} : { parserVersion }), observations: [] };
  try {
    await sampleReadOnly(references, async (reference, index) => {
      const response = await request(unifiedPreviewPath(reference.path, origin), { method: 'GET', credentials: 'omit', redirect: 'error',
        headers: { 'accept-language': reference.path.match(/^\/(zh|en|ja)\//)?.[1] ?? 'zh' }, signal: AbortSignal.timeout(30000) });
      const bytes = await boundedBody(response), bodyFile = `${index}.body`;
      writeFileSync(join(directory, bodyFile), bytes, { flag: 'wx', mode: 0o600 });
      result.observations[index] = { path: reference.path, status: response.status, headers: Object.fromEntries(response.headers),
        sha256: digest(bytes), bytes: bytes.length, bodyFile };
      validateUnifiedPreviewResponse({ response, bytes, reference, parserVersion });
    }, 16);
    result.status = 'passed';
  } catch (error) { result.status = 'failed'; result.error = error.message; throw error; }
  finally {
    result.observations = result.observations.filter(Boolean);
    writeFileSync(join(directory, 'result.json'), json(result), { flag: 'wx', mode: 0o600 });
  }
  return { ...result, evidenceSHA256: digest(readFileSync(join(directory, 'result.json'))) };
}

export function recheckUnifiedPreview(directory, pin, { service, versionId, references, observationMode = 'cloud_exact_version', parserVersion = 'legacy-v1' }) {
  assert(SHA.test(pin));
  const root = resolve(directory); assert.equal(realpathSync(root), root, 'Linked preview evidence forbidden');
  const bytes = file => {
    const p = join(root, file); assert.equal(realpathSync(p), p, 'Linked preview file forbidden');
    assert(statSync(p).isFile() && statSync(p).size <= 16 * 1024 * 1024); return readFileSync(p);
  };
  const raw = bytes('result.json'); assert.equal(digest(raw), pin, 'Preview evidence changed');
  const result = JSON.parse(raw);
  assert.equal(result.schemaVersion, 1); assert.equal(result.kind, 'unified_exact_version_preview'); assert.equal(result.status, 'passed');
  assert.equal(result.service, service); assert.equal(result.versionId, versionId);
  assert.equal(result.observationMode, observationMode, 'Local preview is not cloud evidence');
  assert.equal(result.origin, exactUnifiedPreviewOrigin(service, versionId)); assert.equal(result.parserPin, unifiedHTMLParserPin(parserVersion), 'HTML parser changed');
  assert.equal(result.parserVersion, parserVersion === 'legacy-v1' ? undefined : parserVersion, 'HTML parser version changed');
  assert.equal(result.observations.length, references.length, 'Incomplete preview evidence');
  result.observations.forEach((row, index) => {
    assert.equal(row.path, references[index].path); assert.equal(row.bodyFile, `${index}.body`);
    const body = bytes(row.bodyFile); assert.equal(body.length, row.bytes); assert.equal(digest(body), row.sha256);
    validateUnifiedPreviewResponse({ response: { status: row.status, headers: new Headers(row.headers) }, bytes: body, reference: references[index], parserVersion });
  });
  return result;
}
