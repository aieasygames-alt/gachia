import { loadShadowConsumer } from './shadow-consumer';
import { SHADOW_SCHEMA } from './shadow-release';
import { shadowLocalEnabled } from './shadow-local-gate';
import { digest } from './shadow-canonical';
import { randomUUID } from 'node:crypto';

export type ShadowOwner = 'genshin' | 'nte' | 'main';
const keyPattern = /^[a-f0-9]{64}$/;
export const shadowHeaders = { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex, nofollow', 'x-content-type-options': 'nosniff' };
export const escapeXML = (value: string) => value.replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]!);

export async function loadLocalShadow(owner: ShadowOwner, releaseKey: string, host: string | null,
  env: Record<string, string | undefined> = process.env, fetcher: typeof fetch = fetch) {
  if (!shadowLocalEnabled(owner, host, env)) throw new Error('Shadow reader disabled');
  if (!keyPattern.test(releaseKey) || releaseKey !== env.CONTENT_CMS_SHADOW_RELEASE_KEY) throw new Error('Unapproved local release key');
  const origin = new URL(env.CONTENT_CMS_SHADOW_ORIGIN ?? 'invalid:');
  // Literal loopback only: no DNS, credentials, redirects or production origins.
  if (origin.protocol !== 'http:' || origin.hostname !== '127.0.0.1' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('CMS origin must be literal loopback');
  let reads = 0;
  const consumer = await loadShadowConsumer({ owner, releaseKey, scopes: ['genshin', 'nte'],
    capabilities: { main: [SHADOW_SCHEMA], genshin: [SHADOW_SCHEMA], nte: [SHADOW_SCHEMA] }, asOf: new Date().toISOString() }, async (kind, key) => {
    const response = await fetcher(`${origin.origin}/api/shadow/${kind === 'release' ? 'releases' : 'snapshots'}/${key}`, {
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000),
    });
    reads++;
    if (!response.ok || response.headers.get('x-shadow-only') !== 'true') throw new Error(`Shadow artifact unavailable: ${response.status}`);
    const limit = kind === 'release' ? 1024 * 1024 : 2 * 1024 * 1024;
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Missing shadow artifact body');
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > limit) throw new Error('Oversized shadow artifact');
        chunks.push(value);
      }
    } finally { await reader.cancel(); }
    return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
  });
  const prefix = `/shadow/${consumer.releaseKey}`;
  const entries = consumer.index().entries;
  // This generated test asset is not a third-party media approval or a media migration.
  const mediaBody = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="80"><title>Synthetic shadow fixture</title><rect width="480" height="80" fill="#183c48"/><text x="12" y="42" fill="white">${owner} ${releaseKey.slice(0, 16)}</text></svg>`;
  const mediaDigest = digest(mediaBody);
  const mediaPath = `${prefix}/media/${mediaDigest}`;
  const contextId = randomUUID();
  return { ...consumer, contextId, prefix, entries, reads, mediaBody, mediaDigest, mediaPath,
    responseHeaders: { ...shadowHeaders, 'x-shadow-release': releaseKey, 'x-shadow-owner': owner, 'x-shadow-only': 'true', 'x-shadow-context': contextId },
  };
}

export type LocalShadow = Awaited<ReturnType<typeof loadLocalShadow>>;

export function shadowDocument(context: LocalShadow, pathname: string) {
  const document = context.document(pathname);
  const metadata = context.metadata(pathname);
  if (!document || !metadata) return null;
  const jsonLd = { '@context': 'https://schema.org', '@type': 'CreativeWork', name: metadata.title,
    text: document.body, identifier: context.releaseKey, url: context.prefix + pathname,
    image: context.mediaPath, version: context.releaseKey };
  return { document, metadata, jsonLd };
}

export async function shadowAuxiliaryResponse(owner: ShadowOwner, request: Request, releaseKey: string,
  kind: 'sitemap' | 'media' | 'cache', mediaKey?: string) {
  if (!shadowLocalEnabled(owner, request.headers.get('host'))) return new Response('Not found', { status: 404, headers: shadowHeaders });
  try {
    const context = await loadLocalShadow(owner, releaseKey, request.headers.get('host'));
    const headers = context.responseHeaders;
    if (kind === 'sitemap') {
      // Next may normalize request.url to localhost; retain the validated inbound host.
      const origin = `http://${request.headers.get('host')}`;
      const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${context.entries.map(entry => `<url><loc>${escapeXML(origin + context.prefix + entry.path)}</loc></url>`).join('')}</urlset>`;
      return new Response(xml, { headers: { ...headers, 'content-type': 'application/xml; charset=utf-8' } });
    }
    if (kind === 'media') {
      if (mediaKey !== context.mediaDigest) return new Response('Not found', { status: 404, headers: shadowHeaders });
      return new Response(context.mediaBody, { headers: { ...headers, 'content-type': 'image/svg+xml',
        'content-security-policy': "default-src 'none'; sandbox", 'x-shadow-media-sha256': context.mediaDigest,
        'x-shadow-media-kind': 'synthetic-fixture', etag: `"${context.mediaDigest}"` } });
    }
    return Response.json({ owner, releaseKey, shadowOnly: true, publishable: false,
      policy: 'no-store; no retained fallback', artifactReads: context.reads,
      entries: context.entries.map(entry => ({ path: entry.path, cacheKey: context.document(entry.path)!.cacheKey })),
    }, { headers });
  } catch {
    // Never return a success stamp or silently mix old data into a failed request.
    return Response.json({ error: 'Shadow release unavailable', shadowOnly: true, publishable: false }, { status: 503, headers: shadowHeaders });
  }
}
