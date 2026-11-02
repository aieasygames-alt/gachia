import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { request as httpRequest } from 'node:http';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export function inspectShadowFlightFailure(response, page) {
  assert.match(response.headers['content-type'], /text\/x-component/);
  // Flight can commit status 200 before an async component fails. Require an actual
  // error frame plus absence of success witnesses, not an HTTP status shortcut.
  const errors = response.text.split('\n').filter(line => /^[a-f0-9]+:E\{/.test(line)).map(line => JSON.parse(line.slice(line.indexOf(':E') + 2)));
  assert.ok(errors.some(error => typeof error.digest === 'string' && error.digest.length > 0), 'missing Flight error digest');
  assert.ok(!response.text.includes(page.body) && !response.text.includes('data-shadow-release'));
  assert.equal(response.headers['x-shadow-release'], undefined);
  assert.match(response.headers['cache-control'], /no-store/);
  return { status: response.status, errorDigests: errors.map(error => error.digest), noSuccessWitness: true };
}
const decode = text => text.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const attr = (tag, name) => decode(tag.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1] ?? '');
const meta = (html, name) => attr([...html.matchAll(/<meta\b[^>]*>/g)].map(match => match[0]).find(tag => attr(tag, 'name') === name) ?? '', 'content');

export function inspectShadowHTML(html, { releaseKey, owner, page }) {
  const main = html.match(/<main\b[^>]*data-shadow-release[^>]*>/)?.[0] ?? '';
  assert.equal(attr(main, 'data-shadow-release'), releaseKey, 'body release');
  assert.equal(attr(main, 'data-shadow-owner'), owner, 'body owner');
  assert.equal(meta(html, 'x-shadow-release'), releaseKey, 'metadata release');
  assert.equal(decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? ''), page.title, 'actual metadata title');
  assert.equal(decode(html.match(/<p\b[^>]*data-shadow-body[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? ''), page.body, 'actual fixture body');
  assert.match(meta(html, 'robots'), /noindex/);
  const contextId = attr(main, 'data-shadow-context');
  assert.match(contextId, /^[a-f0-9-]{36}$/);
  assert.equal(meta(html, 'x-shadow-context'), contextId, 'metadata and body share a request context');
  const scripts = [...html.matchAll(/(<script\b[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1, 'one actual shadow JSON-LD');
  assert.equal(attr(scripts[0][1], 'data-shadow-context'), contextId);
  const jsonLd = JSON.parse(scripts[0][2]);
  assert.equal(jsonLd.identifier, releaseKey);
  assert.equal(jsonLd.version, releaseKey);
  assert.equal(jsonLd.text, page.body);
  assert.equal(jsonLd.name, page.title);
  const imageTag = html.match(/<img\b[^>]*>/)?.[0] ?? '';
  const mediaPath = attr(imageTag, 'src');
  assert.equal(jsonLd.image, mediaPath);
  assert.match(mediaPath, new RegExp(`^/shadow/${releaseKey}/media/[a-f0-9]{64}$`));
  const cacheKey = attr(main, 'data-shadow-cache-key');
  assert.ok(cacheKey.startsWith(`shadow:${releaseKey}:`));
  assert.equal(meta(html, 'x-shadow-cache-key'), cacheKey);
  assert.equal(attr(main, 'data-shadow-artifact-reads'), '3');
  return { releaseKey, owner, contextId, cacheKey, mediaPath, jsonLd };
}

export function evidenceSampler(directory) {
  let sequence = 0;
  const records = [];
  async function persist(label, url, status, headers, bytes, requestHeaders, bodyEncoding) {
    const parsed = new URL(url);
    assert.equal(parsed.hostname, '127.0.0.1'); assert.equal(parsed.protocol, 'http:');
    assert.match(label, /^[a-zA-Z0-9-]+$/);
    const stem = `${String(++sequence).padStart(3, '0')}-${label}`;
    const record = { label, url, requestHeaders, status, headers, bodyEncoding,
      bytes: bytes.length, sha256: sha256(bytes), bodyFile: `${stem}.body` };
    await mkdir(directory, { recursive: true });
    await writeFile(resolve(directory, `${stem}.body`), bytes, { flag: 'wx' });
    await writeFile(resolve(directory, `${stem}.json`), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
    records.push(record);
    return { ...record, text: bytes.toString('utf8'), data: bytes };
  }
  return { records, persist, async sample(label, url, options = {}) {
    const parsed = new URL(url);
    assert.equal(parsed.hostname, '127.0.0.1'); assert.equal(parsed.protocol, 'http:');
    const requestHeaders = { 'user-agent': 'T04-local-acceptance', ...options.headers };
    // Node fetch replaces Host; use HTTP directly for adversarial host-boundary probes.
    const response = options.headers?.host ? await new Promise((resolve, reject) => {
      const request = httpRequest(url, { headers: requestHeaders, signal: AbortSignal.timeout(120000) }, incoming => {
        const chunks = [];
        incoming.on('data', chunk => chunks.push(chunk));
        incoming.on('error', reject);
        incoming.on('end', () => resolve(new Response(Buffer.concat(chunks), { status: incoming.statusCode,
          headers: Object.fromEntries(Object.entries(incoming.headers).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)])) })));
      });
      request.on('error', reject); request.end();
    }) : await fetch(url, { ...options, redirect: 'manual', signal: AbortSignal.timeout(120000), headers: requestHeaders });
    const bytes = Buffer.from(await response.arrayBuffer());
    return persist(label, url, response.status, Object.fromEntries(response.headers), bytes, requestHeaders,
      options.headers?.host ? 'http-response-body' : 'decoded-fetch-body');
  } };
}

export async function auditShadowNetwork({ fixture, origins, sampler, label = 'healthy', owners = ['genshin', 'nte'] }) {
  const releaseKey = fixture.release.releaseKey;
  const results = [];
  for (const owner of owners) {
    const pages = Object.values(fixture.snapshots).flatMap(snapshot => snapshot.pages).filter(page => page.owner === owner);
    assert.ok(pages.length, `No fixture page for ${owner}`);
    const page = pages[0];
    const origin = origins[owner];
    const prefix = `/shadow/${releaseKey}`;
    const response = await sampler.sample(`${label}-${owner}-page`, origin + prefix + page.path);
    assert.equal(response.status, 200); assert.match(response.headers['cache-control'], /no-store/);
    const parsed = inspectShadowHTML(response.text, { releaseKey, owner, page });
    const repeated = await sampler.sample(`${label}-${owner}-repeat`, origin + prefix + page.path);
    assert.equal(repeated.status, 200);
    const next = inspectShadowHTML(repeated.text, { releaseKey, owner, page });
    assert.notEqual(next.contextId, parsed.contextId, 'no cross-request context reuse');
    assert.equal(next.cacheKey, parsed.cacheKey);
    const sitemap = await sampler.sample(`${label}-${owner}-sitemap`, origin + prefix + '/sitemap.xml');
    const media = await sampler.sample(`${label}-${owner}-media`, origin + parsed.mediaPath);
    const cache = await sampler.sample(`${label}-${owner}-cache`, origin + prefix + '/cache');
    for (const item of [sitemap, media, cache]) {
      assert.equal(item.status, 200); assert.equal(item.headers['x-shadow-release'], releaseKey);
      assert.equal(item.headers['x-shadow-owner'], owner); assert.equal(item.headers['x-shadow-only'], 'true');
      assert.match(item.headers['cache-control'], /no-store/); assert.match(item.headers['x-robots-tag'], /noindex/);
    }
    assert.match(sitemap.headers['content-type'], /xml/);
    const urls = [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => decode(match[1]));
    assert.deepEqual(urls, pages.map(p => origin + prefix + p.path));
    assert.match(media.headers['content-type'], /^image\/svg\+xml/);
    assert.equal(media.sha256, parsed.mediaPath.split('/').at(-1));
    assert.equal(media.headers['x-shadow-media-sha256'], media.sha256);
    assert.equal(media.headers['x-shadow-media-kind'], 'synthetic-fixture');
    const cacheData = JSON.parse(cache.text);
    assert.equal(cacheData.releaseKey, releaseKey); assert.equal(cacheData.publishable, false);
    assert.equal(cacheData.entries.find(entry => entry.path === page.path)?.cacheKey, parsed.cacheKey);
    assert.equal(cacheData.artifactReads, 3);
    results.push({ ...parsed, mediaSHA256: media.sha256, sitemapURLs: urls, consumers: ['body', 'metadata', 'jsonLd', 'sitemap', 'media', 'cache'], cachePolicy: cacheData.policy });
  }
  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const directory = process.argv[2];
  if (!directory) throw new Error('Usage: node scripts/shadow-consistency-audit.mjs <new-evidence-directory> (requires all three local services)');
  await mkdir(directory, { recursive: false });
  const fixture = JSON.parse(await readFile('reports/shadow-fixture-2026-10-31.json', 'utf8'));
  const sampler = evidenceSampler(directory);
  const results = await auditShadowNetwork({ fixture, sampler, origins: { genshin: 'http://127.0.0.1:3317', nte: 'http://127.0.0.1:3322' } });
  await writeFile(resolve(directory, 'result.json'), JSON.stringify({ results, records: sampler.records, publishable: false }, null, 2));
  console.log(JSON.stringify({ owners: results.length, networkSamples: sampler.records.length, publishable: false }));
}
