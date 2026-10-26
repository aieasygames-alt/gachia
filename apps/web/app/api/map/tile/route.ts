import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getR2 } from '@/lib/db';

const ALLOWED_HOST = 'act-webstatic.hoyoverse.com';
const VALID_MAP_IDS = new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
const TILE_PATH = /^\/map_manage\/\d{8}\/[a-zA-Z0-9_-]+\.png$/;
const MAX_TILE_BYTES = 8 * 1024 * 1024;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const mapId = searchParams.get('map_id') || '2';

  if (!url || !VALID_MAP_IDS.has(mapId)) {
    return NextResponse.json({ error: 'Invalid tile request' }, { status: 400 });
  }

  // Validate URL domain to prevent open proxy
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  if (
    parsedUrl.protocol !== 'https:'
    || parsedUrl.hostname !== ALLOWED_HOST
    || parsedUrl.port
    || parsedUrl.username
    || parsedUrl.password
    || parsedUrl.search
    || parsedUrl.hash
    || !TILE_PATH.test(parsedUrl.pathname)
  ) {
    return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 });
  }

  // Hash the same canonical URL we fetch; never reuse legacy 32-bit cache keys.
  const key = `map-tiles/v2/${mapId}/${await hashUrl(parsedUrl.href)}`;

  let r2: R2Bucket | null = null;
  try {
    r2 = getR2();
    const cached = await r2.get(key);
    if (cached) {
      return new Response(cached.body, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Cache': 'HIT',
        },
      });
    }
  } catch (error) {
    console.error('R2 tile cache is unavailable', error);
    r2 = null;
  }

  let body: ArrayBuffer;
  try {
    body = await fetchTile(parsedUrl);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch tile' }, { status: 502 });
  }

  if (r2) {
    const cacheWrite = r2.put(key, body, {
      httpMetadata: { contentType: 'image/png' },
    }).catch((error) => console.error('Failed to cache map tile in R2', error));
    getCloudflareContext().ctx.waitUntil(cacheWrite);
  }

  return new Response(body, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': r2 ? 'public, max-age=31536000, immutable' : 'public, max-age=86400',
      'X-Cache': 'MISS',
    },
  });
}

async function fetchTile(url: URL): Promise<ArrayBuffer> {
  const response = await fetch(url, { headers: { 'User-Agent': 'Gachia/1.0' } });
  const contentLength = Number(response.headers.get('content-length'));
  if (
    !response.ok
    || response.headers.get('content-type')?.split(';')[0] !== 'image/png'
    || !Number.isSafeInteger(contentLength)
    || contentLength <= 0
    || contentLength > MAX_TILE_BYTES
  ) {
    throw new Error('Invalid tile response');
  }

  const body = await response.arrayBuffer();
  if (body.byteLength !== contentLength || body.byteLength > MAX_TILE_BYTES) {
    throw new Error('Tile response size mismatch');
  }
  return body;
}

async function hashUrl(url: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(url));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
