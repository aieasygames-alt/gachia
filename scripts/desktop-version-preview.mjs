import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { digest } from './desktop-release-assets.mjs';

const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;

export function readRetryFetch(request, { pause = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  assert.equal(typeof request, 'function');
  return async (input, options = {}) => {
    const url = new URL(input instanceof Request ? input.url : input);
    const method = (options.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const reviewed = url.protocol === 'https:' && (['api.cloudflare.com', 'gachia.com'].includes(url.hostname) ||
      /^[a-f0-9]{8}-gachia(?:-game-(?:genshin|nte))?\.aieasygames\.workers\.dev$/.test(url.hostname));
    for (let attempt = 0; ; attempt++) {
      try { return await request(input, options); }
      catch (error) {
        if (method !== 'GET' || !reviewed || !(error instanceof TypeError) || options.signal?.aborted || attempt === 2) throw error;
        await pause(250 * (attempt + 1));
      }
    }
  };
}

export async function sampleReadOnly(items, sample, concurrency = 4) {
  assert(Number.isSafeInteger(concurrency) && concurrency >= 1 && concurrency <= 16, 'Invalid read-only sampling concurrency');
  let next = 0, failed;
  // Only reads overlap. All active writers settle before a failure is returned.
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (!failed && next < items.length) {
      const index = next++;
      try { await sample(items[index], index); } catch (error) { failed ??= { error }; }
    }
  }));
  if (failed) throw failed.error;
}

export function exactPreviewOrigin(service, versionId) {
  assert(['gachia', 'gachia-game-genshin', 'gachia-game-nte'].includes(service), 'Unreviewed preview service');
  assert(UUID.test(versionId), 'Exact version UUID required');
  return `https://${versionId.slice(0, 8)}-${service}.aieasygames.workers.dev`;
}

export async function boundedBody(response, limit = 16 * 1024 * 1024) {
  assert(response.body, 'Missing response body');
  const reader = response.body.getReader(), parts = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length; assert(size <= limit, 'Network body budget exceeded'); parts.push(value);
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(parts);
}

// Compare rendered text, metadata and media, not host-dependent Flight payloads
// or Cloudflare transport headers. Canonical/JSON-LD still point to production.
export function safeJsonLdScripts(html) {
  // This is a fail-closed gate for our generated HTML, not a general HTML parser.
  // HTML raw-text closing tags are ASCII case-insensitive, unlike JSON strings.
  const openings = [...html.matchAll(/<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>/gi)];
  const scripts = [...html.matchAll(/<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi)];
  assert.equal(scripts.length, openings.length, 'Unclosed JSON-LD script');
  return scripts.map(match => {
    assert(!match[1].includes('<'), 'JSON-LD must escape HTML raw-text delimiters');
    return JSON.parse(match[1]);
  });
}

export function pageFingerprint(html, status = 200) {
  const jsonld = safeJsonLdScripts(html);
  const one = re => { const matches = [...html.matchAll(re)]; assert.equal(matches.length, 1, 'Missing/duplicate document field'); return matches[0][1]; };
  const body = one(/<body\b[^>]*>([\s\S]*?)<\/body>/g);
  const text = body.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (status === 404) {
    assert.match(html, /<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/, 'Missing guide must be noindex');
    const rendered = /<h1\b[^>]*>404<\/h1>/.test(body);
    const streamed = body.includes('\\"digest\\":\\"NEXT_HTTP_ERROR_FALLBACK;404\\"');
    // Next may send a noindex 404 shell whose error boundary is in Flight, not visible HTML.
    assert(rendered || streamed, 'Expected the real missing-guide page');
    assert.equal(jsonld.length, 0, 'Missing guide cannot retain article structured data');
    assert(!/<link\b[^>]*rel="canonical"/.test(html), 'Missing guide cannot retain an article canonical');
    const titles = [...html.matchAll(/<title>([\s\S]*?)<\/title>/g)];
    assert(titles.length <= 1, 'Duplicate missing-page title');
    return { missingGuide: true, mode: rendered ? 'rendered' : 'flight-404', title: titles[0]?.[1] ?? null, text };
  }
  assert.equal(status, 200, 'Unreviewed HTML status');
  assert(text.length > 0, 'Missing rendered content/JSON-LD');
  const metadata = [...html.matchAll(/<meta\b[^>]*(?:name="description"|property="og:[^"]+"|name="twitter:[^"]+")[^>]*>/g)].map(m => m[0]).sort();
  assert(metadata.some(m => m.includes('name="description"')), 'Missing description');
  const canonical = one(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"[^>]*>/g);
  assert(canonical.startsWith('https://gachia.com/'), 'Non-production canonical');
  const guideList = /^https:\/\/gachia\.com\/(?:zh|en|ja)\/(?:genshin|nte)\/guides$/.test(canonical);
  assert(jsonld.length > 0 || guideList, 'Missing rendered content/JSON-LD');
  return { title: one(/<title>([\s\S]*?)<\/title>/g), h1: one(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g), text, canonical, metadata, jsonld,
    ...(guideList ? { guideLinks: [...html.matchAll(/<a\b[^>]*href="(\/(?:zh|en|ja)\/(?:genshin|nte)\/guides\/[^"?#]+)"/g)].map(m => m[1]) } : {}),
    media: [...body.matchAll(/<(?:img|source)\b[^>]*>/g)].map(m => m[0]).sort() };
}

export function validatePreviewResponse({ path, response, bytes, reference }) {
  assert.equal(response.status, reference.status, `Version preview HTTP status: ${path}`);
  assert(!response.headers.has('set-cookie'), 'Public preview unexpectedly sets a cookie');
  const mime = response.headers.get('content-type')?.split(';')[0];
  assert.equal(mime, reference.headers['content-type']?.split(';')[0], 'Preview content type changed');
  if (path !== '/robots.txt') {
    const policy = value => (value ?? '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean).sort();
    assert.deepEqual(policy(response.headers.get('cache-control')), policy(reference.headers['cache-control']), 'Preview cache policy changed');
  }
  if (mime === 'application/xml' || path === '/robots.txt') assert.match(response.headers.get('x-robots-tag') ?? '', /\bnoindex\b/, 'Preview discovery must be noindex');
  if (mime === 'text/html') {
    assert.match(response.headers.get('x-robots-tag') ?? '', /\bnoindex\b/, 'Version preview must be noindex');
    assert.deepEqual(pageFingerprint(bytes.toString(), reference.status), reference.fingerprint, 'Rendered body/metadata/JSON-LD/media differ from the sealed local candidate');
    assert(response.headers.get('cache-control'), 'Missing HTML cache policy');
  } else if (path === '/robots.txt') {
    assert.match(bytes.toString(), /Disallow:\s*\/\s*(?:\n|$)/, 'Preview robots must disallow crawling');
  } else assert.equal(digest(bytes), reference.sha256, `Preview bytes differ: ${path}`);
  if (reference.headers['cache-control']?.includes('no-store')) assert.match(response.headers.get('cache-control') ?? '', /no-store/, 'Lost private cache boundary');
}

export async function verifyVersionPreview({ service, versionId, references, directory, request = fetch }) {
  const origin = exactPreviewOrigin(service, versionId);
  assert(references.length > 0 && references.length <= 2500 && new Set(references.map(r => r.path)).size === references.length, 'Invalid preview coverage');
  mkdirSync(directory, { mode: 0o700 });
  const result = { status: 'running', service, versionId, origin, observations: [] };
  try {
    await sampleReadOnly(references, async (reference, index) => {
      const path = reference.path;
      assert(path.startsWith('/') && !path.startsWith('//') && !path.includes('\\') && new URL(path, origin).origin === origin, 'Preview origin escape');
      const response = await request(origin + path, { method: 'GET', credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(30000) });
      const bytes = await boundedBody(response), bodyFile = `${index}.body`;
      writeFileSync(join(directory, bodyFile), bytes, { flag: 'wx', mode: 0o600 });
      result.observations[index] = { path, status: response.status, headers: Object.fromEntries(response.headers), sha256: digest(bytes), bytes: bytes.length, bodyFile };
      validatePreviewResponse({ path, response, bytes, reference });
    });
    result.status = 'passed';
  } catch (error) { result.status = 'failed'; result.error = error.message; throw error; }
  finally { result.observations = result.observations.filter(Boolean); writeFileSync(join(directory, 'result.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); }
  return { ...result, evidenceSHA256: digest(readFileSync(join(directory, 'result.json'))) };
}
